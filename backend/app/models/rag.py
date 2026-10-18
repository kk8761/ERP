from typing import Optional
from sqlalchemy import String, Integer, ForeignKey, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin

class CompanyKnowledgeDoc(Base, TimestampMixin):
    """
    Multi-tenant enterprise knowledge base document.
    Strictly partitioned by organization_id to ensure zero cross-company data leakage.
    Used by the BM25 RAG engine to ground Groq LLM generations in authentic corporate policies.
    """
    __tablename__ = "company_knowledge_docs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    doc_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # e.g. 'DOC-CORP-001'
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="Operational SOP")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[Optional[str]] = mapped_column(String(255), nullable=True) # comma-separated keywords
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationship back to organization
    organization = relationship("Organization")
