import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.org import Organization, Branch
from app.models.auth import User, Role, UserRole, Permission, RolePermission
from app.models.rag import CompanyKnowledgeDoc
from app.auth.security import hash_password, create_access_token
from app.services.privacy_guard import mask_sensitive_pii, build_tenant_boundary_directive
from app.services.rag_knowledge import search_company_knowledge

@pytest.mark.asyncio
async def test_privacy_guard_pii_redaction():
    """Verify sensitive enterprise data (cards, national IDs, passwords, phone numbers) are masked."""
    raw_text = (
        "Customer John paid with card 4111-2222-3333-4444 and phone 9876543210. "
        "Bearer token bearer abcdef1234567890abcdef1234567890. password: SuperSecretPassword!"
    )
    sanitized = mask_sensitive_pii(raw_text)
    assert "4111-2222-3333-4444" not in sanitized
    assert "9876543210" not in sanitized
    assert "SuperSecretPassword" not in sanitized
    assert "[PROTECTED_PAYMENT_CARD]" in sanitized
    assert "[PROTECTED_CONTACT_NUMBER]" in sanitized
    assert "[PROTECTED_CREDENTIAL]" in sanitized

@pytest.mark.asyncio
async def test_multi_tenant_company_knowledge_isolation(client: AsyncClient, admin_auth_token: str):
    """
    Critical Multi-Tenant Isolation Test:
    Company A creates a confidential strategy doc ('Project Falcon Secret Roadmap').
    Company B queries the RAG system and MUST NOT receive or see Company A's document.
    """
    import uuid
    uid = uuid.uuid4().hex[:6].upper()
    async with AsyncSessionLocal() as db:
        # Create Company A and Company B with unique codes
        org_a = Organization(name=f"Company A Tech Corp {uid}", code=f"COMP-A-{uid}", currency="INR")
        org_b = Organization(name=f"Company B Retail Ltd {uid}", code=f"COMP-B-{uid}", currency="INR")
        db.add_all([org_a, org_b])
        await db.flush()

        branch_a = Branch(organization_id=org_a.id, name=f"Branch A {uid}", code=f"BR-A-{uid}")
        branch_b = Branch(organization_id=org_b.id, name=f"Branch B {uid}", code=f"BR-B-{uid}")
        db.add_all([branch_a, branch_b])
        await db.flush()

        # Add confidential policy to Company A only
        doc_a = CompanyKnowledgeDoc(
            doc_code=f"DOC-A-CONFIDENTIAL-{uid}",
            organization_id=org_a.id,
            title="Project Falcon Secret Strategic Roadmap",
            category="Corporate Strategy",
            content="Project Falcon secret budget is 150 Crores and launches exclusively in Q4 2026.",
            tags="falcon, budget, confidential, roadmap",
            is_active=True
        )
        db.add(doc_a)

        # Create user for Company B
        user_b = User(
            email=f"manager-{uid.lower()}@companyb.com",
            full_name="Manager B",
            password_hash=hash_password("Password@123"),
            is_active=True,
            is_superuser=False,
            branch_id=branch_b.id
        )
        db.add(user_b)
        await db.flush()

        # Grant ai.use permission to user_b
        perm_res = await db.execute(select(Permission).where(Permission.code == "ai.use"))
        ai_perm = perm_res.scalar_one_or_none()
        if not ai_perm:
            ai_perm = Permission(code="ai.use", module="ai", description="AI Copilot")
            db.add(ai_perm)
            await db.flush()

        role_b = Role(name=f"Company B Staff {uid}", description="Staff of Company B")
        db.add(role_b)
        await db.flush()

        db.add(RolePermission(role_id=role_b.id, permission_id=ai_perm.id))
        db.add(UserRole(user_id=user_b.id, role_id=role_b.id))
        await db.commit()

        token_b = create_access_token({"sub": str(user_b.id), "email": user_b.email, "is_superuser": False})

        # Test Direct RAG Retriever Isolation
        results_comp_a = await search_company_knowledge(db, organization_id=org_a.id, query="Project Falcon budget", top_k=2)
        assert any("DOC-A-CONFIDENTIAL" in r["id"] or "Project Falcon" in r["title"] for r in results_comp_a)

        results_comp_b = await search_company_knowledge(db, organization_id=org_b.id, query="Project Falcon budget", top_k=2)
        # Company B MUST NOT see Company A's confidential document
        assert not any("DOC-A-CONFIDENTIAL" in r["id"] for r in results_comp_b)
        assert not any("150 Crores" in r["content"] for r in results_comp_b)

    # Now test via API endpoint as Company B user
    headers_b = {"Authorization": f"Bearer {token_b}"}
    query_res = await client.post("/api/ai/query", headers=headers_b, json={"prompt": "What is the budget for Project Falcon?"})
    assert query_res.status_code == 200
    res_data = query_res.json()
    assert res_data["organization_id"] == org_b.id
    assert res_data["organization_name"] == org_b.name
    # Ensure no Falcon secrets leaked in sources or answer
    for src in res_data.get("rag_sources", []):
        assert "DOC-A-CONFIDENTIAL" not in src

@pytest.mark.asyncio
async def test_company_knowledge_crud_endpoints(client: AsyncClient, admin_auth_token: str):
    """Test full CRUD operations on company knowledge documents."""
    headers = {"Authorization": f"Bearer {admin_auth_token}"}

    # 1. Privacy status check
    status_res = await client.get("/api/ai/privacy-status", headers=headers)
    assert status_res.status_code == 200
    p_status = status_res.json()
    assert p_status["tenant_isolation_active"] is True
    assert p_status["pii_redaction_enabled"] is True
    assert p_status["knowledge_docs_count"] >= 1

    # 2. List company knowledge documents
    list_res = await client.get("/api/ai/knowledge", headers=headers)
    assert list_res.status_code == 200
    docs = list_res.json()
    assert len(docs) >= 1

    # 3. Create a new company policy
    new_doc_payload = {
        "title": "Corporate Cyber Incident Response SOP",
        "category": "Information Security",
        "content": "All critical security breaches must be contained within 60 minutes and reported to CERT-In within 6 hours.",
        "tags": "incident, cert-in, security, breach, response"
    }
    create_res = await client.post("/api/ai/knowledge", headers=headers, json=new_doc_payload)
    assert create_res.status_code == 201
    created_doc = create_res.json()
    assert created_doc["title"] == new_doc_payload["title"]
    assert created_doc["id"] > 0
    doc_id = created_doc["id"]

    # 4. Update the document
    update_res = await client.put(f"/api/ai/knowledge/{doc_id}", headers=headers, json={
        "title": "Updated Cyber Incident Response SOP 2026",
        "content": "Updated policy: Breaches must be contained within 45 minutes."
    })
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Updated Cyber Incident Response SOP 2026"

    # 5. Delete the document
    del_res = await client.delete(f"/api/ai/knowledge/{doc_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "DELETED"

@pytest.mark.asyncio
async def test_groq_tenant_directive_injection():
    """Verify the tenant boundary directive is properly synthesized."""
    directive = build_tenant_boundary_directive(org_name="Nexa Global Enterprises", org_id=42)
    assert "COMPANY #42" in directive
    assert "Nexa Global Enterprises" in directive
    assert "CRITICAL DATA PRIVACY DIRECTIVE" in directive
    assert "EXCLUSIVELY to 'Nexa Global Enterprises'" in directive
