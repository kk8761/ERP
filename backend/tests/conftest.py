import pytest
import pytest_asyncio
import sys
import os
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from sqlalchemy import text, select
from app.database import AsyncSessionLocal, engine, Base
from app.config import settings

@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db():
    docs_dir = os.path.join(os.path.dirname(__file__), "..", "data", "mongo_docs")
    if os.path.exists(docs_dir):
        draft_file = os.path.join(docs_dir, "module_drafts.json")
        if os.path.exists(draft_file):
            try:
                os.remove(draft_file)
            except Exception:
                pass

    try:
        from app.services.document_store import document_store
        is_conn = await document_store._try_connect_mongo()
        if is_conn and document_store._db is not None:
            await document_store._db["module_drafts"].delete_many({})
    except Exception:
        pass

    try:
        from app.api.sync import _MODULE_DRAFT_CACHE
        _MODULE_DRAFT_CACHE.clear()
    except Exception:
        pass

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        for tbl in ["users", "products", "suppliers", "customers", "accounts", "journal_entries"]:
            try:
                await conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN organization_id INTEGER"))
            except Exception:
                pass
            try:
                await conn.execute(text(f"UPDATE {tbl} SET organization_id = 1 WHERE organization_id IS NULL"))
            except Exception:
                pass
        try:
            await conn.execute(text("ALTER TABLE sync_idempotency_records ADD COLUMN payload_hash VARCHAR(64)"))
        except Exception:
            pass


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
        for col, col_type in [
            ("prev_hash", "VARCHAR(64)"),
            ("record_hash", "VARCHAR(64)")
        ]:
            try:
                await conn.execute(text(f"ALTER TABLE audit_logs ADD COLUMN {col} {col_type}"))
            except Exception:
                pass
        for col, col_type in [
            ("framework_code", "VARCHAR(50)"),
            ("scope", "TEXT"),
            ("compliance_rate", "FLOAT"),
            ("next_audit_date", "VARCHAR(50)")
        ]:
            try:
                await conn.execute(text(f"ALTER TABLE compliance_frameworks ADD COLUMN {col} {col_type}"))
            except Exception:
                pass
        for col, col_type in [
            ("expected_delivery_date", "TIMESTAMP"),
            ("actual_delivery_date", "TIMESTAMP"),
            ("inspection_status", "VARCHAR(30) DEFAULT 'PENDING'"),
            ("defect_count", "INTEGER DEFAULT 0"),
            ("invoiced_amount", "NUMERIC(12, 2)"),
            ("shipping_cost", "NUMERIC(12, 2) DEFAULT 0"),
            ("tax_duties_cost", "NUMERIC(12, 2) DEFAULT 0")
        ]:
            try:
                await conn.execute(text(f"ALTER TABLE purchase_orders ADD COLUMN {col} {col_type}"))
            except Exception:
                pass
        for col, col_type in [
            ("legal_name", "VARCHAR(200)"),
            ("settings_json", "TEXT")
        ]:
            try:
                await conn.execute(text(f"ALTER TABLE organizations ADD COLUMN {col} {col_type}"))
            except Exception:
                pass
        for col, col_type in [
            ("country", "VARCHAR(50) DEFAULT 'IN'"),
            ("currency", "VARCHAR(10) DEFAULT 'INR'")
        ]:
            try:
                await conn.execute(text(f"ALTER TABLE branches ADD COLUMN {col} {col_type}"))
            except Exception:
                pass
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE intrusion_events ADD COLUMN is_reviewed BOOLEAN DEFAULT 0"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE employees ADD COLUMN reports_to_id INTEGER"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE employees ADD COLUMN hierarchy_role VARCHAR(30) DEFAULT 'MEMBER'"))
        except Exception:
            pass

    try:
        from app.seed_data import seed
        await seed()
    except Exception:
        pass

    async with AsyncSessionLocal() as session:
        from app.models.auth import User
        from app.auth.security import hash_password
        u_res = await session.execute(select(User).where(User.email == settings.BOOTSTRAP_ADMIN_EMAIL))
        admin = u_res.scalar_one_or_none()
        if admin:
            admin.password_hash = hash_password(settings.BOOTSTRAP_ADMIN_PASSWORD)
            admin.is_active = True
            admin.is_superuser = True
            admin.failed_login_attempts = 0
            admin.locked_until = None
        else:
            admin = User(
                email=settings.BOOTSTRAP_ADMIN_EMAIL,
                full_name=settings.BOOTSTRAP_ADMIN_NAME,
                password_hash=hash_password(settings.BOOTSTRAP_ADMIN_PASSWORD),
                is_active=True,
                is_superuser=True,
                organization_id=1
            )
            session.add(admin)

        c_res = await session.execute(select(User).where(User.email == "cashier@nexaerp.internal"))
        cashier = c_res.scalar_one_or_none()
        if cashier:
            cashier.password_hash = hash_password("Cashier@12345")
            cashier.is_active = True
            cashier.failed_login_attempts = 0
            cashier.locked_until = None
        else:
            cashier = User(
                email="cashier@nexaerp.internal",
                full_name="Sunil Reddy",
                password_hash=hash_password("Cashier@12345"),
                is_active=True,
                is_superuser=False,
                organization_id=1
            )
            session.add(cashier)

        await session.commit()

    yield

@pytest.fixture(autouse=True)
def mock_fast_smtp_during_tests(monkeypatch):
    """Ensure tests run locally without hanging on external SMTP network connections."""
    monkeypatch.setattr(settings, "SMTP_HOST", None)

@pytest.fixture(autouse=True)
def reset_waf_quarantine():
    from app.services.intrusion_defense_service import reset_quarantine_state
    from app.api.auth import reset_mfa_tracking
    try:
        from app.services.document_store import document_store
        document_store._mongo_client = None
        document_store._db = None
        document_store._is_mongo_connected = False
    except Exception:
        pass
    reset_quarantine_state()
    reset_mfa_tracking()
    yield
    reset_quarantine_state()
    reset_mfa_tracking()
    try:
        from app.services.document_store import document_store
        document_store._mongo_client = None
        document_store._db = None
        document_store._is_mongo_connected = False
    except Exception:
        pass

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
