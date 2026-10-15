import json
from typing import Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog

async def record_audit_log(
    db: AsyncSession,
    action: str,
    entity_name: str,
    entity_id: Optional[str] = None,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    ip_address: Optional[str] = None,
    status: str = "SUCCESS",
    details: Optional[Any] = None
) -> AuditLog:
    details_str = None
    if details is not None:
        if isinstance(details, (dict, list)):
            details_str = json.dumps(details)
        else:
            details_str = str(details)

    log_entry = AuditLog(
        action=action,
        entity_name=entity_name,
        entity_id=str(entity_id) if entity_id is not None else None,
        user_id=user_id,
        user_email=user_email,
        ip_address=ip_address,
        status=status,
        details=details_str
    )
    db.add(log_entry)
    await db.flush()
    return log_entry
