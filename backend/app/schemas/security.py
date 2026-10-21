from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ScreenshotIncidentCreate(BaseModel):
    page_url: str = Field(..., description="URL / route where screenshot was attempted")
    action_type: str = Field(default="PRINT_SCREEN_KEY", description="Trigger mechanism (e.g., PRINT_SCREEN_KEY, SNIPPING_TOOL, DEV_TOOLS)")
    image_data: str = Field(..., description="Base64 data URL of the captured viewport")
    screen_resolution: Optional[str] = Field(default=None, description="Screen resolution e.g., 1920x1080")
    captured_at: Optional[datetime] = Field(default=None, description="Client-side timestamp of incident")

class ScreenshotIncidentOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    page_url: str
    action_type: str
    image_data: str
    captured_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    screen_resolution: Optional[str] = None
    organization_id: int
    is_reviewed: bool
    severity: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ScreenshotIncidentReview(BaseModel):
    is_reviewed: bool = True
