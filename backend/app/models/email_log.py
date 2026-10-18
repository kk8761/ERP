from typing import Optional
from sqlalchemy import String, Integer, Text, Boolean, ForeignKey
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
    document_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # "PURCHASE_ORDER", "PURCHASE_REQUISITION", "GOODS_RECEIPT", "INVOICE"
    document_reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True) # e.g. PO-6C719B, PR-1004
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body_html: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="SENT") # "SENT", "PENDING", "FAILED"
    sent_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    is_external_party: Mapped[bool] = mapped_column(Boolean, default=True)
