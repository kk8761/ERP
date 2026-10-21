from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class WorkflowDefinitionCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=150)
    description: Optional[str] = None
    trigger_type: str = "SCHEDULE" # SCHEDULE, EVENT, MANUAL
    cron_expression: Optional[str] = None
    interval_minutes: Optional[int] = None
    instruction_prompt: str = Field(..., min_length=5)
    plan_steps: Optional[List[Dict[str, Any]]] = None

class WorkflowDefinitionOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    trigger_type: str
    cron_expression: Optional[str] = None
    interval_minutes: Optional[int] = None
    instruction_prompt: str
    plan_steps: str
    status: str
    is_active: bool
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WorkflowExecutionOut(BaseModel):
    id: int
    workflow_id: Optional[int] = None
    trigger_source: str
    status: str
    step_results: Optional[str] = None
    output_summary: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ApprovalDecisionRequest(BaseModel):
    decision: str = Field(..., pattern="^(APPROVE|REJECT)$") # APPROVE, REJECT
    notes: Optional[str] = None

class ApprovalRequestOut(BaseModel):
    id: int
    workflow_execution_id: Optional[int] = None
    action_type: str
    entity_type: str
    entity_id: Optional[str] = None
    title: str
    description: str
    payload: str
    requested_by_user_id: int
    assigned_role: str
    status: str
    reviewed_by_user_id: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
