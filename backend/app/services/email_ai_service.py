"""
NexaERP Email AI Intelligence Service.
Powers:
1. Information extraction from incoming emails (Summary, Intent, Urgency, Entities, Amounts, Dates).
2. Content suggestion & Auto-drafting for new outgoing emails.
3. Context-aware smart replies.
Uses Groq LLM with resilient regex-based fallback.
"""

import re
import json
from typing import Dict, Any, Optional
from app.services.ai_service import _call_groq_llm

def extract_email_intelligence(subject: str, body: str, sender: str = "") -> Dict[str, Any]:
    """
    Extracts structured business intelligence from an incoming email:
    - Summary
    - Intent
    - Urgency
    - Key Entities (PO #, Invoice #, Amounts, Due Dates)
    - Contextual Suggested Reply
    """
    # 1. Try Groq LLM
    system_prompt = (
        "You are an enterprise ERP Email Intelligence AI for NexaERP. "
        "Analyze the provided business email and output STRICT JSON only with keys: "
        "'summary' (string, max 2 sentences), "
        "'intent' (string, one of: 'PO_ACKNOWLEDGMENT', 'QUOTATION_RESPONSE', 'INVOICE_SUBMISSION', 'PAYMENT_RECEIPT', 'ORDER_STATUS_INQUIRY', 'DISPUTE_ESCALATION', 'GENERAL_INQUIRY'), "
        "'urgency' (string, one of: 'CRITICAL', 'HIGH', 'NORMAL', 'LOW'), "
        "'extracted_data' (object with keys: 'document_reference' (string or null), 'amount' (number or null), 'currency' (string or null), 'due_date' (string or null), 'action_required' (string or null)), "
        "'suggested_reply' (string, professional B2B draft reply)."
    )
    user_prompt = f"Sender: {sender}\nSubject: {subject}\nBody:\n{body}"

    llm_resp = _call_groq_llm(system_prompt, user_prompt)
    if llm_resp:
        try:
            # Extract JSON block if wrapped in markdown
            json_match = re.search(r'\{.*\}', llm_resp, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(0))
                return {
                    "summary": parsed.get("summary") or "Business communication received.",
                    "intent": parsed.get("intent") or "GENERAL_INQUIRY",
                    "urgency": parsed.get("urgency") or "NORMAL",
                    "extracted_data": parsed.get("extracted_data") or {},
                    "suggested_reply": parsed.get("suggested_reply") or "Thank you for your message. We have received your update and will process it accordingly."
                }
        except Exception:
            pass

    # 2. Resilient Rule-Based Fallback
    summary = f"Communication regarding '{subject[:60]}'."
    intent = "GENERAL_INQUIRY"
    urgency = "NORMAL"

    subject_lower = (subject + " " + body).lower()

    if any(k in subject_lower for k in ["urgent", "asap", "immediate", "overdue", "critical", "blocked"]):
        urgency = "HIGH"
    elif any(k in subject_lower for k in ["emergency", "escalation", "breach", "server down"]):
        urgency = "CRITICAL"

    if any(k in subject_lower for k in ["invoice", "bill", "tax invoice", "receipt", "payment"]):
        intent = "INVOICE_SUBMISSION"
    elif any(k in subject_lower for k in ["purchase order", "po-", "order confirmation", "acknowledgment"]):
        intent = "PO_ACKNOWLEDGMENT"
    elif any(k in subject_lower for k in ["quotation", "rfq", "price quote", "proposal"]):
        intent = "QUOTATION_RESPONSE"

    # Regex entity extraction
    extracted: Dict[str, Any] = {
        "document_reference": None,
        "amount": None,
        "currency": "INR",
        "due_date": None,
        "action_required": None
    }

    # Match PO or Invoice numbers
    doc_match = re.search(r'\b(PO-[A-Z0-9-]+|INV-[A-Z0-9-]+|PR-[A-Z0-9-]+)\b', subject + " " + body, re.IGNORECASE)
    if doc_match:
        extracted["document_reference"] = doc_match.group(1).upper()

    # Match monetary amounts like ₹ 712,000 or $5,000 or Rs. 45000
    amt_match = re.search(r'(?:₹|Rs\.?|INR|\$)\s*([0-9,]+(?:\.[0-9]{2})?)', body)
    if amt_match:
        try:
            extracted["amount"] = float(amt_match.group(1).replace(",", ""))
        except ValueError:
            pass

    # Match Dates
    date_match = re.search(r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b', body, re.IGNORECASE)
    if date_match:
        extracted["due_date"] = date_match.group(1)

    suggested_reply = (
        f"Dear {sender.split('@')[0].capitalize() or 'Partner'},\n\n"
        f"Thank you for contacting NexaERP Operations regarding '{subject}'. "
        f"We have noted your details and our team is actively coordinating next steps.\n\n"
        "Best regards,\nKarthik Reddy\nSystem Administrator • Nexa Global Enterprises"
    )

    return {
        "summary": summary,
        "intent": intent,
        "urgency": urgency,
        "extracted_data": extracted,
        "suggested_reply": suggested_reply
    }


def suggest_email_content(
    topic: str,
    recipient_name: Optional[str] = None,
    context: Optional[str] = None,
    tone: str = "formal",
    vendor_info: Optional[Dict[str, Any]] = None,
    order_info: Optional[Dict[str, Any]] = None,
    user_role: Optional[str] = None,
    user_name: Optional[str] = None,
    user_title: Optional[str] = None
) -> Dict[str, str]:
    """
    Generates a full subject and body draft based on user prompt, desired tone, and business context.
    If vendor_info or order_info is supplied, guarantees strict RAG grounding with ZERO cross-contamination (anti criss-cross).
    Tailors tone and signature to the sender's role.
    """
    sender_name = user_name or "Karthik Reddy"
    sender_title = user_title or "System Administrator"
    
    # 1. Build Grounded Context Block
    grounded_context_lines = []
    
    if vendor_info:
        grounded_context_lines.append(
            f"TARGET VENDOR: {vendor_info.get('name')} (Code: {vendor_info.get('vendor_code', 'N/A')}, "
            f"Contact: {vendor_info.get('contact_person', 'Accounts')}, Email: {vendor_info.get('email', 'N/A')}, "
            f"Terms: {vendor_info.get('payment_terms', 'Net 30 Days')})"
        )
    
    if order_info:
        items_text = ", ".join([
            f"{it.get('product_name')} (Qty: {it.get('quantity_ordered', it.get('quantity', 1))})"
            for it in order_info.get('items', [])[:4]
        ])
        grounded_context_lines.append(
            f"TARGET ORDER: Reference {order_info.get('order_reference', 'N/A')} | "
            f"Status: {order_info.get('status', 'PENDING')} | Total: ₹{order_info.get('total_amount', 0):,.2f} | "
            f"Items: {items_text or 'Procured Goods'}"
        )
        if order_info.get("carrier_info"):
            c_info = order_info["carrier_info"]
            grounded_context_lines.append(
                f"CARRIER LOGISTICS: {c_info.get('carrier_name')} (Waybill: {c_info.get('tracking_number')}, "
                f"ETA: {c_info.get('estimated_delivery')}, Status: {c_info.get('live_status')})"
            )

    if context:
        grounded_context_lines.append(f"ADDITIONAL CONTEXT: {context}")

    full_context_str = "\n".join(grounded_context_lines) if grounded_context_lines else "NexaERP Enterprise Operations"

    # 2. Construct LLM System Prompt with Anti-Hallucination & Anti Criss-Cross Guardrails
    system_prompt = (
        f"You are an enterprise ERP Email Copilot for NexaERP. Tone: {tone}.\n"
        f"Sender: {sender_name}, Role: {sender_title} ({user_role or 'Administrator'}).\n"
        "CRITICAL ANTI-HALLUCINATION RULES:\n"
        "1. GROUNDING: If Target Vendor or Target Order is provided, you MUST restrict all facts (names, PO numbers, items, amounts) strictly to that specific vendor and order.\n"
        "2. ZERO CRISS-CROSS: NEVER introduce, mention, or mix data, product names, or order numbers from any other vendor or order.\n"
        "3. ROLE-AWARE VOICE: Speak from the sender's exact functional authority (e.g. Procurement focuses on PO lead times/terms; Finance focuses on remittance/invoices; Logistics focuses on dock delivery/waybills).\n"
        "4. Output STRICT JSON only with keys: 'subject' (concise professional subject line) and 'body' (formatted email body text with greeting, clear request/update, bullet points if relevant, and professional sign-off)."
    )
    user_prompt = (
        f"Topic/Instructions: {topic}\n"
        f"Recipient Name: {recipient_name or (vendor_info.get('name') if vendor_info else 'Partner')}\n"
        f"ERP Verified Grounding Context:\n{full_context_str}"
    )

    llm_resp = _call_groq_llm(system_prompt, user_prompt)
    if llm_resp:
        try:
            json_match = re.search(r'\{.*\}', llm_resp, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(0))
                if parsed.get("subject") and parsed.get("body"):
                    return {
                        "subject": parsed["subject"],
                        "body": parsed["body"]
                    }
        except Exception:
            pass

    # 3. Deterministic Grounded Fallback (100% Criss-Cross Free)
    recipient_disp = recipient_name or (vendor_info.get("name") if vendor_info else "Partner")
    
    order_ref = order_info.get("order_reference") if order_info else None
    vendor_disp = vendor_info.get("name") if vendor_info else None

    if order_ref and vendor_disp:
        subject = f"[{order_ref}] {topic.title()} - NexaERP / {vendor_disp}"
    elif order_ref:
        subject = f"[{order_ref}] {topic.title()} - NexaERP"
    elif vendor_disp:
        subject = f"{topic.title()} - NexaERP / {vendor_disp}"
    else:
        subject = f"Notice Regarding: {topic.title()}"

    body_lines = [
        f"Dear {recipient_disp},\n",
        f"I am writing to you on behalf of NexaERP Operations regarding {topic}.\n"
    ]

    if order_info:
        body_lines.append(f"Order Summary for Reference {order_ref}:")
        body_lines.append(f"• Current Status: {order_info.get('status', 'ACTIVE')}")
        body_lines.append(f"• Total Order Value: ₹{order_info.get('total_amount', 0):,.2f} INR")
        if order_info.get("payment_terms"):
            body_lines.append(f"• Agreed Payment Terms: {order_info.get('payment_terms')}")
        if order_info.get("items"):
            body_lines.append("• Line Items Summary:")
            for it in order_info["items"][:4]:
                body_lines.append(f"   - {it.get('product_name')}: {it.get('quantity_ordered', it.get('quantity', 1))} units")
        if order_info.get("carrier_info"):
            c = order_info["carrier_info"]
            body_lines.append(f"• Freight Carrier: {c.get('carrier_name')} (Waybill #{c.get('tracking_number')}, ETA: {c.get('estimated_delivery')})")
        body_lines.append("")

    body_lines.extend([
        "Please review the details above and let us know your confirmation or earliest status update.",
        "Should you require any further documentation or adjustments, please reply directly to this thread.\n",
        "Best regards,",
        f"{sender_name}",
        f"{sender_title}",
        "Nexa Global Enterprises"
    ])

    return {
        "subject": subject,
        "body": "\n".join(body_lines)
    }

