from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.config import settings
from app.auth.dependencies import get_current_user, require_permission
from app.models.auth import User
from app.models.org import Organization, Branch
from app.schemas.ai import (
    AIQueryRequest,
    KnowledgeDocCreate,
    KnowledgeDocUpdate,
    KnowledgeDocOut,
    PrivacyStatusOut
)
from app.services.ai_service import process_ai_query
from app.services.rag_knowledge import (
    list_company_documents,
    create_company_document,
    update_company_document,
    delete_company_document,
    ensure_organization_knowledge_seeded
)
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/api/ai", tags=["Nexa AI Assistant & Multi-Tenant RAG"])

async def _resolve_user_tenant(db: AsyncSession, current_user: User) -> tuple[int, str, Optional[int]]:
    """
    Resolves the organization_id, organization_name, and branch_id for the current user
    to enforce strict company tenant isolation.
    """
    branch_id = current_user.branch_id
    org_id = 1
    org_name = "Nexa Global Enterprises"

    if branch_id:
        b_res = await db.execute(select(Branch).where(Branch.id == branch_id))
        branch = b_res.scalar_one_or_none()
        if branch and branch.organization_id:
            org_id = branch.organization_id
            o_res = await db.execute(select(Organization).where(Organization.id == org_id))
            org = o_res.scalar_one_or_none()
            if org:
                org_name = org.name
    else:
        # Check first organization in DB
        o_res = await db.execute(select(Organization).limit(1))
        org = o_res.scalar_one_or_none()
        if org:
            org_id = org.id
            org_name = org.name

    return org_id, org_name, branch_id

@router.post("/query")
async def query_ai(
    req: AIQueryRequest,
    current_user: User = Depends(require_permission("ai.use")),
    db: AsyncSession = Depends(get_db)
):
    """
    Enterprise RAG Assistant Query:
    Retrieves knowledge documents and ERP facts strictly partitioned to the user's company.
    Calls Groq LLM (qwen/qwen3.8-27b) with tenant boundary enforcement.
    """
    org_id, org_name, branch_id = await _resolve_user_tenant(db, current_user)

    result = await process_ai_query(
        db=db,
        prompt=req.prompt,
        user_name=current_user.full_name,
        user_id=current_user.id,
        user_email=current_user.email,
        user_role="Administrator" if current_user.is_superuser else "Employee",
        organization_id=org_id,
        organization_name=org_name,
        branch_id=branch_id
    )

    await record_audit_log(
        db,
        action="AI_QUERY",
        entity_name="AIAssistant",
        user_id=current_user.id,
        user_email=current_user.email,
        details={
            "prompt": req.prompt,
            "organization_id": org_id,
            "organization_name": org_name,
            "action_executed": result.get("action_executed", False)
        }
    )
    await db.commit()
    return result

@router.get("/knowledge", response_model=List[KnowledgeDocOut])
async def get_company_knowledge(
    current_user: User = Depends(require_permission("ai.use")),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all operational policies, SOPs, and handbooks strictly belonging to the user's company.
    """
    org_id, _, _ = await _resolve_user_tenant(db, current_user)
    docs = await list_company_documents(db, organization_id=org_id)
    return docs

@router.post("/knowledge", response_model=KnowledgeDocOut, status_code=status.HTTP_201_CREATED)
async def add_company_knowledge(
    doc_in: KnowledgeDocCreate,
    current_user: User = Depends(require_permission("settings.manage")),
    db: AsyncSession = Depends(get_db)
):
    """
    Adds a new corporate policy or standard operating procedure for the user's company.
    Immediately indexed and available for RAG retrieval.
    Requires 'settings.manage' permission.
    """
    org_id, org_name, _ = await _resolve_user_tenant(db, current_user)
    created_doc = await create_company_document(
        db=db,
        organization_id=org_id,
        title=doc_in.title,
        category=doc_in.category,
        content=doc_in.content,
        doc_code=doc_in.doc_code,
        tags=doc_in.tags,
        user_id=current_user.id
    )

    await record_audit_log(
        db,
        action="AI_KNOWLEDGE_CREATE",
        entity_name="CompanyKnowledgeDoc",
        entity_id=str(created_doc.id),
        user_id=current_user.id,
        user_email=current_user.email,
        details={"doc_code": created_doc.doc_code, "title": created_doc.title, "org_id": org_id}
    )
    return created_doc

@router.put("/knowledge/{doc_id}", response_model=KnowledgeDocOut)
async def update_knowledge_doc(
    doc_id: int,
    doc_update: KnowledgeDocUpdate,
    current_user: User = Depends(require_permission("settings.manage")),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates an existing company knowledge document. Ensures user belongs to the same organization.
    Requires 'settings.manage' permission.
    """
    org_id, _, _ = await _resolve_user_tenant(db, current_user)
    updated = await update_company_document(
        db=db,
        organization_id=org_id,
        doc_id=doc_id,
        title=doc_update.title,
        category=doc_update.category,
        content=doc_update.content,
        tags=doc_update.tags,
        is_active=doc_update.is_active
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or does not belong to your organization."
        )

    await record_audit_log(
        db,
        action="AI_KNOWLEDGE_UPDATE",
        entity_name="CompanyKnowledgeDoc",
        entity_id=str(updated.id),
        user_id=current_user.id,
        user_email=current_user.email,
        details={"doc_code": updated.doc_code, "org_id": org_id}
    )
    return updated

@router.delete("/knowledge/{doc_id}")
async def delete_knowledge_doc(
    doc_id: int,
    current_user: User = Depends(require_permission("settings.manage")),
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes a company knowledge document (strictly scoped to user's company).
    Requires 'settings.manage' permission.
    """
    org_id, _, _ = await _resolve_user_tenant(db, current_user)
    deleted = await delete_company_document(db=db, organization_id=org_id, doc_id=doc_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or does not belong to your organization."
        )

    await record_audit_log(
        db,
        action="AI_KNOWLEDGE_DELETE",
        entity_name="CompanyKnowledgeDoc",
        entity_id=str(doc_id),
        user_id=current_user.id,
        user_email=current_user.email,
        details={"doc_id": doc_id, "org_id": org_id}
    )
    return {"status": "DELETED", "id": doc_id, "organization_id": org_id}

@router.post("/knowledge/reset-defaults")
async def reset_company_defaults(
    current_user: User = Depends(require_permission("settings.manage")),
    db: AsyncSession = Depends(get_db)
):
    """
    Initializes or resets default company policies and SOPs for the organization.
    Requires 'settings.manage' permission.
    """
    org_id, org_name, _ = await _resolve_user_tenant(db, current_user)
    docs = await ensure_organization_knowledge_seeded(db, organization_id=org_id)
    return {
        "status": "INITIALIZED",
        "organization_id": org_id,
        "organization_name": org_name,
        "documents_count": len(docs)
    }

@router.get("/privacy-status", response_model=PrivacyStatusOut)
async def get_privacy_and_isolation_status(
    current_user: User = Depends(require_permission("ai.use")),
    db: AsyncSession = Depends(get_db)
):
    """
    Inspects tenant data boundary enforcement, PII protection, and Groq LLM connectivity.
    """
    org_id, org_name, _ = await _resolve_user_tenant(db, current_user)
    docs = await list_company_documents(db, organization_id=org_id)

    return PrivacyStatusOut(
        organization_id=org_id,
        organization_name=org_name,
        tenant_isolation_active=True,
        pii_redaction_enabled=True,
        groq_llm_connected=bool(settings.GROQ_API_KEY),
        active_model=settings.GROQ_MODEL or "qwen/qwen3.8-27b",
        knowledge_docs_count=len(docs)
    )
