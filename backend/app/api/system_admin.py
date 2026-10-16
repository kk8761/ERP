from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.auth import User
from app.services.system_admin_service import SystemAdminService

router = APIRouter(prefix="/api/admin/system", tags=["System Administration & Governance (Requirement 30)"])

class BulkUserCreateRequest(BaseModel):
    users: List[Dict[str, Any]]

class BulkUserDeactivateRequest(BaseModel):
    user_ids: List[int]

class ConfigUpdateRequest(BaseModel):
    key: str
    value: str
    reason: str

class ConfigRollbackRequest(BaseModel):
    revision_id: str

class MaintenanceRunRequest(BaseModel):
    action: str = "INDEX_OPTIMIZATION" # or VACUUM_ANALYZE

class ScheduleMaintenanceRequest(BaseModel):
    title: str
    start_time: str
    end_time: str
    scope: Optional[str] = "Database Cluster"
    notify_users: bool = True
    impact_level: Optional[str] = "Low"

# 44.1 Admin Dashboard
@router.get("/dashboard")
async def get_admin_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await SystemAdminService.get_dashboard_metrics(db)

# 44.2 User Management Tools
@router.post("/users/bulk-create")
async def bulk_create_users(
    payload: BulkUserCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await SystemAdminService.bulk_create_users(
        db,
        users_data=payload.users,
        created_by=current_user.email
    )

@router.post("/users/bulk-deactivate")
async def bulk_deactivate_users(
    payload: BulkUserDeactivateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await SystemAdminService.bulk_deactivate_users(
        db,
        user_ids=payload.user_ids,
        actor_email=current_user.email
    )

# 44.3 Performance Monitoring
@router.get("/performance")
async def get_performance_monitoring(
    current_user: User = Depends(get_current_user)
):
    return SystemAdminService.get_performance_monitoring()

# 44.4 Configuration Management
@router.get("/config")
async def get_configurations(
    current_user: User = Depends(get_current_user)
):
    return SystemAdminService.get_all_configurations()

@router.post("/config/update")
async def update_configuration(
    payload: ConfigUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    return SystemAdminService.update_configuration(
        key=payload.key,
        value=payload.value,
        reason=payload.reason,
        changed_by=current_user.email
    )

@router.post("/config/rollback")
async def rollback_configuration(
    payload: ConfigRollbackRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        return SystemAdminService.rollback_configuration(
            revision_id=payload.revision_id,
            reverted_by=current_user.email
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# 44.5 Database Maintenance Tools
@router.get("/database/maintenance")
async def get_database_maintenance_status(
    current_user: User = Depends(get_current_user)
):
    return SystemAdminService.get_database_maintenance_status()

@router.post("/database/maintenance/run")
async def run_database_maintenance(
    payload: MaintenanceRunRequest,
    current_user: User = Depends(get_current_user)
):
    return SystemAdminService.run_database_maintenance(action=payload.action)

# 44.6 Diagnostic Tools
@router.get("/diagnostics")
async def run_diagnostics(
    current_user: User = Depends(get_current_user)
):
    diagnostics = SystemAdminService.run_system_diagnostics()
    guides = SystemAdminService.get_troubleshooting_guides()
    return {
        "diagnostics": diagnostics,
        "troubleshooting_guides": guides
    }

# 44.7 Maintenance Windows
@router.get("/maintenance-windows")
async def list_maintenance_windows(
    current_user: User = Depends(get_current_user)
):
    return SystemAdminService.get_maintenance_windows()

@router.post("/maintenance-windows")
async def schedule_maintenance_window(
    payload: ScheduleMaintenanceRequest,
    current_user: User = Depends(get_current_user)
):
    return SystemAdminService.schedule_maintenance_window(
        data=payload.model_dump(),
        created_by=current_user.email
    )

# 44.8 Capacity Planning Reports
@router.get("/capacity-report")
async def get_capacity_planning_report(
    current_user: User = Depends(get_current_user)
):
    return SystemAdminService.get_capacity_planning_report()
