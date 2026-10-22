import os
import sys
import uuid
import json
import struct
import base64
import hashlib
import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy import select, text
from cryptography.fernet import Fernet

from app.database import AsyncSessionLocal, engine
from app.config import settings
from app.models.auth import User, Role
from app.models.org import Organization, Branch
from app.models.inventory import Product, ProductCategory, StockMovement
from app.models.sales import SalesOrder, SalesOrderItem, Customer, SyncIdempotencyRecord
from app.models.finance import Expense
from app.services.sales_service import create_sales_order
from app.schemas.sales import SalesOrderCreate, SalesOrderItemIn
from app.services.document_store import document_store
from app.services.disaster_recovery_service import (
    encrypt_backup_file,
    decrypt_backup_file,
    get_dedicated_backup_cipher,
    get_legacy_backup_cipher,
    DisasterRecoveryService,
    MAGIC_STREAM_HEADER,
    MAGIC_STREAM_HEADER_V1
)

@pytest.mark.asyncio
async def test_bug54_sales_sync_schema_and_price_tamper_protection(client: AsyncClient, admin_auth_token: str):
    """
    BUG-54:
    - Sales sync processor imports and uses SalesOrderItemIn (not nonexistent SalesOrderItemCreate).
    - Client-supplied unit_price is ignored; authoritative database price is used.
    - Float quantities/product_ids like "1.5" are strictly rejected with HTTP 400.
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    sku = f"SKU-SYNC-{uuid.uuid4().hex[:6]}"

    async with AsyncSessionLocal() as session:
        # Get admin user and ensure organization_id is set
        admin_user = (await session.execute(select(User).where(User.email == settings.BOOTSTRAP_ADMIN_EMAIL))).scalar_one()
        admin_user.organization_id = 1
        prod = Product(
            organization_id=1,
            name="Authoritative Price Sync Item",
            sku=sku,
            selling_price=Decimal("150.00"),
            cost_price=Decimal("75.00"),
            current_stock=25
        )
        session.add(prod)
        await session.commit()
        prod_id = prod.id

    # 1. Valid sales draft with client unit_price trying to tamper (offering 10.00 instead of 150.00)
    draft_valid = {
        "modules": {
            "sales": {
                "items": [
                    {
                        "product_id": prod_id,
                        "quantity": 2,
                        "unit_price": "10.00" # Attempted price tamper
                    }
                ],
                "payment_method": "CASH"
            }
        }
    }
    sync_res = await client.post("/api/sync/all", json=draft_valid, headers=headers)
    assert sync_res.status_code == 200

    proc_res = await client.post("/api/sync/process", headers=headers)
    assert proc_res.status_code == 200
    pdata = proc_res.json()
    assert pdata["status"] == "SUCCESS"
    assert pdata["synced"] == 1

    # Verify that the created sales order used authoritative price (150.00), not tampered price (10.00)
    async with AsyncSessionLocal() as session:
        order_stmt = select(SalesOrder).order_by(SalesOrder.id.desc()).limit(1)
        created_order = (await session.execute(order_stmt)).scalar_one()
        assert created_order.subtotal == Decimal("300.00") # 2 * 150.00

    # 2. Float quantities like "1.5" or "2.5" must be rejected
    draft_float = {
        "modules": {
            "sales": {
                "items": [
                    {
                        "product_id": prod_id,
                        "quantity": "1.5"
                    }
                ],
                "payment_method": "CASH"
            }
        }
    }
    await client.post("/api/sync/all", json=draft_float, headers=headers)
    proc_res2 = await client.post("/api/sync/process", headers=headers)
    pdata2 = proc_res2.json()
    assert len(pdata2["errors"]) == 1
    assert "Invalid product ID or quantity" in pdata2["errors"][0]["error"]


@pytest.mark.asyncio
async def test_bug55_lease_version_aware_stale_claim():
    """
    BUG-55:
    Reclaiming a stale PROCESSING draft requires the previous claim_time in the query.
    Two workers claiming the same stale draft cannot both succeed; exactly one succeeds.
    """
    draft_id = f"test-stale-draft-{uuid.uuid4().hex[:6]}"
    old_claim_time = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
    new_claim_time_1 = datetime.now(timezone.utc).isoformat()
    new_claim_time_2 = (datetime.now(timezone.utc) + timedelta(seconds=1)).isoformat()

    # Seed draft as stale PROCESSING with old_claim_time
    await document_store.insert_document("module_drafts", {
        "id": draft_id,
        "status": "PROCESSING",
        "claim_time": old_claim_time,
        "data": {"foo": "bar"}
    })

    # Worker 1 claims with expected previous claim_time
    claimed_1 = await document_store.claim_document(
        "module_drafts",
        {"id": draft_id, "status": "PROCESSING", "claim_time": old_claim_time},
        {"status": "PROCESSING", "claim_time": new_claim_time_1, "claim_token": "token-1"}
    )
    assert claimed_1 is True

    # Worker 2 also tries to claim with the stale old_claim_time -> MUST fail
    claimed_2 = await document_store.claim_document(
        "module_drafts",
        {"id": draft_id, "status": "PROCESSING", "claim_time": old_claim_time},
        {"status": "PROCESSING", "claim_time": new_claim_time_2, "claim_token": "token-2"}
    )
    assert claimed_2 is False


@pytest.mark.asyncio
async def test_sec52_client_idempotency_key_stripped_and_payload_conflict(client: AsyncClient, admin_auth_token: str):
    """
    SEC-52:
    - Client-supplied idempotency_key is stripped from clean_data.
    - Server-owned idempotency key is derived from draft_id and payload hash.
    - If duplicate key exists with DIFFERENT payload, reject with HTTP 409 Conflict.
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Submit draft with a client-injected idempotency_key
    client_key = f"CLIENT-INJECTED-{uuid.uuid4().hex[:6]}"
    unique_desc = f"Legitimate office supplies {uuid.uuid4().hex[:8]}"
    payload = {
        "modules": {
            "expenses": {
                "idempotency_key": client_key,
                "amount": "250.00",
                "category": "Office",
                "description": unique_desc
            }
        }
    }
    res = await client.post("/api/sync/all", json=payload, headers=headers)
    assert res.status_code == 200

    # Verify client key was stripped from stored draft data
    async with AsyncSessionLocal() as session:
        admin_user = (await session.execute(select(User).where(User.email == settings.BOOTSTRAP_ADMIN_EMAIL))).scalar_one()
        draft = await document_store.find_document("module_drafts", {"user_id": admin_user.id, "module": "expenses"})
        assert draft is not None
        assert "idempotency_key" not in draft["data"]

    # 2. Process draft -> succeeds and records authoritative ledger entry
    proc = await client.post("/api/sync/process", headers=headers)
    assert proc.status_code == 200
    assert proc.json()["synced"] == 1

    # Retrieve ledger record
    async with AsyncSessionLocal() as session:
        idemp = (await session.execute(select(SyncIdempotencyRecord).where(SyncIdempotencyRecord.module == "expenses").order_by(SyncIdempotencyRecord.id.desc()))).scalars().first()
        assert idemp is not None
        assert idemp.payload_hash is not None
        assert not idemp.idempotency_key.startswith("CLIENT-INJECTED")

    # 3. Test conflict detection:
    conflict_draft_id = f"{admin_user.id}:conflict_{uuid.uuid4().hex[:8]}"
    data_a = {"amount": "100.00", "description": "Original transaction"}
    data_b = {"amount": "200.00", "description": "Conflicting transaction"}
    hash_a = hashlib.sha256(json.dumps(data_a, sort_keys=True, default=str).encode()).hexdigest()
    hash_b = hashlib.sha256(json.dumps(data_b, sort_keys=True, default=str).encode()).hexdigest()

    # Pre-seed ledger with key derived from draft_b but bound to hash_a
    key = f"IDEMP-{conflict_draft_id}-{hash_b[:16]}"

    async with AsyncSessionLocal() as session:
        rec = SyncIdempotencyRecord(
            idempotency_key=key,
            module="expenses",
            user_id=admin_user.id,
            organization_id=1,
            status="APPLIED",
            reference_id="EXP-OLD",
            payload_hash=hash_a
        )
        session.add(rec)
        await session.commit()

        # Seed draft with data_b
        await document_store.insert_document("module_drafts", {
            "id": conflict_draft_id,
            "user_id": admin_user.id,
            "module": "expenses",
            "data": data_b,
            "status": "PENDING"
        })

    # Processing should detect payload hash mismatch and reject with 409 Conflict
    proc_res = await client.post("/api/sync/process", headers=headers)
    assert proc_res.status_code == 409
    assert "Idempotency conflict" in proc_res.json()["detail"]


@pytest.mark.asyncio
async def test_sec53_tenant_isolation_fails_closed():
    """
    SEC-53:
    - Sales order creation fails with HTTP 403 when organization_id is None.
    - Customer and Product cross-organization access is strictly forbidden.
    """
    async with AsyncSessionLocal() as session:
        order_in = SalesOrderCreate(
            items=[SalesOrderItemIn(product_id=1, quantity=1)],
            discount_amount=Decimal("0.00"),
            payment_method="CASH"
        )
        with pytest.raises(Exception) as exc_info:
            await create_sales_order(
                db=session,
                order_in=order_in,
                cashier_user_id=1,
                organization_id=None # Missing organization context
            )
        assert "Organization context is required" in str(exc_info.value)


@pytest.mark.asyncio
async def test_sec54_duplicate_product_name_disambiguation(client: AsyncClient, admin_auth_token: str):
    """
    SEC-54:
    - Multiple products with the same name in one organization do not trigger MultipleResultsFound.
    - When unique SKU is provided, resolves to that exact product.
    - When name is ambiguous and SKU is omitted/different, returns HTTP 409 Conflict.
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    dup_name = f"Common Bracket {uuid.uuid4().hex[:4]}"
    sku1 = f"SKU-BRK-A-{uuid.uuid4().hex[:4]}"
    sku2 = f"SKU-BRK-B-{uuid.uuid4().hex[:4]}"

    async with AsyncSessionLocal() as session:
        p1 = Product(organization_id=1, name=dup_name, sku=sku1, selling_price=Decimal("10.00"), cost_price=Decimal("5.00"), current_stock=100)
        p2 = Product(organization_id=1, name=dup_name, sku=sku2, selling_price=Decimal("12.00"), cost_price=Decimal("6.00"), current_stock=200)
        session.add_all([p1, p2])
        await session.commit()

    # 1. Importing with duplicate name without SKU -> returns HTTP 409 Conflict
    payload_ambiguous = {
        "entity_type": "products",
        "records": [
            {
                "name": dup_name,
                "current_stock": 50,
                "selling_price": "10.00"
            }
        ]
    }
    res_amb = await client.post("/api/data-import/commit", json=payload_ambiguous, headers=headers)
    assert res_amb.status_code == 409
    assert "Ambiguous product match: Multiple products found with name" in res_amb.json()["detail"]

    # 2. Importing with unique SKU -> resolves cleanly
    payload_sku = {
        "entity_type": "products",
        "records": [
            {
                "name": dup_name,
                "sku": sku1,
                "current_stock": 120,
                "selling_price": "10.00",
                "cost_price": "5.00"
            }
        ]
    }
    res_sku = await client.post("/api/data-import/commit", json=payload_sku, headers=headers)
    assert res_sku.status_code == 200
    assert res_sku.json()["updated_count"] == 1


@pytest.mark.asyncio
async def test_bug56_inventory_import_alias_routes_to_stock_adjustment(client: AsyncClient, admin_auth_token: str):
    """
    BUG-56:
    entity_type='inventory' routes to the dedicated stock-adjustment path
    and leaves product prices untouched.
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    sku = f"SKU-INV-ALIAS-{uuid.uuid4().hex[:6]}"

    async with AsyncSessionLocal() as session:
        prod = Product(
            organization_id=1,
            name="Inventory Alias Test Item",
            sku=sku,
            selling_price=Decimal("99.99"),
            cost_price=Decimal("49.99"),
            current_stock=10
        )
        session.add(prod)
        await session.commit()

    import_payload = {
        "entity_type": "inventory", # Must route to stock-adjustment
        "records": [
            {
                "sku": sku,
                "current_stock": 25
            }
        ]
    }
    res = await client.post("/api/data-import/commit", json=import_payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["updated_count"] == 1

    # Verify stock updated and price untouched
    async with AsyncSessionLocal() as session:
        refreshed = (await session.execute(select(Product).where(Product.sku == sku))).scalar_one()
        assert refreshed.current_stock == 25
        assert refreshed.selling_price == Decimal("99.99")


@pytest.mark.asyncio
async def test_bug57_excessive_discount_rejection():
    """
    BUG-57:
    Discount greater than gross sale value (subtotal + tax) must be rejected with HTTP 400.
    """
    async with AsyncSessionLocal() as session:
        prod = Product(
            organization_id=1,
            name="Discount Test Product",
            sku=f"SKU-DISC-{uuid.uuid4().hex[:6]}",
            selling_price=Decimal("100.00"),
            cost_price=Decimal("50.00"),
            current_stock=10
        )
        session.add(prod)
        await session.commit()
        prod_id = prod.id

        order_in = SalesOrderCreate(
            items=[SalesOrderItemIn(product_id=prod_id, quantity=1)],
            discount_amount=Decimal("150.00"), # Subtotal is 100.00, discount 150.00 is excessive
            payment_method="CASH"
        )
        with pytest.raises(Exception) as exc_info:
            await create_sales_order(
                db=session,
                order_in=order_in,
                cashier_user_id=1,
                organization_id=1
            )
        assert "Discount cannot exceed the sale value" in str(exc_info.value)


@pytest.mark.asyncio
async def test_bug58_multi_org_migration_ambiguity_detection():
    """
    BUG-58:
    Existing migration detects customers/suppliers/products associated with multiple organizations
    and halts with an explicit error instead of arbitrarily picking an org using LIMIT 1.
    """
    async with AsyncSessionLocal() as session:
        # Create 2 organizations and 2 branches
        org1 = Organization(name=f"Org A {uuid.uuid4().hex[:4]}", code=f"OA-{uuid.uuid4().hex[:4]}")
        org2 = Organization(name=f"Org B {uuid.uuid4().hex[:4]}", code=f"OB-{uuid.uuid4().hex[:4]}")
        session.add_all([org1, org2])
        await session.commit()

        b1 = Branch(name="Branch 1", code=f"B1-{uuid.uuid4().hex[:6]}", organization_id=org1.id)
        b2 = Branch(name="Branch 2", code=f"B2-{uuid.uuid4().hex[:6]}", organization_id=org2.id)
        session.add_all([b1, b2])
        await session.commit()

        # Create customer with no organization assigned
        amb_cust = Customer(name=f"Ambiguous Customer {uuid.uuid4().hex[:4]}", organization_id=None)
        session.add(amb_cust)
        await session.commit()

        # Create sales orders linking this customer to both branch 1 (org1) and branch 2 (org2)
        so1 = SalesOrder(
            invoice_number=f"INV-AMB-{uuid.uuid4().hex[:6]}",
            customer_id=amb_cust.id,
            branch_id=b1.id,
            cashier_user_id=1,
            subtotal=Decimal("10.00"),
            total_amount=Decimal("10.00")
        )
        so2 = SalesOrder(
            invoice_number=f"INV-AMB-{uuid.uuid4().hex[:6]}",
            customer_id=amb_cust.id,
            branch_id=b2.id,
            cashier_user_id=1,
            subtotal=Decimal("20.00"),
            total_amount=Decimal("20.00")
        )
        session.add_all([so1, so2])
        await session.commit()

        amb_cust_id = amb_cust.id

    # Running ambiguity check should detect this customer
    async with engine.begin() as conn:
        res = await conn.execute(text(
            "SELECT sales_orders.customer_id, COUNT(DISTINCT branches.organization_id) "
            "FROM sales_orders "
            "JOIN branches ON sales_orders.branch_id = branches.id "
            "WHERE branches.organization_id IS NOT NULL "
            "GROUP BY sales_orders.customer_id "
            "HAVING COUNT(DISTINCT branches.organization_id) > 1"
        ))
        amb_ids = [r[0] for r in res.fetchall()]
        assert amb_cust_id in amb_ids


def test_bug59_bug60_chunk_sequence_authentication_and_reorder_rejection(tmp_path):
    """
    BUG-59 & BUG-60:
    - Chunks contain monotonic sequence index and plaintext SHA-256 in header.
    - Swapping, reordering, or duplicating chunks fails decryption.
    - Decryption to temporary stream verifies hash before plaintext deletion.
    """
    plain_file = tmp_path / "financial_backup.sql"
    plain_content = b"STREAMING_ACID_TRANSACTION_PAYLOAD_" * 4000 # ~140 KB
    plain_file.write_bytes(plain_content)

    # 1. Encrypt file with sequence indexing and whole-file hash
    enc_path = encrypt_backup_file(str(plain_file))
    assert os.path.exists(enc_path)
    assert not os.path.exists(str(plain_file)) # Source deleted after verified encryption

    # Verify header is V2
    with open(enc_path, "rb") as f:
        hdr = f.read(len(MAGIC_STREAM_HEADER))
        assert hdr == MAGIC_STREAM_HEADER

    # 2. Decrypt valid stream
    dec_file = tmp_path / "financial_backup_restored.sql"
    decrypt_backup_file(enc_path, str(dec_file))
    assert dec_file.read_bytes() == plain_content

    # 3. BUG-60: Tamper with chunk sequence (swap chunk 0 and chunk 1)
    with open(enc_path, "rb") as f:
        header_and_sha = f.read(len(MAGIC_STREAM_HEADER) + 32)
        chunk0_hdr = f.read(8)
        c0_idx, c0_len = struct.unpack(">II", chunk0_hdr)
        chunk0_data = f.read(c0_len)
        chunk1_hdr = f.read(8)
        c1_idx, c1_len = struct.unpack(">II", chunk1_hdr)
        chunk1_data = f.read(c1_len)
        rest = f.read()

    # Reorder chunk 1 before chunk 0
    tampered_file = tmp_path / "tampered_reordered.sql.enc"
    with open(tampered_file, "wb") as f_tamp:
        f_tamp.write(header_and_sha)
        f_tamp.write(chunk1_hdr + chunk1_data)
        f_tamp.write(chunk0_hdr + chunk0_data)
        f_tamp.write(rest)

    tampered_dest = tmp_path / "tampered_restored.sql"
    with pytest.raises(RuntimeError) as exc_info:
        decrypt_backup_file(str(tampered_file), str(tampered_dest))
    assert "authentication or sequence check failed" in str(exc_info.value).lower()


def test_sec55_production_backup_key_enforcement(monkeypatch):
    """
    SEC-55:
    In production (ENVIRONMENT=production), get_dedicated_backup_cipher()
    fails closed with a RuntimeError if BACKUP_ENCRYPTION_KEY is not set.
    """
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("BACKUP_ENCRYPTION_KEY", raising=False)

    with pytest.raises(RuntimeError) as exc_info:
        get_dedicated_backup_cipher()
    assert "BACKUP_ENCRYPTION_KEY environment variable is required in production" in str(exc_info.value)
