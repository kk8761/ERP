from typing import Optional, List
from decimal import Decimal
from sqlalchemy import String, Integer, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin

class Customer(Base, TimestampMixin):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    total_spend: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)

    orders: Mapped[List["SalesOrder"]] = relationship("SalesOrder", back_populates="customer")

class SalesOrder(Base, TimestampMixin):
    __tablename__ = "sales_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    customer_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("customers.id"), nullable=True)
    branch_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("branches.id"), nullable=True)
    cashier_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    payment_method: Mapped[str] = mapped_column(String(50), default="CASH") # CASH, CARD, UPI, BANK_TRANSFER
    payment_status: Mapped[str] = mapped_column(String(30), default="PAID") # PAID, PENDING, REFUNDED
    order_status: Mapped[str] = mapped_column(String(30), default="COMPLETED") # COMPLETED, CANCELLED, RETURNED
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    customer: Mapped[Optional["Customer"]] = relationship("Customer", back_populates="orders")
    items: Mapped[List["SalesOrderItem"]] = relationship("SalesOrderItem", back_populates="order", cascade="all, delete-orphan")

class SalesOrderItem(Base, TimestampMixin):
    __tablename__ = "sales_order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("sales_orders.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=False)
    product_name: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    order: Mapped["SalesOrder"] = relationship("SalesOrder", back_populates="items")
    product: Mapped["Product"] = relationship("Product")
