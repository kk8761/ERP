import pytest
import pytest_asyncio
import sys
import os
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from sqlalchemy import text
from app.database import AsyncSessionLocal, engine, Base
from app.config import settings

@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for col, col_type in [
            ("sender_email", "VARCHAR(150)"), 
            ("sender_name", "VARCHAR(150)"),
            ("mfa_enabled", "BOOLEAN DEFAULT 0"),
            ("mfa_secret", "VARCHAR(64)")
        ]:
            try:
                await conn.execute(text(f"ALTER TABLE outgoing_email_logs ADD COLUMN {col} {col_type}"))
            except Exception:
                pass
            try:
                await conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))
            except Exception:
                pass
    yield

@pytest.fixture(autouse=True)
def mock_fast_smtp_during_tests(monkeypatch):
    """Ensure tests run locally without hanging on external SMTP network connections."""
    monkeypatch.setattr(settings, "SMTP_HOST", None)

@pytest_asyncio.fixture(scope="function")
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest_asyncio.fixture(scope="function")
async def admin_auth_token(client: AsyncClient):
    # Log in as bootstrapped system administrator
    res = await client.post("/api/auth/login", json={
        "email": settings.BOOTSTRAP_ADMIN_EMAIL,
        "password": settings.BOOTSTRAP_ADMIN_PASSWORD
    })
    assert res.status_code == 200
    data = res.json()
    if data.get("mfa_required"):
        import pyotp
        from sqlalchemy import select
        from app.models.auth import User
        secret = data.get("secret")
        if not secret:
            async with AsyncSessionLocal() as session:
                u_res = await session.execute(select(User).where(User.email == settings.BOOTSTRAP_ADMIN_EMAIL))
                user = u_res.scalar_one_or_none()
                secret = user.mfa_secret if user else None
        totp = pyotp.TOTP(secret)
        v_res = await client.post("/api/auth/verify-2fa", json={
            "temp_token": data["temp_token"],
            "code": totp.now()
        })
        assert v_res.status_code == 200
        return v_res.json()["access_token"]
    return data["access_token"]

@pytest_asyncio.fixture(scope="function")
async def cashier_auth_token(client: AsyncClient):
    res = await client.post("/api/auth/login", json={
        "email": "cashier@nexaerp.internal",
        "password": "Cashier@12345"
    })
    assert res.status_code == 200
    data = res.json()
    if data.get("mfa_required"):
        import pyotp
        from sqlalchemy import select
        from app.models.auth import User
        secret = data.get("secret")
        if not secret:
            async with AsyncSessionLocal() as session:
                u_res = await session.execute(select(User).where(User.email == "cashier@nexaerp.internal"))
                user = u_res.scalar_one_or_none()
                secret = user.mfa_secret if user else None
        totp = pyotp.TOTP(secret)
        v_res = await client.post("/api/auth/verify-2fa", json={
            "temp_token": data["temp_token"],
            "code": totp.now()
        })
        assert v_res.status_code == 200
        return v_res.json()["access_token"]
    return data["access_token"]
