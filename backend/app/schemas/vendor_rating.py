from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict

class OrderEvaluationOut(BaseModel):
    id: int
    purchase_order_id: int
    supplier_id: int
    po_number: str
    order_date: datetime
    promised_delivery_date: Optional[datetime] = None
    actual_delivery_date: Optional[datetime] = None
    quoted_amount: Decimal
    invoiced_amount: Optional[Decimal] = None
    landed_cost: Optional[Decimal] = None
    currency: str = "INR"
    
    delivery_score: Optional[float] = None
    price_score: Optional[float] = None
    quality_score: Optional[float] = None
    service_score: Optional[float] = None
    reliability_score: Optional[float] = None
    compliance_score: Optional[float] = None
    
    overall_score: float
    star_rating: float
    status: str
    confidence_level: str
    
    missing_data: Optional[List[str]] = None
    supporting_evidence: Optional[Dict[str, Any]] = None
    ai_explanation: Optional[str] = None
    
    reviewer_override_score: Optional[float] = None
    reviewer_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class VendorScorecardOut(BaseModel):
    id: int
    supplier_id: int
    supplier_name: Optional[str] = None
    supplier_code: Optional[str] = None
    overall_score: float
    star_rating: float
    
    delivery_avg: float
    price_avg: float
    quality_avg: float
    service_avg: float
    reliability_avg: float
    compliance_avg: float
    
    evaluated_orders_count: int
    on_time_delivery_pct: float
    avg_delay_days: float
    defect_rate_pct: float
    return_rate_pct: float
    price_variance_pct: float
    open_disputes_count: int
    
    compliance_status: str
    is_procurement_eligible: bool
    ineligibility_reason: Optional[str] = None
    
    trend: str
    confidence_level: str
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    recommendations: Optional[List[str]] = None
    last_evaluation_date: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class VendorRatingConfigUpdate(BaseModel):
    delivery_weight: float = Field(..., ge=0, le=100)
    price_weight: float = Field(..., ge=0, le=100)
    quality_weight: float = Field(..., ge=0, le=100)
    service_weight: float = Field(..., ge=0, le=100)
    reliability_weight: float = Field(..., ge=0, le=100)
    compliance_weight: float = Field(..., ge=0, le=100)
    mandatory_compliance_strict: bool = True
    lookback_days: int = Field(180, ge=30, le=730)

class VendorRatingConfigOut(BaseModel):
    id: int
    organization_id: int
    delivery_weight: float
    price_weight: float
    quality_weight: float
    service_weight: float
    reliability_weight: float
    compliance_weight: float
    mandatory_compliance_strict: bool
    lookback_days: int

    model_config = ConfigDict(from_attributes=True)

class OrderScoreOverrideRequest(BaseModel):
    override_score: float = Field(..., ge=0, le=100)
    reason: str = Field(..., min_length=5)

class VendorCompareRequest(BaseModel):
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    quantity: int = Field(..., gt=0)
    required_delivery_days: Optional[int] = Field(None, gt=0)

class VendorComparisonItem(BaseModel):
    supplier_id: int
    supplier_name: str
    supplier_code: str
    overall_score: float
    star_rating: float
    estimated_lead_days: int
    meets_deadline: bool
    unit_price: float
    total_landed_cost: float
    quality_score: float
    delivery_score: float
    compliance_status: str
    is_eligible: bool
    eligibility_note: str
    recommendation_rank: int
    trade_off_summary: str

class VendorCompareResponse(BaseModel):
    product_id: Optional[int]
    product_name: str
    quantity: int
    required_delivery_days: Optional[int]
    recommended_supplier_id: Optional[int]
    recommended_supplier_name: Optional[str]
    recommendation_rationale: str
    vendors: List[VendorComparisonItem]
