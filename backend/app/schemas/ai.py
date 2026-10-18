from typing import Optional, List
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
