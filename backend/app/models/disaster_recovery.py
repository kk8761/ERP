from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
from app.models.base import TimestampMixin

class BackupRecord(Base, TimestampMixin):
    """
    Tracks database backup archives with storage lifecycle tiering and retention policies (Requirement 29.6).
    """
    __tablename__ = "backup_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    backup_name: Mapped[str] = mapped_column(String(150), nullable=False)
    backup_type: Mapped[str] = mapped_column(String(50), default="FULL") # FULL, INCREMENTAL, SNAPSHOT, TRANSACTION_LOG
    status: Mapped[str] = mapped_column(String(30), default="COMPLETED") # COMPLETED, FAILED, ARCHIVED, IN_PROGRESS
    storage_tier: Mapped[str] = mapped_column(String(30), default="HOT_ACTIVE") # HOT_ACTIVE (0-30d), WARM_VAULT (30-90d), COLD_GLACIER (90d+)
    retention_days: Mapped[int] = mapped_column(Integer, default=90) # Requirement 29.6: Maintain backups for 90+ days
    retention_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    archived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class TransactionLogEntry(Base):
    """
    Write-Ahead Transaction Log for Point-In-Time Recovery (PITR) (Requirement 29.7).
    """
    __tablename__ = "transaction_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    lsn: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False) # e.g. LSN-2026-0001042
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    transaction_type: Mapped[str] = mapped_column(String(50), nullable=False) # INSERT, UPDATE, DELETE, CHECKPOINT
    table_name: Mapped[str] = mapped_column(String(100), nullable=False)
    record_id: Mapped[str] = mapped_column(String(100), nullable=False)
    payload_before: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    payload_after: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)


class DRDrillExecution(Base):
    """
    Monthly Disaster Recovery Drill record tracking RTO <= 4 hours and RPO <= 15 minutes (Requirements 29.4, 29.5).
    """
    __tablename__ = "dr_drill_executions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    drill_name: Mapped[str] = mapped_column(String(150), nullable=False)
    scheduled_frequency: Mapped[str] = mapped_column(String(50), default="MONTHLY")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    rto_target_seconds: Mapped[float] = mapped_column(Float, default=14400.0) # 4 hours RTO (Requirement 29.5)
    rto_achieved_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    rto_compliance_met: Mapped[bool] = mapped_column(Boolean, default=True)
    rpo_target_seconds: Mapped[float] = mapped_column(Float, default=900.0) # 15 minutes RPO
    rpo_achieved_seconds: Mapped[float] = mapped_column(Float, default=120.0)
    status: Mapped[str] = mapped_column(String(30), default="PASSED") # PASSED, FAILED, WARNING
    step_results: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON checklist execution
    conducted_by: Mapped[str] = mapped_column(String(150), nullable=False)
    report_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class BackupAlert(Base):
    """
    Real-time monitoring and alerting for backup failures & compliance breaches (Requirement 29.6, 29.7).
    """
    __tablename__ = "backup_alerts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    severity: Mapped[str] = mapped_column(String(30), default="WARNING") # CRITICAL, WARNING, INFO
    event_type: Mapped[str] = mapped_column(String(60), nullable=False) # BACKUP_FAILED, RTO_BREACH, RETENTION_EXPIRED
    message: Mapped[str] = mapped_column(String(255), nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
