from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class AccessRequestCreate(BaseModel):
    requested_role_id: Optional[int] = None
    requested_permission_code: Optional[str] = None
    reason: str = Field(..., min_length=10, description="Mandatory detailed justification for temporary elevated access")
    duration_minutes: int = Field(60, ge=5, le=480, description="Duration between 5 and 480 minutes")

class AccessRequestReview(BaseModel):
    decision: str = Field(..., pattern="^(APPROVED|REJECTED)$")
    approval_note: Optional[str] = None

class AccessRequestOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    requested_role_id: Optional[int] = None
    requested_role_name: Optional[str] = None
    requested_permission_code: Optional[str] = None
    reason: str
    duration_minutes: int
    status: str
    approved_by_name: Optional[str] = None
    approval_note: Optional[str] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
