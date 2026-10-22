from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, Numeric, Text, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin

class Supplier(Base, TimestampMixin):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    # Vendor Master Fields
    vendor_code: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True, nullable=True) # e.g. VEND-10042
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    vendor_account_group: Mapped[Optional[str]] = mapped_column(String(50), default="Standard Vendor") # Standard, One-Time, Intercompany
    contact_person: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(10), default="IN")
    gst_tax_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    payment_terms: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default=None) # Net 30, Net 15, 2/10 Net 30
    incoterms: Mapped[Optional[str]] = mapped_column(String(50), default="FOB - Free on Board")
    currency: Mapped[Optional[str]] = mapped_column(String(10), default="INR")
    reconciliation_account: Mapped[Optional[str]] = mapped_column(String(50), default="2000 - Accounts Payable")
    rating_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=None) # Vendor Evaluation Score (0-100), None = UNRATED
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE") # ACTIVE, BLOCKED, UNDER_EVALUATION

    purchase_orders: Mapped[List["PurchaseOrder"]] = relationship("PurchaseOrder", back_populates="supplier")

class PurchaseOrder(Base, TimestampMixin):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    po_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False) # e.g. 4500001024
    supplier_id: Mapped[int] = mapped_column(Integer, ForeignKey("suppliers.id"), nullable=False)
    branch_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("branches.id"), nullable=True)
    purchasing_org: Mapped[Optional[str]] = mapped_column(String(50), default="PORG-1000") # Purchasing Organization
    purchasing_group: Mapped[Optional[str]] = mapped_column(String(50), default="PGRP-001 (Raw Materials)")
    created_by_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

    status: Mapped[str] = mapped_column(String(30), default="DRAFT", index=True) # DRAFT, SUBMITTED, APPROVED, GOODS_RECEIVED, INVOICED, CANCELLED
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    payment_terms: Mapped[Optional[str]] = mapped_column(String(50), default="Net 30 Days")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expected_delivery_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_delivery_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    inspection_status: Mapped[Optional[str]] = mapped_column(String(30), default="PENDING") # PENDING, PASSED, FAILED, PARTIAL
    defect_count: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    invoiced_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    shipping_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), default=0.00)
    tax_duties_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), default=0.00)

    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="purchase_orders")
    items: Mapped[List["PurchaseOrderItem"]] = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    evaluation: Mapped[Optional["VendorOrderEvaluation"]] = relationship("VendorOrderEvaluation", back_populates="purchase_order", uselist=False, cascade="all, delete-orphan")

class PurchaseOrderItem(Base, TimestampMixin):
    __tablename__ = "purchase_order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    purchase_order_id: Mapped[int] = mapped_column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=False)
    material_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # Material Code
    product_name: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity_ordered: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_received: Mapped[int] = mapped_column(Integer, default=0)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    purchase_order: Mapped["PurchaseOrder"] = relationship("PurchaseOrder", back_populates="items")
    product: Mapped["Product"] = relationship("Product")
