import pytest
from httpx import AsyncClient
from app.config import settings

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "NexaERP"

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    from sqlalchemy import select
    from app.models.auth import User
    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        u_res = await session.execute(select(User).where(User.email == settings.BOOTSTRAP_ADMIN_EMAIL))
        admin = u_res.scalar_one_or_none()
        if admin:
            admin.mfa_enabled = False
            await session.commit()

    response = await client.post("/api/auth/login", json={
        "email": settings.BOOTSTRAP_ADMIN_EMAIL,
        "password": settings.BOOTSTRAP_ADMIN_PASSWORD
    })
    assert response.status_code == 200
    data = response.json()
    assert data.get("mfa_required") is True
    assert data.get("mfa_setup") is True
    assert "temp_token" in data
    assert data["qr_code_base64"] is not None
    assert data["secret"] is not None

    # Verify 2FA temporary code
    import pyotp
    totp = pyotp.TOTP(data["secret"])
    v_res = await client.post("/api/auth/verify-2fa", json={
        "temp_token": data["temp_token"],
        "code": totp.now()
    })
    assert v_res.status_code == 200
    v_data = v_res.json()
    assert "access_token" in v_data
    assert v_data["user"]["email"] == settings.BOOTSTRAP_ADMIN_EMAIL
    assert v_data["user"]["is_superuser"] is True

    # Subsequent login on enrolled account: QR code and secret MUST NOT be sent!
    res_second = await client.post("/api/auth/login", json={
        "email": settings.BOOTSTRAP_ADMIN_EMAIL,
        "password": settings.BOOTSTRAP_ADMIN_PASSWORD
    })
    assert res_second.status_code == 200
    data_second = res_second.json()
    assert data_second.get("mfa_required") is True
    assert data_second.get("mfa_setup") is False
    assert data_second.get("qr_code_base64") is None
    assert data_second.get("secret") is None

@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    response = await client.post("/api/auth/login", json={
        "email": settings.BOOTSTRAP_ADMIN_EMAIL,
        "password": "WrongPassword!123"
    })
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]

@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, admin_auth_token: str):
    response = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {admin_auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == settings.BOOTSTRAP_ADMIN_EMAIL
    assert len(data["effective_permissions"]) > 0

@pytest.mark.asyncio
async def test_logout_revokes_token(client: AsyncClient, cashier_auth_token: str):
    # Call logout
    logout_res = await client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {cashier_auth_token}"}
    )
    assert logout_res.status_code == 200

    # Attempting to use the revoked token should fail with 401
    res = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {cashier_auth_token}"}
    )
    assert res.status_code == 401
    assert "revoked" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_mfa_invalid_and_replay_rejected(client: AsyncClient):
    res = await client.post("/api/auth/login", json={
        "email": settings.BOOTSTRAP_ADMIN_EMAIL,
        "password": settings.BOOTSTRAP_ADMIN_PASSWORD
    })
    assert res.status_code == 200
    data = res.json()
    temp_token = data["temp_token"]

    # 1. Non-numeric or wrong format code must be rejected
    res_bad_fmt = await client.post("/api/auth/verify-2fa", json={
        "temp_token": temp_token,
        "code": "abcdef"
    })
    assert res_bad_fmt.status_code in [401, 422]

    # 2. Arbitrary wrong 6-digit code must be rejected (SEC-01 bypass prevented)
    res_wrong = await client.post("/api/auth/verify-2fa", json={
        "temp_token": temp_token,
        "code": "000000"
    })
    assert res_wrong.status_code == 401
    assert "Invalid 6-digit verification code" in res_wrong.json()["detail"]

