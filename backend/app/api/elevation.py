from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.models.auth import User, Role
from app.models.elevation import AccessRequest
from app.schemas.elevation import AccessRequestCreate, AccessRequestReview, AccessRequestOut
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/api/elevation", tags=["Temporary Role Elevation"])

@router.get("/requests", response_model=List[AccessRequestOut])
async def list_access_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(AccessRequest)
        .options(
            selectinload(AccessRequest.user),
            selectinload(AccessRequest.approved_by),
            selectinload(AccessRequest.requested_role)
        )
        .order_by(desc(AccessRequest.created_at))
    )

    can_approve = (
        current_user.is_superuser or
        "access_requests.approve" in getattr(current_user, "effective_permissions", set())
    )

    # If cannot approve, only see own requests
    if not can_approve:
        stmt = stmt.where(AccessRequest.user_id == current_user.id)

    res = await db.execute(stmt)
    requests = res.scalars().all()

    out = []
    now = datetime.now(timezone.utc)
    for r in requests:
        # Check automatic expiration
        current_status = r.status
        if current_status == "APPROVED" and r.valid_until and r.valid_until < now:
            current_status = "EXPIRED"

        out.append(AccessRequestOut(
            id=r.id,
            user_id=r.user_id,
            user_name=r.user.full_name if r.user else "Unknown",
            user_email=r.user.email if r.user else "",
            requested_role_id=r.requested_role_id,
            requested_role_name=r.requested_role.name if r.requested_role else None,
            requested_permission_code=r.requested_permission_code,
            reason=r.reason,
            duration_minutes=r.duration_minutes,
            status=current_status,
            approved_by_name=r.approved_by.full_name if r.approved_by else None,
            approval_note=r.approval_note,
            valid_from=r.valid_from,
            valid_until=r.valid_until,
            created_at=r.created_at
        ))
    return out

@router.post("/requests", response_model=AccessRequestOut, status_code=status.HTTP_201_CREATED)
async def create_access_request(
    data: AccessRequestCreate,
    current_user: User = Depends(require_permission("access_requests.request")),
    db: AsyncSession = Depends(get_db)
):
    if not data.requested_role_id and not data.requested_permission_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must specify either requested_role_id or requested_permission_code"
        )

    role_name = None
    if data.requested_role_id:
        r_res = await db.execute(select(Role).where(Role.id == data.requested_role_id))
        role = r_res.scalar_one_or_none()
        if not role:
            raise HTTPException(status_code=404, detail="Requested role not found")
        role_name = role.name

    access_req = AccessRequest(
        user_id=current_user.id,
        requested_role_id=data.requested_role_id,
        requested_permission_code=data.requested_permission_code,
        reason=data.reason,
        duration_minutes=data.duration_minutes,
        status="PENDING"
    )
    db.add(access_req)
    await record_audit_log(
        db, action="ELEVATION_REQUESTED", entity_name="AccessRequest",
        user_id=current_user.id, user_email=current_user.email,
        details={
            "role": role_name,
            "permission": data.requested_permission_code,
            "duration_minutes": data.duration_minutes,
            "reason": data.reason
        }
    )
    await db.commit()
    await db.refresh(access_req)

    return AccessRequestOut(
        id=access_req.id,
        user_id=access_req.user_id,
        user_name=current_user.full_name,
        user_email=current_user.email,
        requested_role_id=access_req.requested_role_id,
        requested_role_name=role_name,
        requested_permission_code=access_req.requested_permission_code,
        reason=access_req.reason,
        duration_minutes=access_req.duration_minutes,
        status=access_req.status,
        created_at=access_req.created_at
    )

@router.post("/requests/{request_id}/review", response_model=AccessRequestOut)
async def review_access_request(
    request_id: int,
    review: AccessRequestReview,
    current_user: User = Depends(require_permission("access_requests.approve")),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(AccessRequest)
        .options(selectinload(AccessRequest.user), selectinload(AccessRequest.requested_role))
        .where(AccessRequest.id == request_id)
    )
    res = await db.execute(stmt)
    req = res.scalar_one_or_none()

    if not req:
        raise HTTPException(status_code=404, detail="Access request not found")

    # CRITICAL SECURITY RULE: No self-approval!
    if req.user_id == current_user.id:
        await record_audit_log(
            db, action="ELEVATION_SELF_APPROVAL_ATTEMPT", entity_name="AccessRequest",
            entity_id=str(req.id), user_id=current_user.id, user_email=current_user.email,
            status="DENIED", details="User attempted self-approval of elevated permissions"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conflict of interest: Self-approval of elevated access requests is strictly prohibited"
        )

    now = datetime.now(timezone.utc)
    req.status = review.decision
    req.approved_by_id = current_user.id
    req.approval_note = review.approval_note
    req.decided_at = now

    if review.decision == "APPROVED":
        req.valid_from = now
        req.valid_until = now + timedelta(minutes=req.duration_minutes)

    await record_audit_log(
        db, action=f"ELEVATION_{review.decision}", entity_name="AccessRequest",
        entity_id=str(req.id), user_id=current_user.id, user_email=current_user.email,
        details={
            "target_user": req.user.email,
            "decision": review.decision,
            "note": review.approval_note,
            "valid_until": req.valid_until.isoformat() if req.valid_until else None
        }
    )
    await db.commit()
    await db.refresh(req)

    return AccessRequestOut(
        id=req.id,
        user_id=req.user_id,
        user_name=req.user.full_name if req.user else "Unknown",
        user_email=req.user.email if req.user else "",
        requested_role_id=req.requested_role_id,
        requested_role_name=req.requested_role.name if req.requested_role else None,
        requested_permission_code=req.requested_permission_code,
        reason=req.reason,
        duration_minutes=req.duration_minutes,
        status=req.status,
        approved_by_name=current_user.full_name,
        approval_note=req.approval_note,
        valid_from=req.valid_from,
        valid_until=req.valid_until,
        created_at=req.created_at
    )
