import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.config import settings
from app.database import AsyncSessionLocal
from app.models.auth import User
from app.models.security_incident import IntrusionEvent
from app.models.email_log import OutgoingEmailLog
from app.models.audit import AuditLog
from app.services.intrusion_defense_service import unquarantine_ip_memory

@pytest.mark.asyncio
async def test_sqli_in_login_email_notifies_administrator(client: AsyncClient):
    """
    Verifies that whenever a hostile party attempts SQL injection in the login email field:
    1. The IDS intercepts the attack and returns a security alert.
    2. The System Administrator receives a formal security alert email.
    3. An IntrusionEvent record is persisted into the database.
    4. An AuditLog entry is recorded for compliance.
    """
    import uuid
    test_run_id = uuid.uuid4().hex[:6]
    attacker_ip = f"198.51.100.{int(test_run_id[:2], 16) % 200 + 10}"
    unquarantine_ip_memory(attacker_ip)

    sqli_payload = "' OR 1=1 --"
    res = await client.post(
        "/api/auth/login",
        json={
            "email": sqli_payload,
            "password": "RandomPassword123!"
        },
        headers={"x-forwarded-for": attacker_ip}
    )

    # 1. Verification of HTTP response & IDS headers
    assert res.status_code in (400, 403)
    assert res.headers.get("X-NexaERP-IDS") == "TRIGGERED"
    assert res.headers.get("X-NexaERP-Attack-Vector") == "SQL_INJECTION"
    assert res.headers.get("X-NexaERP-Admin-Alert") == "DISPATCHED"
    data = res.json()
    assert "System Administrator has been notified" in data["detail"]

    # 2. Verification of Database Persistence (IntrusionEvent & Email Dispatch)
    async with AsyncSessionLocal() as session:
        # Check IntrusionEvent
        event_stmt = select(IntrusionEvent).where(
            IntrusionEvent.client_ip == attacker_ip,
            IntrusionEvent.attack_type == "SQL_INJECTION"
        ).order_by(IntrusionEvent.id.desc())
        event_res = await session.execute(event_stmt)
        event = event_res.scalars().first()
        assert event is not None, "IntrusionEvent was not recorded in DB"
        assert event.request_path == "/api/auth/login"
        assert sqli_payload in event.payload_sample or "1=1" in event.payload_sample
        assert event.action_taken == "BLOCKED_AND_ADMIN_NOTIFIED"

        # Check OutgoingEmailLog (Notification sent to System Administrator)
        email_stmt = select(OutgoingEmailLog).where(
            OutgoingEmailLog.document_type == "SECURITY_ALERT",
            OutgoingEmailLog.document_reference == "SQLI-AUTH-ATTEMPT"
        ).order_by(OutgoingEmailLog.id.desc())
        email_res = await session.execute(email_stmt)
        dispatched_email = email_res.scalars().first()
        assert dispatched_email is not None, "Administrator notification email was not logged in DB"
        assert "SQL Injection Attempt Detected During Login" in dispatched_email.subject
        assert attacker_ip in dispatched_email.subject
        assert dispatched_email.status in ("SENT", "PENDING", "SIMULATED")

        # Check AuditLog
        audit_stmt = select(AuditLog).where(
            AuditLog.action == "AUTH_SQL_INJECTION_BLOCKED",
            AuditLog.ip_address == attacker_ip
        ).order_by(AuditLog.id.desc())
        audit_res = await session.execute(audit_stmt)
        audit = audit_res.scalars().first()
        assert audit is not None, "AuditLog entry was not recorded"
        assert audit.status == "BLOCKED"

@pytest.mark.asyncio
async def test_sqli_in_login_password_notifies_administrator(client: AsyncClient):
    """
    Verifies that SQL injection attempts in the password field also notify the administrator.
    """
    attacker_ip = "198.51.100.78"
    unquarantine_ip_memory(attacker_ip)

    res = await client.post(
        "/api/auth/login",
        json={
            "email": "legituser@company.com",
            "password": "' OR '1'='1"
        },
        headers={"x-forwarded-for": attacker_ip}
    )

    assert res.status_code in (400, 403)
    assert res.headers.get("X-NexaERP-IDS") == "TRIGGERED"
    assert res.headers.get("X-NexaERP-Attack-Vector") == "SQL_INJECTION"
    assert res.headers.get("X-NexaERP-Admin-Alert") == "DISPATCHED"

@pytest.mark.asyncio
async def test_admin_receives_sqli_alerts_in_security_notifications(client: AsyncClient, admin_auth_token: str):
    """
    Verifies that logged-in administrators can query security notifications and see
    the intercepted SQL injection attempt in their TopNav notification center.
    """
    res = await client.get(
        "/api/security/security-notifications",
        headers={"Authorization": f"Bearer {admin_auth_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "notifications" in data
    assert data["unreviewed_count"] >= 1

    sqli_notifs = [n for n in data["notifications"] if n.get("attack_type") == "SQL_INJECTION"]
    assert len(sqli_notifs) >= 1
    sample = sqli_notifs[0]
    assert sample["category"] == "IDS_INTRUSION"
    assert sample["severity"] == "CRITICAL"
    assert sample["target_endpoint"] == "/api/auth/login"
    assert "SQL Injection" in sample["title"]
