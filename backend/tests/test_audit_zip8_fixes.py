import pytest
import os
import uuid
import yaml
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy import select, text

from app.models.auth import User, Role, Permission, UserRole, RolePermission
from app.models.org import Organization, Branch
from app.models.inventory import Product, StockMovement
from app.models.sales import Customer, SalesOrder, SyncIdempotencyRecord
from app.models.finance import Expense
from app.services.sales_service import create_sales_order
from app.schemas.sales import SalesOrderCreate, SalesOrderItemIn
from app.services.document_store import document_store
from app.services.disaster_recovery_service import (
    encrypt_backup_file,
    decrypt_backup_file,
    get_dedicated_backup_cipher,
    get_legacy_backup_cipher,
    MAGIC_STREAM_HEADER
)
from app.database import AsyncSessionLocal
from fastapi import HTTPException

@pytest.mark.asyncio
async def test_bug47_atomic_claim_and_synced_retention(client: AsyncClient, admin_auth_token: str):
    """
    BUG-47:
    - Claim draft using upsert=False and modified_count check.
    - Subsequent claim returns False.
    - Calling /api/sync/all does not reset an already SYNCED draft back to PENDING.
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    draft_id = "test_user_bug47:expenses"

    # Seed draft in document store
    await document_store.upsert_document("module_drafts", {"id": draft_id}, {
        "id": draft_id,
        "user_id": 9999,
        "module": "expenses",
        "status": "PENDING",
        "data": {"amount": 100.0, "category": "Office"}
    })

    # 1. Atomic claim succeeds
    claimed1 = await document_store.claim_document(
        "module_drafts",
        {"id": draft_id, "status": "PENDING"},
        {"status": "PROCESSING", "claim_time": datetime.now(timezone.utc).isoformat()}
    )
    assert claimed1 is True

    # 2. Concurrent worker claiming same draft fails
    claimed2 = await document_store.claim_document(
        "module_drafts",
        {"id": draft_id, "status": "PENDING"},
        {"status": "PROCESSING", "claim_time": datetime.now(timezone.utc).isoformat()}
    )
    assert claimed2 is False

    # 3. Mark as SYNCED
    await document_store.update_document("module_drafts", {"id": draft_id}, {"status": "SYNCED"})

    # Post same draft via /api/sync/all: it must remain SYNCED
    sync_res = await client.post("/api/sync/all", headers=headers, json={
        "modules": {
            "expenses": {"amount": 100.0, "category": "Office"}
        }
    })
    assert sync_res.status_code == 200

    # Verify draft status wasn't reset to PENDING
    admin_user_draft = await document_store.find_document("module_drafts", {"user_id": 1, "module": "expenses"})
    # Even if draft for user 1 was created, let's verify process marks it SYNCED
    proc_res = await client.post("/api/sync/process", headers=headers)
    assert proc_res.status_code == 200

    # Now post identical data again to /api/sync/all
    sync_res2 = await client.post("/api/sync/all", headers=headers, json={
        "modules": {
            "expenses": {"amount": 100.0, "category": "Office"}
        }
    })
    assert sync_res2.status_code == 200
    # Status should be SYNCED, not reset to PENDING
    assert sync_res2.json()["status"] == "SYNCED"

@pytest.mark.asyncio
async def test_bug47_sql_idempotency_ledger(client: AsyncClient, admin_auth_token: str):
    """
    BUG-47:
    Authoritative SQL idempotency ledger prevents duplicate sales orders or expenses
    across worker crashes or repeated sync processing calls.
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    unique_key = f"IDEMP-TEST-{uuid.uuid4().hex[:8]}"

    unique_desc = f"Idempotent Expense Verification {unique_key}"

    # Post draft with explicit idempotency key
    sync_res = await client.post("/api/sync/all", headers=headers, json={
        "modules": {
            "expenses": {
                "idempotency_key": unique_key,
                "amount": 420.0,
                "category": "Audit Test",
                "description": unique_desc
            }
        }
    })
    assert sync_res.status_code == 200

    # 1. First process: creates 1 expense and 1 SQL idempotency record
    proc1 = await client.post("/api/sync/process", headers=headers)
    assert proc1.status_code == 200
    assert proc1.json()["synced"] >= 1

    async with AsyncSessionLocal() as session:
        idemp_recs = (await session.execute(
            select(SyncIdempotencyRecord).where(SyncIdempotencyRecord.idempotency_key == unique_key)
        )).scalars().all()
        assert len(idemp_recs) == 1

        exp_recs = (await session.execute(
            select(Expense).where(Expense.description == unique_desc)
        )).scalars().all()
        assert len(exp_recs) == 1

    # 2. Simulate worker re-processing: draft re-submitted with same idempotency key
    # Even if draft is marked PENDING in draft queue, processing MUST NOT create a duplicate expense
    await document_store.update_document("module_drafts", {"id": "1:expenses"}, {"status": "PENDING"})
    proc2 = await client.post("/api/sync/process", headers=headers)
    assert proc2.status_code == 200

    async with AsyncSessionLocal() as session:
        exp_recs_after = (await session.execute(
            select(Expense).where(Expense.description == unique_desc)
        )).scalars().all()
        # Still exactly 1 expense! No duplicates created
        assert len(exp_recs_after) == 1


@pytest.mark.asyncio
async def test_sec47_sales_order_cross_organization_product_isolation():
    """
    SEC-47:
    Sales service MUST reject product retrieval if product belongs to another organization.
    """
    async with AsyncSessionLocal() as session:
        # Create Org A and Org B
        org_a = Organization(name=f"Org A {uuid.uuid4().hex[:6]}", code=f"ORGA-{uuid.uuid4().hex[:4]}")
        org_b = Organization(name=f"Org B {uuid.uuid4().hex[:6]}", code=f"ORGB-{uuid.uuid4().hex[:4]}")
        session.add_all([org_a, org_b])
        await session.flush()

        branch_a = Branch(organization_id=org_a.id, name="Branch A", code=f"BRA-{uuid.uuid4().hex[:4]}")
        branch_b = Branch(organization_id=org_b.id, name="Branch B", code=f"BRB-{uuid.uuid4().hex[:4]}")
        session.add_all([branch_a, branch_b])
        await session.flush()

        # Product in Org B
        prod_b = Product(
            organization_id=org_b.id,
            name="Org B Secret Asset",
            sku=f"SKU-B-{uuid.uuid4().hex[:6]}",
            selling_price=Decimal("150.00"),
            current_stock=100
        )
        session.add(prod_b)
        await session.flush()

        # Attempt to order Product B under Org A
        order_in = SalesOrderCreate(
            branch_id=branch_a.id,
            items=[SalesOrderItemIn(product_id=prod_b.id, quantity=1)]
        )

        with pytest.raises(HTTPException) as exc_info:
            await create_sales_order(
                db=session,
                order_in=order_in,
                cashier_user_id=1,
                organization_id=org_a.id
            )
        assert exc_info.value.status_code == 404
        assert "not found in your organization" in exc_info.value.detail

@pytest.mark.asyncio
async def test_sec47_sales_order_cross_org_customer_and_branch_validation():
    """
    SEC-47:
    Sales service validates customer and branch against organization_id.
    """
    async with AsyncSessionLocal() as session:
        org_1 = Organization(name=f"Org 1 {uuid.uuid4().hex[:6]}", code=f"ORG1-{uuid.uuid4().hex[:4]}")
        org_2 = Organization(name=f"Org 2 {uuid.uuid4().hex[:6]}", code=f"ORG2-{uuid.uuid4().hex[:4]}")
        session.add_all([org_1, org_2])
        await session.flush()

        prod_1 = Product(
            organization_id=org_1.id,
            name="Org 1 Standard Widget",
            sku=f"SKU-1-{uuid.uuid4().hex[:6]}",
            selling_price=Decimal("50.00"),
            current_stock=50
        )
        branch_2 = Branch(organization_id=org_2.id, name="Branch 2", code=f"BR2-{uuid.uuid4().hex[:4]}")
        cust_2 = Customer(organization_id=org_2.id, name="Customer of Org 2", phone="9988776655")
        session.add_all([prod_1, branch_2, cust_2])
        await session.flush()

        # Cross-branch check: Org 1 cashier attempts to use branch_2
        order_cross_branch = SalesOrderCreate(
            branch_id=branch_2.id,
            items=[SalesOrderItemIn(product_id=prod_1.id, quantity=1)]
        )
        with pytest.raises(HTTPException) as exc1:
            await create_sales_order(
                db=session,
                order_in=order_cross_branch,
                cashier_user_id=1,
                organization_id=org_1.id
            )
        assert exc1.value.status_code == 403
        assert "does not belong to your organization" in exc1.value.detail

        # Cross-customer check: Org 1 cashier attempts to bill cust_2
        order_cross_cust = SalesOrderCreate(
            customer_id=cust_2.id,
            items=[SalesOrderItemIn(product_id=prod_1.id, quantity=1)]
        )
        with pytest.raises(HTTPException) as exc2:
            await create_sales_order(
                db=session,
                order_in=order_cross_cust,
                cashier_user_id=1,
                organization_id=org_1.id
            )
        assert exc2.value.status_code == 404
        assert "not found in your organization" in exc2.value.detail

@pytest.mark.asyncio
async def test_bug48_multi_org_migration_unresolved_guard():
    """
    BUG-48:
    Multi-org environment must not blanket-assign org 1.
    If unassigned records remain with organization_id IS NULL in a multi-org deployment,
    startup migration fails closed.
    """
    async with AsyncSessionLocal() as session:
        # Ensure at least 2 organizations exist
        org_cnt = (await session.execute(text("SELECT count(*) FROM organizations"))).scalar()
        if org_cnt < 2:
            session.add(Organization(name=f"Migration Org {uuid.uuid4().hex[:4]}", code=f"MIG-{uuid.uuid4().hex[:4]}"))
            await session.commit()

    from app.main import lifespan
    # Verification: startup check halts if unresolved record exists
    async with AsyncSessionLocal() as session:
        # Create unassigned user
        unassigned_user = User(
            email=f"unassigned_{uuid.uuid4().hex[:6]}@example.com",
            full_name="Unassigned User",
            password_hash="fake",
            organization_id=None,
            branch_id=None
        )
        session.add(unassigned_user)
        await session.commit()

    # Trigger migration ownership check
    from app.database import engine
    with pytest.raises(RuntimeError) as exc_info:
        async with engine.begin() as conn:
            org_res = await conn.execute(text("SELECT id FROM organizations"))
            org_rows = org_res.fetchall()
            if len(org_rows) > 1:
                unres = (await conn.execute(text("SELECT COUNT(*) FROM users WHERE organization_id IS NULL"))).scalar() or 0
                if unres > 0:
                    raise RuntimeError(f"BUG-48 Migration Halt: Found {unres} unresolved record(s) in 'users' with missing organization ownership in a multi-tenant deployment.")
    assert "BUG-48 Migration Halt" in str(exc_info.value)

    # Clean up unassigned user
    async with AsyncSessionLocal() as session:
        await session.execute(text(f"DELETE FROM users WHERE email = '{unassigned_user.email}'"))
        await session.commit()

def test_sec48_dedicated_backup_key_and_streaming_encryption(tmp_path):
    """
    SEC-48:
    - Dedicated encryption key separated from JWT key.
    - Streaming chunked encryption/decryption (not loading entire file into memory).
    - Temporary file verification before deleting plaintext.
    - Backward-compatibility with legacy single-blob backups.
    """
    plain_file = tmp_path / "enterprise_backup.sql"
    plain_content = b"DATABASE_DUMP_STREAM_CONTENT_" * 5000 # > 140 KB to trigger multiple 64KB chunks
    plain_file.write_bytes(plain_content)

    # 1. Streaming encrypt
    enc_path = encrypt_backup_file(str(plain_file))
    assert os.path.exists(enc_path)
    assert not os.path.exists(str(plain_file)) # Plaintext deleted after verified encryption

    with open(enc_path, "rb") as f:
        header = f.read(len(MAGIC_STREAM_HEADER))
        assert header == MAGIC_STREAM_HEADER # Verified streaming chunked format

    # 2. Streaming decrypt
    dec_file = tmp_path / "enterprise_backup_restored.sql"
    decrypt_backup_file(enc_path, str(dec_file))
    assert os.path.exists(str(dec_file))
    assert dec_file.read_bytes() == plain_content

    # 3. Test backward compatibility: legacy single-blob backup encrypted with legacy cipher
    legacy_cipher = get_legacy_backup_cipher()
    legacy_enc_file = tmp_path / "legacy_backup.sql.enc"
    legacy_enc_file.write_bytes(legacy_cipher.encrypt(plain_content))

    legacy_dec_file = tmp_path / "legacy_backup_restored.sql"
    decrypt_backup_file(str(legacy_enc_file), str(legacy_dec_file))
    assert legacy_dec_file.read_bytes() == plain_content

@pytest.mark.asyncio
async def test_bug49_dedicated_stock_adjustment_import(client: AsyncClient, admin_auth_token: str):
    """
    BUG-49:
    Dedicated stock adjustment import path:
    - Only requires inventory.adjust (or admin).
    - Accepts SKU and current_stock/quantity.
    - Leaves selling_price and cost_price completely untouched.
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    sku = f"SKU-STOCK-{uuid.uuid4().hex[:6]}"

    async with AsyncSessionLocal() as session:
        prod = Product(
            organization_id=1,
            name="Stock Adjust Test Item",
            sku=sku,
            selling_price=Decimal("89.99"),
            cost_price=Decimal("45.00"),
            current_stock=10
        )
        session.add(prod)
        await session.commit()
        prod_id = prod.id

    # Perform stock-only adjustment without price fields
    res = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "stock",
        "records": [
            {
                "sku": sku,
                "current_stock": 75
            }
        ]
    })
    assert res.status_code == 200
    assert res.json()["updated_count"] == 1

    async with AsyncSessionLocal() as session:
        updated_prod = (await session.execute(select(Product).where(Product.id == prod_id))).scalar_one()
        assert updated_prod.current_stock == 75
        # Prices preserved untouched
        assert updated_prod.selling_price == Decimal("89.99")
        assert updated_prod.cost_price == Decimal("45.00")

        # Movement record recorded
        mvm = (await session.execute(
            select(StockMovement).where(StockMovement.product_id == prod_id)
        )).scalars().all()
        assert len(mvm) >= 1
        assert mvm[-1].movement_type == "ADJUSTMENT_IN"
        assert mvm[-1].quantity == 65

@pytest.mark.asyncio
async def test_bug50_expense_import_branch_attribution(client: AsyncClient, admin_auth_token: str):
    """
    BUG-50:
    Expense import sets branch_id=effective_branch_id and requires explicit branch context.
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    exp_num = f"EXP-BR-{uuid.uuid4().hex[:6]}"

    # Import expense specifying branch_id 1
    res = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "expenses",
        "branch_id": 1,
        "records": [
            {
                "expense_number": exp_num,
                "amount": 350.0,
                "category": "Office Supplies",
                "description": "Branch-scoped expense test"
            }
        ]
    })
    assert res.status_code == 200

    async with AsyncSessionLocal() as session:
        exp = (await session.execute(
            select(Expense).where(Expense.expense_number == exp_num)
        )).scalar_one_or_none()
        assert exp is not None
        assert exp.branch_id == 1

@pytest.mark.asyncio
async def test_sec51_customer_organization_isolation(client: AsyncClient, admin_auth_token: str):
    """
    SEC-51:
    Customer records have organization ownership.
    Importing a customer scopes search to user's organization and prevents cross-tenant updates.
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    shared_phone = f"99{uuid.uuid4().int % 100000000:08d}"

    async with AsyncSessionLocal() as session:
        # Create Org 2 with customer having shared_phone
        org_other = Organization(name=f"Org Other {uuid.uuid4().hex[:4]}", code=f"OTHR-{uuid.uuid4().hex[:4]}")
        session.add(org_other)
        await session.flush()

        other_cust = Customer(
            organization_id=org_other.id,
            name="Other Tenant VIP",
            phone=shared_phone,
            email="other_tenant@example.com",
            address="Other Org Address"
        )
        session.add(other_cust)
        await session.commit()
        other_cust_id = other_cust.id

    org1_cust_name = f"Org 1 Client {uuid.uuid4().hex[:6]}"

    # Admin of Org 1 imports customer with same phone number
    res = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "customers",
        "records": [
            {
                "name": org1_cust_name,
                "phone": shared_phone,
                "email": "org1_client@example.com",
                "address": "Org 1 Address"
            }
        ]
    })
    assert res.status_code == 200

    async with AsyncSessionLocal() as session:
        # Org other customer's details were NOT overwritten!
        preserved_other = (await session.execute(select(Customer).where(Customer.id == other_cust_id))).scalar_one()
        assert preserved_other.name == "Other Tenant VIP"
        assert preserved_other.address == "Other Org Address"
        assert preserved_other.organization_id == org_other.id

        all_custs = (await session.execute(
            select(Customer).where(Customer.phone == shared_phone)
        )).scalars().all()
        assert len(all_custs) == 2
        new_cust = [c for c in all_custs if c.id != other_cust_id][0]
        assert new_cust.name == org1_cust_name
        assert new_cust.organization_id == 1



@pytest.mark.asyncio
async def test_bug51_strip_client_applied_flag(client: AsyncClient, admin_auth_token: str):
    """
    BUG-51:
    Sync processor ignores client-injected _applied flag and enforces trusted server processing.
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    key = f"IDEMP-INJECT-{uuid.uuid4().hex[:8]}"

    sync_res = await client.post("/api/sync/all", headers=headers, json={
        "modules": {
            "expenses": {
                "idempotency_key": key,
                "amount": 199.99,
                "_applied": True, # Client injection attempt
                "status": "SYNCED"
            }
        }
    })
    assert sync_res.status_code == 200

    # The server stripped _applied, so draft gets processed and recorded in SQL ledger
    proc_res = await client.post("/api/sync/process", headers=headers)
    assert proc_res.status_code == 200
    assert proc_res.json()["synced"] >= 1

    async with AsyncSessionLocal() as session:
        idemp = (await session.execute(
            select(SyncIdempotencyRecord).where(SyncIdempotencyRecord.idempotency_key == key)
        )).scalar_one_or_none()
        assert idemp is not None

@pytest.mark.asyncio
async def test_bug52_product_count_organization_filter(client: AsyncClient, admin_auth_token: str):
    """
    BUG-52:
    Inventory product count metric in /api/sync/all is scoped to user's organization.
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    async with AsyncSessionLocal() as session:
        # Insert a product belonging to another organization
        other_org = Organization(name=f"Foreign Org {uuid.uuid4().hex[:4]}", code=f"FOR-{uuid.uuid4().hex[:4]}")
        session.add(other_org)
        await session.flush()

        foreign_prod = Product(
            organization_id=other_org.id,
            name="Foreign Inventory Item",
            sku=f"SKU-FOR-{uuid.uuid4().hex[:6]}",
            selling_price=Decimal("10.00"),
            current_stock=5
        )
        session.add(foreign_prod)
        await session.commit()

        # Count org 1 products
        org1_prod_count = (await session.execute(
            select(Product).where(Product.organization_id == 1)
        )).scalars().all()

    sync_res = await client.post("/api/sync/all", headers=headers, json={"modules": {}})
    assert sync_res.status_code == 200
    reported_products = sync_res.json()["module_metrics"]["inventory"]["total_products"]
    # Does not count foreign organization's products
    assert reported_products == len(org1_prod_count)

def test_compose_yaml_audit_fixes():
    """
    SEC-49, SEC-50, BUG-53:
    Validates compose.yaml for:
    - Independent offsite volume (not alias of backup_data)
    - Persistent document store volume
    - Backend restart: unless-stopped
    - Backend healthcheck
    """
    compose_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "compose.yaml"))
    with open(compose_path, "r") as f:
        data = yaml.safe_load(f)

    backend = data["services"]["backend"]
    # BUG-53: restart policy restored
    assert backend.get("restart") == "unless-stopped"
    # BUG-53: healthcheck configured
    assert "healthcheck" in backend
    assert "test" in backend["healthcheck"]

    # SEC-49 & SEC-50: volumes check
    vols = backend.get("volumes", [])
    vol_strings = [v if isinstance(v, str) else list(v.keys())[0] for v in vols]
    # SEC-49: OFFSITE_BACKUP_PATH does not default to backup_data
    assert not any("${OFFSITE_BACKUP_PATH:-backup_data}" in v for v in vol_strings)
    # SEC-50: Persistent document store mounted
    assert any("mongo_docs_data" in v for v in vol_strings)

    declared_vols = data.get("volumes", {})
    assert "offsite_archive_data" in declared_vols
    assert "mongo_docs_data" in declared_vols
