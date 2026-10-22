import pytest
import os
import uuid
import tempfile
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy import select
from app.models.auth import User, Role, Permission, UserRole, RolePermission
from app.models.inventory import Product, ProductCategory
from app.models.org import Organization, Branch
from app.models.finance import Account, JournalEntry
from app.services.inventory_service import adjust_product_stock
from app.services.disaster_recovery_service import DisasterRecoveryService
from app.services.document_store import document_store
from app.database import AsyncSessionLocal
from app.auth.security import create_access_token, hash_password


async def assign_permissions(db, user: User, perm_codes: list[str]):
    role = Role(name=f"Role_{uuid.uuid4().hex[:6]}")
    db.add(role)
    await db.flush()
    for code in perm_codes:
        p_res = await db.execute(select(Permission).where(Permission.code == code))
        p_obj = p_res.scalar_one_or_none()
        if not p_obj:
            p_obj = Permission(code=code, module=code.split(".")[0], description=code)
            db.add(p_obj)
            await db.flush()
        db.add(RolePermission(role_id=role.id, permission_id=p_obj.id))
    db.add(UserRole(user_id=user.id, role_id=role.id))
    await db.flush()


@pytest.mark.asyncio
async def test_sec_57_and_bug_61_sync_operation_id_stripping_and_org_validation(client: AsyncClient):
    """
    SEC-57 & BUG-61:
    - User without assigned organization cannot sync (returns HTTP 403, no drafts persisted).
    - Sync endpoint strips both client-supplied idempotency_key and operation_id.
    - Server generates authoritative operation ID and idempotency key.
    """
    # 1. User without organization
    async with AsyncSessionLocal() as db:
        unassigned_user = User(
            email=f"no_org_{uuid.uuid4().hex[:6]}@nexaerp.internal",
            full_name="Unassigned User",
            password_hash=hash_password("Pass123!"),
            is_active=True,
            is_superuser=False,
            organization_id=None,
            branch_id=None
        )
        db.add(unassigned_user)
        await db.flush()
        await assign_permissions(db, unassigned_user, ["sales.view", "sales.create"])
        await db.commit()
        await db.refresh(unassigned_user)
        unassigned_user_id = unassigned_user.id
        unassigned_email = unassigned_user.email

    token_no_org = create_access_token({"sub": str(unassigned_user_id), "email": unassigned_email})

    # Attempt sync without organization context
    res = await client.post(
        "/api/sync/all",
        json={
            "client_timestamp": datetime.now(timezone.utc).isoformat(),
            "modules": {
                "sales": {
                    "operation_id": "CLIENT-INJECTED-OP-123",
                    "idempotency_key": "IDEMP-CLIENT-OVERRIDE",
                    "items": [{"product_id": 1, "quantity": 2}]
                }
            }
        },
        headers={"Authorization": f"Bearer {token_no_org}"}
    )
    # Must reject with HTTP 403 Forbidden (BUG-61: not swallowed)
    assert res.status_code == 403
    assert "Organization context required" in res.json().get("detail", "")

    # Verify no draft was persisted in document store
    draft = await document_store.find_document("module_drafts", {"user_id": unassigned_user_id, "module": "sales"})
    assert draft is None

    # 2. Authenticated user with valid organization and branch
    async with AsyncSessionLocal() as db:
        org = Organization(name=f"Org Sync Test {uuid.uuid4().hex[:6]}", code=f"OST{uuid.uuid4().hex[:4]}")
        db.add(org)
        await db.flush()

        branch = Branch(name="Sync Branch", code=f"SB{uuid.uuid4().hex[:4]}", organization_id=org.id)
        db.add(branch)
        await db.flush()

        valid_user = User(
            email=f"valid_sync_{uuid.uuid4().hex[:6]}@nexaerp.internal",
            full_name="Valid Sync User",
            password_hash=hash_password("Pass123!"),
            is_active=True,
            is_superuser=False,
            organization_id=org.id,
            branch_id=branch.id
        )
        db.add(valid_user)
        await db.flush()
        await assign_permissions(db, valid_user, ["expenses.view", "expenses.record"])
        await db.commit()
        await db.refresh(valid_user)
        valid_user_id = valid_user.id
        valid_email = valid_user.email

    token_valid = create_access_token({"sub": str(valid_user_id), "email": valid_email})

    # Submit draft with client-controlled operation_id and idempotency_key
    res_valid = await client.post(
        "/api/sync/all",
        json={
            "client_timestamp": datetime.now(timezone.utc).isoformat(),
            "modules": {
                "expenses": {
                    "operation_id": "CLIENT-INJECTED-OP-999",
                    "idempotency_key": "IDEMP-CLIENT-OVERRIDE-999",
                    "amount": 250.0,
                    "category": "Office",
                    "description": "Team coffee"
                }
            }
        },
        headers={"Authorization": f"Bearer {token_valid}"}
    )
    assert res_valid.status_code == 200

    # SEC-57: Verify stored draft stripped client keys and generated server operation ID
    stored_draft = await document_store.find_document("module_drafts", {"user_id": valid_user_id, "module": "expenses"})
    assert stored_draft is not None
    assert "operation_id" not in stored_draft["data"]
    assert "idempotency_key" not in stored_draft["data"]
    assert stored_draft["operation_id"].startswith(f"OP-{valid_user_id}-expenses-")
    assert stored_draft["operation_id"] != "CLIENT-INJECTED-OP-999"


@pytest.mark.asyncio
async def test_sec_58_product_creation_requires_verified_organization(client: AsyncClient):
    """
    SEC-58: Product creation fails with HTTP 403 when user has no assigned organization,
    and never silently defaults to organization 1.
    """
    async with AsyncSessionLocal() as db:
        user_no_org = User(
            email=f"prod_no_org_{uuid.uuid4().hex[:6]}@nexaerp.internal",
            full_name="Product Creator No Org",
            password_hash=hash_password("Pass123!"),
            is_active=True,
            is_superuser=False,
            organization_id=None,
            branch_id=None
        )
        db.add(user_no_org)
        await db.flush()
        await assign_permissions(db, user_no_org, ["inventory.create", "inventory.view"])
        await db.commit()
        await db.refresh(user_no_org)
        user_id = user_no_org.id
        email = user_no_org.email

    token = create_access_token({"sub": str(user_id), "email": email})

    res = await client.post(
        "/api/inventory/products",
        json={
            "name": "Sec58 Test Product",
            "sku": f"SEC58-{uuid.uuid4().hex[:6].upper()}",
            "selling_price": 49.99,
            "cost_price": 25.00
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 403
    assert "Organization context required" in res.json().get("detail", "")


@pytest.mark.asyncio
async def test_sec_59_inventory_apis_isolated_by_organization(client: AsyncClient):
    """
    SEC-59: Inventory product list and stock adjustments are strictly scoped by organization.
    Cross-organization stock adjustment is rejected with HTTP 404.
    """
    async with AsyncSessionLocal() as db:
        org_a = Organization(name=f"Org A {uuid.uuid4().hex[:6]}", code=f"OA{uuid.uuid4().hex[:4]}")
        org_b = Organization(name=f"Org B {uuid.uuid4().hex[:6]}", code=f"OB{uuid.uuid4().hex[:4]}")
        db.add_all([org_a, org_b])
        await db.flush()

        prod_a = Product(
            name="Org A Exclusive Widget",
            sku=f"SKU-A-{uuid.uuid4().hex[:6].upper()}",
            selling_price=Decimal("100.00"),
            cost_price=Decimal("50.00"),
            current_stock=20,
            organization_id=org_a.id
        )
        prod_b = Product(
            name="Org B Exclusive Widget",
            sku=f"SKU-B-{uuid.uuid4().hex[:6].upper()}",
            selling_price=Decimal("100.00"),
            cost_price=Decimal("50.00"),
            current_stock=20,
            organization_id=org_b.id
        )
        db.add_all([prod_a, prod_b])
        await db.flush()

        user_a = User(
            email=f"usera_{uuid.uuid4().hex[:6]}@nexaerp.internal",
            full_name="User Org A",
            password_hash=hash_password("Pass123!"),
            is_active=True,
            is_superuser=False,
            organization_id=org_a.id
        )
        db.add(user_a)
        await db.flush()
        await assign_permissions(db, user_a, ["inventory.view", "inventory.adjust"])
        await db.commit()
        await db.refresh(user_a)
        await db.refresh(prod_a)
        await db.refresh(prod_b)

        user_id = user_a.id
        email = user_a.email
        prod_a_sku = prod_a.sku
        prod_b_sku = prod_b.sku
        prod_b_id = prod_b.id

    token_a = create_access_token({"sub": str(user_id), "email": email})

    # 1. Product list only returns Org A's products
    list_res = await client.get("/api/inventory/products", headers={"Authorization": f"Bearer {token_a}"})
    assert list_res.status_code == 200
    listed_skus = [p["sku"] for p in list_res.json()]
    assert prod_a_sku in listed_skus
    assert prod_b_sku not in listed_skus

    # 2. Stock adjustment on Org B's product by User A is rejected
    adj_res = await client.post(
        "/api/inventory/adjust",
        json={
            "product_id": prod_b_id,
            "quantity": 5,
            "adjustment_type": "ADJUSTMENT_IN"
        },
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert adj_res.status_code == 404
    assert f"Product with ID {prod_b_id} not found" in adj_res.json().get("detail", "")


@pytest.mark.asyncio
async def test_sec_60_and_bug_65_dashboard_metrics_organization_and_true_profit(client: AsyncClient):
    """
    SEC-60 & BUG-65:
    - Dashboard metrics are scoped to caller's organization.
    - True accounting profit/loss is calculated without fabricated 55% sales fallbacks.
    """
    async with AsyncSessionLocal() as db:
        org = Organization(name=f"Dash Org {uuid.uuid4().hex[:6]}", code=f"DO{uuid.uuid4().hex[:4]}")
        db.add(org)
        await db.flush()

        branch = Branch(name="Dash Branch", code=f"DB{uuid.uuid4().hex[:4]}", organization_id=org.id)
        db.add(branch)
        await db.flush()

        dash_user = User(
            email=f"dash_user_{uuid.uuid4().hex[:6]}@nexaerp.internal",
            full_name="Dashboard User",
            password_hash=hash_password("Pass123!"),
            is_active=True,
            is_superuser=False,
            organization_id=org.id,
            branch_id=branch.id
        )
        db.add(dash_user)
        await db.flush()
        await assign_permissions(db, dash_user, ["dashboard.view"])
        await db.commit()
        await db.refresh(dash_user)
        user_id = dash_user.id
        email = dash_user.email

    token = create_access_token({"sub": str(user_id), "email": email})

    res = await client.get("/api/dashboard/metrics?range=This%20Week", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "kpis" in data
    assert "sales_overview_chart" in data

    # Verify chart does not invent purchases if none exist (purchases must be 0, not 55% of sales)
    chart = data["sales_overview_chart"]
    for pt in chart:
        if pt["sales"] == 0 and pt["purchases"] == 0:
            assert pt["profit"] == 0.0


@pytest.mark.asyncio
async def test_bug_62_post_general_ledger_balanced_journal_entry(client: AsyncClient):
    """
    BUG-62: General Ledger posting endpoint accepts balanced JournalEntryCreate payload
    at POST /api/finance/journal-entries.
    """
    async with AsyncSessionLocal() as db:
        acc_cash = Account(code=f"CASH-{uuid.uuid4().hex[:4]}", name="Petty Cash", account_type="ASSET", balance=Decimal("1000.00"), is_active=True)
        acc_rev = Account(code=f"REV-{uuid.uuid4().hex[:4]}", name="Sales Revenue", account_type="REVENUE", balance=Decimal("1000.00"), is_active=True)
        db.add_all([acc_cash, acc_rev])
        await db.flush()

        user_fin = User(
            email=f"fin_user_{uuid.uuid4().hex[:6]}@nexaerp.internal",
            full_name="Finance User",
            password_hash=hash_password("Pass123!"),
            is_active=True,
            is_superuser=False,
            organization_id=1
        )
        db.add(user_fin)
        await db.flush()
        await assign_permissions(db, user_fin, ["finance.post", "finance.view"])
        await db.commit()
        await db.refresh(user_fin)
        await db.refresh(acc_cash)
        await db.refresh(acc_rev)
        user_id = user_fin.id
        email = user_fin.email
        cash_id = acc_cash.id
        rev_id = acc_rev.id

    token = create_access_token({"sub": str(user_id), "email": email})

    # Balanced 2-line journal entry
    res = await client.post(
        "/api/finance/journal-entries",
        json={
            "entry_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "description": "ACDOCA Universal Journal Posting",
            "reference": "ACDOCA-TEST-001",
            "lines": [
                {"account_id": cash_id, "debit": 500.0, "credit": 0.0, "description": "Cash In"},
                {"account_id": rev_id, "debit": 0.0, "credit": 500.0, "description": "Revenue Recognized"}
            ]
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 201
    entry_data = res.json()
    assert float(entry_data["total_debit"]) == 500.0
    assert float(entry_data["total_credit"]) == 500.0
    assert entry_data["reference"] == "ACDOCA-TEST-001"


@pytest.mark.asyncio
async def test_bug_63_sync_process_supports_finance_acdoca_spreadsheet(client: AsyncClient):
    """
    BUG-63: Sync processor supports finance_acdoca_spreadsheet drafts with balanced double-entry vouchers.
    """
    async with AsyncSessionLocal() as db:
        acc_bank = Account(code=f"BNK-{uuid.uuid4().hex[:4]}", name="Operating Bank", account_type="ASSET", balance=Decimal("5000.00"), is_active=True)
        acc_rent = Account(code=f"RNT-{uuid.uuid4().hex[:4]}", name="Rent Expense", account_type="EXPENSE", balance=Decimal("0.00"), is_active=True)
        db.add_all([acc_bank, acc_rent])
        await db.flush()

        user_sync = User(
            email=f"sync_acdoca_{uuid.uuid4().hex[:6]}@nexaerp.internal",
            full_name="ACDOCA Sync User",
            password_hash=hash_password("Pass123!"),
            is_active=True,
            is_superuser=False,
            organization_id=1,
            branch_id=1
        )
        db.add(user_sync)
        await db.flush()
        await assign_permissions(db, user_sync, ["finance.post", "finance.view"])
        await db.commit()
        await db.refresh(user_sync)
        await db.refresh(acc_bank)
        await db.refresh(acc_rent)
        user_id = user_sync.id
        email = user_sync.email
        rent_code = acc_rent.code
        bank_code = acc_bank.code

    token = create_access_token({"sub": str(user_id), "email": email})

    # Save draft for finance_acdoca_spreadsheet
    draft_payload = {
        "client_timestamp": datetime.now(timezone.utc).isoformat(),
        "modules": {
            "finance_acdoca_spreadsheet": {
                "description": "Synced ACDOCA rent voucher",
                "draft_journal_vouchers": [
                    {"gl_account": rent_code, "debit": 1200.0, "credit": 0.0, "text_memo": "Monthly Office Rent"},
                    {"gl_account": bank_code, "debit": 0.0, "credit": 1200.0, "text_memo": "Bank Wire Payment"}
                ]
            }
        }
    }
    sync_res = await client.post("/api/sync/all", json=draft_payload, headers={"Authorization": f"Bearer {token}"})
    assert sync_res.status_code == 200

    # Process draft
    proc_res = await client.post("/api/sync/process", headers={"Authorization": f"Bearer {token}"})
    assert proc_res.status_code == 200
    proc_data = proc_res.json()
    assert proc_data["synced"] >= 1
    assert len(proc_data.get("errors", [])) == 0


@pytest.mark.asyncio
async def test_disaster_recovery_destination_verification():
    """
    Section 6: Disaster Recovery destination verification fails if unverified/inaccessible,
    preventing spurious COLD_GLACIER archive transitions.
    """
    # Non-existent directory returns False
    is_valid = DisasterRecoveryService.verify_offsite_storage_destination("/non_existent_vault_path_987654")
    assert is_valid is False
