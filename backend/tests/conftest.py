import pytest
import pytest_asyncio
import sys
import os
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database import AsyncSessionLocal, engine, Base
from app.config import settings

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
    return data["access_token"]

@pytest_asyncio.fixture(scope="function")
async def cashier_auth_token(client: AsyncClient):
    res = await client.post("/api/auth/login", json={
        "email": "cashier@nexaerp.internal",
        "password": "Cashier@12345"
    })
    assert res.status_code == 200
    data = res.json()
    return data["access_token"]
