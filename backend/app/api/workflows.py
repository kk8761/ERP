import json
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.models.auth import User
from app.models.workflow import WorkflowDefinition, WorkflowExecution, ApprovalRequest
from app.schemas.workflow import (
    WorkflowDefinitionCreate,
    WorkflowDefinitionOut,
    WorkflowExecutionOut,
    ApprovalRequestOut,
    ApprovalDecisionRequest
)
from app.services.workflow_engine import (
    execute_workflow_instance,
    compute_next_run_time
)
from app.services.ai_tools import execute_typed_tool
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/api/workflows", tags=["Workflows & Automation Engine"])

@router.get("", response_model=List[WorkflowDefinitionOut])
async def list_workflows(
    current_user: User = Depends(require_permission("workflows.view")),
    db: AsyncSession = Depends(get_db)
):
    """Lists all persistent background automated workflows."""
    stmt = select(WorkflowDefinition).order_by(desc(WorkflowDefinition.created_at))
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("", response_model=WorkflowDefinitionOut, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    body: WorkflowDefinitionCreate,
    current_user: User = Depends(require_permission("workflows.manage")),
    db: AsyncSession = Depends(get_db)
):
    """Creates a new automated workflow definition."""
    plan_steps_json = json.dumps(body.plan_steps or [
        {"step": 1, "title": "Check Low Stock Products", "tool": "search_inventory", "params": {"low_stock_only": True}},
        {"step": 2, "title": "Generate Replenishment Reorder Recommendations", "tool": "calculate_reorder_recommendations", "params": {"urgency_threshold": "ALL"}}
    ])

    next_run = compute_next_run_time(body.cron_expression, body.interval_minutes)
    workflow = WorkflowDefinition(
        name=body.name,
        description=body.description,
        trigger_type=body.trigger_type,
        cron_expression=body.cron_expression,
        interval_minutes=body.interval_minutes,
        instruction_prompt=body.instruction_prompt,
        plan_steps=plan_steps_json,
        status="ACTIVE",
        is_active=True,
        created_by_user_id=current_user.id,
        organization_id=1,
        branch_id=current_user.branch_id,
        next_run_at=next_run
    )
    db.add(workflow)
    await record_audit_log(
        db, action="WORKFLOW_CREATED", entity_name="WorkflowDefinition",
        user_id=current_user.id, user_email=current_user.email,
        details={"name": workflow.name, "cron": workflow.cron_expression}
    )
    await db.commit()
    await db.refresh(workflow)
    return workflow

@router.post("/{workflow_id}/run", response_model=WorkflowExecutionOut)
async def run_workflow_now(
    workflow_id: int,
    current_user: User = Depends(require_permission("workflows.manage")),
    db: AsyncSession = Depends(get_db)
):
    """Triggers an immediate execution of a workflow."""
    stmt = select(WorkflowDefinition).where(WorkflowDefinition.id == workflow_id)
    res = await db.execute(stmt)
    workflow = res.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    execution = await execute_workflow_instance(workflow_id, trigger_source="MANUAL")
    return execution

@router.get("/{workflow_id}/executions", response_model=List[WorkflowExecutionOut])
async def list_workflow_executions(
    workflow_id: int,
    current_user: User = Depends(require_permission("workflows.view")),
    db: AsyncSession = Depends(get_db)
):
    """Returns execution history and step outcomes for a workflow."""
    stmt = (
        select(WorkflowExecution)
        .where(WorkflowExecution.workflow_id == workflow_id)
        .order_by(desc(WorkflowExecution.created_at))
        .limit(20)
    )
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/approvals/pending", response_model=List[ApprovalRequestOut])
async def list_pending_approvals(
    current_user: User = Depends(require_permission("procurement.approve")),
    db: AsyncSession = Depends(get_db)
):
    """Lists all pending segregation-of-duties and sensitive action approval requests."""
    stmt = select(ApprovalRequest).where(ApprovalRequest.status == "PENDING").order_by(desc(ApprovalRequest.created_at))
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/approvals/{approval_id}/decision", response_model=ApprovalRequestOut)
async def decide_approval_request(
    approval_id: int,
    body: ApprovalDecisionRequest,
    current_user: User = Depends(require_permission("procurement.approve")),
    db: AsyncSession = Depends(get_db)
):
    """
    Approves or rejects a sensitive action request.
    If approved, securely executes the staged action.
    """
    stmt = select(ApprovalRequest).where(ApprovalRequest.id == approval_id)
    res = await db.execute(stmt)
    approval = res.scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")

    if approval.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Approval request already has status {approval.status}")

    approval.status = "APPROVED" if body.decision == "APPROVE" else "REJECTED"
    approval.reviewed_by_user_id = current_user.id
    approval.reviewed_at = datetime.now(timezone.utc)
    approval.review_notes = body.notes

    if approval.status == "APPROVED":
        try:
            payload = json.loads(approval.payload)
            if approval.action_type == "CREATE_PURCHASE_ORDER":
                await execute_typed_tool(
                    tool_name="create_draft_purchase_order",
                    parameters={
                        "supplier_name": payload.get("supplier_name"),
                        "items": payload.get("items", []),
                        "notes": payload.get("notes"),
                        "execute_now": True
                    },
                    db=db,
                    user_id=current_user.id,
                    user_email=current_user.email
                )
        except Exception as exc:
            approval.status = "FAILED"
            approval.review_notes = f"Execution failed after approval: {exc}"

    await record_audit_log(
        db, action=f"APPROVAL_{approval.status}", entity_name="ApprovalRequest",
        entity_id=str(approval.id), user_id=current_user.id,
        user_email=current_user.email, status="SUCCESS",
        details={"decision": body.decision, "action_type": approval.action_type, "notes": body.notes}
    )
    await db.commit()
    await db.refresh(approval)
    return approval
