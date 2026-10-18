"""
NexaERP Enterprise Mail & Communication Subsystem.
Complies with RFC 5322 / RFC 2045 standard MIME messaging.
Supports real SMTP relay with STARTTLS encryption, external counterparty notifications,
and transactional audit logging matching tier-1 enterprise standards.
"""

import re
import smtplib
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone

from app.config import settings
from app.models.auth import User
from app.models.email_log import OutgoingEmailLog
from app.services.audit_service import record_audit_log

def _send_smtp_sync(
    recipient_email: str,
    subject: str,
    body_html: str,
    from_email: str,
    from_name: str,
    document_type: str,
    document_reference: str,
    reply_to: Optional[str] = None
) -> Dict[str, Any]:
    """
    Synchronous SMTP transmission executed in background thread.
    Builds multipart alternative MIME message with standard enterprise headers.
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = recipient_email
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=from_email.split("@")[-1] if "@" in from_email else "nexaerp.internal")
    msg["X-Mailer"] = "NexaERP Enterprise Mailer v2.1"
    msg["X-ERP-Document-Type"] = document_type
    msg["X-ERP-Document-Ref"] = document_reference
    msg["Reply-To"] = reply_to or from_email

    # Plaintext fallback from HTML
    plain_text = re.sub(r'<[^>]+>', '', body_html).strip()
    msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(body_html, "html", "utf-8"))

    if not settings.SMTP_HOST:
        return {
            "success": True,
            "mode": "SIMULATED",
            "message": "Simulated transmission: No external SMTP relay configured (dev mode)."
        }

    try:
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12)
            if settings.SMTP_USE_TLS:
                server.starttls()

        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)

        # Use authenticated relay from_email if configured, otherwise sender from_email
        envelope_from = settings.SMTP_FROM_EMAIL or from_email
        server.sendmail(envelope_from, [recipient_email], msg.as_string())
        server.quit()
        return {"success": True, "mode": "SMTP_RELAY", "message": f"Successfully delivered via {settings.SMTP_HOST}:{settings.SMTP_PORT}"}
    except Exception as exc:
        print(f"[Email Service] SMTP Transmission Error: {exc}")
        return {"success": False, "mode": "SMTP_FAILED", "message": str(exc)}

async def send_business_email(
    db: AsyncSession,
    recipient_email: str,
    recipient_name: Optional[str],
    document_type: str,
    document_reference: str,
    subject: str,
    body_html: str,
    sent_by_user_id: Optional[int] = None,
    sender_email: Optional[str] = None,
    sender_name: Optional[str] = None
) -> OutgoingEmailLog:
    """
    Enterprise Email Dispatcher:
    - Transmits real MIME email from the logged-in user who created the PO/PR.
    - Sets Reply-To and From header to the user's login email and name.
    - If in development or unconfigured, performs seamless simulated dispatch.
    - Persists audit record in outgoing_email_logs and security audit trail.
    """
    # 1. Resolve sender user identity if sent_by_user_id is provided and sender_email is not specified
    if not sender_email and sent_by_user_id:
        try:
            u_stmt = select(User).where(User.id == sent_by_user_id)
            u_res = await db.execute(u_stmt)
            user_obj = u_res.scalar_one_or_none()
            if user_obj:
                sender_email = user_obj.email
                sender_name = user_obj.full_name or user_obj.email
        except Exception:
            pass

    from_email = sender_email or settings.SMTP_FROM_EMAIL
    from_name = sender_name or settings.SMTP_FROM_NAME

    # Execute SMTP transmission in background thread
    smtp_result = await asyncio.to_thread(
        _send_smtp_sync,
        recipient_email=recipient_email,
        subject=subject,
        body_html=body_html,
        from_email=from_email,
        from_name=from_name,
        document_type=document_type,
        document_reference=document_reference,
        reply_to=from_email
    )

    delivery_status = "SENT" if smtp_result.get("success") else "FAILED"

    log_entry = OutgoingEmailLog(
        recipient_email=recipient_email,
        recipient_name=recipient_name or recipient_email,
        sender_email=from_email,
        sender_name=from_name,
        document_type=document_type,
        document_reference=document_reference,
        subject=subject,
        body_html=body_html,
        status=delivery_status,
        sent_by_user_id=sent_by_user_id,
        is_external_party=True
    )
    db.add(log_entry)

    await record_audit_log(
        db,
        action="B2B_EMAIL_DISPATCHED",
        entity_name="OutgoingEmailLog",
        user_id=sent_by_user_id,
        status="SUCCESS" if delivery_status == "SENT" else "FAILURE",
        details={
            "recipient": recipient_email,
            "sender": from_email,
            "document_type": document_type,
            "reference": document_reference,
            "subject": subject,
            "mode": smtp_result.get("mode", "UNKNOWN")
        }
    )
    await db.flush()
    return log_entry

def generate_po_email_template(
    po_number: str,
    vendor_name: str,
    items: List[Dict[str, Any]],
    total_amount: float,
    notes: Optional[str] = None,
    company_name: str = "Nexa Global Enterprises",
    buyer_name: Optional[str] = None,
    buyer_email: Optional[str] = None
) -> Dict[str, str]:
    """Generates standardized professional B2B email template for Purchase Orders."""
    subject = f"[PURCHASE ORDER {po_number}] New Order from {company_name}"
    contact_email = buyer_email or settings.SMTP_FROM_EMAIL
    contact_name = buyer_name or "Procurement Officer"
    
    items_rows = "".join([
        f"<tr>"
        f"<td style='padding:10px 14px;border:1px solid #e2e8f0;font-weight:600;'>{item.get('product_name', 'Item')}</td>"
        f"<td style='padding:10px 14px;border:1px solid #e2e8f0;text-align:center;'>{item.get('quantity_ordered', item.get('quantity', 1))}</td>"
        f"<td style='padding:10px 14px;border:1px solid #e2e8f0;text-align:right;'>₹ {float(item.get('unit_cost', 0)):,.2f}</td>"
        f"<td style='padding:10px 14px;border:1px solid #e2e8f0;text-align:right;font-weight:700;'>₹ {float(item.get('line_total', 0)):,.2f}</td>"
        f"</tr>"
        for item in items
    ])

    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 650px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #2563eb 100%); color: #ffffff; padding: 24px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 20px;">{company_name}</h2>
            <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Official Purchase Order Authorization & Notification</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <p>Dear <strong>{vendor_name}</strong>,</p>
            <p>Please find below the official Purchase Order issued by <strong>{company_name}</strong>. Kindly confirm receipt and dispatch consignment according to our standard terms:</p>
            
            <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0;">
                <p style="margin: 0; font-size: 13px;"><strong>PO Reference:</strong> {po_number}</p>
                <p style="margin: 4px 0 0; font-size: 13px;"><strong>Issue Date:</strong> {datetime.now(timezone.utc).strftime('%d %b %Y, %H:%M UTC')}</p>
                <p style="margin: 4px 0 0; font-size: 13px;"><strong>Authorized Buyer / Requisitioner:</strong> {contact_name} (&lt;a href="mailto:{contact_email}" style="color:#2563eb;"&gt;{contact_email}&lt;/a&gt;)</p>
                <p style="margin: 4px 0 0; font-size: 13px;"><strong>Payment Terms:</strong> Net 30 Days (Direct NEFT/RTGS)</p>
            </div>

            <h3 style="font-size: 14px; margin: 20px 0 8px; color: #0f172a;">Material & Quantity Breakdown:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background-color: #f1f5f9;">
                        <th style="padding: 10px 14px; border: 1px solid #e2e8f0; text-align: left;">Product</th>
                        <th style="padding: 10px 14px; border: 1px solid #e2e8f0; text-align: center;">Qty</th>
                        <th style="padding: 10px 14px; border: 1px solid #e2e8f0; text-align: right;">Unit Price</th>
                        <th style="padding: 10px 14px; border: 1px solid #e2e8f0; text-align: right;">Total Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {items_rows}
                </tbody>
                <tfoot>
                    <tr style="background-color: #f8fafc; font-weight: bold;">
                        <td colspan="3" style="padding: 10px 14px; border: 1px solid #e2e8f0; text-align: right;">Total Order Value:</td>
                        <td style="padding: 10px 14px; border: 1px solid #e2e8f0; text-align: right; color: #2563eb;">₹ {total_amount:,.2f}</td>
                    </tr>
                </tfoot>
            </table>

            {f"<p style='margin-top: 16px; font-size: 13px; color: #475569;'><strong>Fulfillment Instructions / Memo:</strong> {notes}</p>" if notes else ""}

            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                <p style="margin: 0;">Please reply directly to <strong>{contact_email}</strong> with order acknowledgment and shipment tracking details.</p>
                <p style="margin: 4px 0 0;">Authorized by {contact_name} • {company_name}</p>
            </div>
        </div>
    </body>
    </html>
    """
    return {"subject": subject, "body_html": body_html}

def generate_pr_email_template(
    pr_number: str,
    vendor_name: str,
    product_name: str,
    quantity: int,
    unit: str = "units",
    urgency_notes: Optional[str] = None,
    company_name: str = "Nexa Global Enterprises",
    requisitioner_name: Optional[str] = None,
    requisitioner_email: Optional[str] = None
) -> Dict[str, str]:
    """Generates standardized professional B2B email template for Purchase Requisitions."""
    subject = f"[PURCHASE REQUISITION {pr_number}] Quotation Request (RFQ) from {company_name}"
    contact_email = requisitioner_email or settings.SMTP_FROM_EMAIL
    contact_name = requisitioner_name or "Procurement Officer"
    
    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 650px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #2563eb 100%); color: #ffffff; padding: 24px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 20px;">{company_name}</h2>
            <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Consignment Inquiry & Replenishment RFQ</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <p>Dear <strong>{vendor_name}</strong>,</p>
            <p>Our automated inventory replenishment system has generated a purchase requisition. Please review the item specification below and provide your earliest delivery timeframe and quotation:</p>
            
            <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0;">
                <p style="margin: 0; font-size: 13px;"><strong>Requisition Number:</strong> {pr_number}</p>
                <p style="margin: 4px 0 0; font-size: 13px;"><strong>Material Description:</strong> {product_name}</p>
                <p style="margin: 4px 0 0; font-size: 13px;"><strong>Requested Quantity:</strong> {quantity} {unit}</p>
                <p style="margin: 4px 0 0; font-size: 13px;"><strong>Requisitioner:</strong> {contact_name} (&lt;a href="mailto:{contact_email}" style="color:#2563eb;"&gt;{contact_email}&lt;/a&gt;)</p>
                {f"<p style='margin: 4px 0 0; font-size: 13px;'><strong>Priority / Notes:</strong> {urgency_notes}</p>" if urgency_notes else ""}
            </div>

            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                <p style="margin: 0;">Please reply directly to <strong>{contact_email}</strong> with your quotation and availability.</p>
                <p style="margin: 4px 0 0;">Procurement & Replenishment Division • {company_name}</p>
            </div>
        </div>
    </body>
    </html>
    """
    return {"subject": subject, "body_html": body_html}

def generate_invoice_email_template(
    invoice_number: str,
    customer_name: str,
    items: List[Dict[str, Any]],
    total_amount: float,
    company_name: str = "Nexa Global Enterprises"
) -> Dict[str, str]:
    """Generates official tax invoice email for customers."""
    subject = f"[TAX INVOICE {invoice_number}] Your Receipt from {company_name}"
    
    items_rows = "".join([
        f"<tr>"
        f"<td style='padding:8px 12px;border:1px solid #e2e8f0;'>{item.get('name', 'Product')}</td>"
        f"<td style='padding:8px 12px;border:1px solid #e2e8f0;text-align:center;'>{item.get('quantity', 1)}</td>"
        f"<td style='padding:8px 12px;border:1px solid #e2e8f0;text-align:right;'>₹ {float(item.get('price', 0)):,.2f}</td>"
        f"<td style='padding:8px 12px;border:1px solid #e2e8f0;text-align:right;'>₹ {float(item.get('total', 0)):,.2f}</td>"
        f"</tr>"
        for item in items
    ])

    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #0f172a; color: #ffffff; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 18px;">{company_name}</h2>
            <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.85;">Official Customer Invoice & Transaction Receipt</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
            <p>Dear <strong>{customer_name}</strong>,</p>
            <p>Thank you for your business. Your transaction has been completed successfully.</p>
            
            <p><strong>Invoice Number:</strong> {invoice_number}<br>
            <strong>Date:</strong> {datetime.now(timezone.utc).strftime('%d %b %Y, %H:%M')}</p>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0;">
                <thead>
                    <tr style="background: #f1f5f9;">
                        <th style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left;">Item</th>
                        <th style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: center;">Qty</th>
                        <th style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right;">Unit Price</th>
                        <th style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items_rows}
                </tbody>
                <tfoot>
                    <tr style="background: #f8fafc; font-weight: bold;">
                        <td colspan="3" style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right;">Total Paid:</td>
                        <td style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right; color: #16a34a;">₹ {total_amount:,.2f}</td>
                    </tr>
                </tfoot>
            </table>

            <p style="font-size: 12px; color: #64748b;">Thank you for shopping with {company_name}. For support, reply to this email.</p>
        </div>
    </body>
    </html>
    """
    return {"subject": subject, "body_html": body_html}

async def get_email_system_status(db: AsyncSession) -> Dict[str, Any]:
    """Returns real-time status of the enterprise mail dispatch subsystem."""
    stmt = select(func.count(OutgoingEmailLog.id))
    res = await db.execute(stmt)
    total_emails = res.scalar() or 0

    return {
        "status": "OPERATIONAL",
        "smtp_configured": bool(settings.SMTP_HOST),
        "smtp_host": settings.SMTP_HOST or "Internal Simulated Relay",
        "smtp_port": settings.SMTP_PORT,
        "tls_encryption": settings.SMTP_USE_TLS,
        "from_address": f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>",
        "total_dispatches": total_emails,
        "protocols": ["RFC 5322 (MIME)", "RFC 2045", "SMTP / STARTTLS"]
    }

def generate_screenshot_alert_template(
    user_name: str,
    user_email: str,
    captured_at_str: str,
    page_url: str,
    image_data: str,
    action_type: str = "PRINT_SCREEN_KEY",
    ip_address: Optional[str] = None,
    company_name: str = "Nexa Global Enterprises"
) -> Dict[str, str]:
    """Generates DLP security alert email for unauthorized screen capture attempts."""
    subject = f"[SECURITY ALERT - DLP] Screen Capture Incident: {user_name} at {captured_at_str}"
    
    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #0f172a; max-width: 680px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%); color: #ffffff; padding: 24px; border-radius: 8px 8px 0 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <h2 style="margin: 0; font-size: 20px; letter-spacing: -0.02em;">⚠️ SECURITY INCIDENT: SCREEN CAPTURE DETECTED</h2>
            </div>
            <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.95;">NexaERP Data Loss Prevention (DLP) & Compliance Guard</p>
        </div>
        
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 18px; margin-bottom: 20px; border-radius: 0 4px 4px 0;">
                <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 600;">
                    A user initiated a screenshot or snipping capture event within the protected ERP environment.
                </p>
                <p style="margin: 4px 0 0; font-size: 12px; color: #b91c1c;">
                    Immediate audit snapshot has been preserved below for administrative inspection.
                </p>
            </div>

            <h3 style="font-size: 15px; margin: 0 0 12px; color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px;">
                Incident Metadata (Who, When & Where):
            </h3>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
                <tbody>
                    <tr>
                        <td style="padding: 8px 12px; background: #f8fafc; font-weight: 600; width: 140px; border: 1px solid #e2e8f0;">User Name:</td>
                        <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">{user_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background: #f8fafc; font-weight: 600; border: 1px solid #e2e8f0;">User Email:</td>
                        <td style="padding: 8px 12px; border: 1px solid #e2e8f0; color: #2563eb; font-family: monospace;">{user_email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background: #f8fafc; font-weight: 600; border: 1px solid #e2e8f0;">Date & Time:</td>
                        <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600; color: #b91c1c;">{captured_at_str}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background: #f8fafc; font-weight: 600; border: 1px solid #e2e8f0;">Page / Route:</td>
                        <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-family: monospace;">{page_url}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background: #f8fafc; font-weight: 600; border: 1px solid #e2e8f0;">Trigger Action:</td>
                        <td style="padding: 8px 12px; border: 1px solid #e2e8f0;"><span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-weight: 600;">{action_type}</span></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background: #f8fafc; font-weight: 600; border: 1px solid #e2e8f0;">Client IP Address:</td>
                        <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-family: monospace;">{ip_address or "Internal / Local"}</td>
                    </tr>
                </tbody>
            </table>

            <h3 style="font-size: 15px; margin: 0 0 12px; color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px;">
                Captured Screen Evidence:
            </h3>

            <div style="background: #0f172a; border-radius: 8px; padding: 12px; text-align: center; margin-bottom: 24px;">
                <img src="{image_data}" alt="Captured Screen Incident" style="max-width: 100%; max-height: 480px; height: auto; border-radius: 6px; border: 1px solid #334155; display: inline-block;" />
            </div>

            <div style="background: #f1f5f9; padding: 14px 16px; border-radius: 6px; font-size: 12px; color: #475569;">
                <p style="margin: 0; font-weight: 600;">Automated Audit Response:</p>
                <p style="margin: 4px 0 0;">This incident has been logged into the tamper-resistant security audit log under ID reference DLP-SCREENSHOT. Please access the Administrator Security Console to review or dismiss this incident.</p>
            </div>

            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
                <p style="margin: 0;">{company_name} • Automated Security Operations Center (SOC)</p>
            </div>
        </div>
    </body>
    </html>
    """
    return {"subject": subject, "body_html": body_html}

