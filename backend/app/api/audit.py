from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import require_permission
from app.models.auth import User
from app.models.audit import AuditLog

router = APIRouter(prefix="/api/admin", tags=["Audit Logs"])

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    action: str
    entity_name: str
    entity_id: Optional[str] = None
    ip_address: Optional[str] = None
    status: str
    details: Optional[str] = None
    prev_hash: Optional[str] = None
    record_hash: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

@router.get("/audit-logs", response_model=List[AuditLogOut])
async def list_audit_logs(
    action: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_permission("audit_logs.view")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AuditLog).order_by(desc(AuditLog.created_at))
    if action:
        stmt = stmt.where(AuditLog.action.ilike(f"%{action}%"))
    stmt = stmt.offset(offset).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/audit-logs/verify")
async def verify_audit_trail(
    current_user: User = Depends(require_permission("audit_logs.view")),
    db: AsyncSession = Depends(get_db)
):
    """
    Cryptographic verification endpoint to prove the tamper-evident integrity of the audit ledger.
    """
    from app.services.audit_service import verify_audit_log_chain
    return await verify_audit_log_chain(db)
