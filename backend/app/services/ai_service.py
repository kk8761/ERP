from typing import Dict, Any, List
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, date, timedelta

from app.models.sales import SalesOrder
from app.models.inventory import Product
from app.models.finance import Expense
from app.models.elevation import AccessRequest

async def process_ai_query(db: AsyncSession, prompt: str, user_name: str) -> Dict[str, Any]:
    """
    Intelligent Business AI Query Processor that inspects live ERP state and returns structured responses.
    """
    prompt_lower = prompt.lower().strip()

    # Query 1: Today's sales summary
    if "today" in prompt_lower or "sales summary" in prompt_lower or "today's sales" in prompt_lower:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        stmt = select(
            func.coalesce(func.sum(SalesOrder.total_amount), 0),
            func.count(SalesOrder.id)
        ).where(SalesOrder.created_at >= today_start)
        res = await db.execute(stmt)
        total_rev, order_count = res.one()

        return {
            "query": prompt,
            "answer": f"Today's total sales reach **₹ {float(total_rev):,.2f}** across **{order_count} completed orders**. Average ticket size is ₹ {(float(total_rev)/order_count if order_count else 0):,.2f}.",
            "data": {
                "total_sales": float(total_rev),
                "orders_count": order_count
            },
            "suggestions": ["Which items are low in stock?", "Show profit analysis", "Expense breakdown"]
        }

    # Query 2: Low stock items / Reorder
    if "low in stock" in prompt_lower or "low stock" in prompt_lower or "reorder" in prompt_lower:
        stmt = select(Product).where(Product.current_stock <= Product.reorder_level).limit(10)
        res = await db.execute(stmt)
        low_items = res.scalars().all()

        if not low_items:
            return {
                "query": prompt,
                "answer": "All inventory items are currently above their minimum reorder thresholds. No immediate purchase orders required.",
                "data": {"count": 0, "items": []},
                "suggestions": ["Show today's sales summary", "Record expense"]
            }

        item_lines = [
            f"- **{item.name}**: Current Stock: **{item.current_stock}** (Reorder threshold: {item.reorder_level} {item.unit_of_measure})"
            for item in low_items
        ]
        return {
            "query": prompt,
            "answer": f"Identified **{len(low_items)} items** requiring stock replenishment:\n\n" + "\n".join(item_lines),
            "data": {
                "count": len(low_items),
                "items": [{"name": i.name, "stock": i.current_stock, "reorder": i.reorder_level} for i in low_items]
            },
            "suggestions": ["Create purchase order", "View inventory catalog", "Today's sales summary"]
        }

    # Query 3: Expense breakdown
    if "expense" in prompt_lower or "breakdown" in prompt_lower:
        stmt = select(
            Expense.category,
            func.coalesce(func.sum(Expense.amount), 0)
        ).group_by(Expense.category)
        res = await db.execute(stmt)
        rows = res.all()

        total_exp = sum(float(r[1]) for r in rows)
        lines = [f"- **{r[0]}**: ₹ {float(r[1]):,.2f} ({((float(r[1])/total_exp)*100 if total_exp else 0):.1f}%)" for r in rows]

        return {
            "query": prompt,
            "answer": f"Total operating expenses recorded: **₹ {total_exp:,.2f}**.\n\nCategory distribution:\n" + "\n".join(lines),
            "data": {"total_expenses": total_exp, "categories": {r[0]: float(r[1]) for r in rows}},
            "suggestions": ["Show profit analysis", "Generate monthly report"]
        }

    # Query 4: Profit analysis / Monthly report
    if "profit" in prompt_lower or "monthly report" in prompt_lower or "revenue" in prompt_lower:
        sales_stmt = select(func.coalesce(func.sum(SalesOrder.total_amount), 0))
        sales_res = await db.execute(sales_stmt)
        total_sales = float(sales_res.scalar_one())

        exp_stmt = select(func.coalesce(func.sum(Expense.amount), 0))
        exp_res = await db.execute(exp_stmt)
        total_expenses = float(exp_res.scalar_one())

        net_profit = total_sales - total_expenses
        margin = (net_profit / total_sales * 100) if total_sales > 0 else 0.0

        return {
            "query": prompt,
            "answer": f"**Monthly Performance Summary**:\n- **Gross Revenue**: ₹ {total_sales:,.2f}\n- **Operational Expenses**: ₹ {total_expenses:,.2f}\n- **Net Operating Profit**: **₹ {net_profit:,.2f}**\n- **Operating Margin**: {margin:.1f}%",
            "data": {
                "revenue": total_sales,
                "expenses": total_expenses,
                "profit": net_profit,
                "margin_pct": round(margin, 2)
            },
            "suggestions": ["Show today's sales summary", "Which items are low in stock?"]
        }

    # General Business Assistant reply
    return {
        "query": prompt,
        "answer": f"Hello {user_name}! I am your **NexaERP AI Assistant**. I can help you analyze sales figures, check low inventory levels, inspect expense distributions, and draft reports.\n\nTry asking:\n- *'Show today's sales summary'*\n- *'Which items are low in stock?'*\n- *'Show profit analysis'*\n- *'Expense breakdown'*",
        "data": {},
        "suggestions": [
            "Show today's sales summary",
            "Which items are low in stock?",
            "Expense breakdown",
            "Show profit analysis"
        ]
    }
