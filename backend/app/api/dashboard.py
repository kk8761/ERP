from datetime import datetime, timezone, timedelta, date
from decimal import Decimal
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.models.auth import User
from app.models.sales import SalesOrder, Customer
from app.models.inventory import Product
from app.models.procurement import PurchaseOrder
from app.models.finance import Expense

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/metrics")
async def get_dashboard_metrics(
    date_range: Optional[str] = Query("Last 30 Days", alias="range"),
    current_user: User = Depends(require_permission("dashboard.view")),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today_start.replace(day=1)

    # SEC-60 / BUG-69: Enforce strict organization resolution
    effective_org = getattr(current_user, "organization_id", None)
    if effective_org is None:
        if current_user.is_superuser:
            from app.models.org import Organization
            o_res = await db.execute(select(Organization.id).order_by(Organization.id.asc()).limit(1))
            effective_org = o_res.scalar_one_or_none()
        if effective_org is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization context required to view dashboard. User has no assigned organization."
            )

    # Multi-branch consolidation authorization check
    user_roles = [r.role.name for r in getattr(current_user, "roles", []) if getattr(r, "role", None)]
    is_global_admin = current_user.is_superuser or any(
        r in ["System Administrator", "Executive", "Managing Director"] for r in user_roles
    ) or ("reports.consolidated" in getattr(current_user, "permissions", []))

    user_branch = getattr(current_user, "active_branch_id", current_user.branch_id)

    from app.models.org import Branch
    b_res = await db.execute(select(Branch.id).where(Branch.organization_id == effective_org))
    org_branch_ids = b_res.scalars().all()

    if is_global_admin:
        allowed_branches = org_branch_ids
    elif user_branch and user_branch in org_branch_ids:
        allowed_branches = [user_branch]
    elif org_branch_ids:
        # Default non-admin without active branch to their organization's primary branch only
        allowed_branches = [org_branch_ids[0]]
    else:
        allowed_branches = []

    # Safe SQL branch filters
    branch_filter = SalesOrder.branch_id.in_(allowed_branches) if allowed_branches else (1 == 0)
    exp_branch_filter = Expense.branch_id.in_(allowed_branches) if allowed_branches else (1 == 0)
    po_branch_filter = PurchaseOrder.branch_id.in_(allowed_branches) if allowed_branches else (1 == 0)

    # 1. Today's Sales (branch and organization scoped)
    today_sales_stmt = select(
        func.coalesce(func.sum(SalesOrder.total_amount), 0),
        func.count(SalesOrder.id)
    ).where(SalesOrder.created_at >= today_start, branch_filter)
    today_sales_res = await db.execute(today_sales_stmt)
    today_sales, today_orders = today_sales_res.one()

    # 2. Total Products & Stock status (organization scoped)
    prod_stmt = select(func.count(Product.id))
    low_stmt = select(func.count(Product.id)).where(Product.current_stock > 0, Product.current_stock <= Product.reorder_level)
    oos_stmt = select(func.count(Product.id)).where(Product.current_stock <= 0)
    if effective_org is not None:
        prod_stmt = prod_stmt.where(Product.organization_id == effective_org)
        low_stmt = low_stmt.where(Product.organization_id == effective_org)
        oos_stmt = oos_stmt.where(Product.organization_id == effective_org)

    prod_total_res = await db.execute(prod_stmt)
    total_products = prod_total_res.scalar_one()

    low_stock_res = await db.execute(low_stmt)
    low_stock_count = low_stock_res.scalar_one()

    out_of_stock_res = await db.execute(oos_stmt)
    out_of_stock_count = out_of_stock_res.scalar_one()

    # 3. Total Customers (organization scoped)
    cust_stmt = select(func.count(Customer.id))
    if effective_org is not None:
        cust_stmt = cust_stmt.where(Customer.organization_id == effective_org)
    cust_res = await db.execute(cust_stmt)
    total_customers = cust_res.scalar_one()

    # 4. Monthly Profit (branch and organization scoped, allowing true losses)
    month_sales_res = await db.execute(
        select(func.coalesce(func.sum(SalesOrder.total_amount), 0))
        .where(SalesOrder.created_at >= month_start, branch_filter)
    )
    month_sales = float(month_sales_res.scalar_one())

    month_expense_res = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0))
        .where(Expense.created_at >= month_start, exp_branch_filter)
    )
    month_expenses = float(month_expense_res.scalar_one())
    monthly_profit = round(month_sales - month_expenses, 2)

    # 5. Low stock items table (top 5, organization scoped)
    low_items_stmt = (
        select(Product)
        .where(Product.current_stock <= Product.reorder_level)
        .order_by(Product.current_stock.asc())
        .limit(5)
    )
    if effective_org is not None:
        low_items_stmt = low_items_stmt.where(Product.organization_id == effective_org)
    low_stock_items_res = await db.execute(low_items_stmt)
    low_stock_items = [
        {
            "id": p.id,
            "name": p.name,
            "current_stock": p.current_stock,
            "reorder_level": p.reorder_level,
            "status": "Out of Stock" if p.current_stock <= 0 else "Low Stock"
        }
        for p in low_stock_items_res.scalars().all()
    ]

    # 6. Recent Sales table (top 5, branch scoped)
    recent_sales_res = await db.execute(
        select(SalesOrder)
        .options(selectinload(SalesOrder.customer), selectinload(SalesOrder.items))
        .where(branch_filter)
        .order_by(desc(SalesOrder.created_at))
        .limit(5)
    )
    recent_sales = [
        {
            "id": order.id,
            "invoice": order.invoice_number,
            "customer": order.customer.name if order.customer else "Walk-in Customer",
            "items_count": sum(it.quantity for it in order.items),
            "amount": float(order.total_amount),
            "time": order.created_at.strftime("%I:%M %p")
        }
        for order in recent_sales_res.scalars().all()
    ]

    # 7. Expense breakdown (branch scoped)
    exp_cats_res = await db.execute(
        select(Expense.category, func.coalesce(func.sum(Expense.amount), 0))
        .where(exp_branch_filter)
        .group_by(Expense.category)
    )
    exp_cats = exp_cats_res.all()
    total_exp_all = sum(float(row[1]) for row in exp_cats)
    expense_breakdown = [
        {
            "category": row[0],
            "amount": float(row[1]),
            "percentage": round((float(row[1]) / total_exp_all * 100), 1) if total_exp_all > 0 else 0
        }
        for row in exp_cats
    ]

    # 8. Sales Overview chart points
    chart_data = []
    filter_range = (date_range or "Last 30 Days").strip().lower()

    if "week" in filter_range:
        # Last 7 days, daily
        intervals = []
        for i in range(6, -1, -1):
            d = (now - timedelta(days=i)).date()
            start = datetime.combine(d, datetime.min.time(), tzinfo=timezone.utc)
            end = start + timedelta(days=1)
            intervals.append((start, end, d.strftime("%a %d")))
    elif "quarter" in filter_range:
        # Last 90 days in 10 intervals
        intervals = []
        for i in range(9, -1, -1):
            start_date = (now - timedelta(days=(i + 1) * 9)).date()
            end_date = (now - timedelta(days=i * 9)).date()
            start = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
            end = datetime.combine(end_date, datetime.min.time(), tzinfo=timezone.utc)
            intervals.append((start, end, start_date.strftime("%b %d")))
    else:
        # Last 30 Days in 8 key intervals
        intervals = []
        day_steps = [28, 24, 20, 16, 12, 8, 4, 0]
        for offset in day_steps:
            d = (now - timedelta(days=offset)).date()
            start = datetime.combine(d - timedelta(days=3), datetime.min.time(), tzinfo=timezone.utc)
            end = datetime.combine(d + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)
            intervals.append((start, end, d.strftime("%b %d")))

    for target_start, target_end, label in intervals:
        s_stmt = select(func.coalesce(func.sum(SalesOrder.total_amount), 0)).where(
            SalesOrder.created_at >= target_start,
            SalesOrder.created_at < target_end,
            branch_filter
        )
        s_val_res = await db.execute(s_stmt)
        day_sales = float(s_val_res.scalar_one())

        p_stmt = select(func.coalesce(func.sum(PurchaseOrder.total_amount), 0)).where(
            PurchaseOrder.created_at >= target_start,
            PurchaseOrder.created_at < target_end,
            po_branch_filter
        )
        p_val_res = await db.execute(p_stmt)
        day_purchases = float(p_val_res.scalar_one())

        exp_stmt = select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.created_at >= target_start,
            Expense.created_at < target_end,
            exp_branch_filter
        )
        exp_res = await db.execute(exp_stmt)
        day_exp = float(exp_res.scalar_one())

        # BUG-69 Fix: Harmonize profit formula consistently with monthly operating profit (Sales - Expenses)
        day_profit = round(day_sales - day_exp, 2)

        chart_data.append({
            "date": label,
            "sales": day_sales,
            "purchases": day_purchases,
            "profit": day_profit
        })

    # Real Dynamic Alerts & Notifications
    alerts = []
    alert_id = 1
    if total_products == 0:
        alerts.append({
            "id": alert_id,
            "type": "info",
            "title": "Welcome to Your Store",
            "description": "Step 1: Add your items in the Product Catalog. Next: Manage quantities in Step 2.",
            "time": "Just now"
        })
        alert_id += 1
    else:
        for ls in low_stock_items[:3]:
            alerts.append({
                "id": alert_id,
                "type": "danger" if ls["status"] == "Out of Stock" else "warning",
                "title": f"Stock Alert: {ls['name']}",
                "description": f"Current stock is {ls['current_stock']} (Threshold: {ls['reorder_level']}). Manage quantity in Step 2.",
                "time": "Active"
            })
            alert_id += 1

    alerts.append({
        "id": alert_id,
        "type": "success",
        "title": "System Active",
        "description": "Store database and POS engine initialized and operational.",
        "time": "Live"
    })

    return {
        "kpis": {
            "total_sales": float(today_sales),
            "total_orders": today_orders,
            "inventory_items": total_products,
            "low_stock_items": low_stock_count,
            "out_of_stock_items": out_of_stock_count,
            "total_customers": total_customers,
            "monthly_profit": float(monthly_profit),
            "total_expenses": float(total_exp_all)
        },
        "sales_overview_chart": chart_data,
        "expense_breakdown": expense_breakdown,
        "low_stock_table": low_stock_items,
        "recent_sales": recent_sales,
        "alerts": alerts
    }
