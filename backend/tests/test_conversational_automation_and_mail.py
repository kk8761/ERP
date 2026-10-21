import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.procurement import PurchaseOrder, Supplier
from app.models.inventory import Product
from app.models.email_log import OutgoingEmailLog
from app.services.ai_service import process_ai_query
from app.services.email_service import get_email_system_status, send_business_email, generate_po_email_template

@pytest.mark.asyncio
async def test_ai_asks_details_when_user_requests_po_without_parameters():
    """Verify AI guides user by asking for missing product and quantity when requesting PO creation."""
    async with AsyncSessionLocal() as db:
        res = await process_ai_query(
            db=db,
            prompt="Create a PO for me please",
            user_name="Karthik",
            organization_id=1,
            organization_name="Nexa Global Enterprises"
        )
        assert res["action_executed"] is False
        assert res.get("needs_details") is True
        assert "Product / Item name" in res["answer"]
        assert "Quantity" in res["answer"]
        assert len(res["suggestions"]) >= 2
        assert any("Create PO for" in s for s in res["suggestions"])

@pytest.mark.asyncio
async def test_ai_asks_details_when_user_requests_stock_adjustment_without_parameters():
    """Verify AI prompts for product and delta when user asks to adjust stock without details."""
    async with AsyncSessionLocal() as db:
        res = await process_ai_query(
            db=db,
            prompt="I need to adjust stock",
            user_name="Karthik",
            organization_id=1,
            organization_name="Nexa Global Enterprises"
        )
        assert res["action_executed"] is False
        assert res.get("needs_details") is True
        assert "Product Name" in res["answer"]
        assert "Quantity Delta" in res["answer"]

@pytest.mark.asyncio
async def test_ai_executes_automation_when_details_provided_and_sends_b2b_email():
    """Verify AI automatically creates PO and dispatches enterprise B2B email when parameters are provided."""
    async with AsyncSessionLocal() as db:
        # Verify supplier and product exist
        supp_res = await db.execute(select(Supplier))
        supplier = supp_res.scalars().first()
        prod_res = await db.execute(select(Product))
        product = prod_res.scalars().first()

        assert supplier is not None
        assert product is not None

        prompt = f"Create PO for 15 units of {product.name} from {supplier.name}"
        res = await process_ai_query(
            db=db,
            prompt=prompt,
            user_name="Karthik",
            user_email="karthik.reddy@nexaerp.internal",
            organization_id=1,
            organization_name="Nexa Global Enterprises"
        )

        assert res["action_executed"] is True
        assert "Purchase Order Executed Successfully" in res["answer"]
        assert res["action_details"]["quantity"] == 15
        assert res["action_details"]["product_name"] == product.name

        # Verify PO created in database
        po_num = res["action_details"]["po_number"]
        po_res = await db.execute(select(PurchaseOrder).where(PurchaseOrder.po_number == po_num))
        po_obj = po_res.scalar_one_or_none()
        assert po_obj is not None
        assert po_obj.status == "APPROVED"

        # Verify B2B email logged in OutgoingEmailLog with user's login email as sender
        email_res = await db.execute(select(OutgoingEmailLog).where(OutgoingEmailLog.document_reference == po_num))
        email_entry = email_res.scalar_one_or_none()
        assert email_entry is not None
        assert email_entry.status in ("SENT", "DELIVERED_SIMULATED", "SIMULATED")
        assert email_entry.sender_email == "karthik.reddy@nexaerp.internal"

@pytest.mark.asyncio
async def test_email_system_status_and_test_dispatch_endpoints(client: AsyncClient, admin_auth_token: str):
    """Verify enterprise mail dispatch endpoints and system status reporting."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Email system status
    status_res = await client.get("/api/procurement/emails/status", headers=headers)
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["status"] == "OPERATIONAL"
    assert "RFC 5322 (MIME)" in status_data["protocols"]

    # 2. Test email dispatch endpoint
    test_res = await client.post(
        "/api/procurement/emails/test-dispatch?target_email=partner.vendor@nexaerp.internal",
        headers=headers
    )
    assert test_res.status_code == 200
    test_data = test_res.json()
    assert test_data["status"] == "DISPATCHED"
    assert test_data["log_id"] > 0
    assert test_data["recipient"] == "partner.vendor@nexaerp.internal"
    assert test_data["sender"] is not None

    # 3. List recent emails and confirm sender fields
    list_res = await client.get("/api/procurement/emails", headers=headers)
    assert list_res.status_code == 200
    emails = list_res.json()
    assert len(emails) >= 1
    matched = [e for e in emails if e["recipient_email"] == "partner.vendor@nexaerp.internal"]
    assert len(matched) >= 1
    assert "sender_email" in matched[0]

@pytest.mark.asyncio
async def test_user_login_email_is_used_as_sender_for_po_and_pr_emails():
    """Verify send_business_email sets From/Reply-To to the logged-in user's email."""
    async with AsyncSessionLocal() as db:
        test_user_email = "buyer.jane@nexaerp.internal"
        log = await send_business_email(
            db=db,
            recipient_email="supplier.acme@vendor.com",
            recipient_name="Acme Supplies",
            document_type="PURCHASE_ORDER",
            document_reference="PO-TEST-SENDER",
            subject="Test Sender PO",
            body_html="<p>Test body</p>",
            sender_email=test_user_email,
            sender_name="Jane Buyer"
        )
        await db.commit()

        assert log.sender_email == test_user_email
        assert log.sender_name == "Jane Buyer"
        assert log.status in ("SENT", "SIMULATED")
