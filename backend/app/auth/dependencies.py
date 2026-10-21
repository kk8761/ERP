from typing import Optional, Set
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.config import settings
from app.auth.security import decode_token
from app.models.auth import User, RevokedToken, UserRole, Role
from app.authorization.rbac_engine import get_user_effective_permissions

bearer_scheme = HTTPBearer(auto_error=False)

async def get_current_user(
    request: Request,
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    token: Optional[str] = None
    if auth_header and auth_header.credentials:
        token = auth_header.credentials
    elif settings.SESSION_COOKIE_NAME in request.cookies:
        token = request.cookies.get(settings.SESSION_COOKIE_NAME)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    jti = payload.get("jti")
    if jti:
        # Check if revoked
        revoked = await db.execute(select(RevokedToken).where(RevokedToken.token_jti == jti))
        if revoked.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session token has been revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token claims",
        )

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user subject in token",
        )

    stmt = select(User).options(selectinload(User.roles).selectinload(UserRole.role)).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    now = datetime.now(timezone.utc)
    locked_time = user.locked_until
    if locked_time is not None:
        if locked_time.tzinfo is None:
            locked_time = locked_time.replace(tzinfo=timezone.utc)
        if locked_time > now:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account locked until {locked_time.isoformat()}",
            )

    # Attach computed permissions and token jti to user request state
    user_perms = await get_user_effective_permissions(user, db)
    setattr(user, "effective_permissions", user_perms)
    setattr(user, "current_token_jti", jti)
    return user

def require_permission(required_permission: str):
    """Dependency factory checking that current user has the required permission."""
    async def permission_dependency(
        user: User = Depends(get_current_user),
    ) -> User:
        effective_perms: Set[str] = getattr(user, "effective_permissions", set())
        if user.is_superuser or required_permission in effective_perms:
            return user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Missing required permission: '{required_permission}'"
        )
    return permission_dependency

def require_admin_user():
    """Dependency verifying caller is an administrator or executive with administrative permissions."""
    async def admin_dependency(user: User = Depends(get_current_user)) -> User:
        effective_perms: Set[str] = getattr(user, "effective_permissions", set())
        has_admin_role = any(r.role and r.role.name in ["System Administrator", "Executive"] for r in getattr(user, "roles", []))
        if user.is_superuser or has_admin_role or "system_admin.manage" in effective_perms or "settings.manage" in effective_perms:
            return user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. System Administrator or Executive privileges required."
        )
    return admin_dependency

async def get_current_user_optional(
    request: Request,
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    try:
        return await get_current_user(request, auth_header, db)
    except Exception:
        return None

