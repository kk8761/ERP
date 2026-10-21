"""
NexaERP RAG (Retrieval-Augmented Generation) Knowledge Base & Engine.
Provides:
1. Strict multi-tenant company isolation: Documents are partitioned by organization_id.
2. Advanced BM25 + Multi-field TF-IDF relevance ranking with confidence scoring.
3. Automated bootstrapping of company-scoped operational policies and SOPs.
4. Dynamic Knowledge Base management for company-specific compliance rules.
"""

from typing import List, Dict, Any, Optional
import re
import math
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rag import CompanyKnowledgeDoc
from app.models.org import Organization

# Default baseline templates used for initialization and fallback
DEFAULT_ENTERPRISE_TEMPLATES = [
    {
        "doc_code": "DOC-CORP-001",
        "title": "Corporate Procurement Policy & Financial Authority Matrix",
        "category": "Procurement & Governance",
        "tags": "procurement, purchase order, po, approval, limit, authority, finance director, net-30",
        "content": (
            "Procurement Policy: Purchase orders below ₹ 50,000 can be approved by the Department Head or Procurement Officer. "
            "Purchase requisitions between ₹ 50,000 and ₹ 5,00,000 require dual approval from the Procurement Manager and Finance Director. "
            "All requisitions exceeding ₹ 5,00,000 require formal Board and Executive approval. Standard vendor payment terms are Net-30 days. "
            "Preferred vendor agreements must be reviewed annually."
        )
    },
    {
        "doc_code": "DOC-CORP-002",
        "title": "Inventory Safety Stock, Reorder SOP & Barcode Standards",
        "category": "Supply Chain & Warehousing",
        "tags": "inventory, safety stock, reorder, basmati rice, amul milk, barcode, gs1-128, warehouse, goods receipt",
        "content": (
            "Inventory SOP: Safety stock thresholds are calculated at 1.5x average weekly consumption. "
            "When current stock drops below reorder level (e.g., Basmati Rice at 10 units, Amul Milk at 20 units), "
            "an automated purchase requisition is triggered. All incoming consignments must be verified via GS1-128 barcode scanners "
            "at the receiving bay before stock movement status changes to 'STORED'. Discrepancies exceeding 2% require quarantine."
        )
    },
    {
        "doc_code": "DOC-CORP-003",
        "title": "Sales Return, Credit Note & Customer Refund Policy",
        "category": "Sales & Retail",
        "tags": "sales, return, refund, credit note, customer, receipt, cash, warranty, perishable",
        "content": (
            "Return Policy: Customers may return unopened, non-perishable merchandise within 14 calendar days of invoice date with valid receipt. "
            "Perishable foodstuffs (e.g. dairy, produce) must be inspected within 24 hours. "
            "Cash refunds are permitted up to ₹ 2,000; returns exceeding ₹ 2,000 are credited via original digital payment method or store credit voucher. "
            "Every return must generate an audited StockMovement entry of type 'RETURN'."
        )
    },
    {
        "doc_code": "DOC-CORP-004",
        "title": "HR Attendance, Leave Encashment & Payroll Calendar",
        "category": "Human Capital Management",
        "tags": "hr, leave, pto, attendance, payroll, salary, overtime, working hours, encashment",
        "content": (
            "HR Regulations: Normal business hours are 09:00 to 18:00 IST Monday through Friday. "
            "Employees are entitled to 18 days of Paid Time Off (PTO), 12 Casual Leaves, and 10 Sick Leaves per fiscal year. "
            "Monthly payroll cutoff date is the 25th of each month, with salary disbursement executed on the 1st of the subsequent month. "
            "Overtime for non-exempt staff is calculated at 1.5x standard hourly wage."
        )
    },
    {
        "doc_code": "DOC-CORP-005",
        "title": "Information Security, Access Requests & JIT Elevation SOP",
        "category": "Information Security",
        "tags": "security, access, jit elevation, least privilege, dual approval, lockout, password, role",
        "content": (
            "Security Policy: Access control follows the Principle of Least Privilege. "
            "Privileged access (Finance posting, User management, Salary processing) must be requested via Just-In-Time (JIT) Temporary Elevation. "
            "Self-approval is mathematically and procedurally prohibited. Approved elevations expire automatically within the requested duration (maximum 480 minutes). "
            "Accounts lock automatically after 5 consecutive failed login attempts for 15 minutes."
        )
    },
    {
        "doc_code": "DOC-CORP-006",
        "title": "Chart of Accounts Structure & Double-Entry Accounting Standard",
        "category": "Finance & Accounting",
        "tags": "finance, chart of accounts, accounting, ledger, balance, debit, credit, journal, accrual",
        "content": (
            "Accounting Standards: General ledger accounts are categorized as Assets (1000s), Liabilities (2000s), "
            "Equity (3000s), Revenue (4000s), and Expenses (5000s). Every journal voucher must be strictly balanced: "
            "Sum of Debits must equal Sum of Credits. Cash basis transactions are updated immediately; accruals are reconciled at monthly close."
        )
    }
]

# Legacy dictionary format export for backward compatibility
COMPANY_KNOWLEDGE_DOCS = [
    {
        "id": t["doc_code"],
        "title": t["title"],
        "category": t["category"],
        "content": t["content"]
    }
    for t in DEFAULT_ENTERPRISE_TEMPLATES
]

def _tokenize(text: str) -> List[str]:
    """Extracts alphanumeric tokens of length > 2 in lowercase."""
    return [w for w in re.findall(r'\b\w+\b', text.lower()) if len(w) > 2]

def _compute_bm25_score(
    query_tokens: List[str],
    doc_text: str,
    doc_title: str,
    doc_tags: str,
    avg_dl: float,
    doc_count: int,
    term_doc_freqs: Dict[str, int],
    k1: float = 1.5,
    b: float = 0.75
) -> float:
    """
    Computes BM25 score with multi-field weighting and exact phrase matching bonus.
    """
    doc_tokens = _tokenize(doc_text)
    dl = len(doc_tokens)
    if dl == 0:
        return 0.0

    score = 0.0
    for q in query_tokens:
        f_qd = doc_tokens.count(q)
        if f_qd == 0:
            continue

        n_q = term_doc_freqs.get(q, 1)
        # BM25 IDF formulation with smoothing
        idf = math.log(1.0 + (doc_count - n_q + 0.5) / (n_q + 0.5))
        idf = max(idf, 0.1)

        # Term frequency saturation
        tf = (f_qd * (k1 + 1.0)) / (f_qd + k1 * (1.0 - b + b * (dl / avg_dl)))
        term_score = idf * tf

        # Multi-field boosting: Title matching gives heavy weight
        if q in doc_title.lower():
            term_score *= 3.0
        # Tags matching gives secondary weight
        if doc_tags and q in doc_tags.lower():
            term_score *= 2.0

        score += term_score

    # Exact phrase bonus: If query has multi-word phrase matching directly
    raw_query = " ".join(query_tokens)
    if len(query_tokens) >= 2 and raw_query in doc_text.lower():
        score += 8.0

    return score

async def ensure_organization_knowledge_seeded(
    db: AsyncSession,
    organization_id: int
) -> List[CompanyKnowledgeDoc]:
    """
    Ensures the given organization has its baseline corporate policies created in DB.
    Tailors policy headers with the organization's legal name for authenticity.
    """
    # Check if this company already has docs in the database
    stmt = select(CompanyKnowledgeDoc).where(
        CompanyKnowledgeDoc.organization_id == organization_id
    )
    result = await db.execute(stmt)
    existing = result.scalars().all()
    if existing:
        return list(existing)

    # Fetch company name
    org_res = await db.execute(select(Organization).where(Organization.id == organization_id))
    org = org_res.scalar_one_or_none()
    company_name = org.name if org else "Enterprise"

    new_docs = []
    for tmpl in DEFAULT_ENTERPRISE_TEMPLATES:
        content = tmpl["content"]
        # Customize policy text with company name where relevant
        doc = CompanyKnowledgeDoc(
            doc_code=tmpl["doc_code"],
            organization_id=organization_id,
            title=tmpl["title"],
            category=tmpl["category"],
            tags=tmpl["tags"],
            content=f"[{company_name}] {content}",
            is_active=True
        )
        db.add(doc)
        new_docs.append(doc)

    await db.commit()
    for d in new_docs:
        await db.refresh(d)
    return new_docs

async def search_company_knowledge(
    db: AsyncSession,
    organization_id: int,
    query: str,
    top_k: int = 3
) -> List[Dict[str, Any]]:
    """
    Multi-tenant enterprise RAG search:
    - Filters strictly by organization_id (Company Isolation).
    - Uses BM25 relevance scoring.
    - Computes confidence percentages for display and grounding.
    """
    # 1. Ensure company has seeded knowledge base
    docs = await ensure_organization_knowledge_seeded(db, organization_id)
    active_docs = [d for d in docs if d.is_active]

    if not active_docs:
        return []

    q_tokens = _tokenize(query)
    if not q_tokens:
        # Return top active docs with default baseline confidence
        return [
            {
                "id": d.doc_code,
                "db_id": d.id,
                "title": d.title,
                "category": d.category,
                "tags": d.tags,
                "content": d.content,
                "organization_id": d.organization_id,
                "confidence_score": 75.0
            }
            for d in active_docs[:top_k]
        ]

    # Precompute corpus statistics for BM25
    doc_count = len(active_docs)
    doc_token_lists = [_tokenize(d.title + " " + d.content + " " + (d.tags or "")) for d in active_docs]
    total_tokens = sum(len(tl) for tl in doc_token_lists)
    avg_dl = max(float(total_tokens) / float(doc_count), 1.0)

    term_doc_freqs: Dict[str, int] = {}
    for q in q_tokens:
        term_doc_freqs[q] = sum(1 for tl in doc_token_lists if q in tl)

    scored = []
    for doc in active_docs:
        score = _compute_bm25_score(
            query_tokens=q_tokens,
            doc_text=doc.content,
            doc_title=doc.title,
            doc_tags=doc.tags or "",
            avg_dl=avg_dl,
            doc_count=doc_count,
            term_doc_freqs=term_doc_freqs
        )
        scored.append((score, doc))

    # Sort descending by BM25 score
    scored.sort(key=lambda x: x[0], reverse=True)

    max_possible_score = max(scored[0][0], 1.0) if scored else 1.0

    results = []
    for score, doc in scored[:top_k]:
        # Normalize confidence to 45% - 99% range for matched documents
        if score > 0:
            confidence = min(99.0, round(55.0 + (score / max_possible_score) * 44.0, 1))
        else:
            confidence = 45.0

        results.append({
            "id": doc.doc_code,
            "db_id": doc.id,
            "title": doc.title,
            "category": doc.category,
            "tags": doc.tags,
            "content": doc.content,
            "organization_id": doc.organization_id,
            "confidence_score": confidence
        })

    return results

def search_knowledge_base(query: str, top_k: int = 2) -> List[Dict[str, Any]]:
    """
    Synchronous fallback implementation for testing / legacy callers.
    Uses default templates with BM25 token matching.
    """
    q_tokens = _tokenize(query)
    if not q_tokens:
        return [
            {
                "id": d["doc_code"],
                "title": d["title"],
                "category": d["category"],
                "content": d["content"],
                "confidence_score": 70.0
            }
            for d in DEFAULT_ENTERPRISE_TEMPLATES[:top_k]
        ]

    scored = []
    doc_count = len(DEFAULT_ENTERPRISE_TEMPLATES)
    doc_token_lists = [_tokenize(d["title"] + " " + d["content"] + " " + d.get("tags", "")) for d in DEFAULT_ENTERPRISE_TEMPLATES]
    avg_dl = max(float(sum(len(tl) for tl in doc_token_lists)) / float(doc_count), 1.0)
    term_doc_freqs = {q: sum(1 for tl in doc_token_lists if q in tl) for q in q_tokens}

    for doc in DEFAULT_ENTERPRISE_TEMPLATES:
        score = _compute_bm25_score(
            query_tokens=q_tokens,
            doc_text=doc["content"],
            doc_title=doc["title"],
            doc_tags=doc.get("tags", ""),
            avg_dl=avg_dl,
            doc_count=doc_count,
            term_doc_freqs=term_doc_freqs
        )
        scored.append((score, doc))

    scored.sort(key=lambda x: x[0], reverse=True)
    results = []
    max_score = max(scored[0][0], 1.0) if scored else 1.0
    for score, doc in scored[:top_k]:
        confidence = min(99.0, round(55.0 + (score / max_score) * 44.0, 1)) if score > 0 else 50.0
        results.append({
            "id": doc["doc_code"],
            "title": doc["title"],
            "category": doc["category"],
            "content": doc["content"],
            "confidence_score": confidence
        })
    return results

# CRUD Helpers for Company-Scoped Knowledge Documents
async def list_company_documents(db: AsyncSession, organization_id: int) -> List[CompanyKnowledgeDoc]:
    """Retrieves all knowledge documents strictly belonging to the company."""
    await ensure_organization_knowledge_seeded(db, organization_id)
    stmt = select(CompanyKnowledgeDoc).where(
        CompanyKnowledgeDoc.organization_id == organization_id
    ).order_by(CompanyKnowledgeDoc.id.asc())
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def create_company_document(
    db: AsyncSession,
    organization_id: int,
    title: str,
    category: str,
    content: str,
    doc_code: Optional[str] = None,
    tags: Optional[str] = None,
    user_id: Optional[int] = None
) -> CompanyKnowledgeDoc:
    """Creates a new operational policy or guideline strictly partitioned to the organization."""
    if not doc_code:
        # Generate next code
        count_stmt = select(CompanyKnowledgeDoc).where(CompanyKnowledgeDoc.organization_id == organization_id)
        res = await db.execute(count_stmt)
        count = len(res.scalars().all()) + 1
        doc_code = f"DOC-C{organization_id}-{count:03d}"

    doc = CompanyKnowledgeDoc(
        doc_code=doc_code,
        organization_id=organization_id,
        title=title,
        category=category,
        content=content,
        tags=tags,
        is_active=True,
        created_by_user_id=user_id
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc

async def update_company_document(
    db: AsyncSession,
    organization_id: int,
    doc_id: int,
    title: Optional[str] = None,
    category: Optional[str] = None,
    content: Optional[str] = None,
    tags: Optional[str] = None,
    is_active: Optional[bool] = None
) -> Optional[CompanyKnowledgeDoc]:
    """Updates a document verifying organization ownership."""
    stmt = select(CompanyKnowledgeDoc).where(
        and_(
            CompanyKnowledgeDoc.id == doc_id,
            CompanyKnowledgeDoc.organization_id == organization_id
        )
    )
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        return None

    if title is not None:
        doc.title = title
    if category is not None:
        doc.category = category
    if content is not None:
        doc.content = content
    if tags is not None:
        doc.tags = tags
    if is_active is not None:
        doc.is_active = is_active

    await db.commit()
    await db.refresh(doc)
    return doc

async def delete_company_document(
    db: AsyncSession,
    organization_id: int,
    doc_id: int
) -> bool:
    """Deletes a document strictly scoped to the company."""
    stmt = select(CompanyKnowledgeDoc).where(
        and_(
            CompanyKnowledgeDoc.id == doc_id,
            CompanyKnowledgeDoc.organization_id == organization_id
        )
    )
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        return False

    await db.delete(doc)
    await db.commit()
    return True
