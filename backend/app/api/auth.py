import io
import base64
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import pyotp
import qrcode

from app.database import get_db
from app.config import settings
from app.models.auth import User, RevokedToken, UserRole
from app.models.org import Branch
from app.schemas.auth import LoginRequest, TokenResponse, LoginResponse, Verify2FARequest, UserOut, PasswordChangeRequest
from app.auth.security import verify_password, hash_password, create_access_token, decode_token
from app.auth.dependencies import get_current_user
from app.authorization.rbac_engine import get_user_effective_permissions
from app.services.audit_service import record_audit_log
from app.services.intrusion_defense_service import detect_sql_injection, notify_administrators_of_sqli

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=LoginResponse)
async def login(
    request: Request,
    response: Response,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "unknown")
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    user_agent = request.headers.get("user-agent", "")

    # Active Intrusion Detection: Check for SQL injection exploit attempts on authentication fields
    sqli_match_email = detect_sql_injection(login_data.email)
    sqli_match_password = detect_sql_injection(login_data.password)

    if sqli_match_email or sqli_match_password:
        targeted_field = "email" if sqli_match_email else "password"
        payload_sample = sqli_match_email or sqli_match_password

        # Notify System Administrators via high-priority dispatch, record IntrusionEvent & AuditLog
        notified_admins, is_quarantined = await notify_administrators_of_sqli(
            db=db,
            client_ip=client_ip,
            target_endpoint="/api/auth/login",
            field_name=targeted_field,
            payload_sample=payload_sample,
            threat_score=90,
            action_taken="BLOCKED_AND_ADMIN_NOTIFIED",
            user_agent=user_agent
        )

        status_code = status.HTTP_403_FORBIDDEN if is_quarantined else status.HTTP_400_BAD_REQUEST
        raise HTTPException(
            status_code=status_code,
            detail="Security Alert: Malicious SQL injection pattern intercepted by NexaERP Intrusion Defense System. System Administrator has been notified.",
            headers={
                "X-NexaERP-IDS": "TRIGGERED",
                "X-NexaERP-Attack-Vector": "SQL_INJECTION",
                "X-NexaERP-Quarantine": "ACTIVE" if is_quarantined else "INACTIVE",
                "X-NexaERP-Admin-Alert": "DISPATCHED"
            }
        )

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

    # Multi-Factor Authentication Challenge (Mandatory 6-digit Authenticator TOTP)
    mfa_is_setup = bool(user.mfa_secret and user.mfa_enabled)
    new_setup = False
    qr_b64 = None
    uri = None

    if not user.mfa_secret:
        # Generate new base32 secret for Authenticator
        sec = pyotp.random_base32()
        user.mfa_secret = sec
        new_setup = True
        
        # Build standard provisioning URI and QR Code
        totp = pyotp.TOTP(sec)
        uri = totp.provisioning_uri(name=user.email, issuer_name="NexaERP")
        
        img = qrcode.make(uri)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        qr_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    elif not user.mfa_enabled:
        # Secret exists but not yet verified
        new_setup = True
        totp = pyotp.TOTP(user.mfa_secret)
        uri = totp.provisioning_uri(name=user.email, issuer_name="NexaERP")
        img = qrcode.make(uri)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        qr_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    # Generate temporary 2FA challenge token (5-minute expiration)
    temp_token = create_access_token(
        {
            "sub": str(user.id),
            "email": user.email,
            "type": "mfa_challenge"
        },
        expires_delta=timedelta(minutes=5)
    )

    await record_audit_log(
        db, action="AUTH_2FA_CHALLENGE_ISSUED", entity_name="User",
        user_id=user.id, user_email=user.email, ip_address=client_ip,
        status="PENDING_2FA", details={"mfa_setup": new_setup}
    )
    await db.commit()

    return LoginResponse(
        mfa_required=True,
        mfa_setup=new_setup,
        temp_token=temp_token,
        secret=user.mfa_secret,
        qr_code_base64=qr_b64,
        provisioning_uri=uri,
        message="Scan QR code into Google or Microsoft Authenticator, then enter your 6-digit code." if new_setup else "Enter the temporary 6-digit verification code from your authenticator app."
    )

@router.post("/verify-2fa", response_model=TokenResponse)
async def verify_2fa(
    request: Request,
    response: Response,
    payload: Verify2FARequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Step 2 of Authentication:
    Verifies the temporary 6-digit code from Google/Microsoft Authenticator.
    Upon successful validation, issues the official enterprise access token and session cookie.
    """
    client_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "unknown")
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()

    # 1. Validate temporary challenge token
    try:
        token_payload = decode_token(payload.temp_token)
        if not token_payload or token_payload.get("type") != "mfa_challenge":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="2FA session expired or invalid. Please sign in with your credentials again."
            )
        user_id = int(token_payload.get("sub"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="2FA session expired or invalid. Please sign in with your credentials again."
        )

    # 2. Fetch User
    stmt = select(User).options(
        selectinload(User.roles).selectinload(UserRole.role)
    ).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.is_active or not user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found, deactivated, or unconfigured."
        )

    # 3. Verify TOTP 6-digit Code (with +/- 1 step tolerance for clock drift)
    clean_code = payload.code.strip().replace(" ", "").replace("-", "")
    totp = pyotp.TOTP(user.mfa_secret)
    is_valid = totp.verify(clean_code, valid_window=1)

    if not is_valid:
        await record_audit_log(
            db, action="AUTH_2FA_FAILED", entity_name="User",
            user_id=user.id, user_email=user.email, ip_address=client_ip,
            status="FAILURE", details={"code_entered": clean_code}
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid 6-digit verification code. Please check your authenticator app and try again."
        )

    # 4. Mark MFA Verified & Enabled
    user.mfa_enabled = True

    # 5. Compute effective permissions & roles
    effective_perms = await get_user_effective_permissions(user, db)
    role_names = [ur.role.name for ur in user.roles if ur.role]

    branch_name = "Main Store"
    if user.branch_id:
        b_res = await db.execute(select(Branch).where(Branch.id == user.branch_id))
        branch = b_res.scalar_one_or_none()
        if branch:
            branch_name = branch.name

    # 6. Issue full enterprise access token
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
        db, action="AUTH_LOGIN_SUCCESS_2FA", entity_name="User",
        user_id=user.id, user_email=user.email, ip_address=client_ip,
        status="SUCCESS", details={"roles": role_names, "mfa_method": "TOTP"}
    )
    await db.commit()

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserOut(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            mfa_enabled=user.mfa_enabled,
            branch_id=user.branch_id,
            branch_name=branch_name,
            department_id=user.department_id,
            roles=role_names,
            effective_permissions=list(effective_perms)
        )
    )

@router.get("/mfa/demo-code/{temp_token}")
async def get_demo_authenticator_code(
    temp_token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Helper for demonstration & developer convenience:
    Returns the current 6-digit TOTP code for the user in the challenge session.
    """
    try:
        payload = decode_token(temp_token)
        if not payload or payload.get("type") != "mfa_challenge":
            raise HTTPException(status_code=400, detail="Invalid challenge token")
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid challenge token")

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user or not user.mfa_secret:
        raise HTTPException(status_code=404, detail="MFA not initialized")

    totp = pyotp.TOTP(user.mfa_secret)
    current_code = totp.now()
    return {
        "current_code": current_code,
        "seconds_remaining": 30 - (int(datetime.now(timezone.utc).timestamp()) % 30),
        "secret": user.mfa_secret
    }

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
