import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.auth import User
from app.models.inventory import Product
from app.models.sales import SalesOrder
from app.models.finance import JournalEntry, Account
from app.models.procurement import PurchaseOrder
from app.models.hr import Employee

router = APIRouter(prefix="/api/sync", tags=["Multi-Module Sync"])

class ModuleSyncPayload(BaseModel):
    client_id: Optional[str] = None
    client_timestamp: Optional[str] = None
    modules: Optional[Dict[str, Any]] = Field(default_factory=dict)

# SEC-32: Bounded in-memory storage for active module draft backups (max 200 items, max 64KB per draft)
_MODULE_DRAFT_CACHE: Dict[str, Any] = {}
MAX_TOTAL_DRAFTS = 200
MAX_DRAFT_SIZE_BYTES = 65536

@router.post("/all", status_code=status.HTTP_200_OK)
async def sync_all_modules(
    payload: ModuleSyncPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Synchronizes state across all ERP modules every 30 seconds.
    Accepts pending client drafts (Finance spreadsheet lines, Inventory adjustments, etc.)
    and returns real-time refreshed state and delta metrics across modules.
    Enforces authentication and memory bounding (SEC-32).
    """
    sync_id = str(uuid.uuid4())
    now_utc = datetime.now(timezone.utc)
    user_id = current_user.id

    # Store any incoming client drafts with bounding
    if payload.modules:
        for module_name, module_data in payload.modules.items():
            encoded = json.dumps(module_data)
            if len(encoded.encode("utf-8")) > MAX_DRAFT_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Draft payload for module '{module_name}' exceeds maximum allowed size (64KB)."
                )

            # Evict oldest entry if cache exceeds bounds
            if len(_MODULE_DRAFT_CACHE) >= MAX_TOTAL_DRAFTS:
                oldest_key = next(iter(_MODULE_DRAFT_CACHE))
                _MODULE_DRAFT_CACHE.pop(oldest_key, None)

            cache_key = f"{user_id}:{module_name}"
            _MODULE_DRAFT_CACHE[cache_key] = {
                "synced_at": now_utc.isoformat(),
                "data": module_data
            }

    # Fetch live counts & summaries across all core ERP modules
    try:
        # 1. Inventory stats
        prod_count_res = await db.execute(select(func.count(Product.id)))
        total_products = prod_count_res.scalar_one() or 0

        # 2. Sales stats
        order_count_res = await db.execute(select(func.count(SalesOrder.id)))
        total_sales_orders = order_count_res.scalar_one() or 0

        # 3. Finance stats
        journal_count_res = await db.execute(select(func.count(JournalEntry.id)))
        total_journals = journal_count_res.scalar_one() or 0

        # 4. Procurement stats
        po_count_res = await db.execute(select(func.count(PurchaseOrder.id)))
        total_pos = po_count_res.scalar_one() or 0

        # 5. HR stats
        emp_count_res = await db.execute(select(func.count(Employee.id)))
        total_employees = emp_count_res.scalar_one() or 0

        # 6. Unread Email stats
        from app.models.email_log import ReceivedEmail
        unread_email_res = await db.execute(select(func.count(ReceivedEmail.id)).where(ReceivedEmail.is_read == False))
        unread_emails = unread_email_res.scalar_one() or 0
    except Exception:
        total_products = 0
        total_sales_orders = 0
        total_journals = 0
        total_pos = 0
        total_employees = 0
        unread_emails = 0

    return {
        "status": "synchronized",
        "sync_id": sync_id,
        "sync_interval_seconds": 30,
        "server_time": now_utc.isoformat(),
        "user_email": current_user.email if current_user else None,
        "module_metrics": {
            "inventory": { "total_products": total_products, "status": "synced" },
            "sales": { "total_orders": total_sales_orders, "status": "synced" },
            "finance": { "total_journal_entries": total_journals, "status": "synced" },
            "procurement": { "total_purchase_orders": total_pos, "status": "synced" },
            "hr": { "total_employees": total_employees, "status": "synced" },
            "emails": { "unread_emails": unread_emails, "status": "synced" }
        },
        "cached_draft_status": {
            k: v["synced_at"] for k, v in _MODULE_DRAFT_CACHE.items() if k.startswith(f"{user_id}:")
        }
    }

@router.get("/status", status_code=status.HTTP_200_OK)
async def get_sync_status(
    current_user: User = Depends(get_current_user)
):
    """
    Returns the real-time synchronization health and interval metadata.
    """
    return {
        "status": "online",
        "interval_seconds": 30,
        "sync_engine": "NexaCloud Multi-Module Delta Sync v2.1",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
