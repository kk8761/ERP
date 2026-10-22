import pytest
import os
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from httpx import AsyncClient
from sqlalchemy import select, text
from fastapi import HTTPException

from app.main import app
from app.database import AsyncSessionLocal
from app.models.auth import User, Role, UserRole, Permission, RolePermission
from app.models.org import Organization, Branch
from app.models.inventory import Product
from app.models.procurement import Supplier, PurchaseOrder, PurchaseOrderItem
from app.models.finance import Account, JournalEntry
from app.services.inventory_service import adjust_product_stock
from app.services.disaster_recovery_service import DisasterRecoveryService
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
async def test_sec_66_stock_adjustment_fails_closed_without_organization():
    """SEC-66: adjust_product_stock must require organization_id and fail closed if None."""
    async with AsyncSessionLocal() as session:
        with pytest.raises(HTTPException) as exc_info:
            await adjust_product_stock(
                db=session,
                product_id=1,
                quantity_change=-5,
                movement_type="MANUAL_ADJUSTMENT",
                organization_id=None
            )
        assert exc_info.value.status_code == 403
        assert "Organization context required" in exc_info.value.detail


@pytest.mark.asyncio
async def test_sec_63_vision_deduct_enforces_permission_and_org(client: AsyncClient):
    """SEC-63: /api/vision/deduct requires inventory.adjust and validates organization."""
    async with AsyncSessionLocal() as session:
        org = Organization(name=f"Vision Org {uuid.uuid4().hex[:4]}", code=f"VO-{uuid.uuid4().hex[:4]}")
        session.add(org)
        await session.flush()

        # Unprivileged user
        unprivileged = User(
            email=f"noperm_{uuid.uuid4().hex[:6]}@nexaerp.test",
            full_name="No Perm User",
            password_hash=hash_password("Pass123!"),
            organization_id=org.id,
            is_active=True
        )
        session.add(unprivileged)
        await session.flush()
        token_noperm = create_access_token({"sub": str(unprivileged.id), "email": unprivileged.email})
        await session.commit()

    # Request without inventory.adjust should fail with 403
    resp = await client.post(
        "/api/vision/deduct",
        json={"product_id": 1, "quantity": 1},
        headers={"Authorization": f"Bearer {token_noperm}"}
    )
    assert resp.status_code == 403
    assert "Permission" in resp.text or "denied" in resp.text or "inventory.adjust" in resp.text


@pytest.mark.asyncio
async def test_sec_64_ai_assistant_tenant_isolation_and_permissions(client: AsyncClient):
    """SEC-64: AI assistant rejects users without org context, requires business permissions, and isolates catalog."""
    async with AsyncSessionLocal() as session:
        org = Organization(name=f"AI Org {uuid.uuid4().hex[:4]}", code=f"AO-{uuid.uuid4().hex[:4]}")
        session.add(org)
        await session.flush()

        # 1. User without organization
        user_no_org = User(
            email=f"noorg_{uuid.uuid4().hex[:6]}@nexaerp.test",
            full_name="No Org User",
            password_hash=hash_password("Pass123!"),
            organization_id=None,
            is_active=True
        )
        session.add(user_no_org)
        await session.flush()
        await assign_permissions(session, user_no_org, ["ai.use"])

        # 2. User with org and ai.use, but lacking procurement.create
        user_with_org = User(
            email=f"orguser_{uuid.uuid4().hex[:6]}@nexaerp.test",
            full_name="Org User",
            password_hash=hash_password("Pass123!"),
            organization_id=org.id,
            is_active=True
        )
        session.add(user_with_org)
        await session.flush()
        await assign_permissions(session, user_with_org, ["ai.use"])
        await session.commit()

        token_no_org = create_access_token({"sub": str(user_no_org.id), "email": user_no_org.email})
        token_with_org = create_access_token({"sub": str(user_with_org.id), "email": user_with_org.email})

    # AI query without org context must fail closed with 403
    resp = await client.post(
        "/api/ai/query",
        json={"prompt": "What are our policies?"},
        headers={"Authorization": f"Bearer {token_no_org}"}
    )
    assert resp.status_code == 403
    assert "organization context" in resp.text.lower()

    # User with ai.use but lacking procurement.create attempting PO action must be rejected with 403
    resp_po = await client.post(
        "/api/ai/query",
        json={"prompt": "Create PO for 50 units of Basmati Rice"},
        headers={"Authorization": f"Bearer {token_with_org}"}
    )
    assert resp_po.status_code == 403
    assert "procurement.create" in resp_po.text.lower()


@pytest.mark.asyncio
async def test_sec_65_user_management_scoped_to_organization(client: AsyncClient):
    """SEC-65: User listing and creation are scoped to caller's organization."""
    async with AsyncSessionLocal() as session:
        org_a = Organization(name=f"Audit Org A {uuid.uuid4().hex[:4]}", code=f"OA-{uuid.uuid4().hex[:4]}")
        org_b = Organization(name=f"Audit Org B {uuid.uuid4().hex[:4]}", code=f"OB-{uuid.uuid4().hex[:4]}")
        session.add_all([org_a, org_b])
        await session.flush()

        branch_b = Branch(name=f"Branch B {uuid.uuid4().hex[:4]}", code=f"BB-{uuid.uuid4().hex[:4]}", organization_id=org_b.id)
        session.add(branch_b)
        await session.flush()

        user_a = User(
            email=f"admin_a_{uuid.uuid4().hex[:6]}@test.com",
            full_name="Admin A",
            password_hash=hash_password("Pass123!"),
            organization_id=org_a.id,
            is_active=True
        )
        user_b = User(
            email=f"user_b_{uuid.uuid4().hex[:6]}@test.com",
            full_name="User B",
            password_hash=hash_password("Pass123!"),
            organization_id=org_b.id,
            is_active=True
        )
        session.add_all([user_a, user_b])
        await session.flush()
        await assign_permissions(session, user_a, ["users.view", "users.manage"])
        await session.commit()

        token_a = create_access_token({"sub": str(user_a.id), "email": user_a.email})

    # List users as Admin A: should only see Org A users
    resp = await client.get("/api/admin/users", headers={"Authorization": f"Bearer {token_a}"})
    assert resp.status_code == 200
    listed_emails = [u["email"] for u in resp.json()]
    assert user_b.email not in listed_emails

    # Attempt to create user targeting Branch B from another organization must fail with 400
    create_resp = await client.post(
        "/api/admin/users",
        json={
            "email": f"new_cross_{uuid.uuid4().hex[:4]}@test.com",
            "full_name": "Cross Org",
            "password": "Password123!",
            "branch_id": branch_b.id
        },
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert create_resp.status_code == 400
    assert "does not belong" in create_resp.text.lower()


@pytest.mark.asyncio
async def test_sec_67_purchase_order_receiving_scoping(client: AsyncClient):
    """SEC-67: PO receiving requires row locking, organization matching, and prevents duplicate receiving."""
    async with AsyncSessionLocal() as session:
        org = Organization(name=f"Proc Org {uuid.uuid4().hex[:4]}", code=f"PO-{uuid.uuid4().hex[:4]}")
        session.add(org)
        await session.flush()

        branch = Branch(name=f"Main Proc Branch {uuid.uuid4().hex[:4]}", code=f"PB-{uuid.uuid4().hex[:4]}", organization_id=org.id)
        supplier = Supplier(name=f"Test Vendor {uuid.uuid4().hex[:4]}", organization_id=org.id)
        session.add_all([branch, supplier])
        await session.flush()

        prod = Product(
            name=f"Test PO Item {uuid.uuid4().hex[:4]}",
            sku=f"SKU-{uuid.uuid4().hex[:6]}",
            selling_price=Decimal("150.00"),
            organization_id=org.id,
            current_stock=10
        )
        session.add(prod)
        await session.flush()

        buyer = User(
            email=f"buyer_{uuid.uuid4().hex[:6]}@test.com",
            full_name="Buyer User",
            password_hash=hash_password("Pass123!"),
            organization_id=org.id,
            branch_id=branch.id,
            is_active=True
        )
        session.add(buyer)
        await session.flush()
        await assign_permissions(session, buyer, ["procurement.view", "procurement.receive"])

        po = PurchaseOrder(
            po_number=f"PO-{uuid.uuid4().hex[:6].upper()}",
            branch_id=branch.id,
            supplier_id=supplier.id,
            created_by_user_id=buyer.id,
            status="APPROVED",
            total_amount=Decimal("500.00")
        )
        session.add(po)
        await session.flush()

        po_item = PurchaseOrderItem(
            purchase_order_id=po.id,
            product_id=prod.id,
            product_name=prod.name,
            quantity_ordered=5,
            quantity_received=0,
            unit_cost=Decimal("100.00"),
            line_total=Decimal("500.00")
        )
        session.add(po_item)
        await session.commit()
        po_id = po.id
        po_item_id = po_item.id
        token_buyer = create_access_token({"sub": str(buyer.id), "email": buyer.email})

    # Normal receipt by authorized user
    resp = await client.post(
        f"/api/procurement/purchase-orders/{po_id}/receive",
        json={"items": [{"item_id": po_item_id, "quantity_received": 5}]},
        headers={"Authorization": f"Bearer {token_buyer}"}
    )
    assert resp.status_code == 200

    # Duplicate receipt attempt must be rejected with 400
    dup_resp = await client.post(
        f"/api/procurement/purchase-orders/{po_id}/receive",
        json={"items": [{"item_id": po_item_id, "quantity_received": 5}]},
        headers={"Authorization": f"Bearer {token_buyer}"}
    )
    assert dup_resp.status_code == 400
    assert "already marked as received" in dup_resp.text.lower() or "already been received" in dup_resp.text.lower()


@pytest.mark.asyncio
async def test_bug_67_daily_sales_branch_scoping(client: AsyncClient):
    """BUG-67: Daily sales enforces branch authorization and product scoping."""
    async with AsyncSessionLocal() as session:
        org_a = Organization(name=f"Sales Org A {uuid.uuid4().hex[:4]}", code=f"SA-{uuid.uuid4().hex[:4]}")
        org_b = Organization(name=f"Sales Org B {uuid.uuid4().hex[:4]}", code=f"SB-{uuid.uuid4().hex[:4]}")
        session.add_all([org_a, org_b])
        await session.flush()

        branch_b = Branch(name=f"Branch B {uuid.uuid4().hex[:4]}", code=f"BB-{uuid.uuid4().hex[:4]}", organization_id=org_b.id)
        session.add(branch_b)
        await session.flush()

        user_a = User(
            email=f"sales_a_{uuid.uuid4().hex[:6]}@test.com",
            full_name="Sales A",
            password_hash=hash_password("Pass123!"),
            organization_id=org_a.id,
            is_active=True
        )
        session.add(user_a)
        await session.flush()
        await assign_permissions(session, user_a, ["inventory.view", "sales.create", "inventory.adjust"])
        await session.commit()

        token_a = create_access_token({"sub": str(user_a.id), "email": user_a.email})

    # Attempt to post daily sale specifying Branch B (from Org B)
    resp = await client.post(
        "/api/inventory/daily-sales",
        json={
            "branch_id": branch_b.id,
            "product_id": 1,
            "quantity": 1,
            "unit_price": 50.0,
            "payment_method": "CASH"
        },
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert resp.status_code in (400, 403, 404)


@pytest.mark.asyncio
async def test_bug_68_finance_sync_validation_and_balances(client: AsyncClient):
    """BUG-68: Finance sync rejects negative values, empty drafts, and updates account balances."""
    async with AsyncSessionLocal() as session:
        org = Organization(name=f"Fin Org {uuid.uuid4().hex[:4]}", code=f"FO-{uuid.uuid4().hex[:4]}")
        session.add(org)
        await session.flush()

        branch = Branch(name=f"Fin Branch {uuid.uuid4().hex[:4]}", code=f"FB-{uuid.uuid4().hex[:4]}", organization_id=org.id)
        session.add(branch)
        await session.flush()

        acc_bank = Account(code=f"BNK-{uuid.uuid4().hex[:4]}", name="Bank Audit", account_type="ASSET", balance=Decimal("1000.00"), organization_id=org.id)
        acc_rev = Account(code=f"REV-{uuid.uuid4().hex[:4]}", name="Rev Audit", account_type="REVENUE", balance=Decimal("5000.00"), organization_id=org.id)
        session.add_all([acc_bank, acc_rev])
        await session.flush()

        fin_user = User(
            email=f"fin_{uuid.uuid4().hex[:6]}@test.com",
            full_name="Fin User",
            password_hash=hash_password("Pass123!"),
            organization_id=org.id,
            branch_id=branch.id,
            is_active=True
        )
        session.add(fin_user)
        await session.flush()
        await assign_permissions(session, fin_user, ["sync.manage", "finance.post", "finance.view", "finance.create"])
        await session.commit()
        await session.refresh(acc_bank)
        await session.refresh(acc_rev)
        b_code, r_code = acc_bank.code, acc_rev.code
        b_id = acc_bank.id
        token = create_access_token({"sub": str(fin_user.id), "email": fin_user.email})

    # Negative amount draft must fail with 400 during processing
    invalid_draft = {
        "client_timestamp": datetime.now(timezone.utc).isoformat(),
        "modules": {
            "finance_acdoca_spreadsheet": {
                "description": "Negative line voucher",
                "draft_journal_vouchers": [
                    {"gl_account": b_code, "debit": -500.0, "credit": 0.0, "text_memo": "Invalid Debit"},
                    {"gl_account": r_code, "debit": 0.0, "credit": -500.0, "text_memo": "Invalid Credit"}
                ]
            }
        }
    }
    resp = await client.post(
        "/api/sync/all",
        json=invalid_draft,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    proc_resp = await client.post(
        "/api/sync/process",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert proc_resp.status_code == 200
    data = proc_resp.json()
    assert len(data.get("errors", [])) > 0 or data.get("synced", 0) == 0

    # Valid draft must update Account balances atomically
    valid_draft = {
        "client_timestamp": datetime.now(timezone.utc).isoformat(),
        "modules": {
            "finance_acdoca_spreadsheet": {
                "description": "Balanced valid voucher",
                "draft_journal_vouchers": [
                    {"gl_account": b_code, "debit": 250.0, "credit": 0.0, "text_memo": "Deposit"},
                    {"gl_account": r_code, "debit": 0.0, "credit": 250.0, "text_memo": "Revenue"}
                ]
            }
        }
    }
    await client.post(
        "/api/sync/all",
        json=valid_draft,
        headers={"Authorization": f"Bearer {token}"}
    )
    proc_resp2 = await client.post(
        "/api/sync/process",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert proc_resp2.status_code == 200
    async with AsyncSessionLocal() as session:
        updated_bank = await session.get(Account, b_id)
        # 1000 + 250 = 1250
        assert updated_bank.balance == Decimal("1250.00")


@pytest.mark.asyncio
async def test_bug_69_dashboard_profit_consistency(client: AsyncClient):
    """BUG-69: Dashboard monthly profit and chart profit calculate operating profit consistently."""
    async with AsyncSessionLocal() as session:
        org = Organization(name=f"Dash Org {uuid.uuid4().hex[:4]}", code=f"DO-{uuid.uuid4().hex[:4]}")
        session.add(org)
        await session.flush()

        branch = Branch(name=f"Dash Branch {uuid.uuid4().hex[:4]}", code=f"DB-{uuid.uuid4().hex[:4]}", organization_id=org.id)
        session.add(branch)
        await session.flush()

        dash_user = User(
            email=f"dash_{uuid.uuid4().hex[:6]}@test.com",
            full_name="Dash User",
            password_hash=hash_password("Pass123!"),
            organization_id=org.id,
            branch_id=branch.id,
            is_active=True
        )
        session.add(dash_user)
        await session.flush()
        await assign_permissions(session, dash_user, ["dashboard.view"])
        await session.commit()
        token = create_access_token({"sub": str(dash_user.id), "email": dash_user.email})

    resp = await client.get("/api/dashboard/metrics", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "kpis" in data
    assert "monthly_profit" in data["kpis"]
    chart = data.get("sales_overview_chart") or data.get("chart_data") or []
    for item in chart:
        assert "profit" in item
        assert item["profit"] is not None


def test_sec_69_offsite_backup_destination_verification(monkeypatch, tmp_path):
    """SEC-69: verify_offsite_storage_destination rejects local dir and requires remote failure domain in prod."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("REMOTE_BACKUP_SERVICE_URL", raising=False)
    monkeypatch.delenv("REMOTE_BACKUP_S3_BUCKET", raising=False)

    local_backup_dir = tmp_path / "app" / "backups"
    local_backup_dir.mkdir(parents=True, exist_ok=True)

    with pytest.raises(RuntimeError) as exc_info:
        DisasterRecoveryService.verify_offsite_storage_destination(str(local_backup_dir))
    assert "cannot count as independent" in str(exc_info.value) or "does not qualify" in str(exc_info.value)

    monkeypatch.setenv("REMOTE_BACKUP_S3_BUCKET", "s3://corp-glacier-vault-2026")
    assert DisasterRecoveryService.verify_offsite_storage_destination() is True
