import json
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.models.auth import User, UserRole, UserPreference
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

# Errors 7 & 8: Use None defaults so partial updates do not overwrite omitted fields
class CompanySettingsUpdate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    code: Optional[str] = None
    tax_identifier: Optional[str] = None
    currency: Optional[str] = None
    fiscal_year_start: Optional[str] = None
    default_tax_rate: Optional[float] = None
    hq_address: Optional[str] = None
    support_email: Optional[str] = None
    phone: Optional[str] = None
    audit_retention_days: Optional[int] = None
    session_timeout_minutes: Optional[int] = None

# Error 9: Use None defaults so changing one preference does not reset others
class UserPreferencesUpdate(BaseModel):
    theme: Optional[str] = None # light, dark, slate, indigo
    currency: Optional[str] = None # INR, USD, AED, EUR, SGD
    date_format: Optional[str] = None # DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
    number_format: Optional[str] = None # IN_LAKHS, INTERNATIONAL
    alexa_voice_enabled: Optional[bool] = None
    voice_speed: Optional[float] = None
    default_tab: Optional[str] = None
    email_alerts: Optional[bool] = None
    security_chimes: Optional[bool] = None

DEFAULT_USER_PREFERENCES = {
    "theme": "light",
    "currency": "INR",
    "date_format": "DD/MM/YYYY",
    "number_format": "IN_LAKHS",
    "alexa_voice_enabled": True,
    "voice_speed": 1.0,
    "default_tab": "dashboard",
    "email_alerts": True,
    "security_chimes": True
}

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
        "last_login": current_user.last_login_at.strftime("%b %d, %Y %I:%M %p UTC") if getattr(current_user, "last_login_at", None) else None,
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

    # SEC-27: Prohibit self-service branch transfers through profile editing
    if payload.branch_id is not None and payload.branch_id != current_user.branch_id:
        is_admin = current_user.is_superuser or any(
            r.role and r.role.name in ["System Administrator", "Executive", "Managing Director"]
            for r in getattr(current_user, "roles", [])
        )
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Branch assignments cannot be self-modified. An official administrative transfer is required."
            )
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
    """Returns organizational profile, corporate parameters, and enterprise policies from authoritative database records."""
    org_res = await db.execute(select(Organization).limit(1))
    org = org_res.scalar_one_or_none()

    branches_res = await db.execute(select(Branch))
    total_branches = len(branches_res.scalars().all())

    extra_settings: Dict[str, Any] = {}
    if org and org.settings_json:
        try:
            extra_settings = json.loads(org.settings_json)
        except Exception:
            extra_settings = {}

    return {
        "name": org.name if org else None,
        "legal_name": org.legal_name if (org and org.legal_name) else None,
        "code": org.code if org else None,
        "tax_identifier": org.tax_identifier if org else None,
        "cin": extra_settings.get("cin") or None,
        "currency": org.currency if org else "INR",
        "supported_currencies": ["INR", "USD", "AED", "EUR", "SGD"],
        "fiscal_year_start": extra_settings.get("fiscal_year_start") or None,
        "default_tax_rate": extra_settings.get("default_tax_rate") or None,
        "gst_tax_slabs": [0, 5, 12, 18, 28],
        "hq_address": extra_settings.get("hq_address") or None,
        "support_email": extra_settings.get("support_email") or None,
        "phone": extra_settings.get("phone") or None,
        "total_operating_branches": total_branches,
        "audit_retention_days": extra_settings.get("audit_retention_days", 365),
        "session_timeout_minutes": extra_settings.get("session_timeout_minutes", 480),
        "enterprise_tier": extra_settings.get("enterprise_tier", "Enterprise Multi-Branch Suite"),
        "last_updated": (org.updated_at.strftime("%b %d, %Y") if (org and org.updated_at) else datetime.now(timezone.utc).strftime("%b %d, %Y"))
    }


@router.put("/company")
async def update_company_settings(
    payload: CompanySettingsUpdate,
    current_user: User = Depends(require_permission("settings.manage")),
    db: AsyncSession = Depends(get_db)
):
    """Updates organizational settings (SEC-27 & SEC-38). Requires settings.manage permission."""
    org_res = await db.execute(select(Organization).limit(1))
    org = org_res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization record not found")

    data = payload.model_dump(exclude_unset=True)
    if not data:
        return {"success": True, "message": "No changes provided.", "organization": {"name": org.name}}

    extra_settings: Dict[str, Any] = {}
    if org.settings_json:
        try:
            extra_settings = json.loads(org.settings_json)
        except Exception:
            extra_settings = {}

    # Update direct columns
    if "name" in data and data["name"] is not None:
        org.name = data["name"]
    if "legal_name" in data:
        org.legal_name = data["legal_name"]
    if "code" in data and data["code"] is not None:
        org.code = data["code"]
    if "tax_identifier" in data:
        org.tax_identifier = data["tax_identifier"]
    if "currency" in data and data["currency"] is not None:
        org.currency = data["currency"]

    # Extra settings persisted in settings_json
    extra_keys = ["fiscal_year_start", "default_tax_rate", "hq_address", "support_email", "phone", "audit_retention_days", "session_timeout_minutes", "cin", "enterprise_tier"]
    for k in extra_keys:
        if k in data:
            extra_settings[k] = data[k]

    org.settings_json = json.dumps(extra_settings)
    await db.commit()
    await db.refresh(org)

    await record_audit_log(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        action="UPDATE_COMPANY_SETTINGS",
        entity_name="organizations",
        entity_id=str(org.id),
        details=f"Updated company settings: {list(data.keys())}"
    )

    saved_response = {
        "name": org.name,
        "legal_name": org.legal_name,
        "code": org.code,
        "tax_identifier": org.tax_identifier,
        "currency": org.currency,
        **extra_settings
    }

    return {
        "success": True,
        "message": "Company configuration and enterprise settings updated successfully.",
        "organization": saved_response
    }


# ----------------- USER PREFERENCES ENDPOINTS -----------------

@router.get("/preferences")
async def get_user_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fetches UI, formatting, voice, and personal user preferences from durable database."""
    res = await db.execute(select(UserPreference).where(UserPreference.user_id == current_user.id))
    pref_row = res.scalar_one_or_none()
    user_prefs = dict(DEFAULT_USER_PREFERENCES)
    if pref_row and pref_row.preferences_json:
        try:
            stored = json.loads(pref_row.preferences_json)
            user_prefs.update(stored)
        except Exception:
            pass
    return user_prefs


@router.put("/preferences")
async def update_user_preferences(
    payload: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Updates user personal preferences with persistent database storage (Error 9)."""
    res = await db.execute(select(UserPreference).where(UserPreference.user_id == current_user.id))
    pref_row = res.scalar_one_or_none()

    current_prefs = dict(DEFAULT_USER_PREFERENCES)
    if pref_row and pref_row.preferences_json:
        try:
            current_prefs.update(json.loads(pref_row.preferences_json))
        except Exception:
            pass

    updates = payload.model_dump(exclude_unset=True)
    clean_updates = {k: v for k, v in updates.items() if v is not None}
    current_prefs.update(clean_updates)

    if pref_row is None:
        pref_row = UserPreference(
            user_id=current_user.id,
            preferences_json=json.dumps(current_prefs)
        )
        db.add(pref_row)
    else:
        pref_row.preferences_json = json.dumps(current_prefs)

    await db.commit()

    return {
        "success": True,
        "message": "Preferences saved successfully.",
        "preferences": current_prefs
    }
