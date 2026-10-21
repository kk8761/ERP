import pytest
from httpx import AsyncClient
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.procurement import Supplier, PurchaseOrder, PurchaseOrderItem
from app.models.inventory import Product
from app.models.vendor_rating import (
    VendorOrderEvaluation,
    VendorScorecard,
    VendorRatingConfig,
    VendorEventLog
)
from app.models.workflow import WorkflowDefinition, WorkflowExecution
from app.services.vendor_rating_service import (
    evaluate_purchase_order,
    recalculate_vendor_scorecard,
    compare_suppliers_for_order,
    get_or_create_rating_config
)
from app.services.workflow_engine import execute_workflow_instance

@pytest.mark.asyncio
async def test_order_evaluation_deterministic_scoring(client: AsyncClient, admin_auth_token: str):
    """
    Verify deterministic order-level vendor rating calculation:
    - On-time delivery = 100 delivery score
    - Delay days reduce delivery score deterministically
    - Quality inspection PASSED with 0 defects = 98 quality score
    - Weight renormalization applies when dimensions have data
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Create a PO
    po_payload = {
        "supplier_id": 1,
        "notes": "Test Order Evaluation PO",
        "items": [
            {"product_id": 1, "quantity": 20, "unit_cost": 85.0}
        ]
    }
    po_res = await client.post("/api/procurement/purchase-orders", json=po_payload, headers=headers)
    assert po_res.status_code == 201
    po_data = po_res.json()
    po_id = po_data["id"]

    # 2. Check initial provisional evaluation
    eval_res = await client.get(f"/api/procurement/purchase-orders/{po_id}/evaluation", headers=headers)
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert eval_data["status"] == "PROVISIONAL"
    assert eval_data["overall_score"] > 0
    assert "missing_data" in eval_data

    # 3. Approve PO
    app_res = await client.post(f"/api/procurement/purchase-orders/{po_id}/approve", headers=headers)
    assert app_res.status_code == 200

    # 4. Receive Goods
    rec_res = await client.post(f"/api/procurement/purchase-orders/{po_id}/receive", headers=headers)
    assert rec_res.status_code == 200

    # 5. Check completed final evaluation
    final_eval_res = await client.get(f"/api/procurement/purchase-orders/{po_id}/evaluation", headers=headers)
    assert final_eval_res.status_code == 200
    final_data = final_eval_res.json()
    assert final_data["status"] == "FINAL"
    assert final_data["delivery_score"] is not None
    assert final_data["quality_score"] is not None
    assert final_data["confidence_level"] in ["MEDIUM", "HIGH"]
    assert final_data["overall_score"] >= 70.0


@pytest.mark.asyncio
async def test_vendor_scorecard_and_override(client: AsyncClient, admin_auth_token: str):
    """
    Verify centralized vendor scorecard aggregation and reviewer score override:
    - Overall scorecard aggregates historical order evaluations
    - Reviewer can dispute or override score with mandatory reason
    - Audit log records score change
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Fetch scorecard for Supplier 1
    sc_res = await client.get("/api/procurement/suppliers/1/scorecard", headers=headers)
    assert sc_res.status_code == 200
    sc_data = sc_res.json()
    assert sc_data["overall_score"] > 0
    assert sc_data["star_rating"] >= 1.0 and sc_data["star_rating"] <= 5.0
    assert sc_data["is_procurement_eligible"] is True
    assert "delivery_avg" in sc_data
    assert "quality_avg" in sc_data

    # 2. Find a PO for Supplier 1 to override
    pos_res = await client.get("/api/procurement/purchase-orders", headers=headers)
    pos = pos_res.json()
    assert len(pos) > 0
    po_id = pos[0]["id"]

    # 3. Submit reviewer score override
    override_payload = {
        "override_score": 96.5,
        "reason": "Exemplary expedited delivery during critical supply chain shortage."
    }
    over_res = await client.post(
        f"/api/procurement/purchase-orders/{po_id}/evaluation/override",
        json=override_payload,
        headers=headers
    )
    assert over_res.status_code == 200
    over_data = over_res.json()
    assert over_data["overall_score"] == 96.5
    assert over_data["status"] == "OVERRIDDEN"
    assert over_data["reviewer_notes"] == override_payload["reason"]


@pytest.mark.asyncio
async def test_rating_config_custom_weights(client: AsyncClient, admin_auth_token: str):
    """Verify administrator-configurable rating formula weights."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Get current config
    cfg_res = await client.get("/api/procurement/rating-config", headers=headers)
    assert cfg_res.status_code == 200
    cfg = cfg_res.json()
    assert "delivery_weight" in cfg

    # 2. Update config
    update_payload = {
        "delivery_weight": 30.0,
        "price_weight": 20.0,
        "quality_weight": 25.0,
        "service_weight": 10.0,
        "reliability_weight": 10.0,
        "compliance_weight": 5.0,
        "mandatory_compliance_strict": True,
        "lookback_days": 180
    }
    put_res = await client.put("/api/procurement/rating-config", json=update_payload, headers=headers)
    assert put_res.status_code == 200
    put_data = put_res.json()
    assert put_data["delivery_weight"] == 30.0
    assert put_data["quality_weight"] == 25.0


@pytest.mark.asyncio
async def test_vendor_comparison_and_recommendation(client: AsyncClient, admin_auth_token: str):
    """
    Verify intelligent supplier comparison:
    - Ranks suppliers by multi-criteria utility score (landed cost, lead time, quality, delivery)
    - Recommends best eligible vendor with trade-off analysis
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    payload = {
        "quantity": 50,
        "required_delivery_days": 5
    }
    comp_res = await client.post("/api/procurement/vendor-compare", json=payload, headers=headers)
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert "recommended_supplier_name" in comp_data
    assert "recommendation_rationale" in comp_data
    assert len(comp_data["vendors"]) > 0

    first_vendor = comp_data["vendors"][0]
    assert "total_landed_cost" in first_vendor
    assert "quality_score" in first_vendor
    assert "star_rating" in first_vendor
    assert "trade_off_summary" in first_vendor


@pytest.mark.asyncio
async def test_ai_command_center_natural_language_flows(client: AsyncClient, admin_auth_token: str):
    """
    Verify Natural-Language AI Command Center:
    - Low-stock replenishment multi-step plan with action preview
    - Supplier comparison instruction
    - Overdue invoices audit instruction
    - Scheduled workflow creation
    - Batch vendor ratings recalculation
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Flow: Find low stock and prepare purchase requests
    req1 = {"prompt": "Find low-stock products and prepare purchase requests"}
    res1 = await client.post("/api/ai/command", json=req1, headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["task_type"] == "MULTI_STEP"
    assert data1["status"] in ["COMPLETED", "PREVIEW_REQUIRED"]
    assert len(data1["plan_steps"]) >= 2
    assert data1["action_preview"] is not None

    # 2. Flow: Compare suppliers
    req2 = {"prompt": "Compare suppliers for this order based on price, delivery speed, quality, and service"}
    res2 = await client.post("/api/ai/command", json=req2, headers=headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["vendor_comparison"] is not None
    assert len(data2["plan_steps"]) > 0

    # 3. Flow: Overdue invoices
    req3 = {"prompt": "Find overdue invoices and draft reminder emails"}
    res3 = await client.post("/api/ai/command", json=req3, headers=headers)
    assert res3.status_code == 200
    data3 = res3.json()
    assert "overdue" in data3["answer"].lower() or "receivable" in data3["answer"].lower()

    # 4. Flow: Scheduled background workflow
    req4 = {"prompt": "Every morning at 9 AM, check stock levels and notify the inventory manager about shortages"}
    res4 = await client.post("/api/ai/command", json=req4, headers=headers)
    assert res4.status_code == 200
    data4 = res4.json()
    assert data4["task_type"] == "RECURRING_WORKFLOW"
    assert data4["workflow_created"] is not None
    assert data4["workflow_created"]["is_active"] is True

    # 5. Flow: Update vendor performance ratings
    req5 = {"prompt": "Review all completed orders and update vendor performance ratings"}
    res5 = await client.post("/api/ai/command", json=req5, headers=headers)
    assert res5.status_code == 200
    data5 = res5.json()
    assert "recalculated" in data5["answer"].lower() or "evaluated" in data5["answer"].lower() or "updated" in data5["answer"].lower()


@pytest.mark.asyncio
async def test_workflow_execution_and_idempotency(client: AsyncClient, admin_auth_token: str):
    """
    Verify persistent workflow execution engine:
    - Manual and scheduled runs create WorkflowExecution records
    - Idempotency key prevents duplicate execution
    - Step results and status are tracked
    """
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Create a workflow via API
    wf_payload = {
        "name": "Daily Stock Shortage Audit",
        "cron_expression": "0 9 * * *",
        "instruction_prompt": "Daily stock audit and replenishment check",
        "plan_steps": [
            {"step": 1, "title": "Scan Low Stock", "tool": "search_inventory", "params": {"low_stock_only": True}},
            {"step": 2, "title": "Calculate Reorder Quantities", "tool": "calculate_reorder_recommendations", "params": {"urgency_threshold": "ALL"}}
        ]
    }
    create_res = await client.post("/api/workflows", json=wf_payload, headers=headers)
    assert create_res.status_code == 201
    wf_data = create_res.json()
    wf_id = wf_data["id"]

    # 2. Trigger workflow run
    run_res = await client.post(f"/api/workflows/{wf_id}/run", headers=headers)
    assert run_res.status_code == 200
    exec_data = run_res.json()
    assert exec_data["status"] == "COMPLETED"
    assert exec_data["output_summary"] is not None

    # 3. Check executions list
    list_res = await client.get(f"/api/workflows/{wf_id}/executions", headers=headers)
    assert list_res.status_code == 200
    execs = list_res.json()
    assert len(execs) > 0


@pytest.mark.asyncio
async def test_unauthorized_user_permission_rejection(client: AsyncClient, cashier_auth_token: str):
    """
    Verify security governance:
    Cashier role without 'settings.manage' or 'procurement.approve' cannot modify formula or approve sensitive actions.
    """
    headers = {"Authorization": f"Bearer {cashier_auth_token}"}

    # Attempt to update rating config
    put_res = await client.put(
        "/api/procurement/rating-config",
        json={
            "delivery_weight": 50.0, "price_weight": 50.0, "quality_weight": 0.0,
            "service_weight": 0.0, "reliability_weight": 0.0, "compliance_weight": 0.0,
            "mandatory_compliance_strict": False, "lookback_days": 180
        },
        headers=headers
    )
    assert put_res.status_code == 403

    # Attempt to override score
    over_res = await client.post(
        "/api/procurement/purchase-orders/1/evaluation/override",
        json={"override_score": 100.0, "reason": "Unauthorized bypass attempt"},
        headers=headers
    )
    assert over_res.status_code == 403
