"""
NexaERP Email Generation & Verification Script
Creates formal B2B emails sent by user 'Karthik Reddy' to:
1. Vendor Email: Purchase Order authorization
2. Client / Customer Email: Tax Invoice and transaction receipt
3. Security Alert Email: DLP audit alert
Verifies database persistence in outgoing_email_logs and audit trail.
"""

import sys
import os
import asyncio
from datetime import datetime, timezone

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import AsyncSessionLocal
from app.models.auth import User
from app.models.email_log import OutgoingEmailLog
from app.services.email_service import (
    send_business_email,
    generate_po_email_template,
    generate_invoice_email_template,
    generate_screenshot_alert_template,
    get_email_system_status
)
from sqlalchemy import select, desc

async def run_email_verification():
    print("=" * 70)
    print("⚡ NEXA-ERP EMAIL SUBSYSTEM VERIFICATION")
    print("=" * 70)

    async with AsyncSessionLocal() as db:
        # 1. Fetch User 'Karthik Reddy'
        stmt = select(User).where(User.email == "admin@nexaerp.internal")
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        
        user_name = user.full_name if user else "Karthik Reddy"
        user_email = user.email if user else "admin@nexaerp.internal"
        user_id = user.id if user else 1

        print(f"👤 Authenticated User: {user_name} <{user_email}> (ID: {user_id})\n")

        # ---------------------------------------------------------------------
        # 1. VENDOR EMAIL: Official Purchase Order (PO-2026-8840)
        # ---------------------------------------------------------------------
        vendor_name = "Apex Industrial Hardware Ltd."
        vendor_email = "vendor.apex@industrialsupplies.com"
        po_number = "PO-2026-8840"
        po_items = [
            {"product_name": "Enterprise Server Rack 42U", "quantity_ordered": 2, "unit_cost": 45000.0, "line_total": 90000.0},
            {"product_name": "Cat6A High-Speed Patch Panels 48-Port", "quantity_ordered": 5, "unit_cost": 3200.0, "line_total": 16000.0},
            {"product_name": "Managed Gigabit PoE+ Switch 24-Port", "quantity_ordered": 4, "unit_cost": 18500.0, "line_total": 74000.0}
        ]
        po_total = sum(item["line_total"] for item in po_items)

        print(f"📧 [1/3] Generating Vendor PO Email to '{vendor_name}' <{vendor_email}>...")
        po_template = generate_po_email_template(
            po_number=po_number,
            vendor_name=vendor_name,
            items=po_items,
            total_amount=po_total,
            notes="Expedited delivery requested to Bengaluru Corporate Data Center. Net 30 payment terms.",
            company_name="Nexa Global Enterprises",
            buyer_name=user_name,
            buyer_email=user_email
        )

        vendor_log = await send_business_email(
            db=db,
            recipient_email=vendor_email,
            recipient_name=vendor_name,
            document_type="PURCHASE_ORDER",
            document_reference=po_number,
            subject=po_template["subject"],
            body_html=po_template["body_html"],
            sent_by_user_id=user_id,
            sender_email=user_email,
            sender_name=user_name
        )
        await db.commit()
        await db.refresh(vendor_log)
        print(f"   ✓ Log ID: #{vendor_log.id}")
        print(f"   ✓ Subject: {vendor_log.subject}")
        print(f"   ✓ Sender: {vendor_log.sender_name} <{vendor_log.sender_email}>")
        print(f"   ✓ Recipient: {vendor_log.recipient_name} <{vendor_log.recipient_email}>")
        print(f"   ✓ Status: {vendor_log.status}\n")

        # ---------------------------------------------------------------------
        # 2. CLIENT / CUSTOMER EMAIL: Official Tax Invoice Receipt (INV-2026-4410)
        # ---------------------------------------------------------------------
        client_name = "Zenith Commercial Cloud Solutions"
        client_email = "client.accounts@zenithcloud.io"
        inv_number = "INV-2026-4410"
        inv_items = [
            {"name": "NexaERP Enterprise Annual Cloud License (100 Users)", "quantity": 1, "price": 180000.0, "total": 180000.0},
            {"name": "Implementation & Data Migration Consulting (20 Hours)", "quantity": 1, "price": 45000.0, "total": 45000.0},
            {"name": "Dedicated SOC Intrusion Defense Monitoring (Year 1)", "quantity": 1, "price": 35000.0, "total": 35000.0}
        ]
        inv_total = sum(item["total"] for item in inv_items)

        print(f"📧 [2/3] Generating Client Invoice Email to '{client_name}' <{client_email}>...")
        inv_template = generate_invoice_email_template(
            invoice_number=inv_number,
            customer_name=client_name,
            items=inv_items,
            total_amount=inv_total,
            company_name="Nexa Global Enterprises"
        )

        client_log = await send_business_email(
            db=db,
            recipient_email=client_email,
            recipient_name=client_name,
            document_type="INVOICE",
            document_reference=inv_number,
            subject=inv_template["subject"],
            body_html=inv_template["body_html"],
            sent_by_user_id=user_id,
            sender_email=user_email,
            sender_name=user_name
        )
        await db.commit()
        await db.refresh(client_log)
        print(f"   ✓ Log ID: #{client_log.id}")
        print(f"   ✓ Subject: {client_log.subject}")
        print(f"   ✓ Sender: {client_log.sender_name} <{client_log.sender_email}>")
        print(f"   ✓ Recipient: {client_log.recipient_name} <{client_log.recipient_email}>")
        print(f"   ✓ Status: {client_log.status}\n")

        # ---------------------------------------------------------------------
        # 3. SECURITY / COMPLIANCE EMAIL: DLP Alert for Screen Capture
        # ---------------------------------------------------------------------
        print(f"📧 [3/3] Generating Security DLP Alert Notification...")
        sec_template = generate_screenshot_alert_template(
            user_name=user_name,
            user_email=user_email,
            captured_at_str=datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M:%S UTC"),
            page_url="/finance/spreadsheet-acdoca-matrix",
            image_data="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            action_type="PRINT_SCREEN_KEY",
            ip_address="192.168.1.105",
            company_name="Nexa Global Enterprises"
        )

        sec_log = await send_business_email(
            db=db,
            recipient_email=user_email,
            recipient_name=user_name,
            document_type="DLP_INCIDENT",
            document_reference="INC-DLP-2026",
            subject=sec_template["subject"],
            body_html=sec_template["body_html"],
            sent_by_user_id=user_id,
            sender_email="security-admin@nexaerp.internal",
            sender_name="NexaERP Security SOC"
        )
        await db.commit()
        await db.refresh(sec_log)
        print(f"   ✓ Log ID: #{sec_log.id}")
        print(f"   ✓ Subject: {sec_log.subject}")
        print(f"   ✓ Sender: {sec_log.sender_name} <{sec_log.sender_email}>")
        print(f"   ✓ Recipient: {sec_log.recipient_name} <{sec_log.recipient_email}>")
        print(f"   ✓ Status: {sec_log.status}\n")

        # ---------------------------------------------------------------------
        # Database Verification & Statistics
        # ---------------------------------------------------------------------
        system_status = await get_email_system_status(db)
        print("=" * 70)
        print("📊 EMAIL SUBSYSTEM VERIFICATION REPORT")
        print("=" * 70)
        print(f"System Status:         {system_status['status']}")
        print(f"SMTP Mode:             {'LIVE RELAY' if system_status['smtp_configured'] else 'SAFE SIMULATION (RFC 5322 Compliant)'}")
        print(f"SMTP Server:           {system_status['smtp_host']}:{system_status['smtp_port']}")
        print(f"Total Dispatched Mails:{system_status['total_dispatches']}")
        print(f"Supported Standards:   {', '.join(system_status['protocols'])}")
        print("=" * 70)

        # Retrieve recent 5 records from database to prove persistence
        print("\n🔍 RECENT OUTGOING EMAIL LOGS IN DATABASE:")
        stmt_recent = select(OutgoingEmailLog).order_by(desc(OutgoingEmailLog.id)).limit(5)
        res_recent = await db.execute(stmt_recent)
        logs = res_recent.scalars().all()
        for idx, l in enumerate(logs, 1):
            print(f"  [{l.id}] Type: {l.document_type:15} | From: {l.sender_name} | To: {l.recipient_email} | Status: {l.status} | Ref: {l.document_reference}")

if __name__ == "__main__":
    asyncio.run(run_email_verification())
