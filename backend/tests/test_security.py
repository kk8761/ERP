import pytest
from httpx import AsyncClient
from app.config import settings

@pytest.mark.asyncio
async def test_security_headers_present(client: AsyncClient):
    res = await client.get("/api/health")
    assert res.status_code == 200
    headers = res.headers

    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "DENY"
    assert "Content-Security-Policy" in headers or "content-security-policy" in headers
    assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"

@pytest.mark.asyncio
async def test_sql_injection_defense(client: AsyncClient, admin_auth_token: str):
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    # Injection payload in search parameter
    sqli_payload = "' OR 1=1 --"
    res = await client.get("/api/inventory/products", headers=headers, params={"search": sqli_payload})
    # The WAF or database defense intercepts the injection safely without SQL crash
    assert res.status_code in (200, 400, 403)
    if res.status_code == 200:
        assert isinstance(res.json(), list)

@pytest.mark.asyncio
async def test_account_lockout_on_consecutive_failed_logins(client: AsyncClient, admin_auth_token: str):
    import uuid
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    test_user_email = f"lockout_{uuid.uuid4().hex[:6]}@nexaerp.internal"

    # Create dedicated user
    create_res = await client.post(
        "/api/admin/users",
        headers=headers,
        json={
            "email": test_user_email,
            "full_name": "Lockout Test User",
            "password": "Password12345!"
        }
    )
    assert create_res.status_code == 201

    # Attempt consecutive failed logins
    for i in range(settings.RATE_LIMIT_LOGIN_ATTEMPTS + 1):
        res = await client.post("/api/auth/login", json={
            "email": test_user_email,
            "password": "WrongPasswordAttempt!"
        })
        assert res.status_code in [401, 403]

    # Verify subsequent attempts are locked out with 403
    lock_res = await client.post("/api/auth/login", json={
        "email": test_user_email,
        "password": "Password12345!"
    })
    assert lock_res.status_code == 403
    assert "locked" in lock_res.json()["detail"].lower()
