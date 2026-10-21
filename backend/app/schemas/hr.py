from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class EmployeeCreate(BaseModel):
    employee_code: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    designation: str
    department_id: Optional[int] = None
    branch_id: Optional[int] = None
    date_of_joining: date = Field(default_factory=date.today)

    # Personal details
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    marital_status: Optional[str] = None
    current_address: Optional[str] = None
    permanent_address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None

    # Job & Work details
    employment_type: Optional[str] = "Full-Time"
    work_mode: Optional[str] = "In-Office"
    branch_location: Optional[str] = None
    reporting_manager: Optional[str] = None
    reports_to_id: Optional[int] = None
    hierarchy_role: Optional[str] = "MEMBER"

    # Branch Access & App Roles (Stored in MongoDB Community / Free Document Store)
    accessible_branches: Optional[List[str]] = Field(default_factory=lambda: ["ALL"])
    branch_access_policy: Optional[str] = "ALL_BRANCHES"
    app_role: Optional[str] = "Staff"
    module_permissions: Optional[Dict[str, bool]] = Field(default_factory=dict)

    # Salary components
    basic_salary: Decimal = Field(Decimal("0.00"), ge=0)
    hra: Optional[Decimal] = Field(Decimal("0.00"), ge=0)
    conveyance_allowance: Optional[Decimal] = Field(Decimal("0.00"), ge=0)
    special_allowance: Optional[Decimal] = Field(Decimal("0.00"), ge=0)
    medical_allowance: Optional[Decimal] = Field(Decimal("0.00"), ge=0)
    variable_pay: Optional[Decimal] = Field(Decimal("0.00"), ge=0)
    pf_deduction: Optional[Decimal] = Field(Decimal("0.00"), ge=0)
    professional_tax: Optional[Decimal] = Field(Decimal("0.00"), ge=0)
    tds_tax: Optional[Decimal] = Field(Decimal("0.00"), ge=0)
    net_salary: Optional[Decimal] = Field(Decimal("0.00"), ge=0)

    # Bank & Statutory
    bank_name: Optional[str] = None
    account_holder_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    account_type: Optional[str] = "Savings"
    pan_tax_id: Optional[str] = None
    aadhaar_id: Optional[str] = None
    uan_number: Optional[str] = None

    # Document Vault & Notes
    documents_json: Optional[str] = None
    notes: Optional[str] = None

class EmployeeOut(BaseModel):
    id: int
    employee_code: str
    first_name: str
    last_name: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    designation: str
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    date_of_joining: date
    basic_salary: Optional[Decimal] = None # Masked if unauthorized

    # Personal & contact
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    marital_status: Optional[str] = None
    current_address: Optional[str] = None
    permanent_address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None

    # Job & Work & Hierarchy
    employment_type: Optional[str] = None
    work_mode: Optional[str] = None
    branch_location: Optional[str] = None
    reporting_manager: Optional[str] = None
    reports_to_id: Optional[int] = None
    reports_to_name: Optional[str] = None
    hierarchy_role: Optional[str] = "MEMBER"
    direct_reports_count: Optional[int] = 0

    # Branch Access & App Roles (Retrieved from MongoDB Community / Free Document Store)
    accessible_branches: Optional[List[str]] = Field(default_factory=lambda: ["ALL"])
    branch_access_policy: Optional[str] = "ALL_BRANCHES"
    app_role: Optional[str] = "Staff"
    module_permissions: Optional[Dict[str, bool]] = Field(default_factory=dict)
    storage_engine: Optional[str] = None

    # Salary components
    hra: Optional[Decimal] = None
    conveyance_allowance: Optional[Decimal] = None
    special_allowance: Optional[Decimal] = None
    medical_allowance: Optional[Decimal] = None
    variable_pay: Optional[Decimal] = None
    pf_deduction: Optional[Decimal] = None
    professional_tax: Optional[Decimal] = None
    tds_tax: Optional[Decimal] = None
    net_salary: Optional[Decimal] = None

    # Banking & Statutory
    bank_name: Optional[str] = None
    account_holder_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    account_type: Optional[str] = None
    pan_tax_id: Optional[str] = None
    aadhaar_id: Optional[str] = None
    uan_number: Optional[str] = None

    # Documents & Notes
    documents_json: Optional[str] = None
    notes: Optional[str] = None

    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class AttendanceIn(BaseModel):
    employee_id: int
    status: str = Field("PRESENT", pattern="^(PRESENT|LATE|ABSENT|ON_LEAVE)$")

class AttendanceOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: str

    model_config = ConfigDict(from_attributes=True)

class LeaveCreate(BaseModel):
    employee_id: int
    leave_type: str = Field(..., pattern="^(CASUAL|SICK|ANNUAL|UNPAID|MATERNITY|PATERNITY|COMPENSATORY)$")
    start_date: date
    end_date: date
    days_count: int = Field(1, ge=1)
    reason: str
    document_name: Optional[str] = None
    document_url: Optional[str] = None
    document_size: Optional[str] = None

class LeaveReviewAction(BaseModel):
    comment: Optional[str] = None

class LeaveOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    leave_type: str
    start_date: date
    end_date: date
    days_count: int
    reason: str
    status: str
    manager_comment: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    document_name: Optional[str] = None
    document_url: Optional[str] = None
    document_size: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class PayrollCreate(BaseModel):
    employee_id: int
    month_year: str # e.g. "October 2026"
    basic_pay: Decimal = Field(..., ge=0)
    allowances: Decimal = Field(Decimal("0.00"), ge=0)
    deductions: Decimal = Field(Decimal("0.00"), ge=0)

class PayrollOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    month_year: str
    basic_pay: Decimal
    allowances: Decimal
    deductions: Decimal
    net_pay: Decimal
    status: str
    payment_date: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)

class ReportingLineUpdateRequest(BaseModel):
    reports_to_id: Optional[int] = None
    hierarchy_role: Optional[str] = "MEMBER"
