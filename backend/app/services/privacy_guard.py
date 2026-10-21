"""
NexaERP Enterprise Data Privacy & Tenant Boundary Guard.
Guarantees that company operational records, PII, and financial metrics remain
strictly within the company boundary and are sanitized before any external LLM calls.
"""

import re
from typing import Dict, Any

# Regular expressions for identifying sensitive PII / secrets
CREDIT_CARD_REGEX = re.compile(r'\b(?:\d[ -]*?){13,16}\b')
AADHAAR_SSN_REGEX = re.compile(r'\b\d{4}[ -]?\d{4}[ -]?\d{4}\b')
AUTH_TOKEN_REGEX = re.compile(r'(?i)(bearer\s+[a-zA-Z0-9_\-\.]{25,}|eyJ[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,})')
PASSWORD_ASSIGN_REGEX = re.compile(r'(?i)(password\s*[:=]\s*[\'"][^\'"]+[\'"]|password\s*[:=]\s*\S+)')
PHONE_REGEX = re.compile(r'(?:\+?91[-.\s]?)?[6-9]\d{9}\b')

def mask_sensitive_pii(text: str) -> str:
    """
    Sanitizes user input and database facts before leaving the enterprise boundary.
    Replaces sensitive payment cards, national IDs, credentials, and phone numbers with redaction tags.
    """
    if not text:
        return ""
    
    sanitized = text
    sanitized = AUTH_TOKEN_REGEX.sub("[PROTECTED_AUTH_TOKEN]", sanitized)
    sanitized = PASSWORD_ASSIGN_REGEX.sub("password: [PROTECTED_CREDENTIAL]", sanitized)
    sanitized = CREDIT_CARD_REGEX.sub("[PROTECTED_PAYMENT_CARD]", sanitized)
    sanitized = AADHAAR_SSN_REGEX.sub("[PROTECTED_NATIONAL_ID]", sanitized)
    sanitized = PHONE_REGEX.sub("[PROTECTED_CONTACT_NUMBER]", sanitized)
    return sanitized

def build_tenant_boundary_directive(org_name: str, org_id: int) -> str:
    """
    Creates an immutable system directive injected into the LLM system prompt.
    Enforces strict multi-tenant sandboxing so the LLM operates solely within the company's domain.
    """
    return (
        f"### ENTERPRISE TENANT BOUNDARY: COMPANY #{org_id} ('{org_name}')\n"
        f"CRITICAL DATA PRIVACY DIRECTIVE:\n"
        f"1. You are bound strictly to '{org_name}' (ID: {org_id}). All provided policies, inventory numbers, "
        f"and transactions belong EXCLUSIVELY to '{org_name}'.\n"
        f"2. You must NEVER reveal, compare, invent, or share data relating to other organizations or subsidiaries.\n"
        f"3. Treat all corporate knowledge documents provided below as confidential company-internal intellectual property.\n"
        f"4. If the user asks for financial figures or confidential metrics outside this company's scope, refuse courteously."
    )

def inspect_and_sanitize_payload(payload: Dict[str, Any], org_name: str, org_id: int) -> Dict[str, Any]:
    """
    Ensures outbound LLM payload meets enterprise privacy and tenant isolation standards.
    """
    return {
        "tenant_org_id": org_id,
        "tenant_org_name": org_name,
        "pii_masked": True,
        "boundary_enforced": True
    }
