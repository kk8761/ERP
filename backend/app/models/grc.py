from typing import Optional
from sqlalchemy import String, Integer, Float, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
from app.models.base import TimestampMixin

class RiskItem(Base, TimestampMixin):
    __tablename__ = "risk_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    risk_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="Operational")
    likelihood: Mapped[int] = mapped_column(Integer, default=2) # 1-5 scale
    impact: Mapped[int] = mapped_column(Integer, default=3)     # 1-5 scale
    score: Mapped[int] = mapped_column(Integer, default=6)      # likelihood * impact
    severity: Mapped[str] = mapped_column(String(30), default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    owner: Mapped[str] = mapped_column(String(150), default="Risk Manager")
    mitigation_plan: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="IDENTIFIED") # IDENTIFIED, IN_PROGRESS, MITIGATED, CLOSED
    residual_score: Mapped[int] = mapped_column(Integer, default=3)

class ComplianceFramework(Base, TimestampMixin):
    __tablename__ = "compliance_frameworks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    framework_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    version: Mapped[str] = mapped_column(String(30), default="2026", server_default="2026")
    compliance_score: Mapped[int] = mapped_column(Integer, default=95, server_default="95")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1")
    scope: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    controls_total: Mapped[int] = mapped_column(Integer, default=93)
    controls_passed: Mapped[int] = mapped_column(Integer, default=91)
    compliance_rate: Mapped[float] = mapped_column(Float, default=97.8)
    status: Mapped[str] = mapped_column(String(50), default="CERTIFIED")
    next_audit_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

class GrcAudit(Base, TimestampMixin):
    __tablename__ = "grc_audits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    audit_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    auditor: Mapped[str] = mapped_column(String(150), default="Internal SecOps")
    status: Mapped[str] = mapped_column(String(50), default="CLOSED")
    findings: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
