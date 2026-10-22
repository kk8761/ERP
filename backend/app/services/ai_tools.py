import json
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta, date
from typing import Dict, Any, List, Optional
from sqlalchemy import select, func, desc, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.org import Branch
from app.models.inventory import Product, ProductCategory, StockMovement
from app.models.procurement import Supplier, PurchaseOrder, PurchaseOrderItem
from app.models.sales import SalesOrder, SalesOrderItem, Customer
from app.models.finance import Account, JournalEntry, Expense
from app.models.hr import Employee, LeaveRequest, Attendance, PayrollRecord
from app.models.workflow import WorkflowDefinition, WorkflowExecution, ApprovalRequest
from app.models.vendor_rating import VendorOrderEvaluation, VendorScorecard
from app.services.inventory_service import adjust_product_stock
from app.services.audit_service import record_audit_log
from app.services.vendor_rating_service import (
    evaluate_purchase_order,
    recalculate_vendor_scorecard,
    compare_suppliers_for_order
)

# Tool Definition Registry metadata for LLM tool selection
TOOL_REGISTRY_METADATA = [
    {
        "name": "search_inventory",
        "description": "Searches inventory catalog by product name, SKU, or category. Can filter for low stock items below reorder level.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search keyword for product name or SKU"},
                "low_stock_only": {"type": "boolean", "description": "If true, returns only items where current_stock <= reorder_level"}
            }
        }
    },
    {
        "name": "calculate_reorder_recommendations",
        "description": "Analyzes inventory levels across all products and calculates optimal reorder quantities based on reorder levels, safety stock, and lead time.",
        "parameters": {
            "type": "object",
            "properties": {
                "urgency_threshold": {"type": "string", "enum": ["ALL", "CRITICAL", "WARNING"]}
            }
        }
    },
    {
        "name": "compare_suppliers",
        "description": "Compares eligible suppliers for a given product and quantity based on landed cost, lead time, quality score, delivery rating, and statutory compliance.",
        "parameters": {
            "type": "object",
            "properties": {
                "product_name": {"type": "string", "description": "Name or SKU of product to procure"},
                "quantity": {"type": "integer", "description": "Quantity to order"},
                "required_delivery_days": {"type": "integer", "description": "Maximum acceptable delivery lead time in days"}
            },
            "required": ["product_name", "quantity"]
        }
    },
    {
        "name": "get_vendor_scorecard",
        "description": "Retrieves the comprehensive vendor rating scorecard, star rating, dimension breakdowns, and recent order evaluations for a supplier.",
        "parameters": {
            "type": "object",
            "properties": {
                "supplier_name_or_id": {"type": "string", "description": "Supplier name, code, or ID"}
            },
            "required": ["supplier_name_or_id"]
        }
    },
    {
        "name": "get_order_evaluation",
        "description": "Retrieves the order-specific vendor evaluation and evidence for a specific purchase order number.",
        "parameters": {
            "type": "object",
            "properties": {
                "po_number": {"type": "string", "description": "Purchase order number e.g. PO-6C719B"}
            },
            "required": ["po_number"]
        }
    },
    {
        "name": "create_draft_purchase_order",
        "description": "Prepares a draft purchase order for specified items and supplier. Requires approval before binding commitment.",
        "parameters": {
            "type": "object",
            "properties": {
                "supplier_name": {"type": "string", "description": "Target supplier name or code"},
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "product_name": {"type": "string"},
                            "quantity": {"type": "integer"},
                            "unit_cost": {"type": "number"}
                        },
                        "required": ["product_name", "quantity"]
                    }
                },
                "notes": {"type": "string", "description": "Procurement notes or instructions"}
            },
            "required": ["supplier_name", "items"]
        }
    },
    {
        "name": "summarize_sales",
        "description": "Generates a sales summary for today, this week, or this month, reporting revenue, order counts, and top selling items.",
        "parameters": {
            "type": "object",
            "properties": {
                "period": {"type": "string", "enum": ["today", "week", "month"], "description": "Reporting period"}
            }
        }
    },
    {
        "name": "get_overdue_invoices_and_receivables",
        "description": "Finds overdue customer invoices and unpaid accounts, calculating outstanding amounts and drafting reminder templates.",
        "parameters": {
            "type": "object",
            "properties": {
                "days_overdue": {"type": "integer", "description": "Minimum days past due date"}
            }
        }
    },
    {
        "name": "get_hr_leave_and_attendance_summary",
        "description": "Summarizes employee leave requests, pending manager approvals, and today's attendance exceptions.",
        "parameters": {
            "type": "object",
            "properties": {
                "status_filter": {"type": "string", "enum": ["PENDING", "APPROVED", "ALL"]}
            }
        }
    },
    {
        "name": "create_scheduled_workflow",
        "description": "Persists a background recurring or scheduled automation workflow that executes business tasks independently of the browser.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Descriptive name for the automated workflow"},
                "schedule_description": {"type": "string", "description": "e.g. 'Daily at 9 AM' or 'Every 60 minutes'"},
                "cron_expression": {"type": "string", "description": "Standard 5-field cron expression or interval keyword"},
                "instruction_prompt": {"type": "string", "description": "Natural language instruction for what the workflow executes"}
            },
            "required": ["name", "instruction_prompt"]
        }
    },
    {
        "name": "list_scheduled_workflows",
        "description": "Lists all active, paused, or scheduled background automation workflows and their execution status.",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "update_vendor_ratings_batch",
        "description": "Reviews all completed purchase orders and recalculates vendor evaluations and scorecards across the entire supplier registry.",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    }
]

# --- TYPED TOOL IMPLEMENTATIONS ---

async def tool_search_inventory(
    db: AsyncSession,
    organization_id: int = 1,
    branch_id: Optional[int] = None,
    query: Optional[str] = None,
    low_stock_only: bool = False,
    limit: int = 25,
    **kwargs
) -> Dict[str, Any]:
    stmt = select(Product).where(Product.is_active == True)
    if query:
        q = f"%{query.strip()}%"
        stmt = stmt.where(or_(Product.name.ilike(q), Product.sku.ilike(q), Product.barcode.ilike(q)))
    if low_stock_only:
        stmt = stmt.where(Product.current_stock <= Product.reorder_level)
    stmt = stmt.order_by(Product.current_stock.asc()).limit(limit)

    res = await db.execute(stmt)
    products = res.scalars().all()

    items = [
        {
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "current_stock": p.current_stock,
            "reorder_level": p.reorder_level,
            "unit_price": float(p.selling_price),
            "cost_price": float(p.cost_price),
            "is_low": p.current_stock <= p.reorder_level,
            "shortage": max(0, p.reorder_level - p.current_stock)
        }
        for p in products
    ]

    return {
        "status": "SUCCESS",
        "count": len(items),
        "low_stock_count": sum(1 for i in items if i["is_low"]),
        "items": items,
        "summary": f"Found {len(items)} products ({sum(1 for i in items if i['is_low'])} low stock items)."
    }


async def tool_calculate_reorder_recommendations(
    db: AsyncSession,
    organization_id: int = 1,
    branch_id: Optional[int] = None,
    urgency_threshold: str = "ALL",
    **kwargs
) -> Dict[str, Any]:
    stmt = select(Product).where(and_(Product.is_active == True, Product.current_stock <= Product.reorder_level)).order_by(Product.current_stock.asc())
    res = await db.execute(stmt)
    low_prods = res.scalars().all()

    recommendations = []
    for p in low_prods:
        deficit = p.reorder_level - p.current_stock
        # EOQ / standard batch reorder calculation
        recommended_qty = max(deficit * 2, 20)
        est_cost = float(p.cost_price or (p.selling_price * Decimal("0.8"))) * recommended_qty

        urgency = "CRITICAL" if p.current_stock <= 0 else ("HIGH" if p.current_stock <= (p.reorder_level // 2) else "MEDIUM")
        if urgency_threshold == "CRITICAL" and urgency != "CRITICAL":
            continue
        if urgency_threshold == "WARNING" and urgency not in ["CRITICAL", "HIGH"]:
            continue

        recommendations.append({
            "product_id": p.id,
            "product_name": p.name,
            "sku": p.sku,
            "current_stock": p.current_stock,
            "reorder_level": p.reorder_level,
            "recommended_order_quantity": recommended_qty,
            "unit_cost": float(p.cost_price),
            "estimated_cost": est_cost,
            "urgency": urgency
        })

    total_est_spend = sum(r["estimated_cost"] for r in recommendations)
    return {
        "status": "SUCCESS",
        "recommendations_count": len(recommendations),
        "total_estimated_spend": round(total_est_spend, 2),
        "recommendations": recommendations,
        "summary": f"Identified {len(recommendations)} products requiring replenishment totaling ₹{total_est_spend:,.2f} INR."
    }


async def tool_compare_suppliers(
    db: AsyncSession,
    product_name: str,
    quantity: int = 10,
    required_delivery_days: Optional[int] = None,
    organization_id: int = 1,
    **kwargs
) -> Dict[str, Any]:
    comparison = await compare_suppliers_for_order(
        db=db,
        product_name=product_name,
        quantity=quantity,
        required_delivery_days=required_delivery_days,
        organization_id=organization_id
    )
    return {
        "status": "SUCCESS",
        "vendor_comparison": comparison,
        "summary": comparison["recommendation_rationale"]
    }


async def tool_get_vendor_scorecard(
    db: AsyncSession,
    supplier_name_or_id: str,
    organization_id: int = 1,
    **kwargs
) -> Dict[str, Any]:
    supplier = None
    if str(supplier_name_or_id).isdigit():
        s_res = await db.execute(select(Supplier).where(Supplier.id == int(supplier_name_or_id)))
        supplier = s_res.scalar_one_or_none()
    
    if not supplier:
        s_res = await db.execute(select(Supplier).where(or_(
            Supplier.name.ilike(f"%{supplier_name_or_id.strip()}%"),
            Supplier.vendor_code.ilike(f"%{supplier_name_or_id.strip()}%")
        )))
        supplier = s_res.scalar_one_or_none()

    if not supplier:
        return {"status": "ERROR", "message": f"Supplier '{supplier_name_or_id}' not found in registry"}

    sc = await recalculate_vendor_scorecard(db, supplier.id, organization_id=organization_id)
    
    # Also fetch recent 5 order evaluations
    oe_stmt = select(VendorOrderEvaluation).where(VendorOrderEvaluation.supplier_id == supplier.id).order_by(desc(VendorOrderEvaluation.order_date)).limit(5)
    oe_res = await db.execute(oe_stmt)
    order_evals = oe_res.scalars().all()

    return {
        "status": "SUCCESS",
        "supplier": {
            "id": supplier.id,
            "name": supplier.name,
            "vendor_code": supplier.vendor_code,
            "contact_person": supplier.contact_person,
            "email": supplier.email,
            "phone": supplier.phone,
            "status": supplier.status
        },
        "scorecard": {
            "overall_score": sc.overall_score,
            "star_rating": sc.star_rating,
            "dimensions": {
                "delivery": sc.delivery_avg,
                "price": sc.price_avg,
                "quality": sc.quality_avg,
                "service": sc.service_avg,
                "reliability": sc.reliability_avg,
                "compliance": sc.compliance_avg
            },
            "on_time_delivery_pct": sc.on_time_delivery_pct,
            "avg_delay_days": sc.avg_delay_days,
            "defect_rate_pct": sc.defect_rate_pct,
            "price_variance_pct": sc.price_variance_pct,
            "evaluated_orders_count": sc.evaluated_orders_count,
            "compliance_status": sc.compliance_status,
            "is_procurement_eligible": sc.is_procurement_eligible,
            "trend": sc.trend,
            "confidence_level": sc.confidence_level,
            "strengths": json.loads(sc.strengths) if sc.strengths else [],
            "weaknesses": json.loads(sc.weaknesses) if sc.weaknesses else [],
            "recommendations": json.loads(sc.recommendations) if sc.recommendations else []
        },
        "recent_evaluations": [
            {
                "po_number": oe.po_number,
                "order_date": oe.order_date.isoformat() if oe.order_date else None,
                "overall_score": oe.overall_score,
                "star_rating": oe.star_rating,
                "status": oe.status,
                "delivery_score": oe.delivery_score,
                "quality_score": oe.quality_score,
                "price_score": oe.price_score
            }
            for oe in order_evals
        ],
        "summary": f"{supplier.name} Performance Scorecard: {sc.overall_score:.1f}/100 ({sc.star_rating}★). On-time: {sc.on_time_delivery_pct}%, Defect rate: {sc.defect_rate_pct}%. Trend: {sc.trend}."
    }


async def tool_get_order_evaluation(
    db: AsyncSession,
    po_number: str,
    organization_id: int = 1,
    **kwargs
) -> Dict[str, Any]:
    stmt = select(PurchaseOrder).where(PurchaseOrder.po_number == po_number.strip().upper())
    res = await db.execute(stmt)
    po = res.scalar_one_or_none()
    if not po:
        return {"status": "ERROR", "message": f"Purchase order '{po_number}' not found"}

    evaluation = await evaluate_purchase_order(db, po.id, organization_id=organization_id)
    return {
        "status": "SUCCESS",
        "po_number": po.po_number,
        "evaluation": {
            "id": evaluation.id,
            "overall_score": evaluation.overall_score,
            "star_rating": evaluation.star_rating,
            "status": evaluation.status,
            "confidence_level": evaluation.confidence_level,
            "dimension_scores": {
                "delivery": evaluation.delivery_score,
                "price": evaluation.price_score,
                "quality": evaluation.quality_score,
                "service": evaluation.service_score,
                "reliability": evaluation.reliability_score,
                "compliance": evaluation.compliance_score
            },
            "quoted_amount": float(evaluation.quoted_amount),
            "invoiced_amount": float(evaluation.invoiced_amount) if evaluation.invoiced_amount else None,
            "landed_cost": float(evaluation.landed_cost) if evaluation.landed_cost else None,
            "missing_data": json.loads(evaluation.missing_data) if evaluation.missing_data else [],
            "supporting_evidence": json.loads(evaluation.supporting_evidence) if evaluation.supporting_evidence else {},
            "ai_explanation": evaluation.ai_explanation
        },
        "summary": f"Evaluation for {po.po_number}: {evaluation.overall_score:.1f}/100 ({evaluation.star_rating}★) - {evaluation.status}."
    }


async def tool_create_draft_purchase_order(
    db: AsyncSession,
    supplier_name: str,
    items: List[Dict[str, Any]],
    notes: Optional[str] = None,
    user_id: int = 1,
    user_email: str = "admin@nexaerp.internal",
    organization_id: int = 1,
    branch_id: Optional[int] = None,
    execute_now: bool = False,
    **kwargs
) -> Dict[str, Any]:
    # 1. Resolve Supplier
    s_res = await db.execute(select(Supplier).where(or_(
        Supplier.name.ilike(f"%{supplier_name.strip()}%"),
        Supplier.vendor_code.ilike(f"%{supplier_name.strip()}%")
    )))
    supplier = s_res.scalar_one_or_none()
    if not supplier:
        return {"status": "ERROR", "message": f"Supplier '{supplier_name}' not found"}

    # 2. Resolve items
    prepared_items = []
    total_val = Decimal("0.00")
    for it in items:
        p_name = it.get("product_name", "")
        qty = int(it.get("quantity", 1))
        unit_cost = it.get("unit_cost")

        # BUG-18: Reject non-positive quantities and negative costs
        if qty <= 0:
            return {"status": "ERROR", "message": f"Validation error: Quantity for product '{p_name}' must be greater than zero (received {qty})."}

        p_res = await db.execute(select(Product).where(or_(
            Product.name.ilike(f"%{p_name.strip()}%"),
            Product.sku.ilike(f"%{p_name.strip()}%")
        )))
        prod = p_res.scalar_one_or_none()
        if not prod:
            return {"status": "ERROR", "message": f"Product '{p_name}' not found in catalog"}

        u_cost = Decimal(str(unit_cost)) if unit_cost is not None else prod.cost_price
        if u_cost < Decimal("0.00"):
            return {"status": "ERROR", "message": f"Validation error: Unit cost for product '{p_name}' cannot be negative (received {u_cost})."}

        l_total = u_cost * qty
        total_val += l_total
        prepared_items.append({
            "product_id": prod.id,
            "product_name": prod.name,
            "quantity_ordered": qty,
            "unit_cost": float(u_cost),
            "line_total": float(l_total)
        })

    # Sensitive Action Check: Threshold >= 50,000 requires independent approval workflow (Error 7)
    APPROVAL_THRESHOLD = 50000.0
    needs_approval = float(total_val) >= APPROVAL_THRESHOLD

    action_id = f"ACT-PO-{uuid.uuid4().hex[:6].upper()}"
    preview = {
        "action_id": action_id,
        "action_type": "CREATE_PURCHASE_ORDER",
        "title": f"Create Purchase Order for {supplier.name}",
        "consequences": [
            f"Draft purchase order will be created for {supplier.name}",
            f"Total commitment amount: ₹{float(total_val):,.2f} INR across {len(prepared_items)} line items",
            "Initial provisional vendor evaluation record will be initialized"
        ],
        "affected_records": [
            {"entity": "Supplier", "id": supplier.id, "name": supplier.name},
            {"entity": "Total Amount", "amount": float(total_val), "currency": "INR"}
        ],
        "requires_human_approval": needs_approval,
        "payload": {
            "supplier_id": supplier.id,
            "supplier_name": supplier.name,
            "items": prepared_items,
            "total_val": float(total_val),
            "notes": notes or f"AI Generated replenishment order"
        }
    }

    # Error 7 Fix: Never allow execute_now to bypass statutory approval threshold
    if needs_approval:
        return {
            "status": "APPROVAL_REQUIRED",
            "action_preview": preview,
            "summary": f"Purchase order total ₹{float(total_val):,.2f} INR exceeds ₹{APPROVAL_THRESHOLD:,.2f} statutory threshold. Independent executive approval required."
        }

    if not execute_now:
        return {
            "status": "PREVIEW_REQUIRED",
            "action_preview": preview,
            "summary": f"Prepared draft PO for {supplier.name} totaling ₹{float(total_val):,.2f} INR. Confirmation required."
        }

    # Execute PO creation
    po_number = f"PO-{uuid.uuid4().hex[:6].upper()}"
    po_items_models = [
        PurchaseOrderItem(
            product_id=it["product_id"],
            product_name=it["product_name"],
            quantity_ordered=it["quantity_ordered"],
            quantity_received=0,
            unit_cost=Decimal(str(it["unit_cost"])),
            line_total=Decimal(str(it["line_total"]))
        )
        for it in prepared_items
    ]

    new_po = PurchaseOrder(
        po_number=po_number,
        supplier_id=supplier.id,
        branch_id=branch_id,
        created_by_user_id=user_id,
        status="DRAFT",
        total_amount=total_val,
        notes=notes or "Created via Nexa AI Command Center",
        expected_delivery_date=datetime.now(timezone.utc) + timedelta(days=3),
        items=po_items_models
    )
    db.add(new_po)
    await db.commit()
    await db.refresh(new_po)

    # Automatically generate initial provisional vendor evaluation
    await evaluate_purchase_order(db, new_po.id, organization_id=organization_id)

    await record_audit_log(
        db, action="AI_PO_CREATED", entity_name="PurchaseOrder",
        entity_id=str(new_po.id), user_id=user_id, user_email=user_email,
        details={"po_number": po_number, "total": float(total_val), "supplier": supplier.name}
    )
    await db.commit()

    return {
        "status": "SUCCESS",
        "po_number": po_number,
        "supplier_name": supplier.name,
        "total_amount": float(total_val),
        "items_count": len(prepared_items),
        "summary": f"Successfully created draft Purchase Order **{po_number}** for **{supplier.name}** totaling ₹{float(total_val):,.2f} INR."
    }


async def tool_summarize_sales(
    db: AsyncSession,
    period: str = "today",
    organization_id: int = 1,
    branch_id: Optional[int] = None,
    **kwargs
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    if period == "today":
        start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_dt = now - timedelta(days=7)
    else: # month
        start_dt = now - timedelta(days=30)

    # Scoped branch query
    branch_stmt = select(Branch.id).where(Branch.organization_id == organization_id)
    b_res = await db.execute(branch_stmt)
    org_branch_ids = [b for b in b_res.scalars().all()]

    conditions = [SalesOrder.created_at >= start_dt]
    if branch_id:
        conditions.append(SalesOrder.branch_id == branch_id)
    elif org_branch_ids:
        conditions.append(SalesOrder.branch_id.in_(org_branch_ids))

    s_stmt = select(
        func.coalesce(func.sum(SalesOrder.total_amount), 0),
        func.count(SalesOrder.id)
    ).where(and_(*conditions))
    s_res = await db.execute(s_stmt)
    total_rev, orders_count = s_res.one()

    # Top selling items
    top_items_stmt = (
        select(
            SalesOrderItem.product_name,
            func.sum(SalesOrderItem.quantity).label("total_qty"),
            func.sum(SalesOrderItem.line_total).label("total_sales")
        )
        .join(SalesOrder, SalesOrderItem.order_id == SalesOrder.id)
        .where(and_(*conditions))
        .group_by(SalesOrderItem.product_name)
        .order_by(desc("total_sales"))
        .limit(5)
    )
    top_res = await db.execute(top_items_stmt)
    top_items = [
        {"product": r[0], "units_sold": int(r[1]), "revenue": float(r[2])}
        for r in top_res.all()
    ]

    return {
        "status": "SUCCESS",
        "period": period,
        "total_revenue": float(total_rev),
        "orders_count": orders_count,
        "average_order_value": round(float(total_rev) / orders_count, 2) if orders_count > 0 else 0.0,
        "top_selling_products": top_items,
        "summary": f"Sales for {period}: ₹{float(total_rev):,.2f} across {orders_count} transactions (AOV: ₹{(float(total_rev) / orders_count) if orders_count else 0:,.2f})."
    }


async def tool_get_overdue_invoices_and_receivables(
    db: AsyncSession,
    days_overdue: int = 15,
    organization_id: int = 1,
    branch_id: Optional[int] = None,
    **kwargs
) -> Dict[str, Any]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_overdue)
    # Error 6 Fix: Apply branch filter to overdue receivables
    stmt = (
        select(SalesOrder)
        .options(selectinload(SalesOrder.customer))
        .where(and_(SalesOrder.payment_status == "PENDING", SalesOrder.created_at <= cutoff))
    )
    if branch_id:
        stmt = stmt.where(SalesOrder.branch_id == branch_id)
    stmt = stmt.order_by(desc(SalesOrder.total_amount)).limit(20)
    res = await db.execute(stmt)
    orders = res.scalars().all()

    overdue_list = []
    total_outstanding = 0.0
    for o in orders:
        c_name = o.customer.name if o.customer else "Walk-in Customer"
        c_email = o.customer.email if o.customer else None
        amt = float(o.total_amount)
        total_outstanding += amt
        days_late = (datetime.now(timezone.utc) - (o.created_at.replace(tzinfo=timezone.utc) if o.created_at.tzinfo is None else o.created_at)).days
        
        reminder_template = (
            f"Dear {c_name},\n\n"
            f"This is a gentle payment reminder from NexaERP regarding Invoice {o.invoice_number} "
            f"for ₹{amt:,.2f} INR which is currently {days_late} days past due.\n"
            "Kindly remit payment at your earliest convenience or contact our accounts team."
        )

        overdue_list.append({
            "order_id": o.id,
            "invoice_number": o.invoice_number,
            "customer_name": c_name,
            "customer_email": c_email,
            "amount": amt,
            "days_overdue": days_late,
            "draft_email_reminder": reminder_template
        })

    return {
        "status": "SUCCESS",
        "overdue_count": len(overdue_list),
        "total_outstanding": round(total_outstanding, 2),
        "overdue_invoices": overdue_list,
        "summary": f"Found {len(overdue_list)} overdue invoices exceeding {days_overdue} days, totaling ₹{total_outstanding:,.2f} INR in outstanding receivables."
    }


async def tool_get_hr_leave_and_attendance_summary(
    db: AsyncSession,
    status_filter: str = "PENDING",
    organization_id: int = 1,
    branch_id: Optional[int] = None,
    user_id: int = 1,
    **kwargs
) -> Dict[str, Any]:
    # Error 6 Fix: HR summary requires branch context; reject branchless requests for multi-tenant isolation
    if not branch_id:
        return {
            "status": "ERROR",
            "message": "Branch context required for HR summary. Access across unassigned branches is prohibited."
        }

    from app.models.hr import Employee
    stmt = (
        select(LeaveRequest)
        .join(Employee, LeaveRequest.employee_id == Employee.id)
        .options(selectinload(LeaveRequest.employee))
        .order_by(desc(LeaveRequest.created_at))
    )
    if branch_id:
        stmt = stmt.where(Employee.branch_id == branch_id)
    if status_filter != "ALL":
        stmt = stmt.where(LeaveRequest.status == status_filter)
    stmt = stmt.limit(20)

    res = await db.execute(stmt)
    leaves = res.scalars().all()

    # Today's attendance snapshot scoped by branch
    today = date.today()
    att_stmt = (
        select(func.count(Attendance.id), Attendance.status)
        .join(Employee, Attendance.employee_id == Employee.id)
        .where(Attendance.date == today)
    )
    if branch_id:
        att_stmt = att_stmt.where(Employee.branch_id == branch_id)
    att_stmt = att_stmt.group_by(Attendance.status)
    att_res = await db.execute(att_stmt)
    att_breakdown = {r[1]: r[0] for r in att_res.all()}

    leaves_out = [
        {
            "leave_id": l.id,
            "employee_name": f"{l.employee.first_name} {l.employee.last_name}" if l.employee else "Employee",
            "leave_type": l.leave_type,
            "start_date": l.start_date.isoformat(),
            "end_date": l.end_date.isoformat(),
            "days_count": l.days_count,
            "reason": l.reason,
            "status": l.status
        }
        for l in leaves
    ]

    return {
        "status": "SUCCESS",
        "pending_leave_requests_count": sum(1 for l in leaves_out if l["status"] == "PENDING"),
        "leaves": leaves_out,
        "today_attendance": att_breakdown or {"PRESENT": 0, "ABSENT": 0},
        "summary": f"HR Overview: {sum(1 for l in leaves_out if l['status'] == 'PENDING')} pending leave approval requests."
    }


async def tool_create_scheduled_workflow(
    db: AsyncSession,
    name: str,
    instruction_prompt: str,
    schedule_description: Optional[str] = "Daily at 9:00 AM",
    cron_expression: Optional[str] = "0 9 * * *",
    interval_minutes: Optional[int] = None,
    user_id: int = 1,
    organization_id: int = 1,
    branch_id: Optional[int] = None,
    **kwargs
) -> Dict[str, Any]:
    # Determine plan steps based on instruction prompt
    plan_steps = []
    p_lower = instruction_prompt.lower()
    
    if "stock" in p_lower or "inventory" in p_lower or "shortage" in p_lower:
        plan_steps.append({
            "step": 1,
            "title": "Check Low Stock Products",
            "tool": "search_inventory",
            "params": {"low_stock_only": True}
        })
        plan_steps.append({
            "step": 2,
            "title": "Calculate Replenishment Recommendations",
            "tool": "calculate_reorder_recommendations",
            "params": {"urgency_threshold": "ALL"}
        })
    elif "vendor" in p_lower or "rating" in p_lower:
        plan_steps.append({
            "step": 1,
            "title": "Batch Recalculate Vendor Ratings",
            "tool": "update_vendor_ratings_batch",
            "params": {}
        })
    elif "invoice" in p_lower or "receivable" in p_lower or "overdue" in p_lower:
        plan_steps.append({
            "step": 1,
            "title": "Detect Overdue Invoices",
            "tool": "get_overdue_invoices_and_receivables",
            "params": {"days_overdue": 15}
        })
    else:
        plan_steps.append({
            "step": 1,
            "title": "Execute Scheduled Operations Summary",
            "tool": "summarize_sales",
            "params": {"period": "today"}
        })

    workflow = WorkflowDefinition(
        name=name,
        description=f"Automated workflow: {schedule_description}",
        trigger_type="SCHEDULE",
        cron_expression=cron_expression or "0 9 * * *",
        interval_minutes=interval_minutes,
        instruction_prompt=instruction_prompt,
        plan_steps=json.dumps(plan_steps),
        status="ACTIVE",
        is_active=True,
        created_by_user_id=user_id,
        organization_id=organization_id,
        branch_id=branch_id,
        next_run_at=datetime.now(timezone.utc) + timedelta(hours=1)
    )
    db.add(workflow)
    await db.commit()
    await db.refresh(workflow)

    return {
        "status": "SUCCESS",
        "workflow": {
            "id": workflow.id,
            "name": workflow.name,
            "trigger_type": workflow.trigger_type,
            "cron_expression": workflow.cron_expression,
            "instruction_prompt": workflow.instruction_prompt,
            "plan_steps": plan_steps,
            "status": workflow.status,
            "is_active": workflow.is_active,
            "next_run_at": workflow.next_run_at.isoformat() if workflow.next_run_at else None
        },
        "summary": f"Successfully created and scheduled workflow **'{workflow.name}'** ({workflow.cron_expression or schedule_description}). It will run in the background without needing an open browser tab."
    }


async def tool_list_scheduled_workflows(
    db: AsyncSession,
    organization_id: int = 1,
    **kwargs
) -> Dict[str, Any]:
    stmt = (
        select(WorkflowDefinition)
        .where(WorkflowDefinition.organization_id == organization_id)
        .order_by(desc(WorkflowDefinition.created_at))
    )
    res = await db.execute(stmt)
    wfs = res.scalars().all()

    items = [
        {
            "id": w.id,
            "name": w.name,
            "trigger_type": w.trigger_type,
            "cron_expression": w.cron_expression,
            "instruction_prompt": w.instruction_prompt,
            "status": w.status,
            "is_active": w.is_active,
            "last_run_at": w.last_run_at.isoformat() if w.last_run_at else None,
            "next_run_at": w.next_run_at.isoformat() if w.next_run_at else None
        }
        for w in wfs
    ]
    return {
        "status": "SUCCESS",
        "workflows_count": len(items),
        "workflows": items,
        "summary": f"Found {len(items)} active workflow definitions."
    }


async def tool_update_vendor_ratings_batch(
    db: AsyncSession,
    organization_id: int = 1,
    **kwargs
) -> Dict[str, Any]:
    # Find all POs that are RECEIVED or have inspections
    po_stmt = select(PurchaseOrder.id).order_by(desc(PurchaseOrder.created_at)).limit(50)
    po_res = await db.execute(po_stmt)
    po_ids = po_res.scalars().all()

    updated_evals = 0
    for po_id in po_ids:
        try:
            await evaluate_purchase_order(db, po_id, organization_id=organization_id)
            updated_evals += 1
        except Exception:
            pass

    # Recalculate scorecards for all suppliers
    s_stmt = select(Supplier.id)
    s_res = await db.execute(s_stmt)
    sup_ids = s_res.scalars().all()

    updated_suppliers = 0
    for s_id in sup_ids:
        try:
            await recalculate_vendor_scorecard(db, s_id, organization_id=organization_id)
            updated_suppliers += 1
        except Exception:
            pass

    return {
        "status": "SUCCESS",
        "evaluated_pos_count": updated_evals,
        "updated_suppliers_count": updated_suppliers,
        "summary": f"Batch update complete: evaluated {updated_evals} purchase orders and updated scorecards for {updated_suppliers} registered suppliers."
    }


# Tool Dispatcher
TOOL_DISPATCH_MAP = {
    "search_inventory": tool_search_inventory,
    "calculate_reorder_recommendations": tool_calculate_reorder_recommendations,
    "compare_suppliers": tool_compare_suppliers,
    "get_vendor_scorecard": tool_get_vendor_scorecard,
    "get_order_evaluation": tool_get_order_evaluation,
    "create_draft_purchase_order": tool_create_draft_purchase_order,
    "summarize_sales": tool_summarize_sales,
    "get_overdue_invoices_and_receivables": tool_get_overdue_invoices_and_receivables,
    "get_hr_leave_and_attendance_summary": tool_get_hr_leave_and_attendance_summary,
    "create_scheduled_workflow": tool_create_scheduled_workflow,
    "list_scheduled_workflows": tool_list_scheduled_workflows,
    "update_vendor_ratings_batch": tool_update_vendor_ratings_batch
}

# SEC-30: Per-tool required permissions for robust RBAC enforcement
TOOL_REQUIRED_PERMISSIONS = {
    "create_scheduled_workflow": "settings.manage",
    "update_vendor_ratings_batch": "procurement.manage",
    "create_draft_purchase_order": "procurement.create",
    "get_hr_leave_and_attendance_summary": "hr.view",
    "get_overdue_invoices_and_receivables": "finance.view",
    "search_inventory": "inventory.view",
    "calculate_reorder_recommendations": "inventory.view",
    "compare_suppliers": "procurement.view",
    "get_vendor_scorecard": "procurement.view",
    "get_order_evaluation": "procurement.view",
    "summarize_sales": "sales.view",
    "list_scheduled_workflows": "settings.manage"
}

MCP_SERVICE_ACCOUNT_ALLOWED_TOOLS = {
    "search_inventory",
    "calculate_reorder_recommendations",
    "compare_suppliers",
    "get_vendor_scorecard",
    "get_order_evaluation"
}

ADMIN_ONLY_TOOLS = {"create_scheduled_workflow", "update_vendor_ratings_batch"}

async def execute_typed_tool(
    tool_name: str,
    parameters: Dict[str, Any],
    db: AsyncSession,
    user_id: int,
    user_email: str,
    organization_id: int = 1,
    branch_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Validates and executes an authorized typed tool strictly within tenant boundary.
    Enforces per-tool role authorization and least-privilege service account constraints (SEC-30).
    """
    if tool_name not in TOOL_DISPATCH_MAP:
        return {"status": "ERROR", "message": f"Unauthorized or unknown tool '{tool_name}'"}

    # SEC-30: Enforce RBAC per tool for all callers
    req_perm = TOOL_REQUIRED_PERMISSIONS.get(tool_name)
    
    # 1. MCP Service Account (id 9999) permissions: Error 6 positive allowlist
    if user_id == 9999:
        if tool_name not in MCP_SERVICE_ACCOUNT_ALLOWED_TOOLS:
            return {
                "status": "ERROR",
                "message": f"Forbidden: Dedicated MCP service account can only invoke tools in its authorized positive allowlist. Tool '{tool_name}' is not permitted."
            }
    # 2. Authenticated ERP User permissions - strictly loaded and verified from database (Error 3)
    else:
        from app.models.auth import User, UserRole, Role
        from sqlalchemy.orm import selectinload
        u_stmt = select(User).options(selectinload(User.roles).selectinload(UserRole.role)).where(User.id == user_id)
        u_res = await db.execute(u_stmt)
        u = u_res.scalar_one_or_none()
        if not u or not u.is_active:
            return {"status": "ERROR", "message": "Invalid or inactive caller identity."}

        # Authoritatively resolve tenant organization and branch from DB record (Error 4)
        organization_id = getattr(u, "organization_id", 1) or 1
        user_branch_id = getattr(u, "branch_id", None)

        user_role_names = [ur.role.name for ur in (u.roles or []) if getattr(ur, "role", None)]
        is_admin_user = u.is_superuser or any(r in ["System Administrator", "Executive", "Managing Director"] for r in user_role_names)

        if not is_admin_user:
            # Overwrite caller-supplied branch_id with the user's authoritative branch
            branch_id = user_branch_id
            if branch_id is None and tool_name in ["get_hr_leave_and_attendance_summary", "get_overdue_invoices_and_receivables"]:
                return {
                    "status": "ERROR",
                    "message": f"Forbidden: Branch context required to execute '{tool_name}'. No branch assigned to caller."
                }
            if tool_name in ADMIN_ONLY_TOOLS:
                return {
                    "status": "ERROR",
                    "message": f"Forbidden: Administrative authorization required to execute '{tool_name}'."
                }
            if not req_perm:
                return {
                    "status": "ERROR",
                    "message": f"Forbidden: Tool '{tool_name}' lacks required permission metadata."
                }
            # Check effective permissions from DB
            from app.authorization.rbac_engine import get_user_effective_permissions
            user_perms = await get_user_effective_permissions(u, db)
            if req_perm not in user_perms:
                return {
                    "status": "ERROR",
                    "message": f"Forbidden: Insufficient permissions to execute tool '{tool_name}'. Missing '{req_perm}'."
                }
        else:
            if branch_id is None:
                branch_id = user_branch_id

    fn = TOOL_DISPATCH_MAP[tool_name]
    params = dict(parameters)
    params["db"] = db
    params["user_id"] = user_id
    params["user_email"] = user_email
    params["organization_id"] = organization_id
    params["branch_id"] = branch_id

    try:
        result = await fn(**params)
        return result
    except Exception as exc:
        return {"status": "ERROR", "message": str(exc)}
