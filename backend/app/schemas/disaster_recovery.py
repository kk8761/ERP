from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

class CreateBackupRequest(BaseModel):
    backup_name: Optional[str] = None
    backup_type: str = "FULL"
    simulate_failure: bool = False

class PITRRestoreRequest(BaseModel):
    target_timestamp: datetime
    base_backup_id: Optional[str] = None

class RunDRDrillRequest(BaseModel):
    conducted_by: Optional[str] = "SecOps Administrator"
    drill_name: Optional[str] = None

class BackupRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    backup_name: str
    backup_type: str
    status: str
    storage_tier: str
    retention_days: int
    retention_until: datetime
    file_path: str
    file_size_bytes: int
    checksum_sha256: str
    is_archived: bool
    archived_at: Optional[datetime] = None
    created_at: datetime

class TransactionLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lsn: str
    timestamp: datetime
    transaction_type: str
    table_name: str
    record_id: str
    payload_before: Optional[str] = None
    payload_after: Optional[str] = None
    archived: bool

class DRDrillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    drill_name: str
    scheduled_frequency: str
    started_at: datetime
    completed_at: datetime
    duration_seconds: float
    rto_target_seconds: float
    rto_achieved_seconds: float
    rto_compliance_met: bool
    rpo_target_seconds: float
    rpo_achieved_seconds: float
    status: str
    step_results: Optional[str] = None
    conducted_by: str
    report_summary: Optional[str] = None

class BackupAlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    severity: str
    event_type: str
    message: str
    details: Optional[str] = None
    resolved: bool
    created_at: datetime
