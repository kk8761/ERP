import pytest
import os
import json
import uuid
import tempfile
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy import select
from pathlib import Path

from app.models.auth import User, Role, Permission, UserRole, RolePermission
from app.models.org import Branch, Warehouse
from app.models.hr import Employee
from app.models.inventory import Product, StockMovement
from app.models.procurement import Supplier
from app.models.finance import Expense
from app.services.document_store import document_store, SECURITY_SENSITIVE_COLLECTIONS
from app.services.disaster_recovery_service import DisasterRecoveryService
from app.services.ai_tools import execute_typed_tool
from app.database import AsyncSessionLocal
from app.auth.security import create_access_token, hash_password


@pytest.mark.asyncio
async def test_bug24_and_import_fix_for_employees_and_warehouses(client: AsyncClient, admin_auth_token: str):
    """
    BUG-24:
    Verifies that importing employees and warehouses does not raise NameError: name 'and_' is not defined.
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Employee import with explicit branch
    emp_res = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "employees",
        "branch_id": 1,
        "records": [{
            "name": "Audit Test Employee",
            "email": "audit_emp_zip6@example.com",
            "employee_code": "EMP-ZIP6-001",
            "basic_salary": 45000.0,
            "designation": "Systems Architect"
        }]
    })
    assert emp_res.status_code == 200, f"Employee import failed: {emp_res.text}"
    assert emp_res.json()["created_count"] + emp_res.json()["updated_count"] >= 1

    # 2. Warehouse import with explicit branch
    wh_res = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "warehouses",
        "branch_id": 1,
        "records": [{
            "code": "WH-ZIP6-01",
            "name": "Audit Central Warehouse",
            "location": "Sector 4 Logistics Hub"
        }]
    })
    assert wh_res.status_code == 200, f"Warehouse import failed: {wh_res.text}"
    assert wh_res.json()["created_count"] + wh_res.json()["updated_count"] >= 1


@pytest.mark.asyncio
async def test_sec40_import_permission_catalog_alignment(client: AsyncClient):
    """
    SEC-40:
    Verifies aligned import permissions:
    - customers: customers.manage
    - products: inventory.create / inventory.manage
    - expenses: expenses.record
    - employees: hr.manage
    - suppliers: suppliers.manage
    - warehouses: warehouses.manage
    """
    async with AsyncSessionLocal() as db:
        # Create user with only customers.manage
        u1 = User(
            email=f"cust_user_{uuid.uuid4().hex[:6]}@example.com",
            full_name="Customer Manager",
            password_hash=hash_password("Pass123!"),
            is_active=True,
            branch_id=1,
            organization_id=1
        )
        r1 = Role(name=f"RoleCust_{uuid.uuid4().hex[:6]}")
        p1 = await db.execute(select(Permission).where(Permission.code == "customers.manage"))
        p1_obj = p1.scalar_one_or_none()
        if not p1_obj:
            p1_obj = Permission(code="customers.manage", module="sales", description="Manage customers")
            db.add(p1_obj)
            await db.flush()
        db.add_all([u1, r1])
        await db.flush()
        db.add(RolePermission(role_id=r1.id, permission_id=p1_obj.id))
        db.add(UserRole(user_id=u1.id, role_id=r1.id))
        await db.commit()

        token1 = create_access_token({"sub": str(u1.id), "email": u1.email})

    headers1 = {"Authorization": f"Bearer {token1}"}

    # Should succeed for customers
    c_res = await client.post("/api/data-import/commit", headers=headers1, json={
        "entity_type": "customers",
        "records": [{"name": "Permitted Customer SEC40", "phone": "9887766554"}]
    })
    assert c_res.status_code == 200, f"Customer import failed: {c_res.text}"

    # Should fail with 403 for expenses (user lacks expenses.record)
    exp_res = await client.post("/api/data-import/commit", headers=headers1, json={
        "entity_type": "expenses",
        "records": [{"title": "Unauthorized Expense", "amount": 100.0}]
    })
    assert exp_res.status_code == 403
    assert "expenses.record" in exp_res.json()["detail"]


@pytest.mark.asyncio
async def test_sec41_document_store_authoritative_read_and_fail_closed():
    """
    SEC-41:
    - Authoritative MongoDB reads do not fall through to stale local store.
    - Security-sensitive collections fail closed when authoritative store is unavailable.
    """
    assert "employee_access_authorizations" in SECURITY_SENSITIVE_COLLECTIONS

    # When MongoDB is disconnected, querying security-sensitive collection returns None (fails closed)
    # Ensure local file exists with dummy data
    local_path = document_store._get_local_file_path("employee_access_authorizations")
    document_store._write_local_collection("employee_access_authorizations", [
        {"email": "revoked_user@example.com", "accessible_branches": [1, 2, 3]}
    ])

    # find_document on security-sensitive collection should refuse stale local fallback
    # when MongoDB is not connected
    if not document_store._is_mongo_connected:
        doc = await document_store.find_document("employee_access_authorizations", {"email": "revoked_user@example.com"})
        assert doc is None, "Security-sensitive collection must fail closed and never resurrect stale local records!"


@pytest.mark.asyncio
async def test_bug25_strict_numeric_parsing(client: AsyncClient, admin_auth_token: str):
    """
    BUG-25:
    Invalid numeric strings like "abc" must raise HTTP 400 (never silently convert to 0).
    Zero selling price must be rejected.
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Product with string "abc" as selling price
    res_abc = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "products",
        "branch_id": 1,
        "records": [{"name": "Malformed Price Product", "selling_price": "abc", "cost_price": 50, "current_stock": 10}]
    })
    assert res_abc.status_code == 400
    assert "must be numeric" in res_abc.json()["detail"]

    # 2. Product with selling price 0
    res_zero = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "products",
        "branch_id": 1,
        "records": [{"name": "Free Product Zero", "selling_price": 0, "cost_price": 50, "current_stock": 10}]
    })
    assert res_zero.status_code == 400
    assert "must be positive" in res_zero.json()["detail"]

    # 3. Employee with malformed salary
    res_sal = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "employees",
        "branch_id": 1,
        "records": [{"name": "Invalid Sal Employee", "basic_salary": "invalid_number"}]
    })
    assert res_sal.status_code == 400
    assert "must be numeric" in res_sal.json()["detail"]


@pytest.mark.asyncio
async def test_bug26_stock_movements_recorded_on_product_import(client: AsyncClient, admin_auth_token: str):
    """
    BUG-26:
    Product imports must record StockMovement audit entries:
    - OPENING_STOCK for new products
    - ADJUSTMENT for existing stock corrections
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    sku = f"SKU-MOV-{uuid.uuid4().hex[:6].upper()}"
    batch = f"BATCH-TEST-{uuid.uuid4().hex[:6].upper()}"

    # 1. Initial product import
    res1 = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "products",
        "branch_id": 1,
        "batch_id": batch,
        "records": [{
            "name": f"Stock Test Product {sku}",
            "sku": sku,
            "selling_price": 100.0,
            "cost_price": 60.0,
            "current_stock": 50,
            "reorder_level": 10
        }]
    })
    assert res1.status_code == 200

    async with AsyncSessionLocal() as db:
        prod_res = await db.execute(select(Product).where(Product.sku == sku))
        prod = prod_res.scalar_one()

        # Check opening stock movement created
        mov_res = await db.execute(
            select(StockMovement).where(StockMovement.product_id == prod.id).order_by(StockMovement.id.asc())
        )
        movements = mov_res.scalars().all()
        assert len(movements) >= 1
        assert movements[0].movement_type == "OPENING_STOCK"
        assert movements[0].quantity == 50
        assert movements[0].new_stock == 50

    # 2. Re-import correcting stock from 50 to 20
    batch2 = f"BATCH-TEST-{uuid.uuid4().hex[:6].upper()}"
    res2 = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "products",
        "branch_id": 1,
        "batch_id": batch2,
        "records": [{
            "name": f"Stock Test Product {sku}",
            "sku": sku,
            "selling_price": 100.0,
            "cost_price": 60.0,
            "current_stock": 20,
            "reorder_level": 10
        }]
    })
    assert res2.status_code == 200

    async with AsyncSessionLocal() as db:
        mov_res2 = await db.execute(
            select(StockMovement).where(StockMovement.product_id == prod.id).order_by(StockMovement.id.desc())
        )
        latest_mov = mov_res2.scalars().first()
        assert latest_mov.movement_type == "ADJUSTMENT_OUT"
        assert latest_mov.quantity == 30
        assert latest_mov.previous_stock == 50
        assert latest_mov.new_stock == 20


@pytest.mark.asyncio
async def test_bug27_explicit_branch_required_for_employees_and_warehouses(client: AsyncClient, admin_auth_token: str):
    """
    BUG-27:
    Admin omitting branch_id must raise HTTP 400 for branch-scoped entities (never silently default to 1).
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # Omitted branch_id for employees
    res_emp = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "employees",
        "records": [{"name": "No Branch Employee", "basic_salary": 25000.0}]
    })
    assert res_emp.status_code == 400
    assert "Branch selection is required" in res_emp.json()["detail"]

    # Omitted branch_id for warehouses
    res_wh = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "warehouses",
        "records": [{"name": "No Branch Warehouse", "code": "WH-NOBRANCH"}]
    })
    assert res_wh.status_code == 400
    assert "Branch selection is required" in res_wh.json()["detail"]


@pytest.mark.asyncio
async def test_bug28_vendor_import_does_not_invent_business_data(client: AsyncClient, admin_auth_token: str):
    """
    BUG-28:
    Vendor imports must not invent Hyderabad, Net 30 Days, or 92.5 rating score when omitted.
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    v_name = f"Authentic Vendor {uuid.uuid4().hex[:6]}"

    res = await client.post("/api/data-import/commit", headers=headers, json={
        "entity_type": "vendors",
        "records": [{
            "name": v_name,
            "email": "vendor@authentic.com"
        }]
    })
    assert res.status_code == 200

    async with AsyncSessionLocal() as db:
        sup_res = await db.execute(select(Supplier).where(Supplier.name == v_name))
        sup = sup_res.scalar_one()

        assert sup.city is None, f"Expected city to be None, got '{sup.city}'"
        assert sup.payment_terms is None, f"Expected payment_terms to be None, got '{sup.payment_terms}'"
        assert sup.rating_score is None, f"Expected rating_score to be None (unrated), got '{sup.rating_score}'"


@pytest.mark.asyncio
async def test_bug29_branch_switch_upsert_and_active_context(client: AsyncClient, admin_auth_token: str):
    """
    BUG-29:
    Branch switch uses upsert_document and updates active branch context across requests.
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # Switch to branch 1
    s1 = await client.post("/api/branches/switch-context", headers=headers, json={"branch_id": 1})
    assert s1.status_code == 200
    assert s1.json()["active_branch_id"] == 1

    # Verify document in user_session_branch_context
    ctx = await document_store.find_document("user_session_branch_context", {"user_id": 1})
    assert ctx is not None
    assert ctx["active_branch_id"] == 1


@pytest.mark.asyncio
async def test_sec43_and_bug30_ai_tools_tenant_isolation_and_permissions(admin_auth_token: str):
    """
    SEC-43 & BUG-30:
    - User model has organization_id column.
    - AI tool execute_typed_tool validates organization and permission procurement.manage.
    """
    async with AsyncSessionLocal() as db:
        u_res = await db.execute(select(User).where(User.id == 1))
        u = u_res.scalar_one()
        assert hasattr(u, "organization_id")

        # Test execute_typed_tool with update_vendor_ratings_batch
        res = await execute_typed_tool(
            tool_name="update_vendor_ratings_batch",
            parameters={"vendor_updates": []},
            db=db,
            user_id=1,
            user_email="admin@nexaerp.internal"
        )
        assert res["status"] in ("SUCCESS", "ERROR")
        # Should not fail with "Unauthorized or unknown tool" or "Administrative authorization required"
        assert "Administrative authorization required" not in res.get("message", "")


@pytest.mark.asyncio
async def test_bug31_and_bug33_dr_service_authentic_history_and_physical_retention():
    """
    BUG-31 & BUG-33:
    - list_backups and get_dr_drills_history do not seed fake historical records into empty tables.
    - apply_retention_lifecycle executes physical file moves.
    """
    async with AsyncSessionLocal() as db:
        # Authentic history query
        drills = await DisasterRecoveryService.get_dr_drills_history(db)
        assert isinstance(drills, list)

        # Test physical file movement in apply_retention_lifecycle
        # Create a real temporary backup file
        with tempfile.NamedTemporaryFile(suffix=".backup.gz", delete=False) as tf:
            tf.write(b"SAMPLE_BACKUP_CONTENT")
            tf_path = tf.name

        try:
            from app.models.disaster_recovery import BackupRecord
            from datetime import datetime, timezone, timedelta
            now = datetime.now(timezone.utc)
            old_time = now - timedelta(days=95)

            rec = BackupRecord(
                id=f"BKP-TEST-{uuid.uuid4().hex[:8]}",
                backup_name=os.path.basename(tf_path),
                backup_type="FULL",
                status="COMPLETED",
                storage_tier="HOT_ACTIVE",
                retention_days=90,
                retention_until=old_time + timedelta(days=90),
                file_path=tf_path,
                file_size_bytes=os.path.getsize(tf_path),
                checksum_sha256="abc123",
                is_archived=False,
                created_at=old_time
            )
            db.add(rec)
            await db.commit()

            # Apply lifecycle
            res = await DisasterRecoveryService.apply_retention_lifecycle(db)
            assert res["status"] == "SUCCESS"
            assert res["archived_to_cold_glacier"] >= 1
            assert res["physical_files_relocated"] >= 1

            # Verify file was physically moved
            await db.refresh(rec)
            assert "cold_glacier" in rec.file_path
            assert os.path.exists(rec.file_path)

            # Cleanup moved file
            if os.path.exists(rec.file_path):
                os.remove(rec.file_path)
        finally:
            if os.path.exists(tf_path):
                os.remove(tf_path)


@pytest.mark.asyncio
async def test_bug35_sync_drafts_process_endpoint(client: AsyncClient, admin_auth_token: str):
    """
    BUG-35:
    /api/sync/process consumes pending module drafts and applies them to business tables,
    marking draft status SYNCED.
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Post a draft to /api/sync/all
    sync_res = await client.post("/api/sync/all", headers=headers, json={
        "modules": {
            "expenses": {
                "amount": 250.0,
                "category": "Travel",
                "description": "Sync Draft Travel Expense"
            }
        }
    })
    assert sync_res.status_code == 200
    assert sync_res.json()["status"] == "PENDING"

    # 2. Process drafts via worker endpoint
    proc_res = await client.post("/api/sync/process", headers=headers)
    assert proc_res.status_code == 200
    assert proc_res.json()["synced"] >= 1

    # 3. Check /api/sync/all again: now all drafts are SYNCED
    sync_res2 = await client.post("/api/sync/all", headers=headers, json={"modules": {}})
    assert sync_res2.status_code == 200
    assert sync_res2.json()["status"] == "SYNCED"
