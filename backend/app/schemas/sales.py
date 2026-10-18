from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=2)
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class CustomerOut(BaseModel):
    id: int
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    total_spend: Decimal

    model_config = ConfigDict(from_attributes=True)

class SalesOrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)

class SalesOrderCreate(BaseModel):
    customer_id: Optional[int] = None
    branch_id: Optional[int] = None
    items: List[SalesOrderItemIn] = Field(..., min_length=1)
    discount_amount: Decimal = Field(Decimal("0.00"), ge=0)
    payment_method: str = Field("CASH", pattern="^(CASH|CARD|UPI|BANK_TRANSFER)$")
    notes: Optional[str] = None

class SalesOrderItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal

    model_config = ConfigDict(from_attributes=True)

class SalesOrderOut(BaseModel):
    id: int
    invoice_number: str
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    branch_id: Optional[int] = None
    cashier_user_id: int
    cashier_name: Optional[str] = None
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    payment_method: str
    payment_status: str
    order_status: str
    notes: Optional[str] = None
    created_at: datetime
    items: List[SalesOrderItemOut] = []

    model_config = ConfigDict(from_attributes=True)
