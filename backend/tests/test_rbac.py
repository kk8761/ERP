import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_admin_has_full_rbac_access(client: AsyncClient, admin_auth_token: str):
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # Admin can inspect audit logs
    res = await client.get("/api/admin/audit-logs", headers=headers)
    assert res.status_code == 200

    # Admin can view dashboard metrics
    res = await client.get("/api/dashboard/metrics", headers=headers)
    assert res.status_code == 200

    # Admin can view payroll
    res = await client.get("/api/hr/payroll", headers=headers)
    assert res.status_code == 200

@pytest.mark.asyncio
async def test_cashier_denied_sensitive_operations(client: AsyncClient, admin_auth_token: str):
    import uuid
    admin_headers = {"Authorization": f"Bearer {admin_auth_token}"}
    clean_email = f"clean_cashier_{uuid.uuid4().hex[:6]}@nexaerp.internal"

    # Fetch role id for Cashier
    roles_res = await client.get("/api/admin/roles", headers=admin_headers)
    roles = roles_res.json()
    cashier_role = next(r for r in roles if "Cashier" in r["name"])

    # Create new clean cashier user
    await client.post(
        "/api/admin/users",
        headers=admin_headers,
        json={
            "email": clean_email,
            "full_name": "Clean Test Cashier",
            "password": "CashierPassword123!",
            "role_ids": [cashier_role["id"]]
        }
    )

    login_res = await client.post("/api/auth/login", json={
        "email": clean_email,
        "password": "CashierPassword123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Cashier cannot view audit logs (Missing audit_logs.view permission) -> 403 Forbidden
    res = await client.get("/api/admin/audit-logs", headers=headers)
    assert res.status_code == 403
    assert "Missing required permission" in res.json()["detail"]

    # Cashier cannot view payroll (Missing payroll.view permission) -> 403 Forbidden
    res = await client.get("/api/hr/payroll", headers=headers)
    assert res.status_code == 403

    # Cashier cannot approve purchase orders -> 403 Forbidden
    res = await client.post("/api/procurement/purchase-orders/1/approve", headers=headers)
    assert res.status_code == 403

    # But Cashier CAN view products and dashboard
    res = await client.get("/api/inventory/products", headers=headers)
    assert res.status_code == 200

    res = await client.get("/api/dashboard/metrics", headers=headers)
    assert res.status_code == 200
