from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, Numeric, Text, Float, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin

class VendorOrderEvaluation(Base, TimestampMixin):
    """
    Order-specific vendor evaluation record calculated for each purchase order.
    Evaluates delivery speed, price competitiveness, quality, service, reliability,
    and compliance based on verifiable ERP operational evidence.
    """
    __tablename__ = "vendor_order_evaluations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    purchase_order_id: Mapped[int] = mapped_column(Integer, ForeignKey("purchase_orders.id"), unique=True, index=True, nullable=False)
    supplier_id: Mapped[int] = mapped_column(Integer, ForeignKey("suppliers.id"), index=True, nullable=False)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"), default=1, index=True)
    
    po_number: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    order_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    promised_delivery_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_delivery_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    quoted_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    invoiced_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    landed_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    
    # 0-100 Dimension Scores (Normalized)
    delivery_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    price_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    quality_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    service_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reliability_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    compliance_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Aggregated Score & Star Rating
    overall_score: Mapped[float] = mapped_column(Float, default=85.0)
    star_rating: Mapped[float] = mapped_column(Float, default=4.25)
    
    # Status: PROVISIONAL (prior to receipt/inspection) or FINAL
    status: Mapped[str] = mapped_column(String(30), default="PROVISIONAL", index=True)
    confidence_level: Mapped[str] = mapped_column(String(20), default="MEDIUM") # LOW, MEDIUM, HIGH
    
    # Evidence & Audit
    missing_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON list of unperformed assessments
    supporting_evidence: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON dictionary of raw metrics
    ai_explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Reviewer Override & Dispute
    reviewer_override_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reviewer_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    supplier: Mapped["Supplier"] = relationship("Supplier")
    purchase_order: Mapped["PurchaseOrder"] = relationship("PurchaseOrder")


class VendorScorecard(Base, TimestampMixin):
    """
    Centralized vendor performance scorecard aggregated across historical eligible orders.
    Maintains average scores across dimensions, on-time percentage, defect rates,
    compliance status, and transparent trend analysis.
    """
    __tablename__ = "vendor_scorecards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    supplier_id: Mapped[int] = mapped_column(Integer, ForeignKey("suppliers.id"), unique=True, index=True, nullable=False)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"), default=1, index=True)
    
    overall_score: Mapped[float] = mapped_column(Float, default=90.0)
    star_rating: Mapped[float] = mapped_column(Float, default=4.5)
    
    # Dimension Averages (0-100)
    delivery_avg: Mapped[float] = mapped_column(Float, default=90.0)
    price_avg: Mapped[float] = mapped_column(Float, default=88.0)
    quality_avg: Mapped[float] = mapped_column(Float, default=92.0)
    service_avg: Mapped[float] = mapped_column(Float, default=90.0)
    reliability_avg: Mapped[float] = mapped_column(Float, default=91.0)
    compliance_avg: Mapped[float] = mapped_column(Float, default=95.0)
    
    # Verifiable Statistical Metrics
    evaluated_orders_count: Mapped[int] = mapped_column(Integer, default=0)
    on_time_delivery_pct: Mapped[float] = mapped_column(Float, default=100.0)
    avg_delay_days: Mapped[float] = mapped_column(Float, default=0.0)
    defect_rate_pct: Mapped[float] = mapped_column(Float, default=0.0)
    return_rate_pct: Mapped[float] = mapped_column(Float, default=0.0)
    price_variance_pct: Mapped[float] = mapped_column(Float, default=0.0)
    open_disputes_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # Compliance & Procurement Eligibility
    compliance_status: Mapped[str] = mapped_column(String(30), default="COMPLIANT") # COMPLIANT, ALERT, EXPIRED, NON_COMPLIANT
    is_procurement_eligible: Mapped[bool] = mapped_column(Boolean, default=True)
    ineligibility_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Trends & Insights
    trend: Mapped[str] = mapped_column(String(30), default="STABLE") # IMPROVING, STABLE, DECLINING
    confidence_level: Mapped[str] = mapped_column(String(20), default="MEDIUM") # LOW, MEDIUM, HIGH
    strengths: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON list
    weaknesses: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON list
    recommendations: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON list
    last_evaluation_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    supplier: Mapped["Supplier"] = relationship("Supplier")


class VendorRatingConfig(Base, TimestampMixin):
    """
    Administrator-configurable weighting and mandatory compliance rules
    for vendor evaluation calculations.
    """
    __tablename__ = "vendor_rating_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"), default=1, unique=True, index=True)
    
    # Percentage weights summing to 100%
    delivery_weight: Mapped[float] = mapped_column(Float, default=25.0)
    price_weight: Mapped[float] = mapped_column(Float, default=25.0)
    quality_weight: Mapped[float] = mapped_column(Float, default=20.0)
    service_weight: Mapped[float] = mapped_column(Float, default=15.0)
    reliability_weight: Mapped[float] = mapped_column(Float, default=10.0)
    compliance_weight: Mapped[float] = mapped_column(Float, default=5.0)
    
    mandatory_compliance_strict: Mapped[bool] = mapped_column(Boolean, default=True)
    lookback_days: Mapped[int] = mapped_column(Integer, default=180)


class VendorEventLog(Base, TimestampMixin):
    """
    Immutable audit trail of vendor evaluations, score updates, and reviewer overrides.
    """
    __tablename__ = "vendor_event_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    supplier_id: Mapped[int] = mapped_column(Integer, ForeignKey("suppliers.id"), index=True, nullable=False)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"), default=1, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    old_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    new_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

    supplier: Mapped["Supplier"] = relationship("Supplier")
