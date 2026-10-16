"""
NexaERP RAG (Retrieval-Augmented Generation) Knowledge Base & Engine
Indexes corporate knowledge (Policies, SOPs, Master Vendor Agreements, Chart of Accounts, Product Catalog)
and performs semantic context retrieval augmented with live transactional facts.
"""

from typing import List, Dict, Any
import re
import math

COMPANY_KNOWLEDGE_DOCS = [
    {
        "id": "DOC-CORP-001",
        "title": "Corporate Procurement Policy & Financial Authority Matrix",
        "category": "Procurement & Governance",
        "content": (
            "Procurement Policy: Purchase orders below ₹ 50,000 can be approved by the Department Head or Procurement Officer. "
            "Purchase requisitions between ₹ 50,000 and ₹ 5,00,000 require dual approval from the Procurement Manager and Finance Director. "
            "All requisitions exceeding ₹ 5,00,000 require formal Board and Executive approval. Standard vendor payment terms are Net-30 days."
        )
    },
    {
        "id": "DOC-CORP-002",
        "title": "Inventory Safety Stock, Reorder SOP & Barcode Standards",
        "category": "Supply Chain & Warehousing",
        "content": (
            "Inventory SOP: Safety stock thresholds are calculated at 1.5x average weekly consumption. "
            "When current stock drops below reorder level (e.g., Basmati Rice at 10 units, Amul Milk at 20 units), "
            "an automated purchase requisition is triggered. All incoming consignments must be verified via GS1-128 barcode scanners "
            "at the receiving bay before stock movement status changes to 'STORED'."
        )
    },
    {
        "id": "DOC-CORP-003",
        "title": "Sales Return, Credit Note & Customer Refund Policy",
        "category": "Sales & Retail",
        "content": (
            "Return Policy: Customers may return unopened, non-perishable merchandise within 14 calendar days of invoice date with valid receipt. "
            "Perishable foodstuffs (e.g. dairy, produce) must be inspected within 24 hours. "
            "Cash refunds are permitted up to ₹ 2,000; returns exceeding ₹ 2,000 are credited via original digital payment method or store credit voucher. "
            "Every return must generate an audited StockMovement entry of type 'RETURN'."
        )
    },
    {
        "id": "DOC-CORP-004",
        "title": "HR Attendance, Leave Encashment & Payroll Calendar",
        "category": "Human Capital Management",
        "content": (
            "HR Regulations: Normal business hours are 09:00 to 18:00 IST Monday through Friday. "
            "Employees are entitled to 18 days of Paid Time Off (PTO), 12 Casual Leaves, and 10 Sick Leaves per fiscal year. "
            "Monthly payroll cutoff date is the 25th of each month, with salary disbursement executed on the 1st of the subsequent month. "
            "Overtime for non-exempt staff is calculated at 1.5x standard hourly wage."
        )
    },
    {
        "id": "DOC-CORP-005",
        "title": "Information Security, Access Requests & JIT Elevation SOP",
        "category": "Information Security",
        "content": (
            "Security Policy: Access control follows the Principle of Least Privilege. "
            "Privileged access (Finance posting, User management, Salary processing) must be requested via Just-In-Time (JIT) Temporary Elevation. "
            "Self-approval is mathematically and procedurally prohibited. Approved elevations expire automatically within the requested duration (maximum 480 minutes). "
            "Accounts lock automatically after 5 consecutive failed login attempts for 15 minutes."
        )
    },
    {
        "id": "DOC-CORP-006",
        "title": "Chart of Accounts Structure & Double-Entry Accounting Standard",
        "category": "Finance & Accounting",
        "content": (
            "Accounting Standards: General ledger accounts are categorized as Assets (1000s), Liabilities (2000s), "
            "Equity (3000s), Revenue (4000s), and Expenses (5000s). Every journal voucher must be strictly balanced: "
            "Sum of Debits must equal Sum of Credits. Cash basis transactions are updated immediately; accruals are reconciled at monthly close."
        )
    }
]

def _tokenize(text: str) -> List[str]:
    return [w for w in re.findall(r'\b\w+\b', text.lower()) if len(w) > 2]

def search_knowledge_base(query: str, top_k: int = 2) -> List[Dict[str, Any]]:
    """
    RAG Retriever: Uses TF-IDF-inspired keyword relevance scoring over company knowledge artifacts.
    """
    q_tokens = _tokenize(query)
    if not q_tokens:
        return COMPANY_KNOWLEDGE_DOCS[:top_k]

    scored = []
    for doc in COMPANY_KNOWLEDGE_DOCS:
        doc_tokens = _tokenize(doc["title"] + " " + doc["content"])
        score = 0.0
        for token in q_tokens:
            count = doc_tokens.count(token)
            if count > 0:
                score += (1.0 + math.log(count)) * 2.0
            if token in doc["title"].lower():
                score += 5.0
        if score > 0:
            scored.append((score, doc))

    scored.sort(key=lambda x: x[0], reverse=True)
    results = [item[1] for item in scored[:top_k]]
    if not results:
        results = [COMPANY_KNOWLEDGE_DOCS[0]]
    return results
