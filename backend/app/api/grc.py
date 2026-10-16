from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel

from app.auth.dependencies import get_current_user
from app.models.auth import User

router = APIRouter(prefix="/api/grc", tags=["GRC"])

RISK_REGISTER = [
    {
        "id": "RSK-001",
        "title": "Third-Party Cloud Infrastructure Outage",
        "category": "Operational",
        "likelihood": 2, # 1-5 scale
        "impact": 5,     # 1-5 scale
        "score": 10,     # likelihood * impact
        "severity": "HIGH",
        "owner": "Cloud Operations Lead",
        "mitigation_plan": "Multi-region failover cluster with automated DNS health probe routing.",
        "status": "MITIGATED",
        "residual_score": 4
    },
    {
        "id": "RSK-002",
        "title": "Privileged Credential Compromise & Session Hijacking",
        "category": "Cybersecurity",
        "likelihood": 2,
        "impact": 5,
        "score": 10,
        "severity": "HIGH",
        "owner": "Chief Information Security Officer",
        "mitigation_plan": "Enforce JIT role elevation, hardware FIDO2 MFA tokens, and 15-minute token TTLs.",
        "status": "MITIGATED",
        "residual_score": 3
    },
    {
        "id": "RSK-003",
        "title": "Critical Semiconductor Component Supply Disruption",
        "category": "Supply Chain",
        "likelihood": 4,
        "impact": 4,
        "score": 16,
        "severity": "CRITICAL",
        "owner": "VP of Procurement",
        "mitigation_plan": "Establish secondary dual-sourcing contracts in Southeast Asia and 90-day safety stock.",
        "status": "IN_PROGRESS",
        "residual_score": 8
    },
    {
        "id": "RSK-004",
        "title": "Cross-Border Data Residency & GDPR Audit Non-Compliance",
        "category": "Regulatory",
        "likelihood": 1,
        "impact": 4,
        "score": 4,
        "severity": "MEDIUM",
        "owner": "General Counsel & Data Privacy Officer",
        "mitigation_plan": "Strict EU-local database sharding and automated PII redaction pipeline.",
        "status": "VERIFIED",
        "residual_score": 2
    },
    {
        "id": "RSK-005",
        "title": "Foreign Exchange Volatility in Raw Material Invoicing",
        "category": "Financial",
        "likelihood": 3,
        "impact": 3,
        "score": 9,
        "severity": "MEDIUM",
        "owner": "Corporate Treasurer",
        "mitigation_plan": "Hedging 70% of quarterly currency exposure via automated forward contracts.",
        "status": "IN_PROGRESS",
        "residual_score": 4
    }
]

COMPLIANCE_FRAMEWORKS = [
    {
        "id": "FW-ISO27001",
        "name": "ISO/IEC 27001:2022",
        "scope": "Information Security Management System",
        "controls_total": 93,
        "controls_passed": 91,
        "compliance_rate": 97.8,
        "status": "CERTIFIED",
        "next_audit_date": "2027-02-15"
    },
    {
        "id": "FW-SOC2",
        "name": "SOC 2 Type II",
        "scope": "Security, Confidentiality & Availability Trust Principles",
        "controls_total": 64,
        "controls_passed": 64,
        "compliance_rate": 100.0,
        "status": "CERTIFIED",
        "next_audit_date": "2026-12-10"
    },
    {
        "id": "FW-SOX404",
        "name": "Sarbanes-Oxley (SOX) Section 404",
        "scope": "Internal Controls Over Financial Reporting (ICFR)",
        "controls_total": 52,
        "controls_passed": 50,
        "compliance_rate": 96.1,
        "status": "AUDITING",
        "next_audit_date": "2026-11-20"
    },
    {
        "id": "FW-GDPR",
        "name": "EU General Data Protection Regulation (GDPR)",
        "scope": "Data Subject Rights, Consent Management, and DPO Governance",
        "controls_total": 45,
        "controls_passed": 45,
        "compliance_rate": 100.0,
        "status": "COMPLIANT",
        "next_audit_date": "2027-04-01"
    }
]

AUDIT_LOG_ITEMS = [
    {
        "id": "AUD-9912",
        "title": "Quarterly Privileged Access & JIT Elevation Review",
        "auditor": "KPMG Enterprise Assurance",
        "status": "CLOSED",
        "findings": 0,
        "completed_at": "2026-09-30"
    },
    {
        "id": "AUD-9913",
        "title": "Disaster Recovery & Hot Failover Tabletop Drill",
        "auditor": "Internal SecOps Team",
        "status": "CLOSED",
        "findings": 1,
        "completed_at": "2026-10-04"
    },
    {
        "id": "AUD-9914",
        "title": "Annual Inventory & Asset Ledger Physical Count Reconciliation",
        "auditor": "Deloitte Financial Advisory",
        "status": "SCHEDULED",
        "findings": 0,
        "completed_at": "2026-11-05"
    }
]

@router.get("/metrics")
async def get_grc_metrics(current_user: User = Depends(get_current_user)):
    critical_risks = len([r for r in RISK_REGISTER if r["severity"] == "CRITICAL"])
    high_risks = len([r for r in RISK_REGISTER if r["severity"] == "HIGH"])
    overall_compliance = round(sum(f["compliance_rate"] for f in COMPLIANCE_FRAMEWORKS) / len(COMPLIANCE_FRAMEWORKS), 1)

    return {
        "overall_compliance_score": overall_compliance,
        "active_risks_count": len(RISK_REGISTER),
        "critical_risks_count": critical_risks,
        "high_risks_count": high_risks,
        "certifications_active": len([f for f in COMPLIANCE_FRAMEWORKS if f["status"] == "CERTIFIED"]),
        "audit_readiness": "AUDIT_READY"
    }

@router.get("/risks")
async def list_risks(category: Optional[str] = None, current_user: User = Depends(get_current_user)):
    if category:
        return [r for r in RISK_REGISTER if r["category"] == category]
    return RISK_REGISTER

@router.get("/frameworks")
async def list_frameworks(current_user: User = Depends(get_current_user)):
    return COMPLIANCE_FRAMEWORKS

@router.get("/audits")
async def list_audits(current_user: User = Depends(get_current_user)):
    return AUDIT_LOG_ITEMS
