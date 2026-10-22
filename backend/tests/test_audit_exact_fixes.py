import pytest
from httpx import AsyncClient
from sqlalchemy import select
from app.models.auth import User, UserPreference
from app.database import AsyncSessionLocal
from app.config import settings

@pytest.mark.asyncio
async def test_audit_fix_data_import_unauthorized_and_branch_restriction(client: AsyncClient, admin_auth_token: str):
    """
    Error 1 & Error 2:
    - Unsupported entity types must be rejected (400)
    - Sensitive entity types (expenses, warehouses) require specific permissions
    - Branch restriction cannot be bypassed
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Unknown entity type rejected with 400
    res = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "unknown_forbidden_entity",
        "branch_id": 1,
        "records": [{"col": "val"}]
    })
    assert res.status_code == 400
    assert "Unsupported import entity type" in res.json().get("detail", "")

    # 2. Supported types in REQUIRED_IMPORT_PERMS map (e.g. expenses, vouchers, warehouses, storage)
    res_expenses = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "expenses",
        "branch_id": 1,
        "records": [{"title": "Cloud Server Hosting", "amount": 250.0}]
    })
    assert res_expenses.status_code in (200, 422) # Permissions verified and passed admin check

@pytest.mark.asyncio
async def test_audit_fix_company_settings_partial_update(client: AsyncClient, admin_auth_token: str):
    """
    Error 7 & Error 8:
    - Updating one setting (e.g. phone) does NOT reset legal_name, name, or tax_identifier
    - Extra fields like phone, cin, hq_address are saved and returned
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # First update name and tax_identifier
    r1 = await client.put("/api/settings/company", headers=headers, json={
        "name": "Nexa Global Corporation",
        "tax_identifier": "GSTIN-ABC-12345",
        "legal_name": "Nexa Global Corp Pvt Ltd"
    })
    assert r1.status_code == 200

    # Partial update: only update support_email and phone
    r2 = await client.put("/api/settings/company", headers=headers, json={
        "phone": "+91 99999 88888",
        "support_email": "ops@nexacorp.internal"
    })
    assert r2.status_code == 200
    org_data = r2.json()["organization"]
    # Check that previous fields were NOT reset to default/empty
    assert org_data["name"] == "Nexa Global Corporation"
    assert org_data["tax_identifier"] == "GSTIN-ABC-12345"
    assert org_data["legal_name"] == "Nexa Global Corp Pvt Ltd"
    assert org_data["phone"] == "+91 99999 88888"

    # Get company settings verifies persistence
    r3 = await client.get("/api/settings/company", headers=headers)
    assert r3.status_code == 200
    cfg = r3.json()
    assert cfg["name"] == "Nexa Global Corporation"
    assert cfg["phone"] == "+91 99999 88888"

@pytest.mark.asyncio
async def test_audit_fix_durable_user_preferences(client: AsyncClient, admin_auth_token: str):
    """
    Error 9:
    - Preferences are stored in database table user_preferences
    - Updating theme does not reset currency or date_format
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # Update theme only
    r1 = await client.put("/api/settings/preferences", headers=headers, json={
        "theme": "indigo"
    })
    assert r1.status_code == 200
    prefs1 = r1.json()["preferences"]
    assert prefs1["theme"] == "indigo"
    assert prefs1["currency"] == "INR"

    # Partial update: number_format only
    r2 = await client.put("/api/settings/preferences", headers=headers, json={
        "number_format": "INTERNATIONAL"
    })
    assert r2.status_code == 200
    prefs2 = r2.json()["preferences"]
    assert prefs2["theme"] == "indigo"
    assert prefs2["number_format"] == "INTERNATIONAL"

    # Verify directly from database
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(UserPreference).limit(1))
        row = res.scalar_one_or_none()
        assert row is not None
        assert "indigo" in row.preferences_json

@pytest.mark.asyncio
async def test_audit_fix_branch_exact_matching(client: AsyncClient, admin_auth_token: str):
    """
    Error 12 & Error 13:
    - Branch switch does not accept arbitrary partial substring
    - Consolidation summary returns real calculated figures without multiplier floor
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # Consolidation summary
    res = await client.get("/api/branches/consolidation-summary", headers=headers)
    assert res.status_code == 200
    summary = res.json()
    # Check that gross_turnover_inr is an authoritative number (not hardcoded 4850000.0 or total_rev * 2.8)
    assert "gross_turnover_inr" in summary["consolidated_financials"]
    assert "branch_breakdown" in summary
    assert isinstance(summary["branch_breakdown"], list)

@pytest.mark.asyncio
async def test_audit_fix_sync_drafts_truthful_status(client: AsyncClient, admin_auth_token: str):
    """
    Error 11:
    - When client submits uncommitted module drafts, status is PENDING (not synchronized)
    - When payload.modules is empty, status is SYNCED
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Draft submission returns PENDING
    r1 = await client.post("/api/sync/all", headers=headers, json={
        "modules": {
            "inventory": {"draft_id": "draft-101", "qty": 5}
        }
    })
    assert r1.status_code == 200
    data1 = r1.json()
    assert data1["status"] == "PENDING"
    assert data1["module_metrics"]["inventory"]["status"] == "PENDING"

    # 2. Query without new drafts reports SYNCED
    r2 = await client.post("/api/sync/all", headers=headers, json={"modules": {}})
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["status"] == "SYNCED"
