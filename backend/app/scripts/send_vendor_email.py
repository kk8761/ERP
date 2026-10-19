"""
NexaERP Enterprise Vendor Email Dispatcher
Sends formal Purchase Order email from System Administrator (Karthik Reddy)
to any custom vendor email provided via CLI argument or prompt.

Usage:
    python app/scripts/send_vendor_email.py [recipient_email] [vendor_name]

Example:
    python app/scripts/send_vendor_email.py your.email@gmail.com "Apex Hardware Corp"
"""

import sys
import os
import asyncio
from datetime import datetime, timezone

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import AsyncSessionLocal
from app.models.auth import User
from app.services.email_service import (
    send_business_email,
    generate_po_email_template
)
from app.config import settings

async def dispatch_vendor_email(target_email: str, target_vendor_name: str):
    async with AsyncSessionLocal() as db:
        user_name = "Karthik Reddy (System Administrator)"
        user_email = "admin@nexaerp.internal"
        po_number = f"PO-2026-VND-{os.urandom(2).hex().upper()}"

        po_items = [
            {"product_name": "AI Edge Computing Server Workstation (NVIDIA RTX 4090)", "quantity_ordered": 2, "unit_cost": 285000.0, "line_total": 570000.0},
            {"product_name": "High-Throughput Optical Transceiver 100Gbps", "quantity_ordered": 8, "unit_cost": 14500.0, "line_total": 116000.0},
            {"product_name": "Cat6A Shielded Patch Cable Spool (500m)", "quantity_ordered": 4, "unit_cost": 6500.0, "line_total": 26000.0}
        ]
        total_value = sum(item["line_total"] for item in po_items)

        print("=" * 65)
        print("🚀 NEXA-ERP VENDOR DISPATCH")
        print("=" * 65)
        print(f"From (System Admin): {user_name} <{user_email}>")
        print(f"To (Vendor):         {target_vendor_name} <{target_email}>")
        print(f"PO Number:           {po_number}")
        print(f"Total Amount:        ₹ {total_value:,.2f}")
        print("-" * 65)

        po_template = generate_po_email_template(
            po_number=po_number,
            vendor_name=target_vendor_name,
            items=po_items,
            total_amount=total_value,
            notes="Authorized Purchase Order issued by System Administrator. Delivery destination: Central Tech Depot. Payment terms: Net 30 Days.",
            company_name="Nexa Global Enterprises",
            buyer_name=user_name,
            buyer_email=user_email
        )

        log_entry = await send_business_email(
            db=db,
            recipient_email=target_email,
            recipient_name=target_vendor_name,
            document_type="PURCHASE_ORDER",
            document_reference=po_number,
            subject=po_template["subject"],
            body_html=po_template["body_html"],
            sent_by_user_id=1,
            sender_email=user_email,
            sender_name=user_name
        )
        await db.commit()
        await db.refresh(log_entry)

        # Save HTML preview
        preview_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vendor_email_preview.html")
        with open(preview_file, "w", encoding="utf-8") as f:
            f.write(po_template["body_html"])

        print(f"✓ Status in DB:       {log_entry.status} (Log #{log_entry.id})")
        print(f"✓ HTML Preview File:  {preview_file}")
        
        if settings.SMTP_HOST:
            print(f"✓ Delivered via live SMTP Relay: {settings.SMTP_HOST}:{settings.SMTP_PORT}")
        else:
            print("ℹ Mode: Safe Simulation (logged to database & rendered to HTML)")
        print("=" * 65)
        return log_entry

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else "vendor.orders@globalhardware.com"
    name = sys.argv[2] if len(sys.argv) > 2 else "Global Hardware & Systems Ltd."
    asyncio.run(dispatch_vendor_email(email, name))
