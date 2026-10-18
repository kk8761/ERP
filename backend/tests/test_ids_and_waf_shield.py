import pytest
import uuid
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import AsyncSessionLocal
from app.models.auth import User
from app.auth.security import create_access_token, get_password_hash
from app.services.intrusion_defense_service import (
    unquarantine_ip_memory,
    is_ip_currently_quarantined
)
from app.security.ssrf_shield import is_safe_external_url, sanitize_external_request_url

@pytest.mark.asyncio
async def test_waf_blocks_sql_injection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # SQL Injection in query string
        res = await client.get(
            "/api/security/screenshot-incidents?search=' OR 1=1 --",
            headers={"x-forwarded-for": "198.51.100.11"}
        )
        assert res.status_code in (400, 403)
        assert res.headers.get("X-NexaERP-IDS") == "TRIGGERED"
        assert res.headers.get("X-NexaERP-Attack-Vector") == "SQL_INJECTION"

@pytest.mark.asyncio
async def test_waf_blocks_command_injection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # OS Command Injection in query
        res = await client.get(
            "/api/security/screenshot-incidents?filter=test; cat /etc/passwd",
            headers={"x-forwarded-for": "198.51.100.12"}
        )
        assert res.status_code in (400, 403)
        assert res.headers.get("X-NexaERP-IDS") == "TRIGGERED"
        assert res.headers.get("X-NexaERP-Attack-Vector") in ("COMMAND_INJECTION", "PATH_TRAVERSAL")

@pytest.mark.asyncio
async def test_waf_blocks_path_traversal():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Path Traversal in Query parameter
        res_query = await client.get(
            "/api/security/screenshot-incidents?filepath=../../etc/passwd",
            headers={"x-forwarded-for": "198.51.100.13"}
        )
        assert res_query.status_code in (400, 403)
        assert res_query.headers.get("X-NexaERP-IDS") == "TRIGGERED"
        assert res_query.headers.get("X-NexaERP-Attack-Vector") == "PATH_TRAVERSAL"

        # Direct root probe for sensitive OS files
        res_direct = await client.get(
            "/etc/passwd",
            headers={"x-forwarded-for": "198.51.100.13"}
        )
        assert res_direct.status_code in (400, 403)
        assert res_direct.headers.get("X-NexaERP-IDS") == "TRIGGERED"

@pytest.mark.asyncio
async def test_waf_blocks_xss_probe():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # XSS Script injection in query
        res = await client.get(
            "/api/security/screenshot-incidents?q=<script>alert('xss')</script>",
            headers={"x-forwarded-for": "198.51.100.14"}
        )
        assert res.status_code in (400, 403)
        assert res.headers.get("X-NexaERP-IDS") == "TRIGGERED"
        assert res.headers.get("X-NexaERP-Attack-Vector") == "XSS_INJECTION"

@pytest.mark.asyncio
async def test_waf_blocks_automated_scanners():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Automated exploit scanner User-Agent
        res = await client.get(
            "/api/security/screenshot-incidents",
            headers={
                "x-forwarded-for": "198.51.100.15",
                "user-agent": "sqlmap/1.7#stable (http://sqlmap.org)"
            }
        )
        assert res.status_code in (400, 403)
        assert res.headers.get("X-NexaERP-IDS") == "TRIGGERED"
        assert res.headers.get("X-NexaERP-Attack-Vector") == "AUTOMATED_SCANNER"

@pytest.mark.asyncio
async def test_dynamic_ip_quarantine_and_admin_unblock():
    target_ip = "198.51.100.99"
    # Ensure starting clean
    unquarantine_ip_memory(target_ip)
    assert not is_ip_currently_quarantined(target_ip)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Attack 1: Command Injection (Threat score = 80)
        res1 = await client.get(
            "/api/security/screenshot-incidents?test=; whoami",
            headers={"x-forwarded-for": target_ip}
        )
        assert res1.status_code == 400

        # Attack 2: SQL Injection (Threat score = 70, Cumulative = 150 >= 100 threshold)
        res2 = await client.get(
            "/api/security/screenshot-incidents?search=union select 1",
            headers={"x-forwarded-for": target_ip}
        )
        assert res2.status_code == 403
        assert res2.headers.get("X-NexaERP-Quarantine") == "ACTIVE"
        assert is_ip_currently_quarantined(target_ip)

        # Subsequent clean request from quarantined IP is immediately denied
        clean_res = await client.get(
            "/api/health", # Note: health check endpoint does not block, test protected API
            headers={"x-forwarded-for": target_ip}
        )
        # Check an API endpoint
        api_res = await client.get(
            "/api/security/screenshot-incidents",
            headers={"x-forwarded-for": target_ip}
        )
        assert api_res.status_code == 403
        assert api_res.headers.get("X-NexaERP-Quarantine") == "ACTIVE"

        # Now authenticate as superuser and unblock the IP
        async with AsyncSessionLocal() as session:
            admin_suffix = uuid.uuid4().hex[:6]
            admin = User(
                email=f"ids_admin_{admin_suffix}@nexaerp.internal",
                full_name=f"IDS Administrator {admin_suffix}",
                password_hash=get_password_hash("AdminPass123!"),
                is_active=True,
                is_superuser=True
            )
            session.add(admin)
            await session.commit()
            await session.refresh(admin)
            admin_token = create_access_token({"sub": str(admin.id), "email": admin.email})

        unblock_res = await client.post(
            f"/api/security/ids/quarantine/{target_ip}/unblock",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert unblock_res.status_code == 200
        assert not is_ip_currently_quarantined(target_ip)

@pytest.mark.asyncio
async def test_ssrf_shield_validations():
    # Loopback / localhost
    assert is_safe_external_url("http://127.0.0.1:8000/secret")[0] is False
    assert is_safe_external_url("http://localhost:5000")[0] is False
    
    # AWS / GCP / Azure Cloud Metadata
    assert is_safe_external_url("http://169.254.169.254/latest/meta-data/")[0] is False
    assert is_safe_external_url("http://metadata.google.internal/computeMetadata/v1/")[0] is False
    assert is_safe_external_url("http://100.100.100.200/latest/meta-data")[0] is False

    # Private RFC 1918 networks
    assert is_safe_external_url("http://10.0.0.5/internal-api")[0] is False
    assert is_safe_external_url("http://192.168.1.100/admin")[0] is False
    assert is_safe_external_url("http://172.16.0.1/dashboard")[0] is False

    # Invalid schemes
    assert is_safe_external_url("file:///etc/passwd")[0] is False
    assert is_safe_external_url("gopher://127.0.0.1:6379/")[0] is False

    # URL sanitizer raises ValueError on hostile URLs
    with pytest.raises(ValueError):
        sanitize_external_request_url("http://169.254.169.254/latest/user-data")

    with pytest.raises(ValueError):
        sanitize_external_request_url("file:///proc/self/environ")

@pytest.mark.asyncio
async def test_csrf_origin_verification():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Untrusted origin on state-changing POST
        res_blocked = await client.post(
            "/api/security/screenshot-incident",
            headers={
                "Origin": "http://evil-hacker-site.org",
                "x-forwarded-for": "198.51.100.88"
            },
            json={}
        )
        assert res_blocked.status_code == 403
        assert "CSRF" in res_blocked.json()["detail"]

        # Trusted origin (localhost / test / configured CORS) is allowed past CSRF gate
        res_allowed = await client.post(
            "/api/security/screenshot-incident",
            headers={
                "Origin": "http://localhost:5173",
                "x-forwarded-for": "198.51.100.89"
            },
            json={}
        )
        # Fails with 401 or 422 (auth or validation), NOT 403 CSRF rejected!
        assert res_allowed.status_code in (401, 422)

@pytest.mark.asyncio
async def test_ids_metrics_rbac_protection():
    async with AsyncSessionLocal() as session:
        u_suffix = uuid.uuid4().hex[:6]
        regular_user = User(
            email=f"regular_{u_suffix}@nexaerp.internal",
            full_name=f"Regular User {u_suffix}",
            password_hash=get_password_hash("Pass123!"),
            is_active=True,
            is_superuser=False
        )
        admin_user = User(
            email=f"admin_{u_suffix}@nexaerp.internal",
            full_name=f"Admin User {u_suffix}",
            password_hash=get_password_hash("AdminPass123!"),
            is_active=True,
            is_superuser=True
        )
        session.add_all([regular_user, admin_user])
        await session.commit()
        await session.refresh(regular_user)
        await session.refresh(admin_user)

        user_token = create_access_token({"sub": str(regular_user.id), "email": regular_user.email})
        admin_token = create_access_token({"sub": str(admin_user.id), "email": admin_user.email})

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Non-admin denied
        res_denied = await client.get(
            "/api/security/ids/metrics",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert res_denied.status_code == 403

        # Admin allowed and receives telemetry payload
        res_allowed = await client.get(
            "/api/security/ids/metrics",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_allowed.status_code == 200
        data = res_allowed.json()
        assert data["ids_status"] == "ARMED_AND_DEFENDING"
        assert "supported_vectors" in data
        assert len(data["supported_vectors"]) >= 7
