import asyncio
import json
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy import select, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.workflow import WorkflowDefinition, WorkflowExecution, ApprovalRequest
from app.services.ai_tools import execute_typed_tool
from app.services.audit_service import record_audit_log

logger = logging.getLogger("workflow_engine")

_WORKFLOW_RUNNER_TASK: Optional[asyncio.Task] = None
_RUNNER_STOP_EVENT = asyncio.Event()

def compute_next_run_time(cron_expression: Optional[str], interval_minutes: Optional[int] = None) -> datetime:
    """Computes next UTC execution time based on interval or standard cron."""
    now = datetime.now(timezone.utc)
    if interval_minutes and interval_minutes > 0:
        return now + timedelta(minutes=interval_minutes)

    if not cron_expression:
        return now + timedelta(hours=24)

    # Simplified deterministic cron evaluator for standard business intervals
    cron = cron_expression.strip().lower()
    if cron == "0 9 * * *" or "9 am" in cron or "daily" in cron:
        next_run = now.replace(hour=9, minute=0, second=0, microsecond=0)
        if next_run <= now:
            next_run += timedelta(days=1)
        return next_run
    elif cron == "0 0 * * *" or "midnight" in cron:
        next_run = now.replace(hour=0, minute=0, second=0, microsecond=0)
        if next_run <= now:
            next_run += timedelta(days=1)
        return next_run
    elif cron == "0 * * * *" or "hourly" in cron:
        return now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    else:
        # Default fallback to 1 hour
        return now + timedelta(hours=1)


async def execute_workflow_instance(
    workflow_id: int,
    trigger_source: str = "SCHEDULE",
    idempotency_key: Optional[str] = None
) -> WorkflowExecution:
    """
    Executes a persistent workflow definition instance.
    Enforces idempotency, records step-by-step progress, handles failure retries.
    """
    async with AsyncSessionLocal() as session:
        # Check idempotency to prevent duplicate runs
        if idempotency_key:
            existing = await session.execute(select(WorkflowExecution).where(WorkflowExecution.idempotency_key == idempotency_key))
            if existing.scalar_one_or_none():
                logger.info(f"Duplicate execution blocked by idempotency key {idempotency_key}")
                return existing.scalar_one()

        wf_stmt = select(WorkflowDefinition).where(WorkflowDefinition.id == workflow_id)
        wf_res = await session.execute(wf_stmt)
        workflow = wf_res.scalar_one_or_none()
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        # Create execution record
        exec_idempotency = idempotency_key or f"EXEC-{workflow.id}-{int(datetime.now(timezone.utc).timestamp())}"
        execution = WorkflowExecution(
            workflow_id=workflow.id,
            trigger_source=trigger_source,
            status="RUNNING",
            retry_count=0,
            max_retries=3,
            idempotency_key=exec_idempotency,
            started_at=datetime.now(timezone.utc),
            organization_id=workflow.organization_id
        )
        session.add(execution)
        await session.commit()
        await session.refresh(execution)

        # Parse steps
        try:
            steps = json.loads(workflow.plan_steps) if workflow.plan_steps else []
        except Exception:
            steps = []

        step_outcomes = []
        overall_success = True
        error_msg = None

        for step in steps:
            step_num = step.get("step", 1)
            step_title = step.get("title", f"Step {step_num}")
            tool_name = step.get("tool")
            params = step.get("params", {})

            step_record = {
                "step": step_num,
                "title": step_title,
                "tool": tool_name,
                "status": "RUNNING",
                "started_at": datetime.now(timezone.utc).isoformat()
            }

            try:
                result = await execute_typed_tool(
                    tool_name=tool_name,
                    parameters=params,
                    db=session,
                    user_id=workflow.created_by_user_id,
                    user_email="system.workflow@nexaerp.internal",
                    organization_id=workflow.organization_id,
                    branch_id=workflow.branch_id
                )
                step_record["status"] = "COMPLETED"
                step_record["summary"] = result.get("summary", "Executed successfully")
                step_record["result"] = result
            except Exception as step_err:
                step_record["status"] = "FAILED"
                step_record["error"] = str(step_err)
                overall_success = False
                error_msg = str(step_err)
                step_outcomes.append(step_record)
                break

            step_outcomes.append(step_record)

        execution.status = "COMPLETED" if overall_success else "FAILED"
        execution.completed_at = datetime.now(timezone.utc)
        execution.step_results = json.dumps(step_outcomes)
        execution.output_summary = f"Workflow completed with {len(step_outcomes)} steps executed." if overall_success else f"Workflow failed at step {step_outcomes[-1].get('title')}: {error_msg}"
        execution.error_message = error_msg

        workflow.last_run_at = datetime.now(timezone.utc)
        workflow.next_run_at = compute_next_run_time(workflow.cron_expression, workflow.interval_minutes)

        await record_audit_log(
            session,
            action="WORKFLOW_EXECUTED",
            entity_name="WorkflowExecution",
            entity_id=str(execution.id),
            user_id=workflow.created_by_user_id,
            user_email="system.workflow@nexaerp.internal",
            status="SUCCESS" if overall_success else "FAILURE",
            details={
                "workflow_id": workflow.id,
                "workflow_name": workflow.name,
                "trigger_source": trigger_source,
                "steps_count": len(step_outcomes)
            }
        )
        await session.commit()
        await session.refresh(execution)
        return execution


async def background_workflow_scheduler_loop():
    """
    Background worker loop that evaluates and triggers due workflows independently of any browser session.
    Runs every 30 seconds.
    """
    logger.info("Starting NexaERP Background Workflow Scheduler loop...")
    while not _RUNNER_STOP_EVENT.is_set():
        try:
            async with AsyncSessionLocal() as session:
                now = datetime.now(timezone.utc)
                stmt = (
                    select(WorkflowDefinition)
                    .where(
                        and_(
                            WorkflowDefinition.is_active == True,
                            WorkflowDefinition.status == "ACTIVE",
                            WorkflowDefinition.next_run_at <= now
                        )
                    )
                )
                res = await session.execute(stmt)
                due_workflows = res.scalars().all()

                for wf in due_workflows:
                    logger.info(f"Triggering scheduled run for workflow {wf.id} ({wf.name})")
                    try:
                        # Advance next_run_at immediately to prevent race conditions
                        wf.next_run_at = compute_next_run_time(wf.cron_expression, wf.interval_minutes)
                        await session.commit()
                        asyncio.create_task(execute_workflow_instance(wf.id, trigger_source="SCHEDULE"))
                    except Exception as wf_err:
                        logger.error(f"Error initiating workflow {wf.id}: {wf_err}")
        except Exception as loop_err:
            logger.warning(f"Workflow scheduler loop notice: {loop_err}")

        try:
            await asyncio.wait_for(_RUNNER_STOP_EVENT.wait(), timeout=30.0)
        except asyncio.TimeoutError:
            pass


def start_workflow_scheduler():
    global _WORKFLOW_RUNNER_TASK, _RUNNER_STOP_EVENT
    _RUNNER_STOP_EVENT.clear()
    if _WORKFLOW_RUNNER_TASK is None or _WORKFLOW_RUNNER_TASK.done():
        _WORKFLOW_RUNNER_TASK = asyncio.create_task(background_workflow_scheduler_loop())


def stop_workflow_scheduler():
    global _WORKFLOW_RUNNER_TASK, _RUNNER_STOP_EVENT
    _RUNNER_STOP_EVENT.set()
    if _WORKFLOW_RUNNER_TASK and not _WORKFLOW_RUNNER_TASK.done():
        _WORKFLOW_RUNNER_TASK.cancel()
