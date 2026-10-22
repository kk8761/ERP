import uuid
from datetime import datetime, timezone, timedelta

from decimal import Decimal
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
import json
import hashlib

from app.database import get_db
from app.auth.dependencies import get_current_user, is_admin_or_exec
from app.models.auth import User
from app.models.inventory import Product
from app.models.sales import SalesOrder
from app.models.finance import JournalEntry, Account
from app.models.procurement import PurchaseOrder
from app.models.hr import Employee

from app.services.document_store import document_store

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
    Accepts pending client drafts, persists them to durable storage with validation,
    and returns branch-scoped real-time metrics and truthful sync statuses (Error 11).
    """
    sync_id = str(uuid.uuid4())
    now_utc = datetime.now(timezone.utc)
    user_id = current_user.id
    has_pending_drafts = False

    # SEC-58 & BUG-61: Validate organization context BEFORE accepting or persisting any drafts
    effective_org = getattr(current_user, "organization_id", None)
    if effective_org is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization context required for synchronization. User has no assigned organization."
        )

    # Store incoming client drafts with durable persistence and memory bounding
    # Branch scoping: non-admins require an assigned branch
    is_admin = is_admin_or_exec(current_user)
    branch_id = getattr(current_user, "active_branch_id", current_user.branch_id) or current_user.branch_id
    if not is_admin and branch_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No branch assigned to this account for branch-scoped synchronization."
        )

    persistence_failed = False
    # Store incoming client drafts with durable atomic upsert and memory bounding (Error 10)
    if payload.modules:
        for module_name, module_data in payload.modules.items():
            encoded = json.dumps(module_data)
            if len(encoded.encode("utf-8")) > MAX_DRAFT_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Draft payload for module '{module_name}' exceeds maximum allowed size (64KB)."
                )

            # Evict oldest entry if in-memory cache exceeds bounds
            if len(_MODULE_DRAFT_CACHE) >= MAX_TOTAL_DRAFTS:
                oldest_key = next(iter(_MODULE_DRAFT_CACHE))
                _MODULE_DRAFT_CACHE.pop(oldest_key, None)

            # SEC-57: Strip both idempotency_key and operation_id from untrusted client data
            clean_data = {
                k: v for k, v in module_data.items()
                if k not in ["_applied", "applied_at", "status", "processed_at", "claim_time", "idempotency_key", "operation_id"]
            }
            payload_hash = hashlib.sha256(json.dumps(clean_data, sort_keys=True, default=str).encode()).hexdigest()
            # Server-generated authoritative operation ID
            server_operation_id = f"OP-{user_id}-{module_name}-{payload_hash[:16]}"

            # BUG-47: Do not reset a successfully processed (SYNCED) draft to PENDING if payload hasn't changed
            existing_draft = await document_store.find_document("module_drafts", {"user_id": user_id, "module": module_name})
            draft_status = "PENDING"
            if existing_draft and existing_draft.get("status") == "SYNCED":
                existing_clean = {
                    k: v for k, v in existing_draft.get("data", {}).items()
                    if k not in ["_applied", "applied_at", "status", "processed_at", "claim_time", "idempotency_key", "operation_id"]
                }
                if existing_clean == clean_data:
                    draft_status = "SYNCED"

            cache_key = f"{user_id}:{module_name}"
            _MODULE_DRAFT_CACHE[cache_key] = {
                "synced_at": now_utc.isoformat(),
                "data": clean_data
            }

            # Error 10 Fix: Atomic upsert keyed by user and module; propagate persistence failures
            try:
                upsert_dict: Dict[str, Any] = {
                    "id": f"{user_id}:{module_name}",
                    "user_id": user_id,
                    "organization_id": effective_org,
                    "branch_id": current_user.branch_id,
                    "module": module_name,
                    "data": clean_data,
                    "operation_id": server_operation_id,
                    "payload_hash": payload_hash,
                    "status": draft_status,
                    "updated_at": now_utc.isoformat()
                }

                await document_store.upsert_document(
                    "module_drafts",
                    {"user_id": user_id, "module": module_name},
                    upsert_dict
                )
            except Exception as e:
                persistence_failed = True
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to persist draft for module '{module_name}': {str(e)}"
                )

    try:
        from app.models.org import Branch
        b_res = await db.execute(select(Branch.id).where(Branch.organization_id == effective_org))
        org_branch_ids = b_res.scalars().all()

        if is_admin:
            allowed_branches = org_branch_ids
        elif branch_id and branch_id in org_branch_ids:
            allowed_branches = [branch_id]
        elif org_branch_ids:
            allowed_branches = [org_branch_ids[0]]
        else:
            allowed_branches = []

        # 1. Inventory stats (BUG-52 & SEC-53: Scoped strictly to user's organization)
        prod_q = select(func.count(Product.id)).where(Product.organization_id == effective_org)
        prod_count_res = await db.execute(prod_q)
        total_products = prod_count_res.scalar_one() or 0

        # 2. Sales stats (SEC-68: branch and organization scoped)
        if allowed_branches:
            sales_q = select(func.count(SalesOrder.id)).where(SalesOrder.branch_id.in_(allowed_branches))
            order_count_res = await db.execute(sales_q)
            total_sales_orders = order_count_res.scalar_one() or 0
        else:
            total_sales_orders = 0

        # 3. Finance stats (SEC-68: filtered by organization and creator for non-admins)
        journal_q = select(func.count(JournalEntry.id)).where(
            or_(JournalEntry.organization_id == effective_org, JournalEntry.organization_id.is_(None))
        )
        if not is_admin:
            journal_q = journal_q.where(JournalEntry.created_by_user_id == user_id)
        journal_count_res = await db.execute(journal_q)
        total_journals = journal_count_res.scalar_one() or 0

        # 4. Procurement stats (SEC-68: branch and organization scoped)
        if allowed_branches:
            po_q = select(func.count(PurchaseOrder.id)).where(PurchaseOrder.branch_id.in_(allowed_branches))
            po_count_res = await db.execute(po_q)
            total_pos = po_count_res.scalar_one() or 0
        else:
            total_pos = 0

        # 5. HR stats (SEC-68: branch and organization scoped)
        if allowed_branches:
            emp_q = select(func.count(Employee.id)).where(Employee.branch_id.in_(allowed_branches))
            emp_count_res = await db.execute(emp_q)
            total_employees = emp_count_res.scalar_one() or 0
        else:
            total_employees = 0

        # 6. Unread Email stats (user-scoped for non-admins)
        from app.models.email_log import ReceivedEmail
        email_q = select(func.count(ReceivedEmail.id)).where(ReceivedEmail.is_read == False)
        if not is_admin and current_user.email:
            email_q = email_q.where(ReceivedEmail.recipient_email == current_user.email)
        email_count_res = await db.execute(email_q)
        unread_emails = email_count_res.scalar_one() or 0
    except HTTPException:
        raise
    except Exception as stat_err:
        logging.getLogger(__name__).exception("Failed to calculate sync metrics: %s", stat_err)
        total_products = 0
        total_sales_orders = 0
        total_journals = 0
        total_pos = 0
        total_employees = 0
        unread_emails = 0

    # Error 10 Fix: Query existing drafts state from durable store. Return SYNCED only if zero pending drafts remain.
    all_user_drafts = await document_store.find_documents("module_drafts", {"user_id": user_id, "status": "PENDING"})
    pending_modules = {d["module"] for d in all_user_drafts}

    if persistence_failed:
        sync_status = "FAILED"
    elif pending_modules:
        sync_status = "PENDING"
    else:
        sync_status = "SYNCED"


    return {
        "status": sync_status,
        "sync_id": sync_id,
        "sync_interval_seconds": 30,
        "server_time": now_utc.isoformat(),
        "branch_id": branch_id,
        "user_email": current_user.email if current_user else None,
        "module_metrics": {
            "inventory": { "total_products": total_products, "status": "PENDING" if "inventory" in pending_modules else "SYNCED" },
            "sales": { "total_orders": total_sales_orders, "status": "PENDING" if "sales" in pending_modules else "SYNCED" },
            "finance": { "total_journal_entries": total_journals, "status": "PENDING" if "finance" in pending_modules else "SYNCED" },
            "procurement": { "total_purchase_orders": total_pos, "status": "PENDING" if "procurement" in pending_modules else "SYNCED" },
            "hr": { "total_employees": total_employees, "status": "PENDING" if "hr" in pending_modules else "SYNCED" },
            "emails": { "unread_emails": unread_emails, "status": "SYNCED" }
        },
        "cached_draft_status": {
            k: v["synced_at"] for k, v in _MODULE_DRAFT_CACHE.items() if k.startswith(f"{user_id}:")
        }
    }

@router.post("/process", status_code=status.HTTP_200_OK)
async def process_pending_drafts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    BUG-35, SEC-44, BUG-40, BUG-41 Worker Endpoint:
    Processes and applies pending client drafts from module_drafts durable collection
    to authoritative business tables with:
    - SEC-44: Explicit module permission enforcement (sales.create, expenses.record).
    - BUG-40: Atomic concurrency claiming and durable idempotency key enforcement.
    - BUG-41: Rejection of unsupported modules / missing data and truthful SYNCED status.
    - Active branch context application for branch-scoped business records.
    """
    user_id = current_user.id
    now = datetime.now(timezone.utc)
    is_admin = is_admin_or_exec(current_user)
    user_perms = getattr(current_user, "effective_permissions", set())
    active_branch = getattr(current_user, "active_branch_id", current_user.branch_id) or current_user.branch_id
    stale_threshold = (now - timedelta(minutes=5)).isoformat()

    # SEC-53: Explicit organization context required to process drafts
    user_org_id = getattr(current_user, "organization_id", None)
    if user_org_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization assignment required to process synchronization drafts."
        )

    # Retrieve pending drafts and expired PROCESSING drafts (worker crash recovery)
    all_drafts = await document_store.find_documents("module_drafts", {"user_id": user_id})
    pending_drafts = [
        d for d in all_drafts
        if d.get("status") == "PENDING" or (
            d.get("status") == "PROCESSING" and (
                not d.get("claim_time") or d.get("claim_time") < stale_threshold
            )
        )
    ]

    processed_count = 0
    synced_count = 0
    errors = []

    for draft in pending_drafts:
        draft_id = draft.get("id", f"{user_id}:{draft.get('module')}")
        module_name = draft.get("module")
        data = draft.get("data", {})

        # SEC-57: Authoritative server-generated idempotency key derived from draft_id and stable payload hash
        payload_hash = hashlib.sha256(json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()
        idempotency_key = f"IDEMP-{draft_id}-{payload_hash[:16]}"

        # BUG-47, BUG-51 & SEC-52: Authoritative SQL idempotency ledger check and payload verification
        from app.models.sales import SyncIdempotencyRecord
        idemp_stmt = select(SyncIdempotencyRecord).where(SyncIdempotencyRecord.idempotency_key == idempotency_key)
        existing_idemp = (await db.execute(idemp_stmt)).scalar_one_or_none()
        if existing_idemp:
            # Verify payload hash matches; reject conflicts with HTTP 409
            if existing_idemp.payload_hash and existing_idemp.payload_hash != payload_hash:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Idempotency conflict: Operation key already bound to a different payload."
                )
            await document_store.update_document(
                "module_drafts",
                {"id": draft_id},
                {"status": "SYNCED", "processed_at": now.isoformat(), "idempotency_key": idempotency_key}
            )
            synced_count += 1
            continue

        # BUG-55: Lease-version-aware atomic claim incorporating previous claim_time for stale drafts
        current_draft_status = draft.get("status", "PENDING")
        claim_query: Dict[str, Any] = {"id": draft_id, "status": current_draft_status}
        if current_draft_status == "PROCESSING":
            claim_query["claim_time"] = draft.get("claim_time")

        claim_token = str(uuid.uuid4())
        claimed = await document_store.claim_document(
            "module_drafts",
            claim_query,
            {"status": "PROCESSING", "claim_time": now.isoformat(), "claim_token": claim_token}
        )
        if not claimed:
            continue

        processed_count += 1
        try:
            # SEC-44 & BUG-41: Validate module support and required permissions
            if module_name == "sales":
                has_perm = is_admin or ("sales.create" in user_perms) or ("sales.manage" in user_perms)
                if not has_perm:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: Processing sales draft requires 'sales.create' permission."
                    )

                items = data.get("items")
                if not items or not isinstance(items, list) or len(items) == 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Sales draft rejected: 'items' list is required and must contain at least one item."
                    )

                # BUG-54 Fix: Use SalesOrderItemIn schema and compute price authoritative server-side
                from app.schemas.sales import SalesOrderCreate, SalesOrderItemIn
                from app.services.sales_service import create_sales_order

                order_items = []
                for idx, item in enumerate(items):
                    product_id = item.get("product_id")
                    quantity = item.get("quantity")
                    if product_id is None or quantity is None:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Missing product ID or quantity at item {idx}."
                        )
                    # Validate numeric inputs before converting, rejecting floats like "1.5"
                    if isinstance(product_id, str) and "." in product_id:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Invalid product ID or quantity at item {idx}."
                        )
                    if isinstance(quantity, str) and "." in quantity:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Invalid product ID or quantity at item {idx}."
                        )
                    try:
                        p_id = int(product_id)
                        qty = int(quantity)
                    except (ValueError, TypeError):
                        raise HTTPException(
                            status_code=400,
                            detail=f"Invalid product ID or quantity at item {idx}."
                        )
                    if p_id <= 0 or qty <= 0:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Invalid product ID or quantity at item {idx}."
                        )
                    order_items.append(
                        SalesOrderItemIn(
                            product_id=p_id,
                            quantity=qty
                        )
                    )

                order_in = SalesOrderCreate(
                    customer_id=data.get("customer_id"),
                    branch_id=active_branch,
                    payment_method=data.get("payment_method", "CASH"),
                    items=order_items
                )
                order = await create_sales_order(
                    db=db,
                    order_in=order_in,
                    cashier_user_id=user_id,
                    organization_id=user_org_id
                )
                ref_id = str(order.id)

            elif module_name == "expenses":
                has_perm = is_admin or ("expenses.record" in user_perms) or ("finance.manage" in user_perms)
                if not has_perm:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: Processing expense draft requires 'expenses.record' permission."
                    )

                raw_amt = data.get("amount")
                if raw_amt is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Expense draft rejected: 'amount' is required."
                    )
                try:
                    exp_amt = Decimal(str(raw_amt))
                    if exp_amt <= 0:
                        raise ValueError()
                except Exception:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Expense draft rejected: 'amount' must be a positive numeric value."
                    )

                from app.models.finance import Expense
                exp = Expense(
                    expense_number=data.get("expense_number") or f"EXP-SYNC-{uuid.uuid4().hex[:6].upper()}",
                    category=data.get("category", "General"),
                    amount=exp_amt,
                    description=data.get("description", "Synced from draft queue"),
                    payment_method=(data.get("payment_method") or "BANK_TRANSFER").upper(),
                    recorded_by_user_id=user_id,
                    branch_id=active_branch
                )
                db.add(exp)
                ref_id = str(exp.expense_number)

            elif module_name in ["finance", "finance_acdoca_spreadsheet"]:
                has_perm = is_admin or ("finance.post" in user_perms) or ("finance.manage" in user_perms)
                if not has_perm:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: Processing finance draft requires 'finance.post' permission."
                    )

                vouchers = data.get("draft_journal_vouchers") or data.get("lines") or []
                from app.models.finance import Account, JournalEntry, JournalEntryLine
                lines_to_post = []
                total_d = Decimal("0.00")
                total_c = Decimal("0.00")

                accounts_to_update = {}
                for v in vouchers:
                    gl_code = str(v.get("gl_account") or "").strip()
                    if not gl_code:
                        continue
                    try:
                        d_val = Decimal(str(v.get("debit") or 0))
                        c_val = Decimal(str(v.get("credit") or 0))
                    except Exception:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Invalid numeric debit or credit in finance draft for account '{gl_code}'."
                        )

                    # BUG-68 Fix: Validate finite, non-negative, and exactly one positive side
                    if not d_val.is_finite() or not c_val.is_finite():
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Amounts for account '{gl_code}' must be finite numbers.")
                    if d_val < 0 or c_val < 0:
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Amounts for account '{gl_code}' cannot be negative.")
                    if (d_val > 0 and c_val > 0) or (d_val == 0 and c_val == 0):
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Line for account '{gl_code}' must have exactly one positive side (debit or credit).")

                    acc_stmt = select(Account).where(func.lower(Account.code) == gl_code.lower())
                    if user_org_id is not None:
                        acc_stmt = acc_stmt.where(or_(Account.organization_id == user_org_id, Account.organization_id.is_(None)))
                    acc = (await db.execute(acc_stmt)).scalar_one_or_none()
                    if not acc or not acc.is_active:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"GL account '{gl_code}' does not exist or is inactive."
                        )
                    total_d += d_val
                    total_c += c_val
                    accounts_to_update[acc.id] = acc
                    lines_to_post.append(
                        JournalEntryLine(
                            account_id=acc.id,
                            debit=d_val,
                            credit=c_val,
                            description=v.get("text_memo") or "ACDOCA Draft Sync"
                        )
                    )

                # BUG-68 Fix: Reject drafts with fewer than two valid lines (remove synthetic checkpoint)
                if len(lines_to_post) < 2:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Double-entry journal requires at least two valid line items."
                    )
                if total_d != total_c:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Double-entry imbalance! Total Debit ({total_d}) != Total Credit ({total_c})"
                    )

                entry_num = f"JE-SYNC-{uuid.uuid4().hex[:6].upper()}"
                je = JournalEntry(
                    entry_number=entry_num,
                    entry_date=now.date(),
                    reference="SYNC-ACDOCA",
                    description=data.get("description") or "Synced from ACDOCA spreadsheet draft",
                    total_debit=total_d,
                    total_credit=total_c,
                    organization_id=user_org_id,
                    is_posted=True,
                    created_by_user_id=user_id,
                    lines=lines_to_post
                )
                db.add(je)

                # BUG-68 Fix: Update corresponding Account.balance in the same database transaction
                for line in lines_to_post:
                    acc = accounts_to_update[line.account_id]
                    if acc.account_type in ["ASSET", "EXPENSE"]:
                        acc.balance += (line.debit - line.credit)
                    else:
                        acc.balance += (line.credit - line.debit)

                ref_id = entry_num

            else:
                # BUG-41: Reject unsupported modules
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported module '{module_name}'. Cannot process draft."
                )

            # BUG-47 & SEC-52: Authoritative SQL Idempotency Ledger Entry with payload_hash
            idemp_rec = SyncIdempotencyRecord(
                idempotency_key=idempotency_key,
                module=module_name,
                user_id=user_id,
                organization_id=user_org_id,
                status="APPLIED",
                reference_id=ref_id,
                payload_hash=payload_hash
            )
            db.add(idemp_rec)
            await db.commit()

            # BUG-40 & BUG-47: Only mark SYNCED after database transaction commits
            await document_store.update_document(
                "module_drafts",
                {"id": draft_id},
                {
                    "status": "SYNCED",
                    "processed_at": now.isoformat(),
                    "idempotency_key": idempotency_key
                }
            )
            synced_count += 1


        except HTTPException as http_ex:
            await db.rollback()
            err_msg = http_ex.detail
            errors.append({"draft_id": draft_id, "module": module_name, "error": err_msg})
            await document_store.update_document(
                "module_drafts",
                {"id": draft_id},
                {
                    "status": "ERROR",
                    "error_detail": err_msg,
                    "attempted_at": now.isoformat()
                }
            )
        except Exception as ex:
            await db.rollback()
            err_msg = str(ex)
            errors.append({"draft_id": draft_id, "module": module_name, "error": err_msg})
            await document_store.update_document(
                "module_drafts",
                {"id": draft_id},
                {
                    "status": "ERROR",
                    "error_detail": err_msg,
                    "attempted_at": now.isoformat()
                }
            )

    return {
        "status": "SUCCESS" if len(errors) == 0 else "PARTIAL_SUCCESS",
        "total_evaluated": len(pending_drafts),
        "processed": processed_count,
        "synced": synced_count,
        "errors": errors,
        "timestamp": now.isoformat()
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
        "draft_persistence": "Durable MongoDB / Local Encrypted Store",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
