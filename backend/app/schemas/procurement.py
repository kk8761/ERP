from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class SupplierCreate(BaseModel):
    name: str = Field(..., min_length=2)
    vendor_code: Optional[str] = None
    vendor_account_group: Optional[str] = "Standard Vendor"
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = "IN"
    gst_tax_number: Optional[str] = None
    payment_terms: Optional[str] = "Net 30 Days"
    incoterms: Optional[str] = "FOB - Free on Board"
    reconciliation_account: Optional[str] = "2000 - Accounts Payable"
    rating_score: Optional[float] = 92.5
    status: Optional[str] = "ACTIVE"

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    payment_terms: Optional[str] = None
    incoterms: Optional[str] = None
    rating_score: Optional[float] = None
    status: Optional[str] = None

class SupplierOut(BaseModel):
    id: int
    vendor_code: Optional[str] = None
    name: str
    vendor_account_group: Optional[str] = "Standard Vendor"
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = "IN"
    gst_tax_number: Optional[str] = None
    payment_terms: Optional[str] = "Net 30 Days"
    incoterms: Optional[str] = "FOB - Free on Board"
    reconciliation_account: Optional[str] = "2000 - Accounts Payable"
    rating_score: Optional[float] = 92.5
    status: Optional[str] = "ACTIVE"
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class PurchaseOrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    unit_cost: Decimal = Field(..., gt=0)

class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    branch_id: Optional[int] = None
    purchasing_org: Optional[str] = "PORG-1000"
    purchasing_group: Optional[str] = "PGRP-001 (Raw Materials)"
    payment_terms: Optional[str] = "Net 30 Days"
    items: List[PurchaseOrderItemIn] = Field(..., min_length=1)
    notes: Optional[str] = None

class PurchaseOrderItemOut(BaseModel):
    id: int
    product_id: int
    material_number: Optional[str] = None
    product_name: str
    quantity_ordered: int
    quantity_received: int
    unit_cost: Decimal
    line_total: Decimal

    model_config = ConfigDict(from_attributes=True)

class PurchaseOrderOut(BaseModel):
    id: int
    po_number: str
    supplier_id: int
    supplier_name: Optional[str] = None
    purchasing_org: Optional[str] = "PORG-1000"
    purchasing_group: Optional[str] = "PGRP-001 (Raw Materials)"
    status: str
    total_amount: Decimal
    payment_terms: Optional[str] = "Net 30 Days"
    notes: Optional[str] = None
    created_at: datetime
    items: List[PurchaseOrderItemOut] = []

    model_config = ConfigDict(from_attributes=True)
