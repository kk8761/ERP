from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field

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
    basic_salary: Decimal = Field(Decimal("0.00"), ge=0)
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    pan_tax_id: Optional[str] = None

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
    is_active: bool

    class Config:
        from_attributes = True

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

    class Config:
        from_attributes = True

class LeaveCreate(BaseModel):
    employee_id: int
    leave_type: str = Field(..., pattern="^(CASUAL|SICK|ANNUAL|UNPAID)$")
    start_date: date
    end_date: date
    days_count: int = Field(1, ge=1)
    reason: str

class LeaveOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    leave_type: str
    start_date: date
    end_date: date
    days_count: int
    reason: str
    status: str

    class Config:
        from_attributes = True

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

    class Config:
        from_attributes = True
