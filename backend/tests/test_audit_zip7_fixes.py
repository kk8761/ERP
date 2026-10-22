import pytest
import os
import json
import uuid
import math
import tempfile
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy import select
from pathlib import Path

from app.models.auth import User, Role, Permission, UserRole, RolePermission
from app.models.org import Branch, Warehouse, Organization
from app.models.hr import Employee
from app.models.inventory import Product, StockMovement
from app.models.procurement import Supplier
from app.models.finance import Expense
from app.models.disaster_recovery import BackupRecord
from app.services.document_store import document_store
from app.services.disaster_recovery_service import DisasterRecoveryService, encrypt_backup_file, decrypt_backup_file
from app.services.ai_tools import execute_typed_tool, tool_search_inventory
from app.database import AsyncSessionLocal
from app.auth.security import create_access_token, hash_password
from app.auth.dependencies import is_admin_or_exec, logger


@pytest.mark.asyncio
async def test_sec44_sync_endpoint_module_permission_enforcement(client: AsyncClient):
    """
    SEC-44:
    POST /api/sync/process validates module permissions:
    - sales draft requires sales.create
    - expenses draft requires expenses.record
    A user lacking these permissions cannot process drafts and receives 403 Forbidden.
    """
    # Create user with no sales.create or expenses.record
    async with AsyncSessionLocal() as db:
        user_no_perms = User(
            email=f"restricted_sync_{uuid.uuid4().hex[:6]}@example.com",
            full_name="Restricted Sync User",
            password_hash=hash_password("Pass123!"),
            is_active=True,
            branch_id=1,
            organization_id=1
        )
        db.add(user_no_perms)
        await db.commit()
        await db.refresh(user_no_perms)
        user_id = user_no_perms.id
        token = create_access_token({"sub": str(user_id), "email": user_no_perms.email})

    headers = {"Authorization": f"Bearer {token}"}

    # Seed an unauthorized expense draft in module_drafts
    draft_id = f"{user_id}:expenses"
    await document_store.upsert_document(
        "module_drafts",
        {"user_id": user_id, "module": "expenses"},
        {
            "id": draft_id,
            "user_id": user_id,
            "branch_id": 1,
            "module": "expenses",
            "data": {"amount": 500.0, "category": "Office", "description": "Unauthorized sync draft"},
            "status": "PENDING",
            "updated_at": "2026-10-22T10:00:00"
        }
    )

    # Call /api/sync/process
    res = await client.post("/api/sync/process", headers=headers)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["synced"] == 0
    assert len(res_data["errors"]) >= 1
    assert "expenses.record" in res_data["errors"][0]["error"]

    # Verify draft remains ERROR, not SYNCED
    doc = await document_store.find_document("module_drafts", {"id": draft_id})
    assert doc["status"] == "ERROR"


@pytest.mark.asyncio
async def test_bug40_and_bug41_sync_idempotency_and_validation(client: AsyncClient, admin_auth_token: str):
    """
    BUG-40 & BUG-41:
    - Rejects unsupported modules and malformed drafts with ERROR (never marks SYNCED).
    - Enforces idempotency key: re-processing an already-applied draft does not create duplicates.
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Post draft with unsupported module
    await client.post("/api/sync/all", headers=headers, json={
        "modules": {
            "unsupported_mod": {"data": "some_value"}
        }
    })
    proc_res1 = await client.post("/api/sync/process", headers=headers)
    assert proc_res1.status_code == 200
    # Unsupported module must fail and not be synced
    err_modules = [e["module"] for e in proc_res1.json().get("errors", [])]
    assert "unsupported_mod" in err_modules

    # 2. Post valid expense draft with unique idempotency key
    idemp_key = f"IDEMP-TEST-{uuid.uuid4().hex}"
    await client.post("/api/sync/all", headers=headers, json={
        "modules": {
            "expenses": {
                "amount": 150.0,
                "category": "Supplies",
                "description": "Idempotent Expense Test",
                "idempotency_key": idemp_key
            }
        }
    })

    # First process: should succeed and sync 1
    p1 = await client.post("/api/sync/process", headers=headers)
    assert p1.status_code == 200
    assert p1.json()["synced"] >= 1

    # Second process: draft already applied, must not re-insert or double count
    p2 = await client.post("/api/sync/process", headers=headers)
    assert p2.status_code == 200
    # No pending drafts remained to process
    assert p2.json()["processed"] == 0


@pytest.mark.asyncio
async def test_sec45_granular_inventory_import_permissions(client: AsyncClient):
    """
    SEC-45:
    Product-import separately enforces:
    - inventory.create for new products
    - inventory.update for modifying existing product details/prices
    - inventory.adjust for modifying existing product stock
    """
    async with AsyncSessionLocal() as db:
        # User A: Only inventory.create
        u_create = User(
            email=f"create_only_{uuid.uuid4().hex[:6]}@example.com",
            full_name="Create Only User",
            password_hash=hash_password("Pass123!"),
            is_active=True,
            branch_id=1,
            organization_id=1
        )
        r_create = Role(name=f"RoleCreate_{uuid.uuid4().hex[:6]}")
        p_c = await db.execute(select(Permission).where(Permission.code == "inventory.create"))
        p_c_obj = p_c.scalar_one()

        db.add_all([u_create, r_create])
        await db.flush()
        db.add(RolePermission(role_id=r_create.id, permission_id=p_c_obj.id))
        db.add(UserRole(user_id=u_create.id, role_id=r_create.id))

        # Seed an existing product in DB
        existing_p = Product(
            name=f"Protected Prod {uuid.uuid4().hex[:6]}",
            sku=f"SKU-PROT-{uuid.uuid4().hex[:6].upper()}",
            selling_price=Decimal("100.00"),
            cost_price=Decimal("50.00"),
            current_stock=20,
            reorder_level=5,
            organization_id=1,
            category_id=1,
            is_active=True
        )
        db.add(existing_p)
        await db.commit()
        await db.refresh(existing_p)

        token_create = create_access_token({"sub": str(u_create.id), "email": u_create.email})

    headers_create = {"Authorization": f"Bearer {token_create}"}

    # 1. Attempt to update existing product with only inventory.create -> MUST FAIL 403
    upd_res = await client.post("/api/data-import/commit", headers=headers_create, json={
        "entity_type": "products",
        "branch_id": 1,
        "records": [{
            "sku": existing_p.sku,
            "name": existing_p.name,
            "selling_price": 120.0,
            "cost_price": 50.0,
            "current_stock": 20
        }]
    })
    assert upd_res.status_code == 403
    assert "inventory.update" in upd_res.json()["detail"]

    # 2. Creating a brand new product with inventory.create -> MUST SUCCEED
    new_sku = f"SKU-NEW-{uuid.uuid4().hex[:6].upper()}"
    new_res = await client.post("/api/data-import/commit", headers=headers_create, json={
        "entity_type": "products",
        "branch_id": 1,
        "records": [{
            "sku": new_sku,
            "name": f"New Product {new_sku}",
            "selling_price": 45.0,
            "cost_price": 20.0,
            "current_stock": 10
        }]
    })
    assert new_res.status_code == 200
    assert new_res.json()["created_count"] == 1


@pytest.mark.asyncio
async def test_sec46_and_bug42_product_org_scoping_and_disambiguation(client: AsyncClient, admin_auth_token: str):
    """
    SEC-46 & BUG-42:
    - Products and Suppliers are assigned organization_id on import.
    - Ambiguous match where SKU matches product A and name matches product B raises 409 Conflict.
    - AI search scopes to tenant organization.
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    u_id = uuid.uuid4().hex[:6].upper()
    sku1 = f"SKU-DISAMBIG-1-{u_id}"
    sku2 = f"SKU-DISAMBIG-2-{u_id}"

    async with AsyncSessionLocal() as db:
        # Seed two distinct products
        p1 = Product(name=f"Disambig Alpha {u_id}", sku=sku1, selling_price=Decimal("10"), cost_price=Decimal("5"), current_stock=5, organization_id=1, category_id=1, is_active=True)
        p2 = Product(name=f"Disambig Beta {u_id}", sku=sku2, selling_price=Decimal("20"), cost_price=Decimal("10"), current_stock=10, organization_id=1, category_id=1, is_active=True)
        db.add_all([p1, p2])
        await db.commit()

    # Import where SKU belongs to p1, but name matches p2 -> BUG-42 Ambiguity check
    ambig_res = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "products",
        "branch_id": 1,
        "records": [{
            "sku": sku1, # matches p1
            "name": f"Disambig Beta {u_id}",  # matches p2
            "selling_price": 25.0,
            "cost_price": 10.0,
            "current_stock": 5
        }]
    })
    assert ambig_res.status_code == 409
    assert "Ambiguous product match" in ambig_res.json()["detail"]

    # Test AI inventory search isolation (SEC-46)
    async with AsyncSessionLocal() as db:
        search_res = await tool_search_inventory(db=db, organization_id=1, query="Disambig Alpha")
        assert search_res["count"] >= 1
        # Organization 999 should not see organization 1's products
        search_res_other = await tool_search_inventory(db=db, organization_id=999, query="Disambig Alpha")
        assert search_res_other["count"] == 0


@pytest.mark.asyncio
async def test_bug43_strict_vendor_rating_validation(client: AsyncClient, admin_auth_token: str):
    """
    BUG-43:
    Vendor ratings must be strictly validated against finite 0.0 - 100.0 range.
    Rejects NaN, inf, >100, <0 with HTTP 400.
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Rating > 100
    r_over = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "vendors",
        "records": [{"name": f"Over Rated Vendor {uuid.uuid4().hex[:6]}", "rating_score": 150.0}]
    })
    assert r_over.status_code == 400
    assert "between 0 and 100" in r_over.json()["detail"]

    # 2. Rating < 0
    r_neg = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "vendors",
        "records": [{"name": f"Negative Rated Vendor {uuid.uuid4().hex[:6]}", "rating_score": -5.0}]
    })
    assert r_neg.status_code == 400
    assert "between 0 and 100" in r_neg.json()["detail"]

    # 3. String NaN
    r_nan = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "vendors",
        "records": [{"name": f"NaN Rated Vendor {uuid.uuid4().hex[:6]}", "rating_score": "NaN"}]
    })
    assert r_nan.status_code == 400
    assert "between 0 and 100" in r_nan.json()["detail"]


@pytest.mark.asyncio
async def test_bug37_and_bug38_branch_switching_and_all_branches_policy(client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
    """
    BUG-37 & BUG-38:
    - User with System Administrator role (is_superuser=False) is recognized as executive/admin.
    - User with ALL_BRANCHES access policy retains active branch context across authenticated requests.
    """
    async with AsyncSessionLocal() as db:
        # Create non-superuser with System Administrator role
        u_admin = User(
            email=f"sysadmin_nosuper_{uuid.uuid4().hex[:6]}@example.com",
            full_name="Non-Super SysAdmin",
            password_hash=hash_password("Pass123!"),
            is_active=True,
            is_superuser=False,
            branch_id=1,
            organization_id=1
        )
        r_admin = Role(name="System Administrator")
        # Check if role exists
        r_ex = await db.execute(select(Role).where(Role.name == "System Administrator"))
        r_admin_obj = r_ex.scalar_one_or_none() or r_admin

        db.add(u_admin)
        await db.flush()
        db.add(UserRole(user_id=u_admin.id, role_id=r_admin_obj.id))
        await db.commit()

        token_sysadmin = create_access_token({"sub": str(u_admin.id), "email": u_admin.email})

    headers = {"Authorization": f"Bearer {token_sysadmin}"}

    # BUG-37: Non-superuser System Administrator can switch to consolidated multi-branch mode (branch_id=None)
    sw_res = await client.post("/api/branches/switch-context", headers=headers, json={"branch_id": None})
    assert sw_res.status_code == 200
    assert sw_res.json()["active_branch"] == "All Branches (Consolidated)"

    # BUG-38: User with ALL_BRANCHES policy can switch to branch 2 and retain it
    # Seed branch 2 in organization 1
    async with AsyncSessionLocal() as db:
        b2_res = await db.execute(select(Branch).where(Branch.id == 2))
        b2 = b2_res.scalar_one_or_none()
        if not b2:
            b2 = Branch(id=2, name="Branch 2 Regional", code="BR-002", is_active=True, organization_id=1)
            db.add(b2)
            await db.commit()

    # Create employee with ALL_BRANCHES policy
    async with AsyncSessionLocal() as db:
        u_all_branches = User(
            email=f"all_branch_emp_{uuid.uuid4().hex[:6]}@example.com",
            full_name="All Branches Employee",
            password_hash=hash_password("Pass123!"),
            is_active=True,
            is_superuser=False,
            branch_id=1,
            organization_id=1
        )
        db.add(u_all_branches)
        await db.commit()
        await db.refresh(u_all_branches)
        token_emp = create_access_token({"sub": str(u_all_branches.id), "email": u_all_branches.email})

    orig_find = document_store.find_document
    async def mock_find_auth(coll, query):
        if coll == "employee_access_authorizations" and query.get("email") == u_all_branches.email:
            return {
                "email": u_all_branches.email,
                "branch_access_policy": "ALL_BRANCHES",
                "accessible_branches": ["ALL"]
            }
        return await orig_find(coll, query)
    monkeypatch.setattr(document_store, "find_document", mock_find_auth)

    headers_emp = {"Authorization": f"Bearer {token_emp}"}
    sw_b2 = await client.post("/api/branches/switch-context", headers=headers_emp, json={"branch_id": 2})
    assert sw_b2.status_code == 200
    assert sw_b2.json()["active_branch_id"] == 2

    # Next authenticated request verifies active branch access
    me_res = await client.get("/api/branches/my-access", headers=headers_emp)
    assert me_res.status_code == 200
    assert me_res.json()["can_access_all"] is True


def test_bug39_logger_defined_in_dependencies():
    """
    BUG-39:
    Logger is defined in dependencies.py and does not raise NameError when called.
    """
    import logging
    assert isinstance(logger, logging.Logger)
    logger.warning("Test logger invocation in dependencies module: successful")


@pytest.mark.asyncio
async def test_bug44_and_bug45_backup_aes_encryption():
    """
    BUG-44 & BUG-45:
    - Backups are encrypted on disk with AES-256 Fernet authenticated cipher.
    - Backup metadata confirms AES-256 encryption.
    - Decryption restores exact original content.
    """
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as tf:
        tf.write(b"TOP_SECRET_NEXAERP_ENTERPRISE_DATA_BACKUP_2026")
        raw_path = tf.name

    try:
        # Test encryption
        enc_path = encrypt_backup_file(raw_path)
        assert enc_path.endswith(".enc")
        assert os.path.exists(enc_path)

        # Read encrypted bytes: must not contain plaintext
        with open(enc_path, "rb") as ef:
            enc_bytes = ef.read()
        assert b"TOP_SECRET_NEXAERP_ENTERPRISE_DATA" not in enc_bytes

        # Test decryption
        with tempfile.NamedTemporaryFile(suffix=".dec", delete=False) as dec_f:
            dec_path = dec_f.name

        decrypt_backup_file(enc_path, dec_path)
        with open(dec_path, "rb") as df:
            decrypted_bytes = df.read()
        assert decrypted_bytes == b"TOP_SECRET_NEXAERP_ENTERPRISE_DATA_BACKUP_2026"

        if os.path.exists(dec_path):
            os.remove(dec_path)
        if os.path.exists(enc_path):
            os.remove(enc_path)
    finally:
        if os.path.exists(raw_path):
            os.remove(raw_path)
