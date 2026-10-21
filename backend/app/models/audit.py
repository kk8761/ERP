from typing import Optional
from sqlalchemy import String, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
from app.models.base import TimestampMixin

class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    user_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True) # e.g. "AUTH_LOGIN", "SALE_CREATE", "ELEVATION_REQUEST"
    entity_name: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. "SalesOrder", "User"
    entity_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="SUCCESS") # SUCCESS, FAILURE, DENIED
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON or formatted description
    prev_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True) # Cryptographic hash chain
    record_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True) # SHA-256 seal of this record
