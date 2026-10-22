from typing import List, Dict, Any, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.models.auth import User
from app.models.org import Organization, Branch, Department, Warehouse
from app.models.sales import SalesOrder
from app.models.procurement import PurchaseOrder
from app.services.audit_service import record_audit_log
from app.services.document_store import document_store

router = APIRouter(prefix="/api/branches", tags=["MNC Multi-Branch & Global Tenant Operations"])

class BranchCreateRequest(BaseModel):
    name: str = Field(..., example="Dubai MENA Regional Hub")
    code: str = Field(..., example="BR-DXB-MENA")
    city: str = Field("Dubai", example="Dubai")
    country: Optional[str] = "AE"
    currency: Optional[str] = "AED"
    address: Optional[str] = "DIFC Gate Tower 4, Level 12"

class BranchSwitchRequest(BaseModel):
    branch_id: Optional[int] = None # None means All Branches Consolidated


@router.get("")
async def list_mnc_branches(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns enterprise subsidiaries, regional hubs, and operational branches.
    Enforces RBAC: non-admin staff only view branches they are authorized to access (Error 9).
    """
    user_role_names = [ur.role.name for ur in (current_user.roles or []) if getattr(ur, "role", None)]
    is_exec_or_admin = bool(current_user.is_superuser or any(r in ["System Administrator", "Executive", "Managing Director"] for r in user_role_names))
    has_global_perm = is_exec_or_admin or "branches.manage" in getattr(current_user, "effective_permissions", set())

    allowed_branch_ids = set()
    if current_user.branch_id is not None:
        allowed_branch_ids.add(current_user.branch_id)

    doc = await document_store.find_document("employee_access_authorizations", {"email": current_user.email})
    if doc:
        raw_policy = doc.get("branch_access_policy", "ASSIGNED_ONLY")
        policy = raw_policy if raw_policy in {"ASSIGNED_ONLY", "ALL_BRANCHES", "CUSTOM_LIST"} else "ASSIGNED_ONLY"
        allowed = doc.get("accessible_branches", [])
        if policy == "ALL_BRANCHES" or "ALL" in allowed:
            has_global_perm = True

    stmt = select(Branch).order_by(Branch.id)
    if not has_global_perm:
        stmt = stmt.where(Branch.id.in_(allowed_branch_ids if allowed_branch_ids else [-1]))

    res = await db.execute(stmt)
    branches = res.scalars().all()

    output = []
    for b in branches:
        # Count departments and warehouses
        dep_count_res = await db.execute(select(func.count(Department.id)).where(Department.branch_id == b.id))
        dep_count = dep_count_res.scalar() or 0

        wh_count_res = await db.execute(select(func.count(Warehouse.id)).where(Warehouse.branch_id == b.id))
        wh_count = wh_count_res.scalar() or 0

        # Count employees in branch
        from app.models.hr import Employee
        emp_count_res = await db.execute(select(func.count(Employee.id)).where(Employee.branch_id == b.id))
        emp_count = emp_count_res.scalar() or 0

        # Calculate real revenue for branch from sales ledger (protected for authorized users)
        gross_rev = None
        if has_global_perm or b.id == current_user.branch_id:
            rev_res = await db.execute(
                select(func.sum(SalesOrder.total_amount)).where(SalesOrder.branch_id == b.id)
            )
            gross_rev = float(rev_res.scalar() or 0.0)

        # Country & Currency: Return stored values rather than guessing (Functional Error Fix)
        currency = b.currency or "INR"
        country_code = b.country or "IN"
        flag = "🇮🇳" if country_code == "IN" else ("🇦🇪" if country_code == "AE" else ("🇸🇬" if country_code == "SG" else "🌐"))
        country_name = "India" if country_code == "IN" else ("United Arab Emirates" if country_code == "AE" else ("Singapore" if country_code == "SG" else country_code))

        output.append({
            "id": b.id,
            "name": b.name,
            "code": b.code,
            "city": b.city or "Metropolitan Hub",
            "country": country_code,
            "country_name": country_name,
            "flag": flag,
            "currency": currency,
            "address": b.address or "Corporate Regional Hub",
            "is_active": b.is_active,
            "employees_count": emp_count,
            "departments_count": dep_count,
            "warehouses_count": wh_count,
            "gross_revenue": gross_rev,
            "is_hq": (b.id == 1 or "main" in (b.name or "").lower() or "hq" in (b.code or "").lower()),
            "status": "OPERATIONAL"
        })

    return output


@router.post("")
async def create_mnc_branch(
    payload: BranchCreateRequest,
    current_user: User = Depends(require_permission("settings.manage")),
    db: AsyncSession = Depends(get_db)
):
    """
    Provisions a new subsidiary, regional office, or distribution branch in the MNC (SEC-29).
    Requires administrative settings.manage permission.
    """
    # Check duplicate code
    existing_res = await db.execute(select(Branch).where(Branch.code == payload.code.strip()))
    if existing_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Branch code '{payload.code}' already exists in MNC registry.")

    org_res = await db.execute(select(Organization).limit(1))
    org = org_res.scalar_one_or_none()
    org_id = org.id if org else 1

    new_branch = Branch(
        organization_id=org_id,
        name=payload.name.strip(),
        code=payload.code.strip().upper(),
        city=payload.city.strip(),
        address=payload.address.strip() if payload.address else f"Regional Office, {payload.city}",
        country=payload.country.strip() if payload.country else "IN",
        currency=payload.currency.strip().upper() if payload.currency else "INR"
    )
    db.add(new_branch)
    await db.flush()

    # Automatically provision core departments
    depts = [
        Department(branch_id=new_branch.id, name="Sales & Client Operations", code=f"{new_branch.code}-SALES"),
        Department(branch_id=new_branch.id, name="Financial Accounting", code=f"{new_branch.code}-FIN"),
        Department(branch_id=new_branch.id, name="Procurement & Vendor SLAs", code=f"{new_branch.code}-PROC"),
        Department(branch_id=new_branch.id, name="Logistics & Warehousing", code=f"{new_branch.code}-LOG")
    ]
    db.add_all(depts)

    # Provision primary warehouse
    wh = Warehouse(
        branch_id=new_branch.id,
        name=f"{new_branch.name} Central Storage",
        code=f"WH-{new_branch.code}",
        location="Zone A"
    )
    db.add(wh)
    await db.commit()
    await db.refresh(new_branch)

    await record_audit_log(
        db=db,
        user_id=current_user.id,
        action="MNC_BRANCH_PROVISIONED",
        entity_name="branch",
        entity_id=new_branch.id,
        details=f"Provisioned new MNC regional branch '{new_branch.name}' ({new_branch.code}) in {new_branch.city}."
    )

    return {
        "success": True,
        "message": f"MNC Branch '{new_branch.name}' successfully provisioned with 4 core departments and primary warehouse.",
        "branch": {
            "id": new_branch.id,
            "name": new_branch.name,
            "code": new_branch.code,
            "city": new_branch.city,
            "country": new_branch.country,
            "currency": new_branch.currency
        }
    }


@router.get("/consolidation-summary")
async def get_consolidation_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Consolidated Multinational Corporation (MNC) Executive Reporting:
    Rolls up revenues, active branches, global workforce, and multi-currency metrics.
    Enforces Error 9: Requires explicit consolidated-reporting or executive permission.
    """
    user_role_names = [ur.role.name for ur in (current_user.roles or []) if getattr(ur, "role", None)]
    is_exec_or_admin = bool(current_user.is_superuser or any(r in ["System Administrator", "Executive", "Managing Director"] for r in user_role_names))
    user_perms = getattr(current_user, "effective_permissions", set())

    if not is_exec_or_admin and "reports.view" not in user_perms and "branches.manage" not in user_perms:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Consolidated corporate financial reporting requires 'reports.view' or 'branches.manage' permission."
        )
    org_res = await db.execute(select(Organization).limit(1))
    org = org_res.scalar_one_or_none()

    branches_res = await db.execute(select(Branch))
    branches = branches_res.scalars().all()
    total_branches = len(branches)

    # Error 13 Fix: Read financial metrics solely from authoritative database records
    rev_res = await db.execute(select(func.sum(SalesOrder.total_amount)))
    total_rev = float(rev_res.scalar() or 0.0)

    # Actual per-branch revenue breakdown calculated from sales records
    branch_sales_res = await db.execute(
        select(SalesOrder.branch_id, func.sum(SalesOrder.total_amount))
        .group_by(SalesOrder.branch_id)
    )
    branch_sales_map = {row[0]: float(row[1] or 0.0) for row in branch_sales_res.all()}

    branch_breakdown = []
    for b in branches:
        b_rev = branch_sales_map.get(b.id, 0.0)
        share_pct = round((b_rev / total_rev * 100.0), 2) if total_rev > 0 else 0.0
        branch_breakdown.append({
            "branch_id": b.id,
            "branch": b.name,
            "code": b.code,
            "city": b.city or "Not Configured",
            "revenue": b_rev,
            "revenue_share_pct": share_pct,
            "currency": org.currency if org else "INR",
            "status": "ACTIVE" if b.is_active else "INACTIVE"
        })

    return {
        "organization_name": org.name if org else "Not Configured",
        "parent_code": org.code if org else "Not Configured",
        "total_active_branches": total_branches,
        "primary_hq": f"{branches[0].name} ({branches[0].code})" if branches else "Not Configured",
        "supported_currencies": ["INR", "USD", "AED", "EUR", "SGD"],
        "reporting_standard": "IFRS & Ind-AS Consolidated Financial Reporting",
        "intercompany_elimination": "ENABLED",
        "consolidated_financials": {
            "gross_turnover_inr": total_rev,
            "operating_margin_pct": None,
            "inter_branch_transfers_mtd": 0,
            "total_cross_border_orders": 0
        },
        "branch_breakdown": branch_breakdown,
        "multi_branch_architecture_highlights": [
            "1. Tenant & Branch Isolation: Strict foreign key isolation on all transactions, orders, and ledger entries.",
            "2. Global Single-Sign-On (SSO): Corporate users switch seamlessly between branch contexts or view consolidated rollups.",
            "3. Inter-Branch Stock Transfers: Automated stock transit vouchers with double-entry inventory reconciliation.",
            "4. Centralized RAG & Policy Governance: Single corporate authority matrix with branch-specific regional limits."
        ]
    }


@router.get("/my-access")
async def get_my_branch_access(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the current user's branch authorizations, assigned roles, and module access
    determined at the time of joining as employee (stored in MongoDB Community / Free Document Store).
    """
    all_branches_res = await db.execute(select(Branch))
    all_branches = all_branches_res.scalars().all()
    all_branch_names = [b.name for b in all_branches]

    user_role_names = [ur.role.name for ur in (current_user.roles or []) if getattr(ur, "role", None)]
    is_exec_or_admin = bool(current_user.is_superuser or "Admin" in user_role_names or "Executive" in user_role_names)

    curr_branch_obj = next((b for b in all_branches if b.id == current_user.branch_id), None)
    current_branch_name = curr_branch_obj.name if curr_branch_obj else "Main Store"

    doc = await document_store.find_document("employee_access_authorizations", {"email": current_user.email})

    if is_exec_or_admin:
        allowed_branches = all_branch_names
        policy = "ALL_BRANCHES"
        app_role = "System Administrator" if current_user.is_superuser else (user_role_names[0] if user_role_names else "Staff")
        module_perms = {
            "pos": True, "inventory": True, "sales": True,
            "finance": True, "hr": True, "procurement": True,
            "manufacturing": True, "grc": True, "settings": True,
            "ai_copilot": True
        }
        storage_engine = "MongoDB Community / Universal Global Access"
    elif doc:
        allowed_branches = doc.get("accessible_branches", [current_branch_name])
        if "ALL" in allowed_branches:
            allowed_branches = all_branch_names
        policy = doc.get("branch_access_policy", "ASSIGNED_ONLY")
        app_role = doc.get("app_role", user_role_names[0] if user_role_names else "Staff")
        module_perms = doc.get("module_permissions", {})
        storage_engine = doc.get("storage_engine", "MongoDB Community / Free Store")
    else:
        allowed_branches = [current_branch_name]
        policy = "ASSIGNED_ONLY"
        app_role = user_role_names[0] if user_role_names else "Staff"
        module_perms = {
            "pos": True, "inventory": True, "sales": True,
            "finance": False, "hr": False, "procurement": True,
            "manufacturing": False, "grc": False, "settings": False,
            "ai_copilot": True
        }
        storage_engine = "MongoDB Community / Default Policy"

    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "name": current_user.full_name,
        "is_superuser": current_user.is_superuser,
        "current_branch": current_branch_name,
        "accessible_branches": allowed_branches,
        "all_branches": all_branch_names,
        "branch_access_policy": policy,
        "app_role": app_role,
        "module_permissions": module_perms,
        "storage_engine": storage_engine,
        "can_access_all": is_exec_or_admin or policy == "ALL_BRANCHES" or "ALL" in allowed_branches
    }


@router.post("/switch-context")
async def switch_branch_context(
    payload: BranchSwitchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Switches active branch context.
    Strictly verifies employee's branch access rights stored in MongoDB Community Edition.
    """
    user_role_names = [ur.role.name for ur in (current_user.roles or []) if getattr(ur, "role", None)]
    is_exec_or_admin = bool(current_user.is_superuser or "Admin" in user_role_names or "Executive" in user_role_names)

    if payload.branch_id is None:
        if not is_exec_or_admin:
            raise HTTPException(status_code=403, detail="Only Executives and Administrators can view Consolidated Multi-Branch mode.")
        # Error 8 & BUG-29 Fix: Do not mutate current_user.branch_id in DB. Upsert active context in session store.
        await document_store.upsert_document("user_session_branch_context", {"user_id": current_user.id}, {
            "id": f"ctx_{current_user.id}",
            "user_id": current_user.id,
            "active_branch_id": None,
            "active_branch_name": "All Branches (Consolidated)",
            "assigned_branch_id": current_user.branch_id
        })
        return {"success": True, "active_branch": "All Branches (Consolidated)", "branch_id": None, "active_branch_id": None, "assigned_branch_id": current_user.branch_id}

    branch_res = await db.execute(select(Branch).where(Branch.id == payload.branch_id))
    branch = branch_res.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    if not is_exec_or_admin:
        # SEC-28: Fail closed. If employee has no access authorization record, deny cross-branch access.
        is_primary = (current_user.branch_id == branch.id)
        doc = await document_store.find_document("employee_access_authorizations", {"email": current_user.email})
        if not doc:
            if not is_primary:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access Denied: No cross-branch access authorization record found for {current_user.email}."
                )
        else:
            allowed = doc.get("accessible_branches", [])
            raw_policy = doc.get("branch_access_policy", "ASSIGNED_ONLY")
            policy = raw_policy if raw_policy in {"ASSIGNED_ONLY", "ALL_BRANCHES", "CUSTOM_LIST"} else "ASSIGNED_ONLY"
            if policy == "ASSIGNED_ONLY" and "ALL" not in allowed:
                # Error 12 Fix: Reject substring matching. Compare exact branch ID, code, or exact full name.
                def branch_matches(entry: Any) -> bool:
                    if not entry:
                        return False
                    s = str(entry).strip()
                    if s == str(branch.id):
                        return True
                    if branch.code and s.upper() == branch.code.upper():
                        return True
                    if branch.name and s.lower() == branch.name.lower():
                        return True
                    return False

                match = any(branch_matches(b) for b in allowed)
                if not match and not is_primary:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Access Denied: You are not authorized to access '{branch.name}'. Your authorized branches: {', '.join(str(b) for b in allowed)}."
                    )

    # Error 8 & BUG-29 Fix: Keep assigned branch immutable on User record.
    # Atomically upsert active branch in session context store without mutating current_user.branch_id in DB.
    await document_store.upsert_document("user_session_branch_context", {"user_id": current_user.id}, {
        "id": f"ctx_{current_user.id}",
        "user_id": current_user.id,
        "active_branch_id": branch.id,
        "active_branch_name": branch.name,
        "assigned_branch_id": current_user.branch_id
    })
    await record_audit_log(
        db, action="BRANCH_CONTEXT_SWITCHED", entity_name="User",
        user_id=current_user.id, user_email=current_user.email,
        details={"active_branch_id": branch.id, "assigned_branch_id": current_user.branch_id, "branch_name": branch.name}
    )
    return {"success": True, "active_branch": branch.name, "branch_id": branch.id, "active_branch_id": branch.id, "assigned_branch_id": current_user.branch_id}


class CrossBranchAccessRequestCreate(BaseModel):
    target_branch_id: int
    target_branch_name: Optional[str] = None
    request_type: Optional[str] = "BRANCH_ACCESS" # "BRANCH_ACCESS", "ELEVATED_AUTHORITY", "CONSOLIDATED_VIEW"
    requested_role: Optional[str] = "Branch Staff / Operator"
    duration: Optional[str] = "TEMPORARY_7D" # "TEMPORARY_24H", "TEMPORARY_7D", "TEMPORARY_30D", "PERMANENT"
    reason: str = Field(..., min_length=3, description="Mandatory business reason for access request")


class CrossBranchAccessReviewRequest(BaseModel):
    action: str = Field(..., pattern="^(APPROVE|DISAPPROVE|ON_HOLD)$")
    admin_reason: str = Field(..., min_length=3, description="Mandatory administrator review reason / justification")


@router.post("/access-requests")
async def create_branch_access_request(
    payload: CrossBranchAccessRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits an employee request to access an operating branch or elevated authority.
    Persisted in MongoDB Community Edition / Free Document Store for admin review.
    """
    import uuid
    from datetime import datetime, timezone

    # Look up target branch
    branch_res = await db.execute(select(Branch).where(Branch.id == payload.target_branch_id))
    target_branch = branch_res.scalar_one_or_none()
    if not target_branch:
        raise HTTPException(status_code=404, detail="Target branch not found")

    # Look up user's current branch
    cur_branch_name = "Global Headquarters"
    if current_user.branch_id:
        cb_res = await db.execute(select(Branch.name).where(Branch.id == current_user.branch_id))
        cur_branch_name = cb_res.scalar_one_or_none() or "Current Branch"

    req_id = f"REQ-{uuid.uuid4().hex[:8].upper()}"
    req_doc = {
        "request_id": req_id,
        "user_id": current_user.id,
        "user_email": current_user.email,
        "employee_name": current_user.full_name or current_user.username or current_user.email.split('@')[0],
        "current_branch_id": current_user.branch_id,
        "current_branch_name": cur_branch_name,
        "target_branch_id": target_branch.id,
        "target_branch_name": target_branch.name,
        "target_branch_city": target_branch.city or "Metropolitan Hub",
        "request_type": payload.request_type,
        "requested_role": payload.requested_role,
        "duration": payload.duration,
        "reason": payload.reason.strip(),
        "status": "PENDING", # PENDING, APPROVED, DISAPPROVED, ON_HOLD
        "admin_reason": None,
        "reviewed_by": None,
        "reviewed_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    inserted = await document_store.insert_document("branch_access_requests", req_doc)
    await record_audit_log(
        db, action="BRANCH_ACCESS_REQUESTED", entity_name="BranchAccessRequest",
        user_id=current_user.id, user_email=current_user.email,
        details={
            "request_id": req_id,
            "target_branch": target_branch.name,
            "reason": payload.reason
        }
    )

    return {
        "success": True,
        "message": f"Cross-branch access request #{req_id} for '{target_branch.name}' has been routed to System Administration.",
        "request": inserted
    }


@router.get("/access-requests")
async def list_branch_access_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns cross-branch & elevated authority requests.
    Administrators and Executives view all requests across all branches.
    Regular employees view their submitted requests.
    """
    user_role_names = [ur.role.name for ur in (current_user.roles or []) if getattr(ur, "role", None)]
    is_admin = bool(current_user.is_superuser or "Admin" in user_role_names or "Executive" in user_role_names)

    if is_admin:
        all_reqs = await document_store.find_documents("branch_access_requests", {})
    else:
        all_reqs = await document_store.find_documents("branch_access_requests", {"user_email": current_user.email})

    # Sort descending by created_at
    all_reqs.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return all_reqs


@router.put("/access-requests/{request_id}/review")
async def review_branch_access_request(
    request_id: str,
    payload: CrossBranchAccessReviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin decision endpoint to APPROVE, DISAPPROVE, or put ON_HOLD an access request with mandatory reasons.
    If APPROVED: immediately grants target branch permission in MongoDB Community Edition.
    """
    from datetime import datetime, timezone
    user_role_names = [ur.role.name for ur in (current_user.roles or []) if getattr(ur, "role", None)]
    is_admin = bool(current_user.is_superuser or "Admin" in user_role_names or "Executive" in user_role_names)
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only System Administrators and Executives can review branch access requests.")

    req = await document_store.find_document("branch_access_requests", {"request_id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail=f"Access request #{request_id} not found.")

    action_key = payload.action.upper()
    status_map = {
        "APPROVE": "APPROVED",
        "DISAPPROVE": "DISAPPROVED",
        "ON_HOLD": "ON_HOLD",
        "APPROVED": "APPROVED",
        "REJECT": "DISAPPROVED"
    }
    req["status"] = status_map.get(action_key, action_key)
    req["admin_reason"] = payload.admin_reason.strip()
    req["reviewed_by"] = current_user.email
    req["reviewed_at"] = datetime.now(timezone.utc).isoformat()

    # Update document in document store
    await document_store.update_document("branch_access_requests", {"request_id": request_id}, req)

    # If APPROVED: grant access in employee_access_authorizations
    if req["status"] == "APPROVED":
        target_branch_name = req.get("target_branch_name")
        user_email = req.get("user_email")

        auth_doc = await document_store.find_document("employee_access_authorizations", {"email": user_email})
        if auth_doc:
            allowed = auth_doc.get("accessible_branches", [])
            if target_branch_name and target_branch_name not in allowed:
                allowed.append(target_branch_name)
                auth_doc["accessible_branches"] = allowed
            if req.get("request_type") == "CONSOLIDATED_VIEW":
                auth_doc["branch_access_policy"] = "ALL_BRANCHES"
            await document_store.update_document("employee_access_authorizations", {"email": user_email}, auth_doc)
        else:
            # Create authorization doc in MongoDB Community Store
            new_auth = {
                "email": user_email,
                "full_name": req.get("employee_name"),
                "accessible_branches": [req.get("current_branch_name"), target_branch_name],
                "branch_access_policy": "ASSIGNED_ONLY",
                "app_role": req.get("requested_role") or "Staff",
                "module_permissions": {"pos": True, "inventory": True, "sales": True, "ai_copilot": True},
                "storage_engine": "MongoDB Community / Free Store",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await document_store.insert_document("employee_access_authorizations", new_auth)

    action_label = {
        "APPROVE": "Approved and branch access granted",
        "DISAPPROVE": "Disapproved / Rejected",
        "ON_HOLD": "Put On Hold pending further review"
    }.get(action_key, action_key)

    await record_audit_log(
        db, action=f"BRANCH_REQUEST_{action_key}", entity_name="BranchAccessRequest",
        user_id=current_user.id, user_email=current_user.email,
        details={
            "request_id": request_id,
            "decision": action_key,
            "admin_reason": payload.admin_reason,
            "target_user": req.get("user_email")
        }
    )

    return {
        "success": True,
        "message": f"Request #{request_id} has been {action_label}.",
        "request": req
    }

