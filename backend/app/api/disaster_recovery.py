from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.auth import User
from app.services.disaster_recovery_service import DisasterRecoveryService
from app.schemas.disaster_recovery import (
    CreateBackupRequest,
    PITRRestoreRequest,
    RunDRDrillRequest,
    BackupRecordOut,
    TransactionLogOut,
    DRDrillOut,
    BackupAlertOut
)

router = APIRouter(prefix="/api/disaster-recovery", tags=["Disaster Recovery & Backup Management"])

# -----------------------------------------------------------------------------
# 43.2 DISASTER RECOVERY PLAN & MONTHLY TESTING (Requirements 29.4, 29.5)
# -----------------------------------------------------------------------------
@router.get("/plan", summary="Get Enterprise Disaster Recovery Plan")
async def get_disaster_recovery_plan(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Returns the formal disaster recovery plan specifying 4-hour RTO, 15-minute RPO,
    failover topology, and monthly testing procedures.
    """
    return DisasterRecoveryService.get_dr_plan()


@router.post("/drills/run", response_model=DRDrillOut, summary="Execute Monthly Disaster Recovery Drill")
async def execute_monthly_dr_drill(
    payload: RunDRDrillRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Executes automated monthly disaster recovery drill to test recovery procedures
    and verify compliance with the 4-hour Recovery Time Objective (RTO <= 4h).
    """
    conducted_by = payload.conducted_by or current_user.email or current_user.username
    drill = await DisasterRecoveryService.run_monthly_dr_drill(
        db,
        conducted_by=conducted_by,
        drill_name=payload.drill_name
    )
    return drill


@router.get("/drills", response_model=List[DRDrillOut], summary="List Monthly DR Drills History")
async def list_dr_drills_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves monthly disaster recovery testing records showing achieved RTO vs 4-hour target.
    """
    return await DisasterRecoveryService.get_dr_drills_history(db)


# -----------------------------------------------------------------------------
# 43.3 BACKUP RETENTION & LIFECYCLE (Requirement 29.6)
# -----------------------------------------------------------------------------
@router.get("/retention/policies", summary="Get Backup Retention & Lifecycle Policies")
async def get_retention_policies(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Returns lifecycle policies enforcing 90+ days backup retention and multi-tier archiving.
    """
    return DisasterRecoveryService.get_retention_policies()


@router.post("/retention/apply", summary="Apply Backup Retention Lifecycle & Archive Old Backups")
async def apply_retention_lifecycle(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Scans backups, transitions backups > 30 days to Warm Vault, and archives backups > 90 days
    to Cold Glacier while preserving all backups for at least 90+ days.
    """
    return await DisasterRecoveryService.apply_retention_lifecycle(db)


@router.get("/backups", response_model=List[BackupRecordOut], summary="List All Backups")
async def list_backups(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all backups with their storage tier (Hot Active, Warm Vault, Cold Glacier)
    and retention expiration dates (guaranteed 90+ days).
    """
    return await DisasterRecoveryService.list_backups(db)


@router.post("/backups", response_model=BackupRecordOut, summary="Create Manual or Scheduled Backup")
async def create_backup(
    payload: CreateBackupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new backup snapshot with SHA-256 integrity checksum and 90+ day retention.
    Supports failure simulation for alert testing.
    """
    record = await DisasterRecoveryService.create_backup(
        db,
        backup_name=payload.backup_name,
        backup_type=payload.backup_type,
        simulate_failure=payload.simulate_failure
    )
    return record


# -----------------------------------------------------------------------------
# 43.4 POINT-IN-TIME RECOVERY (PITR) (Requirement 29.7)
# -----------------------------------------------------------------------------
@router.get("/pitr/logs", response_model=List[TransactionLogOut], summary="Stream Write-Ahead Transaction Logs")
async def get_pitr_transaction_logs(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Streams recent write-ahead transaction logs (WAL) showing sequential LSNs and timestamps.
    """
    return await DisasterRecoveryService.get_transaction_logs(db, limit=limit)


@router.post("/pitr/restore", summary="Perform Point-in-Time Restore")
async def perform_pitr_restore(
    payload: PITRRestoreRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Executes point-in-time recovery by selecting nearest base snapshot and replaying WAL
    transaction logs up to the requested microsecond timestamp.
    """
    return await DisasterRecoveryService.perform_pitr_restore(
        db,
        target_timestamp=payload.target_timestamp,
        base_backup_id=payload.base_backup_id
    )


@router.post("/pitr/test", summary="Test Point-in-Time Recovery Procedures")
async def test_pitr_recovery_procedure(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Automated self-test executing recovery procedures to verify point-in-time recovery
    consistency with zero data loss (Requirement 29.7).
    """
    return await DisasterRecoveryService.run_pitr_recovery_test(db)


# -----------------------------------------------------------------------------
# 43.5 BACKUP MONITORING & AUDIT REPORTS
# -----------------------------------------------------------------------------
@router.get("/status", summary="Get Backup System Monitoring Status & Health")
async def get_monitoring_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Monitors backup health, success rate (99.8%), storage volume, RTO SLA compliance,
    and active failure alerts.
    """
    return await DisasterRecoveryService.get_monitoring_status(db)


@router.get("/alerts", response_model=List[BackupAlertOut], summary="List Backup Alerts")
async def list_backup_alerts(
    resolved: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists real-time alerts generated on backup failures or retention breaches.
    """
    return await DisasterRecoveryService.get_alerts(db, resolved=resolved)


@router.post("/alerts/{alert_id}/resolve", response_model=BackupAlertOut, summary="Resolve Backup Alert")
async def resolve_backup_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Marks an active backup monitoring alert as resolved.
    """
    alert = await DisasterRecoveryService.resolve_alert(db, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.get("/report", summary="Generate Backup & Disaster Recovery Audit Report")
async def generate_audit_report(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Generates downloadable compliance audit report detailing 4-hour RTO compliance,
    monthly recovery drill records, 90+ day retention compliance, and PITR verification.
    """
    return await DisasterRecoveryService.generate_audit_report(db)
