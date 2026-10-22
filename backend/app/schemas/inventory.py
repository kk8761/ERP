from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2)
    code: str = Field(..., min_length=2)
    description: Optional[str] = None

class CategoryOut(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2)
    sku: str = Field(..., min_length=2)
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    unit_of_measure: str = "unit"
    selling_price: Decimal = Field(..., gt=0)
    cost_price: Decimal = Field(Decimal("0.00"), ge=0)
    tax_rate_percent: Decimal = Field(Decimal("0.00"), ge=0)
    reorder_level: int = Field(10, ge=0)
    current_stock: int = Field(0, ge=0)
    image_url: Optional[str] = None
    vision_features: Optional[str] = None
    organization_id: Optional[int] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    unit_of_measure: Optional[str] = None
    selling_price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    tax_rate_percent: Optional[Decimal] = None
    reorder_level: Optional[int] = None
    image_url: Optional[str] = None
    vision_features: Optional[str] = None
    is_active: Optional[bool] = None

class ProductOut(BaseModel):
    id: int
    name: str
    sku: str
    barcode: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    unit_of_measure: str
    selling_price: Decimal
    cost_price: Decimal
    tax_rate_percent: Decimal
    reorder_level: int
    current_stock: int
    image_url: Optional[str] = None
    vision_features: Optional[str] = None
    is_active: bool
    status: str = "Normal" # "Out of Stock", "Low Stock", "In Stock"

    model_config = ConfigDict(from_attributes=True)

class StockAdjustmentIn(BaseModel):
    product_id: int
    adjustment_type: str = Field(..., pattern="^(ADJUSTMENT_IN|ADJUSTMENT_OUT)$")
    quantity: int = Field(..., gt=0)
    notes: Optional[str] = None
