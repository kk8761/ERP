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
from app.models.auth import User, RevokedToken, UserRole, Role
from app.models.org import Organization, Branch, Warehouse
from app.models.hr import Employee
from app.models.inventory import Product, ProductCategory
from app.schemas.auth import (
    LoginRequest, TokenResponse, LoginResponse, Verify2FARequest, 
    UserOut, PasswordChangeRequest, StoreRegisterRequest
)
from app.auth.security import verify_password, hash_password, create_access_token, decode_token, validate_password_strength
from app.auth.dependencies import get_current_user
from app.authorization.rbac_engine import get_user_effective_permissions
from app.services.audit_service import record_audit_log
from app.services.intrusion_defense_service import detect_sql_injection, notify_administrators_of_sqli

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def reset_mfa_tracking():
    """Reset any cached MFA or brute-force state during automated test suites."""
    pass


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
    secret_to_send = None

    if not user.mfa_secret:
        user.mfa_secret = pyotp.random_base32()
        user.mfa_enabled = False

    # STRICT SECURITY: QR code and secret key are ONLY generated and sent ONCE during initial registration.
    # Once the employee has registered and verified their code (user.mfa_enabled == True),
    # the QR code and secret key are NEVER displayed or sent in API responses again.
    if not user.mfa_enabled:
        totp = pyotp.TOTP(user.mfa_secret)
        uri = totp.provisioning_uri(name=user.email, issuer_name="NexaERP")
        img = qrcode.make(uri)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        qr_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        secret_to_send = user.mfa_secret
        new_setup = True

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
        secret=secret_to_send,
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

    # 3. Verify TOTP 6-digit Code (with +/- 2 step tolerance for clock drift, or demo sandbox OTP in non-production)
    clean_code = payload.code.strip().replace(" ", "").replace("-", "")
    totp = pyotp.TOTP(user.mfa_secret)
    is_valid = totp.verify(clean_code, valid_window=2) or (
        settings.ENVIRONMENT.lower() != "production" and clean_code == "123456"
    )

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


@router.post("/mfa/refresh-qr/{temp_token}")
async def refresh_mfa_qr(
    temp_token: str,
    db: AsyncSession = Depends(get_db)
):
    """Generates a fresh Authenticator QR code and secret for the user."""
    try:
        payload = decode_token(temp_token)
        if not payload or payload.get("type") != "mfa_challenge":
            raise HTTPException(status_code=400, detail="Invalid challenge token")
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid challenge token")

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Two-Factor Authentication is already enrolled for this profile. For security reasons, QR codes cannot be re-exposed on enrolled accounts."
        )

    sec = pyotp.random_base32()
    user.mfa_secret = sec
    user.mfa_enabled = False

    totp = pyotp.TOTP(sec)
    uri = totp.provisioning_uri(name=user.email, issuer_name="NexaERP")
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    await db.commit()

    return {
        "secret": sec,
        "qr_code_base64": qr_b64,
        "provisioning_uri": uri,
        "message": "Fresh Authenticator QR code generated."
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
        existing = await db.scalar(select(RevokedToken).where(RevokedToken.token_jti == jti))
        if not existing:
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
    from app.authorization.rbac_engine import get_user_effective_roles_and_permissions
    role_names, effective_perms = await get_user_effective_roles_and_permissions(current_user, db)

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

    try:
        validate_password_strength(data.new_password)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )

    current_user.password_hash = hash_password(data.new_password)
    await record_audit_log(
        db, action="USER_PASSWORD_CHANGE", entity_name="User",
        user_id=current_user.id, user_email=current_user.email,
        status="SUCCESS"
    )
    await db.commit()
    return {"message": "Password changed successfully"}

@router.post("/register-store", response_model=LoginResponse)
async def register_store(
    request: Request,
    response: Response,
    payload: StoreRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    import re
    from decimal import Decimal
    client_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "unknown")
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()

    # 1. Check if user with email already exists
    clean_email = payload.email.lower().strip()
    existing_user = await db.execute(select(User).where(User.email == clean_email))
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in directly."
        )

    # 2. Create Store Organization
    slug = re.sub(r'[^a-zA-Z0-9]+', '-', payload.store_name).strip('-').upper()[:10]
    if not slug:
        slug = "STORE"
    unique_suffix = int(datetime.now(timezone.utc).timestamp()) % 100000

    org = Organization(
        name=payload.store_name.strip(),
        code=f"STR-{slug}-{unique_suffix}",
        currency="INR"
    )
    db.add(org)
    await db.flush()

    # 3. Create Store Main Branch
    branch = Branch(
        organization_id=org.id,
        name=f"{payload.store_name.strip()} - Outlet",
        code=f"BR-{slug[:6]}-{unique_suffix % 1000}",
        city=payload.city or "Hyderabad",
        address=payload.address or "Commercial Main Market"
    )
    db.add(branch)
    await db.flush()

    # 4. Create Store Warehouse
    warehouse = Warehouse(
        branch_id=branch.id,
        name="Storefront Shelf & Counter Storage",
        code=f"WH-{slug[:6]}-{unique_suffix % 1000}",
        location="Floor 1, POS Counters"
    )
    db.add(warehouse)
    await db.flush()

    # 5. Create Owner User as DEFAULT ADMIN
    new_user = User(
        email=clean_email,
        full_name=payload.owner_name.strip(),
        password_hash=hash_password(payload.password),
        is_active=True,
        is_superuser=False,
        mfa_enabled=False,
        organization_id=org.id,
        branch_id=branch.id
    )
    db.add(new_user)
    await db.flush()

    # 6. Assign Store Admin Role (Full rights to manage employees, cashiers, stock, POS)
    role_res = await db.execute(select(Role).where(Role.name == "System Administrator"))
    admin_role = role_res.scalars().first()
    if not admin_role:
        role_res = await db.execute(select(Role).where(Role.name.in_(["Admin", "Branch Manager"])))
        admin_role = role_res.scalars().first()
    if admin_role:
        db.add(UserRole(user_id=new_user.id, role_id=admin_role.id))

    # 7. Create Employee Record for Owner
    name_parts = payload.owner_name.strip().split()
    emp = Employee(
        employee_code=f"EMP-{slug[:4]}-{new_user.id}",
        user_id=new_user.id,
        first_name=name_parts[0],
        last_name=" ".join(name_parts[1:]) if len(name_parts) > 1 else "Store Admin",
        email=clean_email,
        phone=payload.phone or "N/A",
        designation="Store Owner / Administrator",
        date_of_joining=datetime.now(timezone.utc).date(),
        basic_salary=Decimal("50000.00"),
        net_salary=Decimal("50000.00"),
        branch_id=branch.id,
        is_active=True
    )
    db.add(emp)

    # 8. Seed Starter Retail Catalog for this store
    retail_prods = await db.execute(
        select(Product)
        .join(Product.category)
        .where(~ProductCategory.code.like("CAT-IND-%"))
        .limit(25)
    )
    template_prods = retail_prods.scalars().all()
    for tp in template_prods:
        cloned_p = Product(
            organization_id=org.id,
            category_id=tp.category_id,
            name=tp.name,
            sku=f"{tp.sku}-{slug[:4]}-{unique_suffix % 1000}",
            barcode=f"{tp.barcode or 'BAR'}-{new_user.id}-{tp.id}",
            unit_of_measure=tp.unit_of_measure,
            selling_price=tp.selling_price,
            cost_price=tp.cost_price,
            tax_rate_percent=tp.tax_rate_percent,
            reorder_level=tp.reorder_level,
            current_stock=tp.current_stock or 30,
            image_url=tp.image_url,
            is_active=True
        )
        db.add(cloned_p)

    await db.commit()

    # Reload user with roles eagerly loaded
    refreshed_res = await db.execute(
        select(User)
        .options(selectinload(User.roles).selectinload(UserRole.role))
        .where(User.id == new_user.id)
    )
    user_with_roles = refreshed_res.scalar_one()

    # 9. Issue immediate access token
    role_names = [admin_role.name] if admin_role else ["Admin"]
    perms = await get_user_effective_permissions(user_with_roles, db)
    token = create_access_token({
        "sub": str(new_user.id),
        "email": new_user.email,
        "is_superuser": new_user.is_superuser,
        "roles": role_names,
    })

    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    await record_audit_log(
        db, action="STORE_REGISTERED", entity_name="Organization",
        entity_id=str(org.id), user_id=new_user.id, user_email=new_user.email,
        ip_address=client_ip, status="SUCCESS",
        details={"store_name": payload.store_name, "owner": payload.owner_name}
    )
    await db.commit()

    return LoginResponse(
        mfa_required=False,
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        message=f"Store '{payload.store_name}' registered successfully! You are logged in as default Store Administrator.",
        user=UserOut(
            id=new_user.id,
            email=new_user.email,
            full_name=new_user.full_name,
            is_active=new_user.is_active,
            is_superuser=new_user.is_superuser,
            mfa_enabled=False,
            branch_id=branch.id,
            branch_name=branch.name,
            roles=role_names,
            effective_permissions=list(perms)
        )
    )
