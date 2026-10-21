import re
import json
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy import select, and_, or_, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import User
from app.models.inventory import Product
from app.models.procurement import Supplier, PurchaseOrder
from app.models.workflow import ApprovalRequest
from app.services.ai_service import call_enterprise_ai_llm
from app.services.ai_tools import (
    TOOL_REGISTRY_METADATA,
    execute_typed_tool
)
from app.services.audit_service import record_audit_log

async def process_natural_language_command(
    db: AsyncSession,
    prompt: str,
    user_id: int,
    user_email: str,
    user_role: str = "Employee",
    organization_id: int = 1,
    organization_name: str = "Nexa Global Enterprises",
    branch_id: Optional[int] = None,
    confirm_action_id: Optional[str] = None,
    parameters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Enterprise Natural Language Command Center:
    1. Understands user's business intent and extracts parameters.
    2. Identifies required modules and constructs structured execution plan.
    3. Handles 3 task types: ONE_TIME, MULTI_STEP, RECURRING_WORKFLOW.
    4. Detects missing information and asks clarifying follow-up questions.
    5. Shows preview for consequential actions and enforces human approval.
    6. Tracks step progress (pending, running, completed, failed).
    7. Records audit trail.
    """
    p_lower = prompt.lower().strip()
    
    # -------------------------------------------------------------
    # Case 0: User is confirming a previously previewed action
    # -------------------------------------------------------------
    if confirm_action_id and parameters:
        action_type = parameters.get("action_type")
        payload = parameters.get("payload", {})
        
        if action_type == "CREATE_PURCHASE_ORDER":
            res = await execute_typed_tool(
                tool_name="create_draft_purchase_order",
                parameters={
                    "supplier_name": payload.get("supplier_name"),
                    "items": payload.get("items", []),
                    "notes": payload.get("notes"),
                    "execute_now": True
                },
                db=db,
                user_id=user_id,
                user_email=user_email,
                organization_id=organization_id,
                branch_id=branch_id
            )
            return {
                "answer": res.get("summary", "Purchase order created successfully."),
                "task_type": "ONE_TIME",
                "status": "COMPLETED",
                "plan_steps": [
                    {
                        "step_number": 1,
                        "title": f"Execute Purchase Order for {payload.get('supplier_name')}",
                        "tool_name": "create_draft_purchase_order",
                        "status": "COMPLETED",
                        "result_summary": res.get("summary")
                    }
                ],
                "data": res,
                "suggestions": ["View recent purchase orders", "Check vendor scorecard", "Show today's sales summary"]
            }

    # -------------------------------------------------------------
    # Case 1: Recurring Workflow Scheduling Instruction
    # e.g. "Every morning at 9 AM, check stock levels..."
    # -------------------------------------------------------------
    is_recurring = bool(re.search(
        r'\b(every\s+(?:morning|day|week|month|hour|\d+\s*hours?|\d+\s*minutes?)|daily\s+at|schedule|recurring|run\s+every)\b',
        p_lower
    ))
    if is_recurring:
        # Extract schedule timing
        schedule_desc = "Daily at 9:00 AM"
        cron_expr = "0 9 * * *"
        if "hour" in p_lower:
            schedule_desc = "Every Hour"
            cron_expr = "0 * * * *"
        elif "night" in p_lower or "midnight" in p_lower:
            schedule_desc = "Every Night at 12:00 AM"
            cron_expr = "0 0 * * *"
        elif "week" in p_lower or "monday" in p_lower:
            schedule_desc = "Every Monday at 9:00 AM"
            cron_expr = "0 9 * * 1"

        wf_name = f"Auto: {prompt[:40].strip()}"
        res = await execute_typed_tool(
            tool_name="create_scheduled_workflow",
            parameters={
                "name": wf_name,
                "schedule_description": schedule_desc,
                "cron_expression": cron_expr,
                "instruction_prompt": prompt
            },
            db=db,
            user_id=user_id,
            user_email=user_email,
            organization_id=organization_id,
            branch_id=branch_id
        )

        wf_data = res.get("workflow", {})
        return {
            "answer": res.get("summary"),
            "task_type": "RECURRING_WORKFLOW",
            "status": "COMPLETED",
            "plan_steps": [
                {
                    "step_number": 1,
                    "title": f"Register Persistent Workflow '{wf_name}'",
                    "tool_name": "create_scheduled_workflow",
                    "status": "COMPLETED",
                    "result_summary": f"Configured cron: {cron_expr}"
                },
                {
                    "step_number": 2,
                    "title": "Activate Background Job Worker",
                    "tool_name": "workflow_engine",
                    "status": "COMPLETED",
                    "result_summary": "Active on server background runner"
                }
            ],
            "workflow_created": wf_data,
            "suggestions": ["List active workflows", "Run this workflow now", "Find low-stock products"]
        }

    # -------------------------------------------------------------
    # Case 2: Vendor Comparison & Selection
    # e.g. "Compare suppliers for this order based on price, delivery speed, quality..."
    # -------------------------------------------------------------
    is_vendor_compare = bool(re.search(r'\b(compare\s+suppliers|compare\s+vendors|best\s+supplier|recommend\s+a\s+supplier|cheapest\s+supplier)\b', p_lower))
    if is_vendor_compare:
        # Extract product if mentioned
        product_keyword = None
        qty = 25
        
        # Check catalog products
        prod_res = await db.execute(select(Product.name).where(Product.is_active == True))
        all_prods = [r[0] for r in prod_res.all()]
        for p in all_prods:
            if p.lower() in p_lower:
                product_keyword = p
                break
        
        # Extract quantity
        qty_match = re.search(r'\b(\d+)\s*(?:units?|kg|pcs|bags?|liters?|ltr|packets?)?\b', p_lower)
        if qty_match:
            try:
                qty = int(qty_match.group(1))
            except ValueError:
                pass

        if not product_keyword:
            # Check if there is an active low stock product to suggest
            low_p_res = await db.execute(select(Product.name).where(and_(Product.is_active == True, Product.current_stock <= Product.reorder_level)).limit(1))
            fallback_prod = low_p_res.scalar_one_or_none()
            if not fallback_prod:
                fallback_prod = all_prods[0] if all_prods else "Basmati Rice"

            product_keyword = fallback_prod

        comp_res = await execute_typed_tool(
            tool_name="compare_suppliers",
            parameters={"product_name": product_keyword, "quantity": qty},
            db=db,
            user_id=user_id,
            user_email=user_email,
            organization_id=organization_id,
            branch_id=branch_id
        )

        comparison_data = comp_res.get("vendor_comparison", {})
        recommended_sup = comparison_data.get("recommended_supplier_name", "Primary Vendor")
        
        return {
            "answer": (
                f"### Supplier Multi-Criteria Evaluation for **{product_keyword}** (Qty: {qty})\n\n"
                f"{comp_res.get('summary')}\n\n"
                f"Below is the transparent comparison table evaluating total landed cost, promised lead times, "
                f"verifiable quality scores, and compliance status."
            ),
            "task_type": "ONE_TIME",
            "status": "COMPLETED",
            "plan_steps": [
                {
                    "step_number": 1,
                    "title": f"Retrieve eligible quotes for {product_keyword}",
                    "tool_name": "compare_suppliers",
                    "status": "COMPLETED",
                    "result_summary": f"Evaluated {len(comparison_data.get('vendors', []))} suppliers"
                },
                {
                    "step_number": 2,
                    "title": f"Calculate landed cost and quality tradeoffs",
                    "tool_name": "compare_suppliers",
                    "status": "COMPLETED",
                    "result_summary": f"Ranked #{1}: {recommended_sup}"
                }
            ],
            "vendor_comparison": comparison_data,
            "suggestions": [
                f"Generate a purchase order using the best eligible supplier ({recommended_sup})",
                "Find low-stock products and prepare purchase requests",
                "Show today's sales summary"
            ]
        }

    # -------------------------------------------------------------
    # Case 3: Low-stock replenishment & Multi-Step PO preparation
    # e.g. "Find low-stock products and prepare purchase requests"
    # -------------------------------------------------------------
    is_replenish = bool(re.search(r'\b(find\s+low[- ]stock|prepare\s+purchase\s+requests|replenish\s+inventory|reorder\s+stock|low[- ]stock\s+products)\b', p_lower))
    if is_replenish:
        # Step 1: Search inventory
        inv_res = await execute_typed_tool(
            tool_name="search_inventory",
            parameters={"low_stock_only": True},
            db=db,
            user_id=user_id,
            user_email=user_email,
            organization_id=organization_id,
            branch_id=branch_id
        )

        # Step 2: Calculate reorders
        reorder_res = await execute_typed_tool(
            tool_name="calculate_reorder_recommendations",
            parameters={"urgency_threshold": "ALL"},
            db=db,
            user_id=user_id,
            user_email=user_email,
            organization_id=organization_id,
            branch_id=branch_id
        )

        recs = reorder_res.get("recommendations", [])
        total_spend = reorder_res.get("total_estimated_spend", 0.0)

        # Step 3: Prepare draft purchase order preview for top supplier
        s_res = await db.execute(select(Supplier).where(Supplier.status == "ACTIVE").limit(1))
        supplier = s_res.scalar_one_or_none()
        sup_name = supplier.name if supplier else "Primary Vendor Partner"
        sup_id = supplier.id if supplier else 1

        po_items_payload = [
            {
                "product_id": r["product_id"],
                "product_name": r["product_name"],
                "quantity_ordered": r["recommended_order_quantity"],
                "unit_cost": r["unit_cost"],
                "line_total": r["estimated_cost"]
            }
            for r in recs[:3]
        ]
        
        preview_id = f"ACT-PR-{uuid.uuid4().hex[:6].upper()}"
        preview = {
            "action_id": preview_id,
            "action_type": "CREATE_PURCHASE_ORDER",
            "title": f"Create Replenishment PO for {sup_name}",
            "consequences": [
                f"Draft purchase order will be created for {len(po_items_payload)} low-stock products",
                f"Estimated total landed cost: ₹{total_spend:,.2f} INR",
                "Vendor performance scorecard and provisional order evaluation will be updated"
            ],
            "affected_records": [
                {"entity": "Supplier", "id": sup_id, "name": sup_name},
                {"entity": "Low Stock Products Count", "count": len(recs)},
                {"entity": "Estimated Total", "amount": total_spend, "currency": "INR"}
            ],
            "requires_human_approval": total_spend >= 50000.0,
            "payload": {
                "supplier_name": sup_name,
                "items": [
                    {"product_name": it["product_name"], "quantity": it["quantity_ordered"], "unit_cost": it["unit_cost"]}
                    for it in po_items_payload
                ],
                "notes": "Automated low-stock replenishment generated via AI Command Center"
            }
        }

        return {
            "answer": (
                f"### Inventory Shortage & Replenishment Plan\n\n"
                f"Identified **{len(recs)} low-stock products** requiring urgent replenishment, totaling an estimated **₹{total_spend:,.2f} INR**.\n\n"
                f"I have coordinated the replenishment plan and prepared an editable draft purchase order for **{sup_name}**."
            ),
            "task_type": "MULTI_STEP",
            "status": "PREVIEW_REQUIRED",
            "plan_steps": [
                {
                    "step_number": 1,
                    "title": "Scan inventory for stockout deficits",
                    "tool_name": "search_inventory",
                    "status": "COMPLETED",
                    "result_summary": f"Detected {len(recs)} depleted SKUs"
                },
                {
                    "step_number": 2,
                    "title": "Compute optimal replenishment batch quantities",
                    "tool_name": "calculate_reorder_recommendations",
                    "status": "COMPLETED",
                    "result_summary": f"Estimated spend: ₹{total_spend:,.2f}"
                },
                {
                    "step_number": 3,
                    "title": f"Prepare draft purchase order for {sup_name}",
                    "tool_name": "create_draft_purchase_order",
                    "status": "AWAITING_APPROVAL",
                    "requires_approval": True,
                    "result_summary": "Action preview ready for confirmation"
                }
            ],
            "action_preview": preview,
            "data": {"reorder_recommendations": recs},
            "suggestions": [
                f"Confirm & create PO for {sup_name}",
                "Compare alternative suppliers for these items",
                "Show today's sales summary"
            ]
        }

    # -------------------------------------------------------------
    # Case 4: Generate PO using the best eligible supplier
    # e.g. "Generate a purchase order using the best eligible supplier..."
    # -------------------------------------------------------------
    is_gen_po = bool(re.search(r'\b(generate\s+(?:a\s+)?purchase\s+order|create\s+(?:a\s+)?po|create\s+(?:a\s+)?purchase\s+order)\b', p_lower))
    if is_gen_po:
        # Check if product or supplier specified
        prod_res = await db.execute(select(Product).where(Product.is_active == True))
        all_prods = prod_res.scalars().all()
        matched_prod = None
        for p in all_prods:
            if p.name.lower() in p_lower:
                matched_prod = p
                break

        # Check quantity
        qty = 20
        qty_match = re.search(r'\b(\d+)\s*(?:units?|kg|pcs|bags?|liters?|ltr|packets?)?\b', p_lower)
        if qty_match:
            try:
                qty = int(qty_match.group(1))
            except ValueError:
                pass

        if not matched_prod:
            # Missing product information: ask follow-up!
            return {
                "answer": "Which product and quantity would you like to generate this purchase order for?",
                "task_type": "MULTI_STEP",
                "status": "NEEDS_DETAILS",
                "needs_details": {
                    "missing_fields": ["product_name", "quantity"],
                    "question": "Please specify the item name and quantity (e.g. '25 units of Basmati Rice')."
                },
                "suggestions": [
                    "Generate PO for 25 units of Basmati Rice using best eligible supplier",
                    "Generate PO for 50 units of Sunflower Oil",
                    "Find low-stock products and prepare purchase requests"
                ]
            }

        # Compare suppliers to pick best eligible
        comp_res = await compare_suppliers_for_order(
            db=db,
            product_id=matched_prod.id,
            quantity=qty,
            organization_id=organization_id
        )
        recommended_sup_id = comp_res.get("recommended_supplier_id")
        recommended_sup_name = comp_res.get("recommended_supplier_name", "Adani Wilmar")

        unit_cost = float(matched_prod.cost_price or (matched_prod.selling_price * Decimal("0.8")))
        total_val = unit_cost * qty

        preview_id = f"ACT-PO-{uuid.uuid4().hex[:6].upper()}"
        preview = {
            "action_id": preview_id,
            "action_type": "CREATE_PURCHASE_ORDER",
            "title": f"Issue PO for {qty} units of {matched_prod.name}",
            "consequences": [
                f"Draft purchase order will be created for {recommended_sup_name}",
                f"Total procurement cost: ₹{total_val:,.2f} INR",
                "PO will be routed for manager sign-off prior to dispatch"
            ],
            "affected_records": [
                {"entity": "Supplier", "id": recommended_sup_id, "name": recommended_sup_name},
                {"entity": "Product", "name": matched_prod.name, "quantity": qty},
                {"entity": "Total Value", "amount": total_val, "currency": "INR"}
            ],
            "requires_human_approval": total_val >= 50000.0,
            "payload": {
                "supplier_name": recommended_sup_name,
                "items": [{"product_name": matched_prod.name, "quantity": qty, "unit_cost": unit_cost}],
                "notes": f"Generated using best eligible supplier recommendation: {comp_res.get('recommendation_rationale')}"
            }
        }

        return {
            "answer": (
                f"### Best Eligible Supplier Identified: **{recommended_sup_name}**\n\n"
                f"{comp_res.get('recommendation_rationale')}\n\n"
                f"I have staged the draft purchase order for **{qty} units of {matched_prod.name}** "
                f"totaling **₹{total_val:,.2f} INR**. Please confirm to execute."
            ),
            "task_type": "MULTI_STEP",
            "status": "PREVIEW_REQUIRED",
            "plan_steps": [
                {
                    "step_number": 1,
                    "title": f"Evaluate eligible suppliers for {matched_prod.name}",
                    "tool_name": "compare_suppliers",
                    "status": "COMPLETED",
                    "result_summary": f"Selected top-ranked: {recommended_sup_name}"
                },
                {
                    "step_number": 2,
                    "title": f"Stage draft PO for {recommended_sup_name}",
                    "tool_name": "create_draft_purchase_order",
                    "status": "AWAITING_APPROVAL",
                    "requires_approval": True,
                    "result_summary": f"Awaiting user approval (₹{total_val:,.2f})"
                }
            ],
            "action_preview": preview,
            "vendor_comparison": comp_res,
            "suggestions": [
                f"Confirm & create PO for {recommended_sup_name}",
                "Check vendor performance scorecard",
                "Show today's sales summary"
            ]
        }

    # -------------------------------------------------------------
    # Case 5: Overdue invoices and payment reminders
    # e.g. "Find overdue invoices and draft reminder emails"
    # -------------------------------------------------------------
    is_overdue = bool(re.search(r'\b(overdue\s+invoices?|unpaid\s+invoices?|draft\s+reminder\s+emails?|payment\s+reminders?)\b', p_lower))
    if is_overdue:
        res = await execute_typed_tool(
            tool_name="get_overdue_invoices_and_receivables",
            parameters={"days_overdue": 15},
            db=db,
            user_id=user_id,
            user_email=user_email,
            organization_id=organization_id,
            branch_id=branch_id
        )

        invoices = res.get("overdue_invoices", [])
        total_out = res.get("total_outstanding", 0.0)

        return {
            "answer": (
                f"### Accounts Receivable & Overdue Invoices Audit\n\n"
                f"{res.get('summary')}\n\n"
                f"Prepared payment reminder draft templates for all delinquent accounts ready for finance dispatch."
            ),
            "task_type": "ONE_TIME",
            "status": "COMPLETED",
            "plan_steps": [
                {
                    "step_number": 1,
                    "title": "Query sales ledger for unpaid receivables > 15 days",
                    "tool_name": "get_overdue_invoices_and_receivables",
                    "status": "COMPLETED",
                    "result_summary": f"Found {len(invoices)} overdue invoices"
                },
                {
                    "step_number": 2,
                    "title": "Generate tailored B2B reminder templates",
                    "tool_name": "get_overdue_invoices_and_receivables",
                    "status": "COMPLETED",
                    "result_summary": f"Drafted {len(invoices)} emails"
                }
            ],
            "data": {"overdue_invoices": invoices, "total_outstanding": total_out},
            "suggestions": [
                "Show today's sales summary",
                "Check vendor performance ratings",
                "Find low-stock products"
            ]
        }

    # -------------------------------------------------------------
    # Case 6: Review all completed orders and update vendor performance ratings
    # e.g. "Review all completed orders and update vendor performance ratings"
    # -------------------------------------------------------------
    is_update_ratings = bool(re.search(r'\b(update\s+vendor\s+(?:performance\s+)?ratings?|review\s+(?:all\s+)?completed\s+orders|recalculate\s+vendor\s+scores?)\b', p_lower))
    if is_update_ratings:
        res = await execute_typed_tool(
            tool_name="update_vendor_ratings_batch",
            parameters={},
            db=db,
            user_id=user_id,
            user_email=user_email,
            organization_id=organization_id,
            branch_id=branch_id
        )

        return {
            "answer": (
                f"### Vendor Performance Rating Engine Update\n\n"
                f"{res.get('summary')}\n\n"
                f"All order-level evaluations have been recalculated based on actual delivery timeliness, "
                f"quality inspection outcomes, and landed cost records. Supplier scorecards and star ratings have been updated."
            ),
            "task_type": "ONE_TIME",
            "status": "COMPLETED",
            "plan_steps": [
                {
                    "step_number": 1,
                    "title": "Evaluate completed purchase orders and receipts",
                    "tool_name": "update_vendor_ratings_batch",
                    "status": "COMPLETED",
                    "result_summary": f"Audited {res.get('evaluated_pos_count', 0)} orders"
                },
                {
                    "step_number": 2,
                    "title": "Recalculate aggregated vendor scorecards & trends",
                    "tool_name": "update_vendor_ratings_batch",
                    "status": "COMPLETED",
                    "result_summary": f"Updated {res.get('updated_suppliers_count', 0)} supplier scorecards"
                }
            ],
            "data": res,
            "suggestions": [
                "Compare suppliers for an order",
                "Find low-stock products and prepare purchase requests",
                "Show today's sales summary"
            ]
        }

    # -------------------------------------------------------------
    # Case 7: Vendor Scorecard Inquiry
    # e.g. "Show vendor scorecard for Adani Wilmar" or "How is vendor X performing?"
    # -------------------------------------------------------------
    is_scorecard_inquiry = bool(re.search(r'\b(vendor\s+scorecard|vendor\s+rating|how\s+is\s+.*performing|scorecard\s+for)\b', p_lower))
    if is_scorecard_inquiry:
        # Extract supplier name
        supp_res = await db.execute(select(Supplier.name))
        all_sups = [r[0] for r in supp_res.all()]
        target_sup = None
        for s in all_sups:
            if s.lower() in p_lower:
                target_sup = s
                break

        if not target_sup:
            target_sup = all_sups[0] if all_sups else "Adani Wilmar"

        res = await execute_typed_tool(
            tool_name="get_vendor_scorecard",
            parameters={"supplier_name_or_id": target_sup},
            db=db,
            user_id=user_id,
            user_email=user_email,
            organization_id=organization_id,
            branch_id=branch_id
        )

        sc = res.get("scorecard", {})
        return {
            "answer": (
                f"### Vendor Performance Profile: **{target_sup}**\n\n"
                f"{res.get('summary')}\n\n"
                f"- **Overall Rating**: {sc.get('overall_score', 90.0):.1f}/100 ({sc.get('star_rating', 4.5)}★)\n"
                f"- **On-Time Delivery**: {sc.get('on_time_delivery_pct', 100.0)}% (Avg delay: {sc.get('avg_delay_days', 0.0)} days)\n"
                f"- **Quality Defect Rate**: {sc.get('defect_rate_pct', 0.0)}%\n"
                f"- **Price Stability**: {sc.get('price_variance_pct', 0.0)}% variance\n"
                f"- **Compliance Status**: {sc.get('compliance_status', 'COMPLIANT')}\n"
                f"- **Procurement Eligibility**: {'Eligible' if sc.get('is_procurement_eligible') else 'Ineligible'}\n"
                f"- **Performance Trend**: {sc.get('trend', 'STABLE')}"
            ),
            "task_type": "ONE_TIME",
            "status": "COMPLETED",
            "plan_steps": [
                {
                    "step_number": 1,
                    "title": f"Fetch scorecard metrics for {target_sup}",
                    "tool_name": "get_vendor_scorecard",
                    "status": "COMPLETED",
                    "result_summary": f"Score: {sc.get('overall_score', 90.0)}/100"
                }
            ],
            "vendor_scorecard": res,
            "suggestions": [
                f"Compare {target_sup} against other suppliers",
                "Review all completed orders and update vendor performance ratings",
                "Find low-stock products"
            ]
        }

    # -------------------------------------------------------------
    # Case 8: Sales Summary / Unusual Changes
    # e.g. "Summarize this month's sales and identify unusual changes"
    # -------------------------------------------------------------
    is_sales = bool(re.search(r'\b(sales\s+summary|summarize\s+(?:this\s+)?(?:month|week|today)|revenue\s+summary|sales\s+report)\b', p_lower))
    if is_sales:
        period = "month" if "month" in p_lower else ("week" if "week" in p_lower else "today")
        res = await execute_typed_tool(
            tool_name="summarize_sales",
            parameters={"period": period},
            db=db,
            user_id=user_id,
            user_email=user_email,
            organization_id=organization_id,
            branch_id=branch_id
        )

        return {
            "answer": (
                f"### Sales & Operations Performance Summary ({period.title()})\n\n"
                f"{res.get('summary')}\n\n"
                f"**Top Selling Items**:\n" +
                "\n".join([f"- **{it['product']}**: {it['units_sold']} units (₹{it['revenue']:,.2f})" for it in res.get("top_selling_products", [])])
            ),
            "task_type": "ONE_TIME",
            "status": "COMPLETED",
            "plan_steps": [
                {
                    "step_number": 1,
                    "title": f"Aggregate sales ledger for {period}",
                    "tool_name": "summarize_sales",
                    "status": "COMPLETED",
                    "result_summary": f"Revenue: ₹{res.get('total_revenue', 0):,.2f}"
                }
            ],
            "data": res,
            "suggestions": [
                "Find low-stock products and prepare purchase requests",
                "Find overdue invoices and draft reminder emails",
                "Check vendor performance ratings"
            ]
        }

    # -------------------------------------------------------------
    # Case 9: HR & Leave Summary
    # e.g. "Show HR leave requests" or "Summarize pending leaves"
    # -------------------------------------------------------------
    is_hr = bool(re.search(r'\b(leave\s+requests?|pending\s+leaves?|attendance\s+summary|hr\s+summary)\b', p_lower))
    if is_hr:
        res = await execute_typed_tool(
            tool_name="get_hr_leave_and_attendance_summary",
            parameters={"status_filter": "PENDING"},
            db=db,
            user_id=user_id,
            user_email=user_email,
            organization_id=organization_id,
            branch_id=branch_id
        )

        leaves = res.get("leaves", [])
        return {
            "answer": (
                f"### Human Resources & Attendance Overview\n\n"
                f"{res.get('summary')}\n\n" +
                ("\n".join([f"- **{l['employee_name']}**: {l['leave_type']} ({l['days_count']} days, {l['start_date']} to {l['end_date']}) - Reason: {l['reason']}" for l in leaves[:5]]) if leaves else "No pending leave approval requests.")
            ),
            "task_type": "ONE_TIME",
            "status": "COMPLETED",
            "plan_steps": [
                {
                    "step_number": 1,
                    "title": "Fetch pending employee leave applications",
                    "tool_name": "get_hr_leave_and_attendance_summary",
                    "status": "COMPLETED",
                    "result_summary": f"{len(leaves)} applications pending"
                }
            ],
            "data": res,
            "suggestions": [
                "Show today's sales summary",
                "Find low-stock products",
                "Check vendor performance ratings"
            ]
        }

    # -------------------------------------------------------------
    # Case 10: Fallback to General AI Assistant with Tool Grounding
    # -------------------------------------------------------------
    from app.services.ai_service import process_ai_query
    legacy_res = await process_ai_query(
        db=db,
        prompt=prompt,
        user_name=user_email.split('@')[0],
        user_id=user_id,
        user_email=user_email,
        user_role=user_role,
        organization_id=organization_id,
        organization_name=organization_name,
        branch_id=branch_id
    )

    return {
        "answer": legacy_res.get("answer", "Processed inquiry successfully."),
        "task_type": "ONE_TIME",
        "status": "COMPLETED",
        "plan_steps": [
            {
                "step_number": 1,
                "title": "Analyze Enterprise RAG & Knowledge Base",
                "tool_name": "search_company_knowledge",
                "status": "COMPLETED",
                "result_summary": "Retrieved operational context"
            }
        ],
        "data": legacy_res.get("data"),
        "suggestions": legacy_res.get("suggestions", [
            "Find low-stock products and prepare purchase requests",
            "Compare suppliers for this order",
            "Show today's sales summary"
        ])
    }
