from typing import Optional, List
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, Text, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin

class WorkflowDefinition(Base, TimestampMixin):
    """
    Persistent workflow definition created manually or via AI natural language instructions.
    Can be triggered via schedule (cron/interval), event, or manual execution.
    """
    __tablename__ = "workflow_definitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    trigger_type: Mapped[str] = mapped_column(String(30), default="SCHEDULE") # SCHEDULE, EVENT, MANUAL
    cron_expression: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # e.g. "0 9 * * *"
    interval_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    instruction_prompt: Mapped[str] = mapped_column(Text, nullable=False) # Natural language instruction
    plan_steps: Mapped[str] = mapped_column(Text, nullable=False) # JSON list of planned tools and parameters
    
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", index=True) # DRAFT, ACTIVE, PAUSED, ARCHIVED
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    last_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    next_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    created_by_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"), default=1, index=True)
    branch_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("branches.id"), nullable=True)

    executions: Mapped[List["WorkflowExecution"]] = relationship("WorkflowExecution", back_populates="workflow", cascade="all, delete-orphan")


class WorkflowExecution(Base, TimestampMixin):
    """
    Audit record of each background or interactive execution of a workflow.
    Tracks step-by-step progress, duration, outputs, and errors.
    """
    __tablename__ = "workflow_executions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    workflow_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("workflow_definitions.id"), nullable=True, index=True)
    trigger_source: Mapped[str] = mapped_column(String(30), default="SCHEDULE") # SCHEDULE, CHAT, MANUAL, EVENT
    
    status: Mapped[str] = mapped_column(String(30), default="PENDING", index=True) # PENDING, RUNNING, COMPLETED, FAILED, APPROVAL_REQUIRED, CANCELLED
    
    step_results: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON list of step execution outcomes
    output_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, default=3)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    organization_id: Mapped[int] = mapped_column(Integer, default=1, index=True)

    workflow: Mapped[Optional["WorkflowDefinition"]] = relationship("WorkflowDefinition", back_populates="executions")
    approvals: Mapped[List["ApprovalRequest"]] = relationship("ApprovalRequest", back_populates="execution")


class ApprovalRequest(Base, TimestampMixin):
    """
    Segregation-of-duties and sensitive-action approval request.
    Prevents AI or unauthorized users from executing binding operations
    without human review.
    """
    __tablename__ = "approval_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    workflow_execution_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("workflow_executions.id"), nullable=True)
    action_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # PURCHASE_ORDER_ISSUANCE, STOCK_ADJUSTMENT, PAYMENT_RELEASE, WORKFLOW_ACTIVATION
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False) # PurchaseOrder, Product, Supplier, WorkflowDefinition
    entity_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[str] = mapped_column(Text, nullable=False) # JSON payload to execute upon approval
    
    requested_by_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_role: Mapped[str] = mapped_column(String(50), default="Administrator")
    
    status: Mapped[str] = mapped_column(String(30), default="PENDING", index=True) # PENDING, APPROVED, REJECTED, CANCELLED
    reviewed_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    organization_id: Mapped[int] = mapped_column(Integer, default=1, index=True)

    execution: Mapped[Optional["WorkflowExecution"]] = relationship("WorkflowExecution", back_populates="approvals")
