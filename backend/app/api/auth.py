from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.config import settings
from app.models.auth import User, RevokedToken, UserRole
from app.models.org import Branch
from app.schemas.auth import LoginRequest, TokenResponse, UserOut, PasswordChangeRequest
from app.auth.security import verify_password, hash_password, create_access_token, decode_token
from app.auth.dependencies import get_current_user
from app.authorization.rbac_engine import get_user_effective_permissions
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    response: Response,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else "unknown"

    # Find user by email
    stmt = select(User).options(
        selectinload(User.roles).selectinload(UserRole.role)
    ).where(User.email == login_data.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        await record_audit_log(
            db, action="AUTH_LOGIN_FAILED", entity_name="User",
            user_email=login_data.email, ip_address=client_ip,
            status="FAILURE", details="User does not exist"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Check lock status
    now = datetime.now(timezone.utc)
    locked_time = user.locked_until
    if locked_time is not None:
        if locked_time.tzinfo is None:
            locked_time = locked_time.replace(tzinfo=timezone.utc)
        if locked_time > now:
            await record_audit_log(
                db, action="AUTH_LOGIN_LOCKED", entity_name="User",
                user_id=user.id, user_email=user.email, ip_address=client_ip,
                status="DENIED", details="Account is currently locked"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account locked until {locked_time.strftime('%Y-%m-%d %H:%M:%S UTC')}",
            )

    # Verify password
    if not verify_password(login_data.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= settings.RATE_LIMIT_LOGIN_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=15)
            lock_msg = f"Exceeded maximum failed attempts. Account locked for 15 minutes."
        else:
            lock_msg = f"Failed attempt {user.failed_login_attempts}/{settings.RATE_LIMIT_LOGIN_ATTEMPTS}"

        await record_audit_log(
            db, action="AUTH_LOGIN_FAILED", entity_name="User",
            user_id=user.id, user_email=user.email, ip_address=client_ip,
            status="FAILURE", details=lock_msg
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact your system administrator.",
        )

    # Reset failed attempts
    user.failed_login_attempts = 0
    user.locked_until = None

    # Compute effective permissions
    effective_perms = await get_user_effective_permissions(user, db)
    role_names = [ur.role.name for ur in user.roles if ur.role]

    branch_name = "Main Store"
    if user.branch_id:
        b_res = await db.execute(select(Branch).where(Branch.id == user.branch_id))
        branch = b_res.scalar_one_or_none()
        if branch:
            branch_name = branch.name

    # Create access token
    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "is_superuser": user.is_superuser,
        "roles": role_names,
    })

    # Set secure HTTP-only session cookie
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    await record_audit_log(
        db, action="AUTH_LOGIN_SUCCESS", entity_name="User",
        user_id=user.id, user_email=user.email, ip_address=client_ip,
        status="SUCCESS", details={"roles": role_names}
    )
    await db.commit()

    return TokenResponse(
        access_token=token,
        token_type="bearer",  # nosec B106
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserOut(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            branch_id=user.branch_id,
            branch_name=branch_name,
            department_id=user.department_id,
            roles=role_names,
            effective_permissions=list(effective_perms)
        )
    )

@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Revoke current token
    jti = getattr(current_user, "current_token_jti", None)
    if jti:
        revoked = RevokedToken(
            token_jti=jti,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        db.add(revoked)

    # Clear cookie
    response.delete_cookie(key=settings.SESSION_COOKIE_NAME)

    await record_audit_log(
        db, action="AUTH_LOGOUT", entity_name="User",
        user_id=current_user.id, user_email=current_user.email,
        ip_address=request.client.host if request.client else "unknown",
        status="SUCCESS"
    )
    await db.commit()
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserOut)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    effective_perms = await get_user_effective_permissions(current_user, db)
    role_names = [ur.role.name for ur in current_user.roles if ur.role]

    branch_name = "Main Store"
    if current_user.branch_id:
        b_res = await db.execute(select(Branch).where(Branch.id == current_user.branch_id))
        branch = b_res.scalar_one_or_none()
        if branch:
            branch_name = branch.name

    return UserOut(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        branch_id=current_user.branch_id,
        branch_name=branch_name,
        department_id=current_user.department_id,
        roles=role_names,
        effective_permissions=list(effective_perms)
    )

@router.post("/change-password")
async def change_password(
    data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed",
        )

    current_user.password_hash = hash_password(data.new_password)
    await record_audit_log(
        db, action="USER_PASSWORD_CHANGE", entity_name="User",
        user_id=current_user.id, user_email=current_user.email,
        status="SUCCESS"
    )
    await db.commit()
    return {"message": "Password changed successfully"}
