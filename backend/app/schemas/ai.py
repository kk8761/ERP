from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class AIQueryRequest(BaseModel):
    prompt: str = Field(..., min_length=2, description="Employee question, doubt, or actionable instruction")

class KnowledgeDocCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    category: str = Field("Operational SOP", max_length=100)
    content: str = Field(..., min_length=10)
    doc_code: Optional[str] = Field(None, max_length=50)
    tags: Optional[str] = Field(None, max_length=255)

class KnowledgeDocUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    content: Optional[str] = Field(None, min_length=10)
    tags: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None

class KnowledgeDocOut(BaseModel):
    id: int
    doc_code: str
    organization_id: int
    title: str
    category: str
    content: str
    tags: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class PrivacyStatusOut(BaseModel):
    organization_id: int
    organization_name: str
    tenant_isolation_active: bool
    pii_redaction_enabled: bool
    groq_llm_connected: bool
    active_model: str
    knowledge_docs_count: int

class TaskPlanStep(BaseModel):
    step_number: int
    title: str
    tool_name: str
    parameters: dict = Field(default_factory=dict)
    status: str = "PENDING" # PENDING, RUNNING, COMPLETED, FAILED, SKIPPED, AWAITING_APPROVAL
    result_summary: Optional[str] = None
    requires_approval: bool = False

class ActionPreview(BaseModel):
    action_id: str
    action_type: str
    title: str
    consequences: List[str] = Field(default_factory=list)
    affected_records: List[dict] = Field(default_factory=list)
    requires_human_approval: bool = False
    payload: Optional[dict] = None

class AICommandRequest(BaseModel):
    prompt: str = Field(..., min_length=2)
    task_type: Optional[str] = None # ONE_TIME, MULTI_STEP, RECURRING_WORKFLOW, AUTO
    confirm_action_id: Optional[str] = None
    parameters: Optional[dict] = None

class AICommandResponse(BaseModel):
    answer: str
    task_type: str = "ONE_TIME" # ONE_TIME, MULTI_STEP, RECURRING_WORKFLOW
    status: str = "COMPLETED" # COMPLETED, PREVIEW_REQUIRED, NEEDS_DETAILS, APPROVAL_REQUIRED, FAILED
    plan_steps: List[TaskPlanStep] = Field(default_factory=list)
    action_preview: Optional[ActionPreview] = None
    needs_details: Optional[dict] = None
    approval_request: Optional[dict] = None
    data: Optional[Any] = None
    vendor_comparison: Optional[dict] = None
    vendor_scorecard: Optional[dict] = None
    workflow_created: Optional[dict] = None
    suggestions: List[str] = Field(default_factory=list)

AICommandResponse.model_rebuild()
