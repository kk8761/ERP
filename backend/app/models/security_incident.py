from typing import Optional
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin

class ScreenshotIncident(Base, TimestampMixin):
    """
    Enterprise Data Loss Prevention (DLP) Incident Log.
    Records unauthorized screen capture attempts (PrintScreen, Snipping tool, Print-to-PDF)
    including user identity, exact timestamp, page location, and captured image snapshot.
    Notifies system administrators and logs tamper-evident audit trails.
    """
    __tablename__ = "screenshot_incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user_name: Mapped[str] = mapped_column(String(150), nullable=False)
    user_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    
    page_url: Mapped[str] = mapped_column(String(255), nullable=False)
    action_type: Mapped[str] = mapped_column(String(100), nullable=False, default="PRINT_SCREEN_KEY")
    image_data: Mapped[str] = mapped_column(Text, nullable=False) # Base64 PNG/JPEG screenshot data URL
    
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    screen_resolution: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, default=1, index=True)
    is_reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    severity: Mapped[str] = mapped_column(String(20), default="HIGH")

    # Relationships
    user = relationship("User")
    organization = relationship("Organization")
