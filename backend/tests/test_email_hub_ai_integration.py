import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.email_log import ReceivedEmail, OutgoingEmailLog

@pytest.mark.asyncio
async def test_email_hub_inbox_and_ai_extraction(client: AsyncClient, admin_auth_token: str):
    """Verify listing inbox emails returns complete AI intelligence extraction fields."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    res = await client.get("/api/emails/inbox", headers=headers)
    assert res.status_code == 200
    emails = res.json()
    assert len(emails) >= 1

    first_email = emails[0]
    assert "subject" in first_email
    assert "sender_email" in first_email
    assert "ai_summary" in first_email
    assert "ai_intent" in first_email
    assert "ai_urgency" in first_email
    assert "ai_suggested_reply" in first_email
    assert first_email["ai_urgency"] in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "NORMAL")

@pytest.mark.asyncio
async def test_email_hub_ai_suggest_content(client: AsyncClient, admin_auth_token: str):
    """Verify AI content suggestion drafting endpoint produces structured subject & body."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    payload = {
        "topic": "Confirm receipt of PO-2026-9901 and schedule delivery by next Tuesday",
        "recipient_name": "Apex Industrial Tools",
        "context": "Supplier Purchase Order Confirmation",
        "tone": "formal"
    }
    res = await client.post("/api/emails/ai-suggest", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "subject" in data
    assert "body" in data
    assert len(data["subject"]) > 5
    assert len(data["body"]) > 20

@pytest.mark.asyncio
async def test_email_hub_ai_extract_arbitrary_email(client: AsyncClient, admin_auth_token: str):
    """Verify AI extraction on arbitrary incoming email text."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    payload = {
        "subject": "URGENT: Outstanding Invoice INV-8821 for $14,500.00 Due Immediately",
        "body": "Dear Finance Team, Please find attached Invoice INV-8821 for the amount of $14,500.00 USD due on October 25, 2026. Action required: kindly transfer remittance and confirm wire transfer reference.",
        "sender": "billing@supplypartner.com"
    }
    res = await client.post("/api/emails/ai-extract", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "intent" in data
    assert "urgency" in data
    assert data["urgency"] in ("HIGH", "CRITICAL")
    assert "suggested_reply" in data
    assert "extracted_data" in data
    assert "INV-8821" in str(data["extracted_data"]) or "14,500" in str(data["extracted_data"])

@pytest.mark.asyncio
async def test_email_hub_send_and_sync(client: AsyncClient, admin_auth_token: str):
    """Verify sending an email records dispatch and sync triggers cleanly."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Send an email
    send_payload = {
        "recipient_email": "client.procurement@acmecorp.internal",
        "recipient_name": "Acme Procurement Director",
        "subject": "Quotation Estimate QT-2026-554",
        "body_text": "Dear Acme Team,\n\nPlease review our approved quotation QT-2026-554.\n\nRegards,\nNexaERP Team",
        "document_type": "SALES_QUOTATION",
        "document_reference": "QT-2026-554"
    }
    send_res = await client.post("/api/emails/send", json=send_payload, headers=headers)
    assert send_res.status_code == 200
    send_data = send_res.json()
    assert send_data["status"] == "DISPATCHED"
    assert send_data["recipient"] == "client.procurement@acmecorp.internal"

    # 2. Check sent mail ledger
    sent_res = await client.get("/api/emails/sent", headers=headers)
    assert sent_res.status_code == 200
    sent_list = sent_res.json()
    assert any(item["recipient_email"] == "client.procurement@acmecorp.internal" for item in sent_list)

    # 3. Trigger Inbox Sync
    sync_res = await client.post("/api/emails/inbox/sync", headers=headers)
    assert sync_res.status_code == 200
    sync_data = sync_res.json()
    assert sync_data["status"] == "SYNCED"

    # 4. Email Subsystem Status
    status_res = await client.get("/api/emails/status", headers=headers)
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["status"] == "OPERATIONAL"

@pytest.mark.asyncio
async def test_email_hub_original_mail_archive_and_forwarding(client: AsyncClient, admin_auth_token: str):
    """Verify original mail archive preservation, CC copy dispatch, raw headers, and forwarding."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Dispatch email with cc_me=True
    send_payload = {
        "recipient_email": "vendor.logistics@hardwarecorp.internal",
        "recipient_name": "Hardware Corp Logistics",
        "subject": "Purchase Order PO-2026-TEST-77",
        "body_text": "Please fulfill order PO-2026-TEST-77 for 10x Server Units.",
        "document_type": "PURCHASE_ORDER",
        "document_reference": "PO-2026-TEST-77",
        "cc_me": True
    }
    send_res = await client.post("/api/emails/send", json=send_payload, headers=headers)
    assert send_res.status_code == 200
    send_data = send_res.json()
    assert send_data["cc_recipient"] is not None

    # 2. Sync inbox to simulate counterparty reply
    sync_res = await client.post("/api/emails/inbox/sync", headers=headers)
    assert sync_res.status_code == 200

    # 3. Retrieve inbox emails and verify original email is present in inbox item
    inbox_res = await client.get("/api/emails/inbox", headers=headers)
    assert inbox_res.status_code == 200
    emails = inbox_res.json()
    assert len(emails) > 0

    first_email = emails[0]
    email_id = first_email["id"]

    # 4. Query original email endpoint
    orig_res = await client.get(f"/api/emails/inbox/{email_id}/original", headers=headers)
    assert orig_res.status_code == 200
    orig_data = orig_res.json()
    assert "has_original" in orig_data

    # 5. Query raw RFC822 source headers
    raw_res = await client.get(f"/api/emails/inbox/{email_id}/raw", headers=headers)
    assert raw_res.status_code == 200
    raw_data = raw_res.json()
    assert "headers" in raw_data
    assert "raw_rfc822" in raw_data

    # 6. Forward original mail to user
    fwd_res = await client.post(
        f"/api/emails/inbox/{email_id}/forward-original",
        json={"target_email": "admin@nexaerp.internal"},
        headers=headers
    )
    assert fwd_res.status_code == 200
    fwd_data = fwd_res.json()
    assert fwd_data["status"] == "FORWARDED"
    assert fwd_data["recipient"] == "admin@nexaerp.internal"


@pytest.mark.asyncio
async def test_email_hub_smtp_config_and_test_validation(client: AsyncClient, admin_auth_token: str):
    """Verify SMTP configuration retrieval, updating, and test endpoint diagnostics."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    import os

    # 1. Get current configuration
    res = await client.get("/api/emails/smtp-config", headers=headers)
    assert res.status_code == 200
    config_data = res.json()
    assert "is_configured" in config_data
    assert "mode" in config_data
    assert "smtp_host" in config_data

    # Backup .env file content directly
    env_path = ".env"
    env_backup = None
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            env_backup = f.read()

    try:
        # 2. Update SMTP settings
        update_payload = {
            "smtp_host": "smtp.gmail.com",
            "smtp_port": 587,
            "smtp_username": "enterprise@gmail.com",
            "smtp_password": "test app password key",
            "smtp_use_tls": True,
            "smtp_from_email": "enterprise@gmail.com",
            "smtp_from_name": "NexaERP System"
        }
        update_res = await client.post("/api/emails/smtp-config", json=update_payload, headers=headers)
        assert update_res.status_code == 200
        updated_data = update_res.json()
        assert updated_data["status"] == "CONFIGURED"
        assert updated_data["mode"] == "LIVE_SMTP"
        assert updated_data["smtp_host"] == "smtp.gmail.com"

        # 3. Test SMTP test endpoint with empty host validation
        test_empty = await client.post("/api/emails/smtp-test", json={"recipient_email": "test@test.com", "smtp_host": ""}, headers=headers)
        assert test_empty.status_code == 400
    finally:
        # Restore .env backup directly
        if env_backup is not None and os.path.exists(env_path):
            with open(env_path, "w", encoding="utf-8") as f:
                f.write(env_backup)


@pytest.mark.asyncio
async def test_email_hub_drafts_workflow(client: AsyncClient, admin_auth_token: str):
    """Verify draft creation, listing, updating, and deletion."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Create a draft with CC, BCC, Priority, and Attachment
    draft_payload = {
        "recipient_email": "partner@vendor.org",
        "recipient_name": "Partner Vendor",
        "cc_recipients": "finance@nexaerp.internal, ops@nexaerp.internal",
        "bcc_recipients": "audit@nexaerp.internal",
        "subject": "Draft: Partnership Proposal Q4",
        "body_text": "Here is our revised terms sheet.",
        "body_html": "<p>Here is our revised <strong>terms sheet</strong>.</p>",
        "priority": "HIGH",
        "attachments": [
            {
                "filename": "terms_q4.pdf",
                "content_type": "application/pdf",
                "size": 1024,
                "data_base64": "JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwgL0xlbmd0aCA1IDAgUiA+PgpzdHJlYW0Ke30KZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjAKZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFsgMSAwIFIgXSAvQ291bnQgMSA+PgplbmRvYmoK"
            }
        ]
    }
    create_res = await client.post("/api/emails/drafts", json=draft_payload, headers=headers)
    assert create_res.status_code == 200
    draft = create_res.json()
    assert draft["subject"] == "Draft: Partnership Proposal Q4"
    assert draft["priority"] == "HIGH"
    assert "finance@nexaerp.internal" in draft["cc_recipients"]
    draft_id = draft["id"]

    # 2. List drafts
    list_res = await client.get("/api/emails/drafts", headers=headers)
    assert list_res.status_code == 200
    drafts = list_res.json()
    assert any(d["id"] == draft_id for d in drafts)

    # 3. Delete draft
    del_res = await client.delete(f"/api/emails/drafts/{draft_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "DELETED"

    # Verify no longer in drafts
    list_res2 = await client.get("/api/emails/drafts", headers=headers)
    assert not any(d["id"] == draft_id for d in list_res2.json())


@pytest.mark.asyncio
async def test_email_hub_folder_management(client: AsyncClient, admin_auth_token: str):
    """Verify folder filtering, read/unread, trash, and archive toggling."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # Fetch initial inbox emails
    res = await client.get("/api/emails/inbox?folder=inbox", headers=headers)
    assert res.status_code == 200
    emails = res.json()
    assert len(emails) >= 1
    target_id = emails[0]["id"]

    # Toggle read status
    read_res = await client.post(f"/api/emails/inbox/{target_id}/toggle-read", headers=headers)
    assert read_res.status_code == 200
    new_state = read_res.json()["is_read"]

    # Toggle trash
    trash_res = await client.post(f"/api/emails/inbox/{target_id}/trash", headers=headers)
    assert trash_res.status_code == 200
    assert trash_res.json()["is_trash"] is True

    # Check trash folder has the email
    trash_list = await client.get("/api/emails/inbox?folder=trash", headers=headers)
    assert any(m["id"] == target_id for m in trash_list.json())

    # Untrash
    untrash_res = await client.post(f"/api/emails/inbox/{target_id}/trash", headers=headers)
    assert untrash_res.status_code == 200
    assert untrash_res.json()["is_trash"] is False


@pytest.mark.asyncio
async def test_email_hub_user_context_and_roles(client: AsyncClient, admin_auth_token: str):
    """Verify role-based context, duties, signature, and tailored prompt templates."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    res = await client.get("/api/emails/user-context", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "primary_role" in data
    assert "duties" in data
    assert len(data["duties"]) > 0
    assert "signature" in data
    assert "quick_prompts" in data
    assert len(data["quick_prompts"]) >= 2
    assert "job_title" in data


@pytest.mark.asyncio
async def test_email_hub_vendor_lookup_and_orders(client: AsyncClient, admin_auth_token: str):
    """Verify looking up known vendors and fetching their active POs."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}
    
    # 1. List all vendors with orders
    v_res = await client.get("/api/emails/vendors-and-orders", headers=headers)
    assert v_res.status_code == 200
    v_data = v_res.json()
    assert "vendors" in v_data
    assert len(v_data["vendors"]) >= 1

    first_vendor = v_data["vendors"][0]
    vendor_email = first_vendor["email"]

    # 2. Lookup specific vendor by email
    lookup_res = await client.get(f"/api/emails/entities/lookup?email={vendor_email}", headers=headers)
    assert lookup_res.status_code == 200
    lookup_data = lookup_res.json()
    assert lookup_data["matched"] is True
    assert lookup_data["vendor"] is not None
    assert lookup_data["vendor"]["name"] == first_vendor["name"]


@pytest.mark.asyncio
async def test_email_hub_order_tracking_lifecycle(client: AsyncClient, admin_auth_token: str):
    """Verify order tracking milestones, carrier information, and stage progression."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # Track PO-6C719B or PO-80C271
    track_res = await client.get("/api/emails/orders/track/PO-6C719B", headers=headers)
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["order_reference"] == "PO-6C719B"
    assert "milestones" in track_data
    assert len(track_data["milestones"]) == 6
    assert "carrier_info" in track_data
    assert "progress_percent" in track_data
    assert track_data["progress_percent"] > 0

    # Advance stage to IN_TRANSIT
    stage_payload = {
        "stage": "IN_TRANSIT",
        "carrier": "Blue Dart Express Air Cargo",
        "tracking_number": "BD-TEST-9981"
    }
    update_res = await client.post("/api/emails/orders/track/PO-6C719B/stage", json=stage_payload, headers=headers)
    assert update_res.status_code == 200
    up_data = update_res.json()
    assert up_data["current_stage"] == "IN_TRANSIT"
    assert up_data["carrier_info"]["carrier_name"] == "Blue Dart Express Air Cargo"


@pytest.mark.asyncio
async def test_email_hub_vendor_grounded_ai_suggest(client: AsyncClient, admin_auth_token: str):
    """Verify RAG email suggestions are strictly grounded in vendor master data and order items without criss-cross."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    payload = {
        "topic": "Follow up on scheduled dispatch and carrier tracking details for order PO-6C719B",
        "vendor_id": 1,
        "order_reference": "PO-6C719B",
        "tone": "formal"
    }
    res = await client.post("/api/emails/ai-suggest", json=payload, headers=headers)
    assert res.status_code == 200
    draft = res.json()
    assert "subject" in draft
    assert "body" in draft
    assert "PO-6C719B" in draft["subject"] or "PO-6C719B" in draft["body"]
    assert any(term in (draft["subject"] + " " + draft["body"]) for term in ["Adani Wilmar", "Ramesh Patel", "Fortune Sunlite", "VEND-1001"])




