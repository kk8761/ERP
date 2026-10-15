from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field

class SupplierCreate(BaseModel):
    name: str = Field(..., min_length=2)
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gst_tax_number: Optional[str] = None

class SupplierOut(BaseModel):
    id: int
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gst_tax_number: Optional[str] = None

    class Config:
        from_attributes = True

class PurchaseOrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    unit_cost: Decimal = Field(..., gt=0)

class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    branch_id: Optional[int] = None
    items: List[PurchaseOrderItemIn] = Field(..., min_length=1)
    notes: Optional[str] = None

class PurchaseOrderItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity_ordered: int
    quantity_received: int
    unit_cost: Decimal
    line_total: Decimal

    class Config:
        from_attributes = True

class PurchaseOrderOut(BaseModel):
    id: int
    po_number: str
    supplier_id: int
    supplier_name: Optional[str] = None
    status: str
    total_amount: Decimal
    notes: Optional[str] = None
    created_at: datetime
    items: List[PurchaseOrderItemOut] = []

    class Config:
        from_attributes = True
