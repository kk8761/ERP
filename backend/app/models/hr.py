from typing import Optional, List
from decimal import Decimal
from datetime import date, time, datetime
from sqlalchemy import String, Integer, ForeignKey, Numeric, Date, Time, DateTime, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.base import TimestampMixin

class Employee(Base, TimestampMixin):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    department_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("departments.id"), nullable=True)
    branch_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("branches.id"), nullable=True)
    designation: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_joining: Mapped[date] = mapped_column(Date, default=date.today)

    # Personal & Contact Information
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    marital_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    current_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    permanent_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    emergency_contact_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    emergency_contact_relation: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Job & Work Arrangement
    employment_type: Mapped[Optional[str]] = mapped_column(String(50), default="Full-Time")
    work_mode: Mapped[Optional[str]] = mapped_column(String(30), default="In-Office")
    branch_location: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reporting_manager: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reports_to_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("employees.id"), nullable=True)
    hierarchy_role: Mapped[str] = mapped_column(String(30), default="MEMBER") # EXECUTIVE, MANAGER, TEAM_LEAD, MEMBER

    # Detailed Salary Components (Protected by payroll/hr permissions)
    basic_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    hra: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    conveyance_allowance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    special_allowance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    medical_allowance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    variable_pay: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    pf_deduction: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    professional_tax: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    tds_tax: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    net_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)

    # Banking & Statutory
    bank_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    account_holder_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    bank_account_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    bank_ifsc: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    account_type: Mapped[Optional[str]] = mapped_column(String(30), default="Savings")
    pan_tax_id: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    aadhaar_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    uan_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Document Vault & Notes (Stored JSON string of metadata/attachments)
    documents_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    department: Mapped[Optional["Department"]] = relationship("Department")
    branch: Mapped[Optional["Branch"]] = relationship("Branch")
    attendances: Mapped[List["Attendance"]] = relationship("Attendance", back_populates="employee")
    leaves: Mapped[List["LeaveRequest"]] = relationship("LeaveRequest", back_populates="employee")
    payrolls: Mapped[List["PayrollRecord"]] = relationship("PayrollRecord", back_populates="employee")

class Attendance(Base, TimestampMixin):
    __tablename__ = "attendances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(Integer, ForeignKey("employees.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, default=date.today, index=True)
    check_in: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    check_out: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="PRESENT") # PRESENT, LATE, ABSENT, ON_LEAVE

    employee: Mapped["Employee"] = relationship("Employee", back_populates="attendances")

class LeaveRequest(Base, TimestampMixin):
    __tablename__ = "leave_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(Integer, ForeignKey("employees.id"), nullable=False)
    leave_type: Mapped[str] = mapped_column(String(50), nullable=False) # CASUAL, SICK, ANNUAL, UNPAID
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    days_count: Mapped[int] = mapped_column(Integer, default=1)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING") # PENDING, APPROVED, REJECTED
    approved_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

    # Reviewer & Manager Feedback
    manager_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Supporting Documents (Medical cert, ticket, leave proof)
    document_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    document_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    document_size: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    employee: Mapped["Employee"] = relationship("Employee", back_populates="leaves")

class PayrollRecord(Base, TimestampMixin):
    __tablename__ = "payroll_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(Integer, ForeignKey("employees.id"), nullable=False)
    month_year: Mapped[str] = mapped_column(String(20), nullable=False) # e.g. "October 2026"
    basic_pay: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    allowances: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    deductions: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    net_pay: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING") # PENDING, PROCESSED, PAID
    payment_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    employee: Mapped["Employee"] = relationship("Employee", back_populates="payrolls")
