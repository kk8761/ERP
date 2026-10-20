import os
import re
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, desc, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, ConfigDict

import json
from app.config import settings
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.auth import User
from app.models.email_log import OutgoingEmailLog, ReceivedEmail, EmailDraft
from app.models.procurement import Supplier, PurchaseOrder, PurchaseOrderItem
from app.models.sales import Customer, SalesOrder, SalesOrderItem
from app.services.email_service import send_business_email, sync_inbox_emails, get_email_system_status
from app.services.email_ai_service import extract_email_intelligence, suggest_email_content
from app.services.order_tracking_service import get_order_tracking_flow, update_order_tracking_stage

router = APIRouter(prefix="/api/emails", tags=["Email & AI Mailbox Hub"])

# Schemas
class AttachmentItem(BaseModel):
    filename: str
    content_type: Optional[str] = "application/octet-stream"
    size: Optional[int] = 0
    data_base64: str

class SendEmailRequest(BaseModel):
    recipient_email: str
    recipient_name: Optional[str] = None
    subject: str
    body_text: str
    document_type: Optional[str] = "GENERAL_COMMUNICATION"
    document_reference: Optional[str] = "COMM-OUT"
    original_mail_id: Optional[int] = None
    cc_me: Optional[bool] = False
    cc_recipients: Optional[str] = None
    bcc_recipients: Optional[str] = None
    attachments: Optional[List[AttachmentItem]] = None
    priority: Optional[str] = "NORMAL"
    draft_id: Optional[int] = None

class EmailDraftCreate(BaseModel):
    id: Optional[int] = None
    recipient_email: Optional[str] = None
    recipient_name: Optional[str] = None
    cc_recipients: Optional[str] = None
    bcc_recipients: Optional[str] = None
    subject: Optional[str] = None
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    attachments: Optional[List[AttachmentItem]] = None
    priority: Optional[str] = "NORMAL"

class EmailDraftOut(BaseModel):
    id: int
    user_id: int
    recipient_email: Optional[str] = None
    recipient_name: Optional[str] = None
    cc_recipients: Optional[str] = None
    bcc_recipients: Optional[str] = None
    subject: Optional[str] = None
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    attachments_data: Optional[str] = None
    priority: Optional[str] = "NORMAL"
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ForwardOriginalRequest(BaseModel):
    target_email: Optional[str] = None

class SMTPSettingsRequest(BaseModel):
    smtp_host: str
    smtp_port: int = 587
    smtp_username: str
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = True
    smtp_from_email: str
    smtp_from_name: Optional[str] = "NexaERP Enterprise Mailer"

class SMTPTestRequest(BaseModel):
    recipient_email: str
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: Optional[bool] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None

class AISuggestRequest(BaseModel):
    topic: str
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    vendor_id: Optional[int] = None
    order_reference: Optional[str] = None
    context: Optional[str] = None
    tone: Optional[str] = "formal"

class StageUpdateRequest(BaseModel):
    stage: str
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None

class AIExtractRequest(BaseModel):
    subject: str
    body: str
    sender: Optional[str] = None

class ReceivedEmailOut(BaseModel):
    id: int
    sender_email: str
    sender_name: Optional[str] = None
    recipient_email: str
    subject: str
    body_text: str
    body_html: Optional[str] = None
    received_at: datetime
    is_read: bool
    is_starred: bool
    is_trash: Optional[bool] = False
    is_archived: Optional[bool] = False
    category: str
    status: str
    original_mail_id: Optional[int] = None
    original_message_body: Optional[str] = None
    raw_headers: Optional[str] = None
    cc_recipients: Optional[str] = None
    bcc_recipients: Optional[str] = None
    attachments_data: Optional[str] = None
    priority: Optional[str] = "NORMAL"
    ai_summary: Optional[str] = None
    ai_intent: Optional[str] = None
    ai_urgency: Optional[str] = None
    ai_extracted_data: Optional[str] = None
    ai_suggested_reply: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class OutgoingEmailOut(BaseModel):
    id: int
    recipient_email: str
    recipient_name: Optional[str] = None
    sender_email: Optional[str] = None
    sender_name: Optional[str] = None
    document_type: str
    document_reference: str
    subject: str
    body_html: Optional[str] = None
    raw_headers: Optional[str] = None
    status: str
    cc_recipients: Optional[str] = None
    bcc_recipients: Optional[str] = None
    attachments_data: Optional[str] = None
    priority: Optional[str] = "NORMAL"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


@router.get("/inbox", response_model=List[ReceivedEmailOut])
async def list_inbox_emails(
    folder: Optional[str] = Query("inbox"),
    category: Optional[str] = Query(None),
    unread_only: bool = Query(False),
    urgency: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves incoming emails with folder routing, AI extracted insights, search, and category filters."""
    # Ensure inbox has initial records
    count_stmt = select(func.count(ReceivedEmail.id))
    c_res = await db.execute(count_stmt)
    if (c_res.scalar() or 0) == 0:
        await sync_inbox_emails(db)

    stmt = select(ReceivedEmail).order_by(desc(ReceivedEmail.received_at))
    
    # Folder filtering
    folder_lower = (folder or "inbox").lower()
    if folder_lower == "trash":
        stmt = stmt.where(ReceivedEmail.is_trash == True)
    elif folder_lower == "archived":
        stmt = stmt.where(ReceivedEmail.is_archived == True, ReceivedEmail.is_trash == False)
    elif folder_lower == "starred":
        stmt = stmt.where(ReceivedEmail.is_starred == True, ReceivedEmail.is_trash == False)
    elif folder_lower == "urgent":
        stmt = stmt.where(or_(ReceivedEmail.ai_urgency == "HIGH", ReceivedEmail.priority == "HIGH"), ReceivedEmail.is_trash == False)
    else:  # standard inbox
        stmt = stmt.where(ReceivedEmail.is_trash == False, ReceivedEmail.is_archived == False)

    if category and category.upper() != "ALL":
        stmt = stmt.where(ReceivedEmail.category == category.upper())
    if unread_only:
        stmt = stmt.where(ReceivedEmail.is_read == False)
    if urgency and urgency.upper() != "ALL":
        stmt = stmt.where(ReceivedEmail.ai_urgency == urgency.upper())
    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                ReceivedEmail.subject.ilike(term),
                ReceivedEmail.sender_name.ilike(term),
                ReceivedEmail.sender_email.ilike(term),
                ReceivedEmail.body_text.ilike(term)
            )
        )

    stmt = stmt.offset(offset).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/inbox/{email_id}", response_model=ReceivedEmailOut)
async def get_inbox_email(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves a single email message with its AI extraction and mark as read."""
    stmt = select(ReceivedEmail).where(ReceivedEmail.id == email_id)
    res = await db.execute(stmt)
    email_obj = res.scalar_one_or_none()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email not found")

    if not email_obj.is_read:
        email_obj.is_read = True
        await db.commit()
        await db.refresh(email_obj)

    return email_obj


@router.post("/inbox/{email_id}/toggle-star")
async def toggle_star(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Toggles favorite/starred status of an email."""
    stmt = select(ReceivedEmail).where(ReceivedEmail.id == email_id)
    res = await db.execute(stmt)
    email_obj = res.scalar_one_or_none()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email not found")

    email_obj.is_starred = not (email_obj.is_starred or False)
    await db.commit()
    return {"id": email_obj.id, "is_starred": email_obj.is_starred}


@router.post("/inbox/{email_id}/toggle-read")
async def toggle_read(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Toggles read/unread status of an email."""
    stmt = select(ReceivedEmail).where(ReceivedEmail.id == email_id)
    res = await db.execute(stmt)
    email_obj = res.scalar_one_or_none()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email not found")

    email_obj.is_read = not (email_obj.is_read or False)
    await db.commit()
    return {"id": email_obj.id, "is_read": email_obj.is_read}


@router.post("/inbox/{email_id}/trash")
async def toggle_trash(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Moves an email to trash or restores it."""
    stmt = select(ReceivedEmail).where(ReceivedEmail.id == email_id)
    res = await db.execute(stmt)
    email_obj = res.scalar_one_or_none()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email not found")

    email_obj.is_trash = not (email_obj.is_trash or False)
    await db.commit()
    return {"id": email_obj.id, "is_trash": email_obj.is_trash}


@router.post("/inbox/{email_id}/archive")
async def toggle_archive(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Archives or unarchives an email."""
    stmt = select(ReceivedEmail).where(ReceivedEmail.id == email_id)
    res = await db.execute(stmt)
    email_obj = res.scalar_one_or_none()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email not found")

    email_obj.is_archived = not (email_obj.is_archived or False)
    await db.commit()
    return {"id": email_obj.id, "is_archived": email_obj.is_archived}


@router.post("/inbox/sync")
async def trigger_inbox_sync(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Manually triggers an email sync via IMAP (or automated demo communications) and runs AI extraction."""
    synced = await sync_inbox_emails(db)
    return {
        "status": "SYNCED",
        "new_messages_count": len(synced),
        "synced_at": datetime.now(timezone.utc).isoformat()
    }


@router.get("/sent", response_model=List[OutgoingEmailOut])
async def list_sent_emails(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lists dispatched outgoing emails."""
    stmt = select(OutgoingEmailLog).order_by(desc(OutgoingEmailLog.created_at)).offset(offset).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/send")
async def send_email_endpoint(
    payload: SendEmailRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Sends a business email via SMTP (or simulated relay), delivers CC copy to sender if requested, and logs to the audit ledger."""
    sender_name = current_user.full_name or "Karthik Reddy"
    sender_email = current_user.email or "admin@nexaerp.internal"
    
    # If using live external SMTP and current user has an internal dummy email, route through verified SMTP sender
    if settings.SMTP_HOST and settings.SMTP_FROM_EMAIL and "@" in settings.SMTP_FROM_EMAIL:
        if sender_email.endswith(".internal") or sender_email.endswith(".local"):
            sender_email = settings.SMTP_FROM_EMAIL
            sender_name = settings.SMTP_FROM_NAME or sender_name

    cc_email = current_user.email
    if settings.SMTP_HOST and settings.SMTP_USERNAME and "@" in settings.SMTP_USERNAME:
        if cc_email and (cc_email.endswith(".internal") or cc_email.endswith(".local")):
            cc_email = settings.SMTP_USERNAME

    body_html = f"<div style='font-family:sans-serif;line-height:1.6;color:#1e293b;padding:16px;'>{payload.body_text.replace(chr(10), '<br/>')}</div>"

    log_entry = await send_business_email(
        db=db,
        recipient_email=payload.recipient_email,
        recipient_name=payload.recipient_name or payload.recipient_email,
        document_type=payload.document_type or "GENERAL_COMMUNICATION",
        document_reference=payload.document_reference or "COMM-OUT",
        subject=payload.subject,
        body_html=body_html,
        sent_by_user_id=current_user.id,
        sender_email=sender_email,
        sender_name=sender_name,
        cc_me=payload.cc_me if payload.cc_me is not None else True,
        cc_email=cc_email,
        cc_recipients=payload.cc_recipients,
        bcc_recipients=payload.bcc_recipients,
        attachments=[att.model_dump() for att in payload.attachments] if payload.attachments else None,
        priority=payload.priority or "NORMAL"
    )

    if payload.draft_id:
        draft_stmt = select(EmailDraft).where(EmailDraft.id == payload.draft_id, EmailDraft.user_id == current_user.id)
        d_res = await db.execute(draft_stmt)
        draft_item = d_res.scalar_one_or_none()
        if draft_item:
            await db.delete(draft_item)

    await db.commit()
    smtp_res = getattr(log_entry, "smtp_result", {}) or {}
    is_simulated = smtp_res.get("is_simulated", False) or (smtp_res.get("mode") != "SMTP_RELAY")
    mode = smtp_res.get("mode", "SIMULATED")

    return {
        "status": "DISPATCHED",
        "log_id": log_entry.id,
        "delivery_status": log_entry.status,
        "mode": mode,
        "is_simulated": is_simulated,
        "message": smtp_res.get("message", "Email logged in system ledger."),
        "error": smtp_res.get("error"),
        "recipient": log_entry.recipient_email,
        "sender": log_entry.sender_email,
        "cc_recipient": current_user.email if payload.cc_me else None,
        "cc_recipients": payload.cc_recipients,
        "bcc_recipients": payload.bcc_recipients,
        "priority": log_entry.priority
    }


@router.get("/drafts", response_model=List[EmailDraftOut])
async def list_drafts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves all drafts for the authenticated user."""
    stmt = select(EmailDraft).where(EmailDraft.user_id == current_user.id).order_by(desc(EmailDraft.updated_at))
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/drafts", response_model=EmailDraftOut)
async def save_draft(
    payload: EmailDraftCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Creates a new draft or updates an existing draft."""
    att_str = json.dumps([att.model_dump() for att in payload.attachments]) if payload.attachments else None
    
    if payload.id:
        stmt = select(EmailDraft).where(EmailDraft.id == payload.id, EmailDraft.user_id == current_user.id)
        res = await db.execute(stmt)
        draft = res.scalar_one_or_none()
        if draft:
            draft.recipient_email = payload.recipient_email
            draft.recipient_name = payload.recipient_name
            draft.cc_recipients = payload.cc_recipients
            draft.bcc_recipients = payload.bcc_recipients
            draft.subject = payload.subject
            draft.body_text = payload.body_text
            draft.body_html = payload.body_html
            draft.attachments_data = att_str
            draft.priority = payload.priority or "NORMAL"
            draft.updated_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(draft)
            return draft
            
    draft = EmailDraft(
        user_id=current_user.id,
        recipient_email=payload.recipient_email,
        recipient_name=payload.recipient_name,
        cc_recipients=payload.cc_recipients,
        bcc_recipients=payload.bcc_recipients,
        subject=payload.subject,
        body_text=payload.body_text,
        body_html=payload.body_html,
        attachments_data=att_str,
        priority=payload.priority or "NORMAL"
    )
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return draft


@router.delete("/drafts/{draft_id}")
async def delete_draft(
    draft_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Deletes a draft by ID."""
    stmt = select(EmailDraft).where(EmailDraft.id == draft_id, EmailDraft.user_id == current_user.id)
    res = await db.execute(stmt)
    draft = res.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    await db.delete(draft)
    await db.commit()
    return {"status": "DELETED", "id": draft_id}


@router.get("/inbox/{email_id}/original")
async def get_original_email_for_inbox_item(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves full original mail details, either linked via original_mail_id or embedded original_message_body."""
    stmt = select(ReceivedEmail).where(ReceivedEmail.id == email_id)
    res = await db.execute(stmt)
    email_obj = res.scalar_one_or_none()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email not found")

    original_details = {
        "email_id": email_id,
        "subject": email_obj.subject,
        "has_original": False,
        "original_mail_id": email_obj.original_mail_id,
        "original_message_body": email_obj.original_message_body,
        "raw_headers": email_obj.raw_headers,
        "linked_outgoing": None
    }

    if email_obj.original_mail_id:
        out_stmt = select(OutgoingEmailLog).where(OutgoingEmailLog.id == email_obj.original_mail_id)
        out_res = await db.execute(out_stmt)
        out_obj = out_res.scalar_one_or_none()
        if out_obj:
            original_details["has_original"] = True
            original_details["linked_outgoing"] = {
                "id": out_obj.id,
                "recipient_email": out_obj.recipient_email,
                "recipient_name": out_obj.recipient_name,
                "sender_email": out_obj.sender_email,
                "sender_name": out_obj.sender_name,
                "subject": out_obj.subject,
                "document_type": out_obj.document_type,
                "document_reference": out_obj.document_reference,
                "body_html": out_obj.body_html,
                "status": out_obj.status,
                "created_at": out_obj.created_at.isoformat() if out_obj.created_at else None,
                "raw_headers": out_obj.raw_headers
            }
            if not original_details["original_message_body"]:
                original_details["original_message_body"] = re.sub(r'<[^>]+>', '', out_obj.body_html or '')
    elif email_obj.original_message_body:
        original_details["has_original"] = True

    return original_details


@router.post("/inbox/{email_id}/forward-original")
async def forward_original_email(
    email_id: int,
    payload: ForwardOriginalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Forwards/delivers a verified copy of the original email to the user's email address."""
    stmt = select(ReceivedEmail).where(ReceivedEmail.id == email_id)
    res = await db.execute(stmt)
    email_obj = res.scalar_one_or_none()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email not found")

    target = payload.target_email or current_user.email or "admin@nexaerp.internal"
    orig_body = email_obj.original_message_body or email_obj.body_text
    orig_subject = f"Fwd: [Original Mail Archive] {email_obj.subject}"

    body_html = f"""
    <div style='font-family:sans-serif;line-height:1.6;color:#1e293b;padding:16px;'>
        <div style='background:#f8fafc;border-left:4px solid #0284c7;padding:12px;margin-bottom:16px;'>
            <strong>NexaERP Official Mail Archive Forward</strong><br/>
            Original Received Message ID: #{email_obj.id}<br/>
            Original Sender: {email_obj.sender_name} &lt;{email_obj.sender_email}&gt;<br/>
            Received Date: {email_obj.received_at.strftime('%a, %d %b %Y %H:%M UTC') if email_obj.received_at else 'N/A'}<br/>
            Forwarded To: {target}
        </div>
        <div style='white-space:pre-wrap;background:#ffffff;padding:16px;border:1px solid #e2e8f0;border-radius:6px;'>
{orig_body}
        </div>
    </div>
    """

    log_entry = await send_business_email(
        db=db,
        recipient_email=target,
        recipient_name=current_user.full_name or target,
        document_type="FORWARDED_ORIGINAL",
        document_reference=f"FWD-ORIG-{email_obj.id}",
        subject=orig_subject,
        body_html=body_html,
        sent_by_user_id=current_user.id,
        sender_email=current_user.email or "admin@nexaerp.internal",
        sender_name=current_user.full_name or "System Administrator",
        cc_me=False
    )
    await db.commit()
    return {
        "status": "FORWARDED",
        "recipient": target,
        "delivery_status": log_entry.status,
        "log_id": log_entry.id
    }


@router.get("/inbox/{email_id}/raw")
async def get_raw_email_source(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns raw RFC822 MIME source headers and message body for full audit authenticity."""
    stmt = select(ReceivedEmail).where(ReceivedEmail.id == email_id)
    res = await db.execute(stmt)
    email_obj = res.scalar_one_or_none()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email not found")

    headers_str = email_obj.raw_headers or (
        f"From: {email_obj.sender_name or email_obj.sender_email} <{email_obj.sender_email}>\n"
        f"To: {email_obj.recipient_email}\n"
        f"Subject: {email_obj.subject}\n"
        f"Date: {email_obj.received_at.strftime('%a, %d %b %Y %H:%M:%S +0000') if email_obj.received_at else ''}\n"
        f"Message-ID: <msg-{email_obj.id}@nexaerp.internal>\n"
        f"Content-Type: text/plain; charset=utf-8"
    )

    full_rfc822 = f"{headers_str}\n\n{email_obj.body_text}"
    return {
        "id": email_obj.id,
        "headers": headers_str,
        "raw_rfc822": full_rfc822
    }


@router.get("/user-context")
async def get_email_user_context(
    current_user: User = Depends(get_current_user)
):
    """
    Returns current user's role profile, functional duties, email signature,
    and specialized quick prompts tailored to their organizational duties.
    """
    user_roles = [ur.role.name for ur in (current_user.roles or [])]
    role_str = ", ".join(user_roles) if user_roles else ("Super Administrator" if current_user.is_superuser else "Staff Member")

    # Determine functional role category
    role_lower = role_str.lower()
    if current_user.is_superuser or "admin" in role_lower:
        primary_role = "ADMIN"
        job_title = "System Administrator"
        department = "Executive & IT Administration"
        duties = [
            "Enterprise system operations and governance",
            "Purchase order and financial release authorizations",
            "Vendor relationship oversight and contract enforcement",
            "Emergency escalations and multi-department coordination"
        ]
        quick_prompts = [
            {"label": "Expedited PO Delivery Request", "prompt": "Request immediate expedited delivery for the pending purchase order due to critical store inventory thresholds."},
            {"label": "Contract & Pricing Revision", "prompt": "Inquire about updated volume discounts and quarterly rate card revisions under our preferred vendor agreement."},
            {"label": "Audit & Compliance Documentation", "prompt": "Request official GST e-waybill, compliance certificates, and signed delivery challan for our audit file."},
            {"label": "Vendor Performance Review", "prompt": "Schedule a quarterly vendor performance and SLA review meeting with purchasing leadership."}
        ]
    elif "procurement" in role_lower or "purchas" in role_lower or "inventory" in role_lower:
        primary_role = "PROCUREMENT"
        job_title = "Procurement & Supply Chain Officer"
        department = "Purchasing & Inventory Control"
        duties = [
            "Supplier requisition processing and purchase order placement",
            "Vendor lead time monitoring and delivery expediting",
            "Batch quality inspection coordination at warehouse receiving dock",
            "Material price negotiation and quotation comparison"
        ]
        quick_prompts = [
            {"label": "Urgent PO Status Inquiry", "prompt": "Follow up on the scheduled dispatch date and carrier consignment tracking number for our open purchase order."},
            {"label": "Dock Delivery Scheduling", "prompt": "Coordinate delivery appointment window at Warehouse Receiving Dock Bay 4 to ensure immediate offloading."},
            {"label": "Damaged / Short Shipment Claim", "prompt": "Report discrepancy between invoice quantities and actual received units; request replacement or credit note."},
            {"label": "Request Updated Quotation / RFQ", "prompt": "Request formal price quotation and guaranteed lead time for our upcoming inventory replenishment batch."}
        ]
    elif "account" in role_lower or "finance" in role_lower:
        primary_role = "FINANCE"
        job_title = "Financial Controller & Accounts Lead"
        department = "Finance & Accounts Payable"
        duties = [
            "Vendor tax invoice 3-way matching with PO and Goods Receipt",
            "Wire transfer remittances and payment release scheduling",
            "GST e-invoicing verification and input tax credit reconciliation",
            "Vendor statement of account reconciliation"
        ]
        quick_prompts = [
            {"label": "Payment Remittance Advice", "prompt": "Confirm that wire transfer payment has been cleared against your tax invoice; attach payment advice."},
            {"label": "Missing Tax Invoice Request", "prompt": "Request GST-compliant original tax invoice with e-waybill for completed purchase consignment."},
            {"label": "Payment Terms & Ledger Reconciliation", "prompt": "Request mutual statement of accounts reconciliation for the preceding month under Net-30 terms."},
            {"label": "Hold Notice Pending QC Clearance", "prompt": "Notify supplier that payment is temporarily on hold pending quality check sign-off at receiving bay."}
        ]
    elif "cashier" in role_lower or "sales" in role_lower:
        primary_role = "SALES"
        job_title = "Sales & Customer Accounts Specialist"
        department = "Commercial Sales & Retail Operations"
        duties = [
            "Customer quotation drafting and order fulfillment updates",
            "Dispatch waybill tracking and customer delivery confirmations",
            "Invoicing, return handling, and payment receipt confirmation"
        ]
        quick_prompts = [
            {"label": "Order Fulfillment & Dispatch Confirmation", "prompt": "Confirm that customer sales order has been packed and handed over to express courier with live tracking."},
            {"label": "Proforma Invoice & Payment Instructions", "prompt": "Provide proforma invoice with bank wire details for swift processing of confirmed order."},
            {"label": "Delivery Status Check", "prompt": "Update client regarding final-mile courier transit status and expected delivery schedule."},
            {"label": "Post-Delivery Satisfaction Follow-Up", "prompt": "Thank customer for their order and request feedback on product condition and delivery speed."}
        ]
    else:
        primary_role = "STAFF"
        job_title = "Business Operations Associate"
        department = "General Operations"
        duties = ["Cross-functional correspondence and administrative coordination"]
        quick_prompts = [
            {"label": "General Status Inquiry", "prompt": "Request an update regarding the pending business communication and next scheduled milestones."},
            {"label": "Meeting & Discussion Scheduling", "prompt": "Propose a collaborative meeting slot to align on operational priorities."}
        ]

    signature = (
        f"Best regards,\n"
        f"{current_user.full_name}\n"
        f"{job_title} • {department}\n"
        f"Nexa Global Enterprises | ERP System Hub\n"
        f"Email: {current_user.email}"
    )

    return {
        "user_id": current_user.id,
        "name": current_user.full_name,
        "email": current_user.email,
        "primary_role": primary_role,
        "roles": user_roles,
        "job_title": job_title,
        "department": department,
        "duties": duties,
        "signature": signature,
        "quick_prompts": quick_prompts
    }


@router.get("/entities/lookup")
async def lookup_erp_entity(
    query: Optional[str] = Query(None, description="Search term for vendor or customer"),
    email: Optional[str] = Query(None, description="Specific email address to lookup"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Searches known Vendors (Suppliers) and Customers in the ERP database.
    Returns entity master data + their active Purchase Orders or Sales Orders.
    Guarantees strict single-entity isolation.
    """
    matched_vendor = None
    matched_customer = None

    # 1. Lookup Supplier
    sup_stmt = select(Supplier).options(
        selectinload(Supplier.purchase_orders).selectinload(PurchaseOrder.items)
    )
    if email and email.strip():
        sup_stmt = sup_stmt.where(Supplier.email.ilike(email.strip()))
    elif query and query.strip():
        q_term = f"%{query.strip()}%"
        sup_stmt = sup_stmt.where(
            or_(
                Supplier.name.ilike(q_term),
                Supplier.vendor_code.ilike(q_term),
                Supplier.email.ilike(q_term)
            )
        )
    sup_res = await db.execute(sup_stmt)
    supplier = sup_res.scalars().first()

    if supplier:
        pos_data = []
        for po in sorted(supplier.purchase_orders, key=lambda x: x.id, reverse=True)[:5]:
            items_list = [
                {
                    "product_name": it.product_name,
                    "quantity_ordered": it.quantity_ordered,
                    "quantity_received": it.quantity_received,
                    "unit_cost": float(it.unit_cost),
                    "line_total": float(it.line_total)
                }
                for it in (po.items or [])
            ]
            pos_data.append({
                "id": po.id,
                "po_number": po.po_number,
                "status": po.status,
                "total_amount": float(po.total_amount),
                "payment_terms": po.payment_terms or supplier.payment_terms or "Net 30 Days",
                "items_count": len(po.items or []),
                "items": items_list,
                "created_at": po.created_at.isoformat() if po.created_at else None
            })

        matched_vendor = {
            "entity_type": "VENDOR",
            "id": supplier.id,
            "name": supplier.name,
            "vendor_code": supplier.vendor_code,
            "email": supplier.email,
            "phone": supplier.phone,
            "contact_person": supplier.contact_person,
            "payment_terms": supplier.payment_terms or "Net 30 Days",
            "rating_score": supplier.rating_score or 90.0,
            "status": supplier.status,
            "orders": pos_data
        }

    # 2. Lookup Customer if no vendor matched or if explicitly searched
    if not matched_vendor:
        cust_stmt = select(Customer).options(
            selectinload(Customer.orders).selectinload(SalesOrder.items)
        )
        if email and email.strip():
            cust_stmt = cust_stmt.where(Customer.email.ilike(email.strip()))
        elif query and query.strip():
            q_term = f"%{query.strip()}%"
            cust_stmt = cust_stmt.where(
                or_(
                    Customer.name.ilike(q_term),
                    Customer.email.ilike(q_term),
                    Customer.phone.ilike(q_term)
                )
            )
        cust_res = await db.execute(cust_stmt)
        customer = cust_res.scalars().first()

        if customer:
            sos_data = []
            for so in sorted(customer.orders, key=lambda x: x.id, reverse=True)[:5]:
                items_list = [
                    {
                        "product_name": it.product_name,
                        "quantity": it.quantity,
                        "unit_price": float(it.unit_price),
                        "line_total": float(it.line_total)
                    }
                    for it in (so.items or [])
                ]
                sos_data.append({
                    "id": so.id,
                    "order_reference": so.invoice_number,
                    "order_status": so.order_status,
                    "payment_status": so.payment_status,
                    "total_amount": float(so.total_amount),
                    "items": items_list,
                    "created_at": so.created_at.isoformat() if so.created_at else None
                })

            matched_customer = {
                "entity_type": "CUSTOMER",
                "id": customer.id,
                "name": customer.name,
                "email": customer.email,
                "phone": customer.phone,
                "total_spend": float(customer.total_spend),
                "orders": sos_data
            }

    return {
        "matched": bool(matched_vendor or matched_customer),
        "vendor": matched_vendor,
        "customer": matched_customer
    }


@router.get("/vendors-and-orders")
async def list_vendors_and_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns all registered suppliers and recent purchase orders for instant
    dropdown selection and anti-criss-cross context anchoring in the composer.
    """
    stmt = (
        select(Supplier)
        .options(
            selectinload(Supplier.purchase_orders).selectinload(PurchaseOrder.items)
        )
        .order_by(Supplier.name.asc())
    )
    res = await db.execute(stmt)
    suppliers = res.scalars().all()

    vendors_out = []
    for s in suppliers:
        po_list = []
        for po in sorted(s.purchase_orders, key=lambda p: p.id, reverse=True)[:6]:
            po_list.append({
                "id": po.id,
                "po_number": po.po_number,
                "status": po.status,
                "total_amount": float(po.total_amount),
                "payment_terms": po.payment_terms or s.payment_terms or "Net 30 Days",
                "items_count": len(po.items or []),
                "items_summary": [it.product_name for it in (po.items or [])[:3]]
            })

        vendors_out.append({
            "id": s.id,
            "name": s.name,
            "vendor_code": s.vendor_code or f"VEND-{s.id}",
            "email": s.email or "",
            "contact_person": s.contact_person or "Accounts",
            "payment_terms": s.payment_terms or "Net 30 Days",
            "purchase_orders": po_list
        })

    return {"vendors": vendors_out}


@router.get("/orders/track/{order_ref}")
async def track_order_flow(
    order_ref: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves full lifecycle tracking flow for a Purchase Order (PO-...) or Sales Order (INV-...).
    Includes visual milestones, carrier waybill data, line items, and current completion percentage.
    """
    tracking = await get_order_tracking_flow(db, order_ref)
    if not tracking:
        raise HTTPException(
            status_code=404,
            detail=f"Order reference '{order_ref}' not found in procurement or sales records."
        )
    return tracking


@router.post("/orders/track/{order_ref}/stage")
async def update_order_stage(
    order_ref: str,
    payload: StageUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Advances or updates the tracking stage for an order (e.g. IN_TRANSIT, DOCK_RECEIVED, MATCHED_PAID).
    """
    try:
        updated = update_order_tracking_stage(
            order_reference=order_ref,
            new_stage=payload.stage,
            carrier=payload.carrier,
            tracking_number=payload.tracking_number
        )
        # Fetch fresh full tracking flow
        fresh = await get_order_tracking_flow(db, order_ref)
        return fresh or updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ai-suggest")
async def ai_suggest_email_content(
    payload: AISuggestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Uses Groq AI with strict RAG ERP grounding to draft an email.
    Guarantees zero cross-contamination (anti-criss-cross):
    - Grounded in the specific vendor master record and specific PO line items.
    - Tailored to sender's exact organizational role and authority duties.
    """
    vendor_info = None
    order_info = None

    # 1. Fetch exact vendor if specified
    if payload.vendor_id:
        v_stmt = select(Supplier).where(Supplier.id == payload.vendor_id)
        v_res = await db.execute(v_stmt)
        sup = v_res.scalar_one_or_none()
        if sup:
            vendor_info = {
                "name": sup.name,
                "vendor_code": sup.vendor_code,
                "contact_person": sup.contact_person,
                "email": sup.email,
                "payment_terms": sup.payment_terms
            }
    elif payload.recipient_email:
        v_stmt = select(Supplier).where(Supplier.email.ilike(payload.recipient_email.strip()))
        v_res = await db.execute(v_stmt)
        sup = v_res.scalar_one_or_none()
        if sup:
            vendor_info = {
                "name": sup.name,
                "vendor_code": sup.vendor_code,
                "contact_person": sup.contact_person,
                "email": sup.email,
                "payment_terms": sup.payment_terms
            }

    # 2. Fetch exact order tracking & items if specified
    if payload.order_reference:
        order_info = await get_order_tracking_flow(db, payload.order_reference)
        # If vendor was not set, deduce vendor from order
        if not vendor_info and order_info and order_info.get("vendor_name"):
            vendor_info = {
                "name": order_info.get("vendor_name"),
                "vendor_code": order_info.get("vendor_code"),
                "contact_person": "Vendor Partner",
                "email": order_info.get("vendor_email"),
                "payment_terms": order_info.get("payment_terms")
            }

    # 3. Derive user role and title
    user_roles = [ur.role.name for ur in (current_user.roles or [])]
    user_role_label = user_roles[0] if user_roles else ("System Administrator" if current_user.is_superuser else "Staff Member")
    user_title = user_role_label

    result = suggest_email_content(
        topic=payload.topic,
        recipient_name=payload.recipient_name,
        context=payload.context,
        tone=payload.tone or "formal",
        vendor_info=vendor_info,
        order_info=order_info,
        user_role=user_role_label,
        user_name=current_user.full_name or "Karthik Reddy",
        user_title=user_title
    )
    return result


@router.post("/ai-extract")
async def ai_extract_email_intelligence(
    payload: AIExtractRequest,
    current_user: User = Depends(get_current_user)
):
    """Uses Groq AI to extract summary, intent, urgency, entities, and generate smart reply for any email."""
    result = extract_email_intelligence(
        subject=payload.subject,
        body=payload.body,
        sender=payload.sender or "Unknown"
    )
    return result


@router.get("/status")
async def email_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns real-time status of the enterprise mail and AI extraction subsystem."""
    return await get_email_system_status(db)


def _update_env_file(updates: Dict[str, str]):
    candidate_paths = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env")),
        os.path.abspath(".env")
    ]
    target_path = None
    for p in candidate_paths:
        if os.path.exists(p):
            target_path = p
            break
    if not target_path:
        target_path = candidate_paths[0]

    lines = []
    if os.path.exists(target_path):
        with open(target_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

    existing_keys = set()
    new_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            k = stripped.split("=", 1)[0].strip()
            if k in updates:
                new_lines.append(f"{k}={updates[k]}\n")
                existing_keys.add(k)
                continue
        new_lines.append(line)

    for k, v in updates.items():
        if k not in existing_keys:
            new_lines.append(f"{k}={v}\n")

    with open(target_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)


@router.get("/smtp-config")
async def get_smtp_configuration(
    current_user: User = Depends(get_current_user)
):
    """Returns the current live SMTP configuration status and details (password masked)."""
    has_host = bool(settings.SMTP_HOST and settings.SMTP_HOST.strip())
    has_pwd = bool(settings.SMTP_PASSWORD and settings.SMTP_PASSWORD.strip())
    return {
        "is_configured": has_host and bool(settings.SMTP_USERNAME),
        "mode": "LIVE_SMTP" if has_host else "SIMULATED",
        "smtp_host": settings.SMTP_HOST or "",
        "smtp_port": settings.SMTP_PORT or 587,
        "smtp_username": settings.SMTP_USERNAME or "",
        "has_password": has_pwd,
        "smtp_use_tls": settings.SMTP_USE_TLS,
        "smtp_from_email": settings.SMTP_FROM_EMAIL or "procurement@nexaerp.internal",
        "smtp_from_name": settings.SMTP_FROM_NAME or "NexaERP Enterprise Mailer"
    }


@router.post("/smtp-config")
async def update_smtp_configuration(
    payload: SMTPSettingsRequest,
    current_user: User = Depends(get_current_user)
):
    """Updates SMTP configuration both in-memory and persisted into the .env file."""
    # Update in-memory settings
    settings.SMTP_HOST = payload.smtp_host.strip() if payload.smtp_host else None
    settings.SMTP_PORT = payload.smtp_port
    settings.SMTP_USERNAME = payload.smtp_username.strip() if payload.smtp_username else None
    if payload.smtp_password is not None and payload.smtp_password.strip():
        clean_pwd = payload.smtp_password.replace(" ", "").strip()
        settings.SMTP_PASSWORD = clean_pwd
    settings.SMTP_USE_TLS = payload.smtp_use_tls
    settings.SMTP_FROM_EMAIL = payload.smtp_from_email.strip() if payload.smtp_from_email else settings.SMTP_FROM_EMAIL
    if payload.smtp_from_name:
        settings.SMTP_FROM_NAME = payload.smtp_from_name.strip()

    # Persist to .env
    env_updates = {
        "SMTP_HOST": settings.SMTP_HOST or "",
        "SMTP_PORT": str(settings.SMTP_PORT),
        "SMTP_USERNAME": settings.SMTP_USERNAME or "",
        "SMTP_USE_TLS": str(settings.SMTP_USE_TLS).lower(),
        "SMTP_FROM_EMAIL": settings.SMTP_FROM_EMAIL,
        "SMTP_FROM_NAME": f'"{settings.SMTP_FROM_NAME}"'
    }
    if settings.SMTP_PASSWORD:
        env_updates["SMTP_PASSWORD"] = settings.SMTP_PASSWORD

    _update_env_file(env_updates)

    return {
        "status": "CONFIGURED",
        "message": "SMTP relay configuration updated and persisted.",
        "mode": "LIVE_SMTP" if settings.SMTP_HOST else "SIMULATED",
        "smtp_host": settings.SMTP_HOST,
        "smtp_port": settings.SMTP_PORT,
        "smtp_username": settings.SMTP_USERNAME,
        "smtp_from_email": settings.SMTP_FROM_EMAIL
    }


@router.post("/smtp-test")
async def test_smtp_relay(
    payload: SMTPTestRequest,
    current_user: User = Depends(get_current_user)
):
    """Attempts immediate live delivery of a test email via the configured or provided SMTP parameters."""
    host = (payload.smtp_host or settings.SMTP_HOST or "").strip()
    port = payload.smtp_port or settings.SMTP_PORT or 587
    username = (payload.smtp_username or settings.SMTP_USERNAME or "").strip()
    password = (payload.smtp_password if payload.smtp_password is not None and payload.smtp_password.strip() else settings.SMTP_PASSWORD or "").replace(" ", "").strip()
    use_tls = payload.smtp_use_tls if payload.smtp_use_tls is not None else settings.SMTP_USE_TLS
    from_email = (payload.smtp_from_email or settings.SMTP_FROM_EMAIL or username or "procurement@nexaerp.internal").strip()
    from_name = (payload.smtp_from_name or settings.SMTP_FROM_NAME or "NexaERP Enterprise Mailer").strip()
    recipient = (payload.recipient_email or current_user.email).strip()

    if not host:
        raise HTTPException(
            status_code=400,
            detail="SMTP Host is missing. Please configure an SMTP Host (e.g. smtp.gmail.com) before sending a live test."
        )

    if not recipient:
        raise HTTPException(
            status_code=400,
            detail="Recipient email address is required for test dispatch."
        )

    def _sync_test():
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"NexaERP Live SMTP Verification: {datetime.now().strftime('%d %b %Y %H:%M:%S')}"
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = recipient
        msg["Date"] = formatdate(localtime=True)
        msg["Message-ID"] = make_msgid(domain=from_email.split("@")[-1] if "@" in from_email else "nexaerp.internal")
        msg["X-Mailer"] = "NexaERP Diagnostic Mailer"

        plain_text = (
            f"NexaERP Live SMTP Relay Verification\n\n"
            f"This is an automated test message dispatched by NexaERP.\n\n"
            f"Relay Server: {host}:{port}\n"
            f"Authenticated User: {username}\n"
            f"Recipient: {recipient}\n"
            f"Timestamp: {datetime.now(timezone.utc).isoformat()}\n\n"
            f"If you received this message in your personal Gmail/inbox, your NexaERP live mail integration is 100% active and working!"
        )

        body_html = f"""
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#1e293b;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
            <div style="background:linear-gradient(135deg,#0284c7 0%,#0369a1 100%);color:#ffffff;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
                <h2 style="margin:0;font-size:20px;letter-spacing:-0.02em;">NexaERP Live SMTP Verification</h2>
                <p style="margin:4px 0 0;font-size:12px;opacity:0.9;">Secure Enterprise Mail Dispatch Matrix</p>
            </div>
            <div style="background:#ffffff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;">
                <p style="font-size:15px;color:#0f172a;font-weight:600;margin-top:0;">
                    ✓ Live Email Delivery Confirmed!
                </p>
                <p style="font-size:13px;color:#475569;">
                    This test message confirms that NexaERP has successfully connected to your external mail server and transmitted directly to your personal inbox.
                </p>
                <div style="background:#f1f5f9;border-radius:6px;padding:14px;margin:18px 0;font-size:12px;">
                    <div style="margin-bottom:6px;"><strong>SMTP Server:</strong> {host}:{port}</div>
                    <div style="margin-bottom:6px;"><strong>Auth Account:</strong> {username}</div>
                    <div style="margin-bottom:6px;"><strong>Security / TLS:</strong> {'STARTTLS Encrypted' if use_tls else 'Direct / SSL'}</div>
                    <div style="margin-bottom:6px;"><strong>Destination:</strong> {recipient}</div>
                    <div><strong>Server Timestamp:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}</div>
                </div>
                <p style="font-size:12px;color:#64748b;margin-bottom:0;">
                    All subsequent Purchase Orders, RFQs, invoices, and manual dispatches from the NexaERP Mail Hub will now route through this live relay to external vendors and personal inboxes.
                </p>
            </div>
        </div>
        """

        msg.attach(MIMEText(plain_text, "plain", "utf-8"))
        msg.attach(MIMEText(body_html, "html", "utf-8"))

        server = None
        try:
            if port == 465:
                server = smtplib.SMTP_SSL(host, port, timeout=15)
            else:
                server = smtplib.SMTP(host, port, timeout=15)
                if use_tls:
                    server.starttls()

            if username and password:
                server.login(username, password)

            server.sendmail(from_email, [recipient], msg.as_string())
            server.quit()
            return {
                "success": True,
                "message": f"Live test email sent successfully to {recipient} via {host}:{port}!"
            }
        except smtplib.SMTPAuthenticationError as auth_err:
            if "gmail" in host.lower():
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Gmail Authentication Failed (535): Google requires a 16-character Google App Password when 2-Step Verification is enabled. "
                        "Your regular Gmail login password will NOT work. "
                        "Steps: 1. Open Google Account (myaccount.google.com). 2. Go to Security > 2-Step Verification. "
                        "3. Scroll to bottom, click 'App passwords'. 4. Create an app named 'NexaERP' and paste the 16-character key here."
                    )
                )
            raise HTTPException(
                status_code=400,
                detail=f"SMTP Authentication Error ({auth_err.smtp_code}): {auth_err.smtp_error.decode('utf-8', errors='ignore') if isinstance(auth_err.smtp_error, bytes) else str(auth_err)}"
            )
        except smtplib.SMTPConnectError as conn_err:
            raise HTTPException(
                status_code=400,
                detail=f"Could not connect to SMTP server at {host}:{port}. Check host address and firewall rules."
            )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to dispatch test email via {host}:{port}: {str(exc)}"
            )
        finally:
            if server:
                try:
                    server.close()
                except Exception:
                    pass

    return await asyncio.to_thread(_sync_test)

