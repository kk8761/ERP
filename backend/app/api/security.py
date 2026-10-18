from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.models.auth import User, Role, UserRole
from app.models.security_incident import ScreenshotIncident, IntrusionEvent, QuarantinedIP
from app.services.intrusion_defense_service import (
    get_ids_metrics,
    unquarantine_ip_memory,
    quarantine_ip_address_db
)
from app.schemas.security import (
    ScreenshotIncidentCreate,
    ScreenshotIncidentOut,
    ScreenshotIncidentReview
)
from app.services.audit_service import record_audit_log
from app.services.email_service import send_business_email, generate_screenshot_alert_template
from app.config import settings

router = APIRouter(prefix="/api/security", tags=["Security & DLP"])

@router.post("/screenshot-incident", response_model=ScreenshotIncidentOut, status_code=status.HTTP_201_CREATED)
async def log_screenshot_incident(
    payload: ScreenshotIncidentCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Data Loss Prevention (DLP) Incident Trigger:
    Called whenever an employee attempts or executes a screen capture (PrintScreen, Snipping tool, etc.).
    Preserves evidence image, registers audit record, and transmits real-time security alert to administrators.
    """
    client_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "127.0.0.1")
    user_agent = request.headers.get("user-agent", "Unknown Device")[:250]
    captured_time = payload.captured_at or datetime.now(timezone.utc)
    
    org_id = getattr(current_user, "organization_id", 1) or 1
    user_display_name = getattr(current_user, "full_name", None) or getattr(current_user, "email", "Employee")

    incident = ScreenshotIncident(
        user_id=current_user.id,
        user_name=user_display_name,
        user_email=current_user.email,
        page_url=payload.page_url,
        action_type=payload.action_type or "PRINT_SCREEN_KEY",
        image_data=payload.image_data,
        captured_at=captured_time,
        ip_address=client_ip,
        user_agent=user_agent,
        screen_resolution=payload.screen_resolution,
        organization_id=org_id,
        is_reviewed=False,
        severity="HIGH"
    )
    db.add(incident)
    await db.flush()

    # Log to tamper-evident audit trail
    await record_audit_log(
        db,
        action="DLP_SCREENSHOT_CAPTURED",
        entity_name="ScreenshotIncident",
        entity_id=incident.id,
        user_id=current_user.id,
        status="ALERT",
        details={
            "user_email": current_user.email,
            "user_name": user_display_name,
            "page_url": payload.page_url,
            "action_type": payload.action_type,
            "captured_at": captured_time.isoformat(),
            "client_ip": client_ip,
            "screen_resolution": payload.screen_resolution
        }
    )

    # Resolve Administrator notification targets
    admin_emails = set()
    # 1. Any superuser or administrator
    admin_stmt = (
        select(User.email, User.full_name)
        .where(User.is_active == True)
        .where(User.is_superuser == True)
    )
    admin_res = await db.execute(admin_stmt)
    admins = admin_res.all()
    for admin_row in admins:
        if admin_row.email:
            admin_emails.add((admin_row.email, admin_row.full_name or "Administrator"))

    # Fallback to system security administrator address if no specific superuser email found
    if not admin_emails:
        admin_emails.add((settings.SMTP_FROM_EMAIL or "security-admin@nexaerp.internal", "NexaERP SOC Admin"))

    # Dispatch email alerts to administrators with embedded evidence image and who/when/what metadata
    formatted_time_str = captured_time.strftime("%d %b %Y, %H:%M:%S UTC")
    for adm_email, adm_name in admin_emails:
        email_content = generate_screenshot_alert_template(
            user_name=user_display_name,
            user_email=current_user.email,
            captured_at_str=formatted_time_str,
            page_url=payload.page_url,
            image_data=payload.image_data,
            action_type=payload.action_type,
            ip_address=client_ip
        )
        try:
            await send_business_email(
                db=db,
                recipient_email=adm_email,
                recipient_name=adm_name,
                subject=email_content["subject"],
                body_html=email_content["body_html"],
                document_type="DLP_INCIDENT",
                document_reference=f"INC-{incident.id}",
                sent_by_user_id=current_user.id
            )
        except Exception as e:
            # Continue without failing the incident logging
            pass

    await db.commit()
    await db.refresh(incident)
    return incident

@router.get("/screenshot-incidents", response_model=List[ScreenshotIncidentOut])
async def list_screenshot_incidents(
    unreviewed_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Administrator query to list and review captured screenshot DLP security incidents.
    Requires administrative permissions or superuser access.
    """
    is_admin = (
        current_user.is_superuser or
        "audit.view" in getattr(current_user, "effective_permissions", set()) or
        "system.admin" in getattr(current_user, "effective_permissions", set())
    )
    if not is_admin:
        # Non-admins can only see their own recorded incidents
        stmt = (
            select(ScreenshotIncident)
            .where(ScreenshotIncident.user_id == current_user.id)
            .order_by(desc(ScreenshotIncident.captured_at))
            .offset(offset)
            .limit(limit)
        )
    else:
        stmt = (
            select(ScreenshotIncident)
            .order_by(desc(ScreenshotIncident.captured_at))
            .offset(offset)
            .limit(limit)
        )
        if unreviewed_only:
            stmt = stmt.where(ScreenshotIncident.is_reviewed == False)

    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/screenshot-incidents/{incident_id}/review", response_model=ScreenshotIncidentOut)
async def review_screenshot_incident(
    incident_id: int,
    payload: ScreenshotIncidentReview,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a DLP screenshot incident as reviewed / resolved by the security admin.
    """
    is_admin = (
        current_user.is_superuser or
        "audit.view" in getattr(current_user, "effective_permissions", set()) or
        "system.admin" in getattr(current_user, "effective_permissions", set())
    )
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to review DLP security incidents."
        )

    stmt = select(ScreenshotIncident).where(ScreenshotIncident.id == incident_id)
    res = await db.execute(stmt)
    incident = res.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Screenshot incident not found.")

    incident.is_reviewed = payload.is_reviewed
    await record_audit_log(
        db,
        action="DLP_SCREENSHOT_REVIEWED",
        entity_name="ScreenshotIncident",
        entity_id=incident.id,
        user_id=current_user.id,
        status="SUCCESS",
        details={"reviewed_by": current_user.email, "incident_id": incident.id}
    )
    await db.commit()
    await db.refresh(incident)
    return incident

@router.get("/screenshot-incidents/stats")
async def get_screenshot_incident_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Summary counts of screenshot DLP incidents for the TopNav notification badge and SOC dashboard.
    """
    total_stmt = select(func.count(ScreenshotIncident.id))
    unreviewed_stmt = select(func.count(ScreenshotIncident.id)).where(ScreenshotIncident.is_reviewed == False)
    
    total_res = await db.execute(total_stmt)
    unreviewed_res = await db.execute(unreviewed_stmt)
    
    recent_stmt = (
        select(ScreenshotIncident)
        .order_by(desc(ScreenshotIncident.captured_at))
        .limit(5)
    )
    recent_res = await db.execute(recent_stmt)
    recent_incidents = recent_res.scalars().all()

    return {
        "total_incidents": total_res.scalar() or 0,
        "unreviewed_count": unreviewed_res.scalar() or 0,
        "recent_incidents": [
            {
                "id": inc.id,
                "user_name": inc.user_name,
                "user_email": inc.user_email,
                "captured_at": inc.captured_at.isoformat(),
                "page_url": inc.page_url,
                "action_type": inc.action_type,
                "is_reviewed": inc.is_reviewed
            }
            for inc in recent_incidents
        ]
    }


# =====================================================================
# NexaERP Intrusion Defense System (IDS/WAF) Endpoints
# =====================================================================

@router.get("/ids/metrics")
async def get_ids_telemetry_metrics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns real-time telemetry metrics from the Autonomous Intrusion Defense System.
    Includes mitigated attack vectors, active quarantines, and incident logs.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Administrator privilege required to view IDS telemetry."
        )
    return await get_ids_metrics(db)


@router.get("/ids/quarantine")
async def get_active_quarantined_ips(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all IP addresses currently isolated under active firewall quarantine.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Administrator privilege required."
        )
    stmt = (
        select(QuarantinedIP)
        .where(QuarantinedIP.is_active == True)
        .order_by(desc(QuarantinedIP.created_at))
    )
    res = await db.execute(stmt)
    quarantined = res.scalars().all()
    return [
        {
            "id": q.id,
            "ip_address": q.ip_address,
            "reason": q.reason,
            "threat_score": q.threat_score,
            "quarantined_until": q.quarantined_until.isoformat() if q.quarantined_until else None,
            "quarantined_by": q.quarantined_by,
            "created_at": q.created_at.isoformat()
        }
        for q in quarantined
    ]


@router.post("/ids/quarantine/{ip}/unblock")
async def unblock_quarantined_ip(
    ip: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Administratively unbans an IP address from both database records and in-memory WAF cache.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Administrator privilege required."
        )

    # 1. Clear in-memory WAF quarantine cache
    unquarantine_ip_memory(ip)

    # 2. Deactivate in persistent database table
    stmt = select(QuarantinedIP).where(QuarantinedIP.ip_address == ip)
    res = await db.execute(stmt)
    record = res.scalar_one_or_none()

    if record:
        record.is_active = False
        await record_audit_log(
            db,
            action="IP_UNQUARANTINED_BY_ADMIN",
            entity_name="QuarantinedIP",
            user_id=current_user.id,
            status="UNBLOCKED",
            details={"ip_address": ip, "admin": current_user.email}
        )
        await db.commit()

    return {"message": f"IP address {ip} has been successfully unblocked."}


@router.post("/ids/quarantine/{ip}/block")
async def manually_quarantine_ip(
    ip: str,
    reason: Optional[str] = Query("Administrative quarantine by SOC"),
    duration_minutes: int = Query(60, ge=1, le=43200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Manually quarantines a hostile or abusive IP address across the platform.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Administrator privilege required."
        )

    record = await quarantine_ip_address_db(
        db,
        ip_address=ip,
        reason=reason,
        threat_score=100,
        duration_minutes=duration_minutes
    )
    return {
        "message": f"IP address {ip} has been quarantined.",
        "quarantined_until": record.quarantined_until.isoformat()
    }

