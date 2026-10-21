from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
from app.models.base import TimestampMixin

class OutgoingEmailLog(Base, TimestampMixin):
    """
    Enterprise Email Dispatch & Request Matrix.
    Dispatches formal business requests (PRs, POs, Invoices, Delivery Dispatches)
    to external vendors and counterparties who do not run this ERP instance.
    """
    __tablename__ = "outgoing_email_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    recipient_email: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    recipient_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    sender_email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True, index=True)
    sender_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # "PURCHASE_ORDER", "PURCHASE_REQUISITION", "GOODS_RECEIPT", "INVOICE"
    document_reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True) # e.g. PO-6C719B, PR-1004
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body_html: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="SENT") # "SENT", "PENDING", "FAILED"
    sent_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    is_external_party: Mapped[bool] = mapped_column(Boolean, default=True)
    raw_headers: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cc_recipients: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # comma-separated or JSON
    bcc_recipients: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attachments_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON list: [{filename, content_type, size, data_base64}]
    priority: Mapped[Optional[str]] = mapped_column(String(20), default="NORMAL") # "HIGH", "NORMAL", "LOW"


class ReceivedEmail(Base, TimestampMixin):
    """
    Enterprise Incoming Email & Intelligence Matrix.
    Captures incoming emails from vendors, clients, and counterparties.
    Stores AI-extracted metadata (intent, urgency, structured entities, suggested reply).
    """
    __tablename__ = "received_emails"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sender_email: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    sender_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    recipient_email: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body_text: Mapped[str] = mapped_column(Text, nullable=False)
    body_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_starred: Mapped[bool] = mapped_column(Boolean, default=False)
    is_trash: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    category: Mapped[str] = mapped_column(String(50), default="GENERAL", index=True) # "VENDOR", "CLIENT", "FINANCE", "HR", "GENERAL"
    status: Mapped[str] = mapped_column(String(30), default="RECEIVED") # "RECEIVED", "PROCESSED", "ARCHIVED"

    # Threading & Original Message Archive
    original_mail_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    original_message_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_headers: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cc_recipients: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bcc_recipients: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attachments_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority: Mapped[Optional[str]] = mapped_column(String(20), default="NORMAL")

    # AI Intelligence & Structured Extraction
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_intent: Mapped[Optional[str]] = mapped_column(String(80), nullable=True, index=True)
    ai_urgency: Mapped[Optional[str]] = mapped_column(String(30), default="NORMAL", index=True) # "CRITICAL", "HIGH", "NORMAL", "LOW"
    ai_extracted_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON of parsed entities (amounts, PO/Inv #, dates)
    ai_suggested_reply: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class EmailDraft(Base, TimestampMixin):
    """
    Enterprise Email Draft Archive.
    Stores in-progress email drafts created by users, including rich formatting, CC, BCC, and file attachments.
    """
    __tablename__ = "email_drafts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    recipient_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    recipient_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    cc_recipients: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bcc_recipients: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    body_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attachments_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority: Mapped[Optional[str]] = mapped_column(String(20), default="NORMAL")


