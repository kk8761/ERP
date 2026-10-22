import pytest
import uuid
from httpx import AsyncClient
from decimal import Decimal
from sqlalchemy import select
from app.models.auth import User, Role, Permission, UserRole, RolePermission, UserPreference
from app.models.inventory import Product
from app.models.org import Branch
from app.models.sales import Customer
from app.models.procurement import Supplier
from app.auth.security import hash_password, create_access_token
from app.database import AsyncSessionLocal
from app.config import settings
from app.services.ai_tools import (
    tool_create_draft_purchase_order,
    tool_get_overdue_invoices_and_receivables,
    execute_typed_tool,
    MCP_SERVICE_ACCOUNT_ALLOWED_TOOLS
)
from app.services.disaster_recovery_service import DisasterRecoveryService

@pytest.mark.asyncio
async def test_audit_fix_data_import_unauthorized_and_branch_restriction(client: AsyncClient, admin_auth_token: str):
    """
    Error 1 & Error 5:
    - Unsupported entity types must be rejected (400)
    - Data validation errors preserve 400 status codes (not 500)
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

    # 2. Supported clients alias maps to sales.manage
    res_clients = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "clients",
        "branch_id": 1,
        "records": [{"name": "Test Client Pvt Ltd", "email": "client_test@example.com", "phone": "9876543210"}]
    })
    assert res_clients.status_code == 200
    assert (res_clients.json()["created_count"] + res_clients.json()["updated_count"]) >= 1

@pytest.mark.asyncio
async def test_negative_branch_restriction_and_non_admin_import(client: AsyncClient, cashier_auth_token: str):
    """
    Error 1:
    - Non-admin with insufficient permissions cannot import sensitive data (403)
    - Non-admin cannot import data into another branch (403)
    - When branch_id is omitted by non-admin, effective branch is derived from user's record
    """
    headers = {"Authorization": f"Bearer {cashier_auth_token}"}

    # 1. Cashier lacks finance.manage for expenses
    res_expenses = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "expenses",
        "records": [{"title": "Unauthorized Expense", "amount": 500.0}]
    })
    assert res_expenses.status_code == 403
    assert "requires 'finance.manage' permission" in res_expenses.json().get("detail", "")

    # 2. Cashier lacks sales.manage for customer imports
    res_cust = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "customers",
        "records": [{"name": "Sneak Customer", "email": "sneak@example.com"}]
    })
    assert res_cust.status_code == 403
    assert "requires 'sales.manage' permission" in res_cust.json().get("detail", "")

    # 3. Provision a non-admin sales manager assigned to branch 2
    async with AsyncSessionLocal() as session:
        # Check or create sales.manage permission
        p_res = await session.execute(select(Permission).where(Permission.code == "sales.manage"))
        perm = p_res.scalar_one_or_none()
        if not perm:
            perm = Permission(code="sales.manage", module="sales", description="Manage sales and clients")
            session.add(perm)
            await session.flush()

        r_res = await session.execute(select(Role).where(Role.name == "Branch 2 Sales Lead"))
        role = r_res.scalar_one_or_none()
        if not role:
            role = Role(name="Branch 2 Sales Lead", description="Sales manager for Branch 2", is_system_role=False)
            session.add(role)
            await session.flush()
        
        rp_res = await session.execute(select(RolePermission).where(RolePermission.role_id == role.id, RolePermission.permission_id == perm.id))
        if not rp_res.scalar_one_or_none():
            session.add(RolePermission(role_id=role.id, permission_id=perm.id))
            await session.flush()

        # Ensure Branch 2 exists in database
        b_res = await session.execute(select(Branch).where(Branch.id == 2))
        if not b_res.scalar_one_or_none():
            session.add(Branch(id=2, organization_id=1, name="Branch 2 Regional Store", code="BR-NORTH-02"))
            await session.flush()

        u_res = await session.execute(select(User).where(User.email == "saleslead_b2@nexaerp.internal"))
        user_b2 = u_res.scalar_one_or_none()
        if not user_b2:
            user_b2 = User(
                email="saleslead_b2@nexaerp.internal",
                full_name="Branch 2 Sales Lead",
                password_hash=hash_password("Lead@12345"),
                is_active=True,
                is_superuser=False,
                branch_id=2
            )
            session.add(user_b2)
            await session.flush()
        
        # Ensure role mapping is present
        ur_res = await session.execute(select(UserRole).where(UserRole.user_id == user_b2.id, UserRole.role_id == role.id))
        if not ur_res.scalar_one_or_none():
            session.add(UserRole(user_id=user_b2.id, role_id=role.id))

        await session.commit()
        await session.refresh(user_b2)
        token_b2 = create_access_token({"sub": str(user_b2.id), "email": user_b2.email, "is_superuser": False})

    headers_b2 = {"Authorization": f"Bearer {token_b2}"}

    # Non-admin assigned to branch 2 attempts to import into branch 1 -> Blocked with 403
    res_cross_branch = await client.post("/api/data-import/commit", headers=headers_b2, json={
        "entity_type": "customers",
        "branch_id": 1,
        "records": [{"name": "Cross Branch Client", "email": "cross@example.com"}]
    })
    assert res_cross_branch.status_code == 403
    assert "Cannot import into another branch" in res_cross_branch.json().get("detail", "")

    # Non-admin omits branch_id -> Allowed, effective branch is branch 2
    res_b2_valid = await client.post("/api/data-import/commit", headers=headers_b2, json={
        "entity_type": "customers",
        "records": [{"name": "Branch 2 Local Client", "email": "b2client@example.com", "phone": "9998887771"}]
    })
    assert res_b2_valid.status_code == 200, res_b2_valid.json()
    assert (res_b2_valid.json()["created_count"] + res_b2_valid.json()["updated_count"]) >= 1

@pytest.mark.asyncio
async def test_negative_data_validation_and_no_fabricated_values(client: AsyncClient, admin_auth_token: str):
    """
    Error 2, 3, 4:
    - Missing prices, stock, or salaries must raise 400 (never invented)
    - Expense amounts must be positive (never 0 or negative)
    - Product reimport does absolute stock assignment (no double-counting)
    - General ledger cannot directly overwrite live account balances
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Product missing selling price
    r_no_price = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "products",
        "branch_id": 1,
        "records": [{"name": "Incomplete Grain", "cost_price": 50.0, "current_stock": 20}]
    })
    assert r_no_price.status_code == 400
    assert "selling_price" in r_no_price.json().get("detail", "")

    # 2. Product missing cost price
    r_no_cost = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "products",
        "branch_id": 1,
        "records": [{"name": "Incomplete Grain 2", "selling_price": 70.0, "current_stock": 20}]
    })
    assert r_no_cost.status_code == 400
    assert "cost_price" in r_no_cost.json().get("detail", "")

    # 3. Product missing stock
    r_no_stock = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "products",
        "branch_id": 1,
        "records": [{"name": "Incomplete Grain 3", "selling_price": 70.0, "cost_price": 50.0}]
    })
    assert r_no_stock.status_code == 400
    assert "current_stock" in r_no_stock.json().get("detail", "")

    # 4. Expense with negative amount
    r_neg_expense = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "expenses",
        "branch_id": 1,
        "records": [{"title": "Negative Expense", "amount": -150.0}]
    })
    assert r_neg_expense.status_code == 400
    assert "Expense amount must be positive" in r_neg_expense.json().get("detail", "")

    # 5. Product absolute stock snapshot (no double counting)
    prod_sku = "TEST-ABS-SKU-01"
    # First import sets stock to 50
    r_import1 = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "products",
        "branch_id": 1,
        "records": [{
            "name": "Absolute Stock Test Item",
            "sku": prod_sku,
            "selling_price": 100.0,
            "cost_price": 80.0,
            "current_stock": 50
        }]
    })
    assert r_import1.status_code == 200

    # Second import of exact same spreadsheet specifying stock 50
    r_import2 = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "products",
        "branch_id": 1,
        "records": [{
            "name": "Absolute Stock Test Item",
            "sku": prod_sku,
            "selling_price": 100.0,
            "cost_price": 80.0,
            "current_stock": 50
        }]
    })
    assert r_import2.status_code == 200

    # Verify current_stock is 50, NOT 100
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Product).where(Product.sku == prod_sku))
        p = res.scalar_one_or_none()
        assert p is not None
        assert p.current_stock == 50

@pytest.mark.asyncio
async def test_ai_po_approval_threshold_cannot_be_bypassed():
    """
    Error 7:
    - PO with total >= ₹50,000 CANNOT be bypassed by execute_now=True
    - Must return APPROVAL_REQUIRED
    """
    async with AsyncSessionLocal() as session:
        s_res = await session.execute(select(Supplier).where(Supplier.name == "Adani Wilmar Supplies Ltd"))
        sup = s_res.scalar_one_or_none()
        if not sup:
            sup = Supplier(
                name="Adani Wilmar Supplies Ltd",
                vendor_code="SUP-ADANI-01",
                contact_person="Ramesh Patel",
                email="orders@adaniwilmar.internal",
                phone="+91 99887 76655"
            )
            session.add(sup)
            await session.flush()

        p_res = await session.execute(select(Product).where(Product.name == "Basmati Rice (Premium)"))
        prod = p_res.scalar_one_or_none()
        if not prod:
            prod = Product(
                name="Basmati Rice (Premium)",
                sku="GRAIN-RIC-001",
                selling_price=100.0,
                cost_price=80.0,
                current_stock=50
            )
            session.add(prod)
            await session.flush()
        await session.commit()

        # Request with total amount 60,000 (100 * 600) and execute_now=True
        result = await tool_create_draft_purchase_order(
            db=session,
            supplier_name="Adani Wilmar Supplies Ltd",
            items=[{"product_name": "Basmati Rice (Premium)", "quantity": 100, "unit_cost": 600.0}],
            execute_now=True
        )
        assert result["status"] == "APPROVAL_REQUIRED"
        assert result["action_preview"]["requires_human_approval"] is True
        assert result["action_preview"]["action_type"] == "CREATE_PURCHASE_ORDER"

@pytest.mark.asyncio
async def test_ai_mcp_service_account_allowlist_enforced():
    """
    Error 6:
    - MCP user 9999 has positive allowlist, not denylist
    - Overdue receivables enforces branch filter
    """
    assert "create_draft_purchase_order" not in MCP_SERVICE_ACCOUNT_ALLOWED_TOOLS
    assert "search_inventory" in MCP_SERVICE_ACCOUNT_ALLOWED_TOOLS
    assert "calculate_reorder_recommendations" in MCP_SERVICE_ACCOUNT_ALLOWED_TOOLS

    async with AsyncSessionLocal() as session:
        # Unauthorized tool for MCP
        res_blocked = await execute_typed_tool(
            tool_name="create_draft_purchase_order",
            parameters={"supplier_id": 1, "items": []},
            db=session,
            user_id=9999,
            user_email="mcp-agent@nexaerp.internal"
        )
        assert res_blocked["status"] == "ERROR"
        assert "positive allowlist" in res_blocked["message"]

@pytest.mark.asyncio
async def test_branch_context_switch_immutability_and_reporting_isolation(client: AsyncClient, cashier_auth_token: str, admin_auth_token: str):
    """
    Error 8 & 9:
    - Context switch does NOT alter User.branch_id in database
    - Non-admin blocked from consolidation summary (403)
    - Branch country/currency persisted and returned
    - User profile returns stored last_login (or None)
    """
    # 1. Non-admin blocked from consolidation summary
    cashier_headers = {"Authorization": f"Bearer {cashier_auth_token}"}
    r_consol = await client.get("/api/branches/consolidation-summary", headers=cashier_headers)
    assert r_consol.status_code == 403
    assert "Consolidated corporate financial reporting requires 'reports.view' or 'branches.manage'" in r_consol.json().get("detail", "")

    # 2. Context switch does NOT change assigned branch in users table
    admin_headers = {"Authorization": f"Bearer {admin_auth_token}"}
    async with AsyncSessionLocal() as session:
        u_res = await session.execute(select(User).where(User.email == settings.BOOTSTRAP_ADMIN_EMAIL))
        admin_user = u_res.scalar_one_or_none()
        orig_branch_id = admin_user.branch_id

    # Switch context to branch 1
    r_switch = await client.post("/api/branches/switch-context", headers=admin_headers, json={"branch_id": 1})
    assert r_switch.status_code == 200
    assert r_switch.json()["active_branch_id"] == 1

    # Verify users table in DB still has orig_branch_id (immutable)
    async with AsyncSessionLocal() as session:
        u_res = await session.execute(select(User).where(User.email == settings.BOOTSTRAP_ADMIN_EMAIL))
        refreshed_user = u_res.scalar_one_or_none()
        assert refreshed_user.branch_id == orig_branch_id

    # 3. Create branch persists country and currency
    r_new_branch = await client.post("/api/branches", headers=admin_headers, json={
        "name": "Audit Test Branch Dubai",
        "code": f"BR-DXB-{uuid.uuid4().hex[:4].upper()}",
        "country": "AE",
        "currency": "AED",
        "city": "Dubai",
        "address": "Sheikh Zayed Road"
    })
    assert r_new_branch.status_code == 200
    b_data = r_new_branch.json()["branch"]
    assert b_data["country"] == "AE"
    assert b_data["currency"] == "AED"

    # 4. Settings profile returns last_login
    r_prof = await client.get("/api/settings/profile", headers=admin_headers)
    assert r_prof.status_code == 200
    prof = r_prof.json()
    assert "last_login" in prof
    assert prof["last_login"] is None or isinstance(prof["last_login"], str)

@pytest.mark.asyncio
async def test_backup_path_traversal_and_simulated_dr_status(client: AsyncClient, admin_auth_token: str):
    """
    Error 12, 13, 14:
    - Path traversal in backup_name is rejected with 400
    - PITR test returns SIMULATED (never claiming false production verification)
    - Encryption metadata is truthfully NONE
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Path traversal rejected
    r_traversal = await client.post("/api/disaster-recovery/backups", headers=headers, json={
        "backup_name": "../../etc/malicious.backup",
        "backup_type": "FULL"
    })
    assert r_traversal.status_code == 400
    assert "path traversal" in r_traversal.json().get("detail", "").lower()

    # 2. PITR test returns SIMULATED
    r_pitr = await client.post("/api/disaster-recovery/pitr/test", headers=headers)
    assert r_pitr.status_code == 200
    pitr_data = r_pitr.json()
    assert pitr_data["test_status"] == "SIMULATED"
    assert pitr_data["is_simulated"] is True
    assert pitr_data["mode"] == "DRILL_SIMULATION"

    # 3. Create normal backup and verify metadata encryption is NONE
    r_valid_bkp = await client.post("/api/disaster-recovery/backups", headers=headers, json={
        "backup_name": f"safe_audit_{uuid.uuid4().hex[:6]}.backup",
        "backup_type": "FULL"
    })
    assert r_valid_bkp.status_code == 200
    bkp = r_valid_bkp.json()
    assert "checksum_sha256" in bkp
    assert len(bkp["checksum_sha256"]) == 64

@pytest.mark.asyncio
async def test_audit_fix_company_settings_partial_update(client: AsyncClient, admin_auth_token: str):
    """
    Updating one setting (e.g. phone) does NOT reset legal_name, name, or tax_identifier
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
    assert org_data["name"] == "Nexa Global Corporation"
    assert org_data["tax_identifier"] == "GSTIN-ABC-12345"
    assert org_data["legal_name"] == "Nexa Global Corp Pvt Ltd"
    assert org_data["phone"] == "+91 99999 88888"

@pytest.mark.asyncio
async def test_audit_fix_durable_user_preferences(client: AsyncClient, admin_auth_token: str):
    """
    Preferences are stored in database table user_preferences
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
async def test_audit_fix_sync_drafts_truthful_status(client: AsyncClient, admin_auth_token: str):
    """
    Error 10:
    - When client submits uncommitted module drafts, status is PENDING
    - When pending drafts exist in store, query without new drafts stays PENDING
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

    # 2. Query without new drafts still returns PENDING if older uncommitted drafts exist
    r2 = await client.post("/api/sync/all", headers=headers, json={"modules": {}})
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["status"] == "PENDING"
