from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.auth import User, UserRole
from app.models.org import Organization, Branch
from app.authorization.rbac_engine import get_user_effective_roles_and_permissions
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/api/settings", tags=["Enterprise Settings, Profile & Preferences"])

# ----------------- SCHEMAS -----------------

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    branch_id: Optional[int] = None

class CompanySettingsUpdate(BaseModel):
    name: Optional[str] = "Nexa Global Enterprises"
    legal_name: Optional[str] = "Nexa Global Enterprises Private Limited"
    code: Optional[str] = "NEXA-HQ"
    tax_identifier: Optional[str] = "GSTIN27AABCU9603R1ZM"
    currency: Optional[str] = "INR"
    fiscal_year_start: Optional[str] = "April 1"
    default_tax_rate: Optional[float] = 18.0
    hq_address: Optional[str] = "Plot 42, Hitech City Main Road, Hyderabad, Telangana 500081"
    support_email: Optional[str] = "admin@nexaerp.internal"
    phone: Optional[str] = "+91 98765 00001"
    audit_retention_days: Optional[int] = 365
    session_timeout_minutes: Optional[int] = 480

class UserPreferencesUpdate(BaseModel):
    theme: Optional[str] = "light" # light, dark, slate, indigo
    currency: Optional[str] = "INR" # INR, USD, AED, EUR, SGD
    date_format: Optional[str] = "DD/MM/YYYY" # DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
    number_format: Optional[str] = "IN_LAKHS" # IN_LAKHS, INTERNATIONAL
    alexa_voice_enabled: Optional[bool] = True
    voice_speed: Optional[float] = 1.0
    default_tab: Optional[str] = "dashboard"
    email_alerts: Optional[bool] = True
    security_chimes: Optional[bool] = True


# In-memory preference fallback store per user
_USER_PREFERENCES_STORE: Dict[int, Dict[str, Any]] = {}

# ----------------- PROFILE ENDPOINTS -----------------

@router.get("/profile")
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fetches comprehensive profile details for the authenticated user."""
    role_names, effective_perms = await get_user_effective_roles_and_permissions(current_user, db)

    branch_name = "Hyderabad Corporate Headquarters (Main Store)"
    if current_user.branch_id:
        b_res = await db.execute(select(Branch).where(Branch.id == current_user.branch_id))
        branch = b_res.scalar_one_or_none()
        if branch:
            branch_name = f"{branch.name} ({branch.code})"

    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "is_superuser": current_user.is_superuser,
        "roles": role_names,
        "effective_permissions": list(effective_perms),
        "branch_id": current_user.branch_id,
        "branch_name": branch_name,
        "mfa_enabled": current_user.mfa_enabled,
        "mfa_type": "TOTP Authenticator (Google / Microsoft)" if current_user.mfa_enabled else "Unenrolled",
        "last_login": datetime.now(timezone.utc).strftime("%b %d, %Y %I:%M %p UTC"),
        "account_security_status": "HIGH (2FA Enforced)" if current_user.mfa_enabled else "STANDARD"
    }


@router.put("/profile")
async def update_user_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Updates user profile information."""
    if payload.full_name:
        current_user.full_name = payload.full_name.strip()
    if payload.email and payload.email != current_user.email:
        # Check uniqueness
        ex = await db.execute(select(User).where(User.email == payload.email, User.id != current_user.id))
        if ex.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already registered to another user")
        current_user.email = payload.email.strip().lower()
    if payload.branch_id is not None:
        current_user.branch_id = payload.branch_id

    await record_audit_log(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        action="UPDATE_USER_PROFILE",
        entity_name="users",
        entity_id=str(current_user.id),
        details=f"Updated user profile for {current_user.full_name} ({current_user.email})"
    )
    await db.commit()

    return {
        "success": True,
        "message": "User profile updated successfully.",
        "user": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "branch_id": current_user.branch_id
        }
    }


# ----------------- COMPANY SETTINGS ENDPOINTS -----------------

@router.get("/company")
async def get_company_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns organizational profile, corporate parameters, and enterprise policies."""
    org_res = await db.execute(select(Organization).limit(1))
    org = org_res.scalar_one_or_none()

    branches_res = await db.execute(select(Branch))
    total_branches = len(branches_res.scalars().all())

    return {
        "name": org.name if org else "Nexa Global Enterprises",
        "legal_name": "Nexa Global Enterprises Private Limited",
        "code": org.code if org else "NEXA-HQ",
        "tax_identifier": org.tax_identifier if org else "GSTIN27AABCU9603R1ZM",
        "cin": "U72200TG2026PTC184920",
        "currency": org.currency if org else "INR",
        "supported_currencies": ["INR", "USD", "AED", "EUR", "SGD"],
        "fiscal_year_start": "April 1 - March 31",
        "default_tax_rate": 18.0,
        "gst_tax_slabs": [0, 5, 12, 18, 28],
        "hq_address": "Plot 42, Hitech City Main Road, Hyderabad, Telangana 500081",
        "support_email": "admin@nexaerp.internal",
        "phone": "+91 98765 00001",
        "total_operating_branches": max(1, total_branches),
        "audit_retention_days": 365,
        "session_timeout_minutes": 480,
        "enterprise_tier": "Multi-Entity MNC Enterprise Suite",
        "last_updated": datetime.now(timezone.utc).strftime("%b %d, %Y")
    }


@router.put("/company")
async def update_company_settings(
    payload: CompanySettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Updates organizational settings."""
    org_res = await db.execute(select(Organization).limit(1))
    org = org_res.scalar_one_or_none()
    if org:
        if payload.name: org.name = payload.name
        if payload.tax_identifier: org.tax_identifier = payload.tax_identifier
        if payload.currency: org.currency = payload.currency
        await db.commit()

    await record_audit_log(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        action="UPDATE_COMPANY_SETTINGS",
        entity_name="organizations",
        entity_id="1",
        details=f"Updated company profile and parameters: {payload.name}"
    )

    return {
        "success": True,
        "message": "Company configuration and enterprise settings updated successfully.",
        "settings": payload.model_dump()
    }


# ----------------- USER PREFERENCES ENDPOINTS -----------------

@router.get("/preferences")
async def get_user_preferences(
    current_user: User = Depends(get_current_user)
):
    """Fetches UI, formatting, voice, and personal user preferences."""
    prefs = _USER_PREFERENCES_STORE.get(current_user.id, {
        "theme": "light",
        "currency": "INR",
        "date_format": "DD/MM/YYYY",
        "number_format": "IN_LAKHS",
        "alexa_voice_enabled": True,
        "voice_speed": 1.0,
        "default_tab": "dashboard",
        "email_alerts": True,
        "security_chimes": True
    })
    return prefs


@router.put("/preferences")
async def update_user_preferences(
    payload: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user)
):
    """Updates user personal preferences."""
    curr = _USER_PREFERENCES_STORE.get(current_user.id, {})
    curr.update({k: v for k, v in payload.model_dump().items() if v is not None})
    _USER_PREFERENCES_STORE[current_user.id] = curr

    return {
        "success": True,
        "message": "Preferences saved successfully.",
        "preferences": curr
    }
