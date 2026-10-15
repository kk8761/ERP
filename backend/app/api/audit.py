from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
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
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/audit-logs", response_model=List[AuditLogOut])
async def list_audit_logs(
    action: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    current_user: User = Depends(require_permission("audit_logs.view")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit)
    if action:
        stmt = stmt.where(AuditLog.action.ilike(f"%{action}%"))
    res = await db.execute(stmt)
    return res.scalars().all()
