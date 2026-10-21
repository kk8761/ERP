from typing import Optional, List
from decimal import Decimal
from datetime import date
from pydantic import BaseModel, Field, ConfigDict, model_validator

class AccountCreate(BaseModel):
    code: str
    name: str
    account_type: str = Field(..., pattern="^(ASSET|LIABILITY|EQUITY|REVENUE|EXPENSE)$")
    balance: Decimal = Decimal("0.00")

class AccountOut(BaseModel):
    id: int
    code: str
    name: str
    account_type: str
    balance: Decimal
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class JournalLineIn(BaseModel):
    account_id: int
    debit: Decimal = Field(default=Decimal("0.00"), ge=0)
    credit: Decimal = Field(default=Decimal("0.00"), ge=0)
    description: Optional[str] = None

    @model_validator(mode="after")
    def validate_single_positive_side(self) -> "JournalLineIn":
        if self.debit < 0 or self.credit < 0:
            raise ValueError("Debit and credit amounts must be non-negative.")
        if (self.debit > 0 and self.credit > 0) or (self.debit == 0 and self.credit == 0):
            raise ValueError("Each journal line must specify either a positive debit or a positive credit amount, not both or neither.")
        return self

class JournalEntryCreate(BaseModel):
    entry_date: date = Field(default_factory=date.today)
    reference: Optional[str] = None
    description: str
    lines: List[JournalLineIn] = Field(..., min_length=2)

class JournalLineOut(BaseModel):
    id: int
    account_id: int
    account_name: Optional[str] = None
    account_code: Optional[str] = None
    debit: Decimal
    credit: Decimal
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class JournalEntryOut(BaseModel):
    id: int
    entry_number: str
    entry_date: date
    reference: Optional[str] = None
    description: str
    total_debit: Decimal
    total_credit: Decimal
    is_posted: bool
    lines: List[JournalLineOut] = []

    model_config = ConfigDict(from_attributes=True)

class ExpenseCreate(BaseModel):
    category: str = Field(..., pattern="^(Inventory|Staff & Payroll|Rent & Utilities|Marketing|Other)$")
    amount: Decimal = Field(..., gt=0)
    expense_date: date = Field(default_factory=date.today)
    payment_method: str = "BANK_TRANSFER"
    branch_id: Optional[int] = None
    receipt_reference: Optional[str] = None
    description: str

class ExpenseOut(BaseModel):
    id: int
    expense_number: str
    category: str
    amount: Decimal
    expense_date: date
    payment_method: str
    description: str
    receipt_reference: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
