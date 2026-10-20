import json
import hashlib
from typing import Optional, Any, Dict, List
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog

GENESIS_AUDIT_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

def _compute_audit_hash(prev_hash: str, action: str, entity_name: str, entity_id: Optional[str], user_id: Optional[int], status: str, details_str: Optional[str]) -> str:
    raw = f"{prev_hash}|{action}|{entity_name}|{entity_id or ''}|{user_id or ''}|{status}|{details_str or ''}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

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

    # Fetch last audit record hash to maintain tamper-evident hash chain
    last_stmt = select(AuditLog.record_hash).order_by(desc(AuditLog.id)).limit(1)
    last_res = await db.execute(last_stmt)
    prev_hash = last_res.scalar_one_or_none() or GENESIS_AUDIT_HASH

    record_hash = _compute_audit_hash(
        prev_hash=prev_hash,
        action=action,
        entity_name=entity_name,
        entity_id=str(entity_id) if entity_id is not None else None,
        user_id=user_id,
        status=status,
        details_str=details_str
    )

    log_entry = AuditLog(
        action=action,
        entity_name=entity_name,
        entity_id=str(entity_id) if entity_id is not None else None,
        user_id=user_id,
        user_email=user_email,
        ip_address=ip_address,
        status=status,
        details=details_str,
        prev_hash=prev_hash,
        record_hash=record_hash
    )
    db.add(log_entry)
    await db.flush()
    return log_entry

async def verify_audit_log_chain(db: AsyncSession) -> Dict[str, Any]:
    """
    Cryptographically verifies the append-only audit log ledger.
    Returns whether the chain is intact or if tampering has occurred.
    """
    stmt = select(AuditLog).order_by(AuditLog.id.asc())
    res = await db.execute(stmt)
    records: List[AuditLog] = res.scalars().all()

    expected_prev = GENESIS_AUDIT_HASH
    for r in records:
        if r.prev_hash and r.prev_hash != expected_prev:
            return {
                "is_valid": False,
                "error": f"Hash chain broken at audit log ID {r.id}: expected prev_hash {expected_prev}, found {r.prev_hash}",
                "corrupted_log_id": r.id
            }

        recomputed = _compute_audit_hash(
            prev_hash=r.prev_hash or expected_prev,
            action=r.action,
            entity_name=r.entity_name,
            entity_id=r.entity_id,
            user_id=r.user_id,
            status=r.status,
            details_str=r.details
        )
        if r.record_hash and r.record_hash != recomputed:
            return {
                "is_valid": False,
                "error": f"Tampering detected at audit log ID {r.id}: recorded hash {r.record_hash} does not match computed hash {recomputed}",
                "corrupted_log_id": r.id
            }
        expected_prev = r.record_hash or recomputed

    return {
        "is_valid": True,
        "total_records_verified": len(records),
        "latest_block_hash": expected_prev
    }
