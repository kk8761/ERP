import pytest
import uuid
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.database import AsyncSessionLocal
from app.models.auth import User, Role, UserRole
from app.models.security_incident import ScreenshotIncident
from app.models.email_log import OutgoingEmailLog
from app.auth.security import create_access_token, get_password_hash

@pytest.mark.asyncio
async def test_dlp_screenshot_incident_captures_who_image_time_and_notifies_admin():
    async with AsyncSessionLocal() as session:
        # Create unique user & admin
        u_suffix = uuid.uuid4().hex[:6]
        
        # Regular employee
        emp = User(
            email=f"emp_{u_suffix}@nexaerp.internal",
            full_name=f"John Doe {u_suffix}",
            password_hash=get_password_hash("EmpPass123!"),
            is_active=True,
            is_superuser=False,
            organization_id=1
        )
        # Security admin
        admin = User(
            email=f"sec_admin_{u_suffix}@nexaerp.internal",
            full_name=f"Admin Chief {u_suffix}",
            password_hash=get_password_hash("AdminPass123!"),
            is_active=True,
            is_superuser=True,
            organization_id=1
        )
        session.add_all([emp, admin])
        await session.commit()
        await session.refresh(emp)
        await session.refresh(admin)

        emp_token = create_access_token({"sub": str(emp.id), "email": emp.email})
        admin_token = create_access_token({"sub": str(admin.id), "email": admin.email})

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Employee triggers a screenshot (e.g. via PrintScreen key)
        sample_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        now_utc = datetime.now(timezone.utc).isoformat()
        
        response = await client.post(
            "/api/security/screenshot-incident",
            headers={"Authorization": f"Bearer {emp_token}"},
            json={
                "page_url": "/procurement/purchase-orders/PO-2026-9901",
                "action_type": "PRINT_SCREEN_KEY",
                "image_data": sample_b64,
                "screen_resolution": "1920x1080",
                "captured_at": now_utc
            }
        )
        assert response.status_code == 201, response.text
        data = response.json()
        
        # Verify response attributes (WHO, WHAT image, WHAT date and time)
        assert data["user_id"] == emp.id
        assert data["user_name"] == emp.full_name
        assert data["user_email"] == emp.email
        assert data["image_data"] == sample_b64
        assert data["page_url"] == "/procurement/purchase-orders/PO-2026-9901"
        assert data["action_type"] == "PRINT_SCREEN_KEY"
        assert data["is_reviewed"] is False
        assert data["severity"] == "HIGH"
        incident_id = data["id"]

        # 2. Verify Database records & Admin notification email was dispatched
        async with AsyncSessionLocal() as session:
            # Check ScreenshotIncident record
            stmt = select(ScreenshotIncident).where(ScreenshotIncident.id == incident_id)
            res = await session.execute(stmt)
            saved_inc = res.scalar_one_or_none()
            assert saved_inc is not None
            assert saved_inc.user_email == emp.email
            assert saved_inc.user_name == emp.full_name
            assert saved_inc.image_data == sample_b64
            assert saved_inc.captured_at is not None

            # Check that an alert email was sent to Admin
            email_stmt = (
                select(OutgoingEmailLog)
                .where(OutgoingEmailLog.document_type == "DLP_INCIDENT")
                .where(OutgoingEmailLog.document_reference == f"INC-{incident_id}")
            )
            email_res = await session.execute(email_stmt)
            email_logs = email_res.scalars().all()
            assert len(email_logs) >= 1
            sample_log = email_logs[0]
            assert sample_log.status in ["SENT", "SIMULATED"]
            assert any(emp.full_name in log.subject or emp.email in log.body_html for log in email_logs)
            assert any("Captured Screen Evidence" in log.body_html for log in email_logs)

        # 3. Admin lists incidents
        admin_list_resp = await client.get(
            "/api/security/screenshot-incidents",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_list_resp.status_code == 200
        incident_list = admin_list_resp.json()
        assert any(inc["id"] == incident_id for inc in incident_list)

        # 4. Check stats endpoint
        stats_resp = await client.get(
            "/api/security/screenshot-incidents/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert stats_resp.status_code == 200
        stats = stats_resp.json()
        assert stats["total_incidents"] >= 1
        assert stats["unreviewed_count"] >= 1

        # 5. Admin reviews the incident
        review_resp = await client.post(
            f"/api/security/screenshot-incidents/{incident_id}/review",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_reviewed": True}
        )
        assert review_resp.status_code == 200
        reviewed_data = review_resp.json()
        assert reviewed_data["is_reviewed"] is True
