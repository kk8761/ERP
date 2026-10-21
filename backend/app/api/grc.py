from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.auth import User
from app.models.grc import RiskItem, ComplianceFramework, GrcAudit

router = APIRouter(prefix="/api/grc", tags=["GRC"])

INITIAL_RISK_REGISTER = [
    {
        "risk_code": "RSK-001",
        "title": "Third-Party Cloud Infrastructure Outage",
        "category": "Operational",
        "likelihood": 2,
        "impact": 5,
        "score": 10,
        "severity": "HIGH",
        "owner": "Cloud Operations Lead",
        "mitigation_plan": "Multi-region failover cluster with automated DNS health probe routing.",
        "status": "MITIGATED",
        "residual_score": 4
    },
    {
        "risk_code": "RSK-002",
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
        "risk_code": "RSK-003",
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
        "risk_code": "RSK-004",
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
        "risk_code": "RSK-005",
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

INITIAL_COMPLIANCE_FRAMEWORKS = [
    {
        "framework_code": "FW-ISO27001",
        "name": "ISO/IEC 27001:2022",
        "version": "2026",
        "compliance_score": 98,
        "is_active": True,
        "scope": "Information Security Management System",
        "controls_total": 93,
        "controls_passed": 91,
        "compliance_rate": 97.8,
        "status": "CERTIFIED",
        "next_audit_date": "2027-02-15"
    },
    {
        "framework_code": "FW-SOC2",
        "name": "SOC 2 Type II",
        "version": "2026",
        "compliance_score": 100,
        "is_active": True,
        "scope": "Security, Confidentiality & Availability Trust Principles",
        "controls_total": 64,
        "controls_passed": 64,
        "compliance_rate": 100.0,
        "status": "CERTIFIED",
        "next_audit_date": "2026-12-10"
    },
    {
        "framework_code": "FW-SOX404",
        "name": "Sarbanes-Oxley (SOX) Section 404",
        "version": "2026",
        "compliance_score": 96,
        "is_active": True,
        "scope": "Internal Controls Over Financial Reporting (ICFR)",
        "controls_total": 52,
        "controls_passed": 50,
        "compliance_rate": 96.1,
        "status": "AUDITING",
        "next_audit_date": "2026-11-20"
    },
    {
        "framework_code": "FW-GDPR",
        "name": "EU General Data Protection Regulation (GDPR)",
        "version": "2026",
        "compliance_score": 100,
        "is_active": True,
        "scope": "Data Subject Rights, Consent Management, and DPO Governance",
        "controls_total": 45,
        "controls_passed": 45,
        "compliance_rate": 100.0,
        "status": "COMPLIANT",
        "next_audit_date": "2027-04-01"
    }
]

INITIAL_AUDIT_LOG_ITEMS = [
    {
        "audit_code": "AUD-9912",
        "title": "Quarterly Privileged Access & JIT Elevation Review",
        "auditor": "KPMG Enterprise Assurance",
        "status": "CLOSED",
        "findings": 0,
        "completed_at": "2026-09-30"
    },
    {
        "audit_code": "AUD-9913",
        "title": "Disaster Recovery & Hot Failover Tabletop Drill",
        "auditor": "Internal SecOps Team",
        "status": "CLOSED",
        "findings": 1,
        "completed_at": "2026-10-04"
    },
    {
        "audit_code": "AUD-9914",
        "title": "Annual Inventory & Asset Ledger Physical Count Reconciliation",
        "auditor": "Deloitte Financial Advisory",
        "status": "SCHEDULED",
        "findings": 0,
        "completed_at": "2026-11-05"
    }
]

async def _ensure_grc_seeded(db: AsyncSession):
    # Risks
    risk_res = await db.execute(select(RiskItem))
    if not risk_res.scalars().first():
        for r in INITIAL_RISK_REGISTER:
            db.add(RiskItem(**r))
        await db.commit()

    # Frameworks
    fw_res = await db.execute(select(ComplianceFramework))
    if not fw_res.scalars().first():
        for f in INITIAL_COMPLIANCE_FRAMEWORKS:
            db.add(ComplianceFramework(**f))
        await db.commit()

    # Audits
    aud_res = await db.execute(select(GrcAudit))
    if not aud_res.scalars().first():
        for a in INITIAL_AUDIT_LOG_ITEMS:
            db.add(GrcAudit(**a))
        await db.commit()

@router.get("/metrics")
async def get_grc_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await _ensure_grc_seeded(db)
    risks = (await db.execute(select(RiskItem))).scalars().all()
    frameworks = (await db.execute(select(ComplianceFramework))).scalars().all()

    critical_risks = len([r for r in risks if r.severity == "CRITICAL"])
    high_risks = len([r for r in risks if r.severity == "HIGH"])
    overall_compliance = round(sum(f.compliance_rate for f in frameworks) / len(frameworks), 1) if frameworks else 98.5

    return {
        "overall_compliance_score": overall_compliance,
        "active_risks_count": len(risks),
        "critical_risks_count": critical_risks,
        "high_risks_count": high_risks,
        "certifications_active": len([f for f in frameworks if f.status == "CERTIFIED"]),
        "audit_readiness": "AUDIT_READY"
    }

@router.get("/risks")
async def list_risks(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await _ensure_grc_seeded(db)
    query = select(RiskItem)
    if category:
        query = query.where(RiskItem.category == category)
    risks = (await db.execute(query)).scalars().all()

    return [
        {
            "id": r.risk_code,
            "title": r.title,
            "category": r.category,
            "likelihood": r.likelihood,
            "impact": r.impact,
            "score": r.score,
            "severity": r.severity,
            "owner": r.owner,
            "mitigation_plan": r.mitigation_plan,
            "status": r.status,
            "residual_score": r.residual_score
        }
        for r in risks
    ]

@router.get("/frameworks")
async def list_frameworks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await _ensure_grc_seeded(db)
    frameworks = (await db.execute(select(ComplianceFramework))).scalars().all()
    return [
        {
            "id": f.framework_code,
            "name": f.name,
            "scope": f.scope,
            "controls_total": f.controls_total,
            "controls_passed": f.controls_passed,
            "compliance_rate": f.compliance_rate,
            "status": f.status,
            "next_audit_date": f.next_audit_date
        }
        for f in frameworks
    ]

@router.get("/audits")
async def list_audits(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await _ensure_grc_seeded(db)
    audits = (await db.execute(select(GrcAudit))).scalars().all()
    return [
        {
            "id": a.audit_code,
            "title": a.title,
            "auditor": a.auditor,
            "status": a.status,
            "findings": a.findings,
            "completed_at": a.completed_at
        }
        for a in audits
    ]
