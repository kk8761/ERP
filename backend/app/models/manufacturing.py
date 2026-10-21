from typing import Optional
from sqlalchemy import String, Integer, Float, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
from app.models.base import TimestampMixin

class WorkCenter(Base, TimestampMixin):
    __tablename__ = "work_centers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="OPERATIONAL") # OPERATIONAL, MAINTENANCE_DUE, OFFLINE
    health: Mapped[float] = mapped_column(Float, default=98.0)
    temperature_c: Mapped[float] = mapped_column(Float, default=35.0)
    vibration_g: Mapped[float] = mapped_column(Float, default=0.1)
    efficiency: Mapped[float] = mapped_column(Float, default=95.0)
    operator: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

class BillOfMaterials(Base, TimestampMixin):
    __tablename__ = "bill_of_materials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bom_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    product_code: Mapped[str] = mapped_column(String(50), nullable=False)
    product_name: Mapped[str] = mapped_column(String(150), nullable=False)
    revision: Mapped[str] = mapped_column(String(20), default="A.1")
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE")
    total_cost: Mapped[float] = mapped_column(Float, default=0.0)
    routing_lead_time_days: Mapped[int] = mapped_column(Integer, default=3)
    components_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON list of components

class ProductionOrder(Base, TimestampMixin):
    __tablename__ = "production_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    bom_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    product_name: Mapped[str] = mapped_column(String(150), nullable=False)
    quantity_planned: Mapped[int] = mapped_column(Integer, default=100)
    quantity_completed: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default="PLANNED") # PLANNED, IN_PROGRESS, COMPLETED, ON_HOLD
    work_center: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    priority: Mapped[str] = mapped_column(String(30), default="MEDIUM")
    progress_percent: Mapped[int] = mapped_column(Integer, default=0)
    start_date: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    due_date: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
