import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_jit_elevation_lifecycle_and_no_self_approval(
    client: AsyncClient,
    admin_auth_token: str
):
    import uuid
    admin_headers = {"Authorization": f"Bearer {admin_auth_token}"}
    elev_email = f"elev_{uuid.uuid4().hex[:6]}@nexaerp.internal"

    # Fetch role id for Cashier
    roles_res = await client.get("/api/admin/roles", headers=admin_headers)
    roles = roles_res.json()
    cashier_role = next(r for r in roles if "Cashier" in r["name"])

    # Create new clean user with Cashier role (which has access_requests.request)
    await client.post(
        "/api/admin/users",
        headers=admin_headers,
        json={
            "email": elev_email,
            "full_name": "Elevation Candidate",
            "password": "Password12345!",
            "role_ids": [cashier_role["id"]]
        }
    )

    login_res = await client.post("/api/auth/login", json={
        "email": elev_email,
        "password": "Password12345!"
    })
    data = login_res.json()
    if data.get("mfa_required"):
        import pyotp
        totp = pyotp.TOTP(data["secret"])
        v_res = await client.post("/api/auth/verify-2fa", json={
            "temp_token": data["temp_token"],
            "code": totp.now()
        })
        candidate_token = v_res.json()["access_token"]
    else:
        candidate_token = data["access_token"]
    candidate_headers = {"Authorization": f"Bearer {candidate_token}"}

    # 1. Before elevation, candidate is forbidden from inspecting audit logs
    pre_res = await client.get("/api/admin/audit-logs", headers=candidate_headers)
    assert pre_res.status_code == 403

    # 2. Candidate requests temporary elevation for "audit_logs.view"
    req_res = await client.post(
        "/api/elevation/requests",
        headers=candidate_headers,
        json={
            "requested_permission_code": "audit_logs.view",
            "reason": "Quarterly compliance review audit requested by management",
            "duration_minutes": 60
        }
    )
    assert req_res.status_code == 201
    request_data = req_res.json()
    request_id = request_data["id"]
    assert request_data["status"] == "PENDING"

    # 3. Candidate attempts to approve their own request -> 403 Forbidden (Self-approval prevented!)
    self_approve_res = await client.post(
        f"/api/elevation/requests/{request_id}/review",
        headers=candidate_headers,
        json={"decision": "APPROVED", "approval_note": "Self approving"}
    )
    assert self_approve_res.status_code == 403

    # 4. Authorized Administrator reviews and approves the request
    approve_res = await client.post(
        f"/api/elevation/requests/{request_id}/review",
        headers=admin_headers,
        json={"decision": "APPROVED", "approval_note": "Approved for audit compliance session"}
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "APPROVED"

    # 5. Now candidate can successfully access audit logs dynamically via JIT elevation!
    post_res = await client.get("/api/admin/audit-logs", headers=candidate_headers)
    assert post_res.status_code == 200
    assert isinstance(post_res.json(), list)

@pytest.mark.asyncio
async def test_admin_cannot_self_approve_elevation(
    client: AsyncClient,
    admin_auth_token: str
):
    admin_headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # Admin submits an elevation request
    req_res = await client.post(
        "/api/elevation/requests",
        headers=admin_headers,
        json={
            "requested_permission_code": "finance.post",
            "reason": "Emergency financial year-end reconciliation",
            "duration_minutes": 30
        }
    )
    assert req_res.status_code == 201
    req_id = req_res.json()["id"]

    # Admin attempts to self-approve the elevation request
    self_res = await client.post(
        f"/api/elevation/requests/{req_id}/review",
        headers=admin_headers,
        json={"decision": "APPROVED", "approval_note": "Approving myself"}
    )
    assert self_res.status_code == 403
    assert "Self-approval of elevated access requests is strictly prohibited" in self_res.json()["detail"]
