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
    response = await client.post("/api/auth/login", json={
        "email": settings.BOOTSTRAP_ADMIN_EMAIL,
        "password": settings.BOOTSTRAP_ADMIN_PASSWORD
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == settings.BOOTSTRAP_ADMIN_EMAIL
    assert data["user"]["is_superuser"] is True

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
