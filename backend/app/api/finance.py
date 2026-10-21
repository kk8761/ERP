import uuid
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.models.auth import User
from app.models.finance import Account, JournalEntry, JournalEntryLine, Expense
from app.schemas.finance import (
    AccountCreate, AccountOut,
    JournalEntryCreate, JournalEntryOut, JournalLineOut,
    ExpenseCreate, ExpenseOut
)
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/api/finance", tags=["Finance"])

@router.get("/accounts", response_model=List[AccountOut])
async def list_accounts(
    current_user: User = Depends(require_permission("finance.view")),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Account).order_by(Account.code.asc()))
    return res.scalars().all()

@router.post("/accounts", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
async def create_account(
    data: AccountCreate,
    current_user: User = Depends(require_permission("finance.post")),
    db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(select(Account).where(Account.code == data.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Account code already exists")

    account = Account(**data.model_dump())
    db.add(account)
    await record_audit_log(
        db, action="ACCOUNT_CREATED", entity_name="Account",
        user_id=current_user.id, user_email=current_user.email,
        details={"code": account.code, "name": account.name}
    )
    await db.commit()
    await db.refresh(account)
    return account

@router.get("/journal-entries", response_model=List[JournalEntryOut])
async def list_journal_entries(
    current_user: User = Depends(require_permission("finance.view")),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(JournalEntry)
        .options(selectinload(JournalEntry.lines).selectinload(JournalEntryLine.account))
        .order_by(desc(JournalEntry.created_at))
    )
    res = await db.execute(stmt)
    entries = res.scalars().all()

    out = []
    for e in entries:
        lines_out = [
            JournalLineOut(
                id=line.id,
                account_id=line.account_id,
                account_name=line.account.name if line.account else None,
                account_code=line.account.code if line.account else None,
                debit=line.debit,
                credit=line.credit,
                description=line.description
            )
            for line in e.lines
        ]
        out.append(JournalEntryOut(
            id=e.id,
            entry_number=e.entry_number,
            entry_date=e.entry_date,
            reference=e.reference,
            description=e.description,
            total_debit=e.total_debit,
            total_credit=e.total_credit,
            is_posted=e.is_posted,
            lines=lines_out
        ))
    return out

@router.post("/journal-entries", response_model=JournalEntryOut, status_code=status.HTTP_201_CREATED)
async def create_journal_entry(
    data: JournalEntryCreate,
    current_user: User = Depends(require_permission("finance.post")),
    db: AsyncSession = Depends(get_db)
):
    if not data.lines or len(data.lines) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Double-entry bookkeeping requires at least two line items (at least one debit and one credit)."
        )

    # Verify double-entry balance: total debit must equal total credit
    total_debit = sum(line.debit for line in data.lines)
    total_credit = sum(line.credit for line in data.lines)

    if total_debit <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Total journal entry amount must be greater than zero."
        )

    if total_debit != total_credit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Double-entry imbalance! Total Debit ({total_debit}) must equal Total Credit ({total_credit})"
        )

    entry_num = f"JE-{uuid.uuid4().hex[:6].upper()}"
    lines = [
        JournalEntryLine(
            account_id=l.account_id,
            debit=l.debit,
            credit=l.credit,
            description=l.description
        )
        for l in data.lines
    ]

    entry = JournalEntry(
        entry_number=entry_num,
        entry_date=data.entry_date,
        reference=data.reference,
        description=data.description,
        total_debit=total_debit,
        total_credit=total_credit,
        is_posted=True,
        created_by_user_id=current_user.id,
        lines=lines
    )
    db.add(entry)

    # Update account balances
    for line in data.lines:
        acc_res = await db.execute(select(Account).where(Account.id == line.account_id))
        acc = acc_res.scalar_one_or_none()
        if acc:
            if acc.account_type in ["ASSET", "EXPENSE"]:
                acc.balance += (line.debit - line.credit)
            else:
                acc.balance += (line.credit - line.debit)

    await record_audit_log(
        db, action="JOURNAL_ENTRY_POSTED", entity_name="JournalEntry",
        user_id=current_user.id, user_email=current_user.email,
        details={"entry_num": entry_num, "amount": float(total_debit)}
    )
    await db.commit()
    await db.refresh(entry)

    stmt = (
        select(JournalEntry)
        .options(selectinload(JournalEntry.lines).selectinload(JournalEntryLine.account))
        .where(JournalEntry.id == entry.id)
    )
    res = await db.execute(stmt)
    full_entry = res.scalar_one()

    return JournalEntryOut(
        id=full_entry.id,
        entry_number=full_entry.entry_number,
        entry_date=full_entry.entry_date,
        reference=full_entry.reference,
        description=full_entry.description,
        total_debit=full_entry.total_debit,
        total_credit=full_entry.total_credit,
        is_posted=full_entry.is_posted,
        lines=[
            JournalLineOut(
                id=l.id, account_id=l.account_id,
                account_name=l.account.name if l.account else None,
                account_code=l.account.code if l.account else None,
                debit=l.debit, credit=l.credit, description=l.description
            ) for l in full_entry.lines
        ]
    )

@router.get("/expenses", response_model=List[ExpenseOut])
async def list_expenses(
    category: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("finance.view")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Expense).order_by(desc(Expense.expense_date))
    if category:
        stmt = stmt.where(Expense.category == category)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/expenses", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
async def record_expense(
    data: ExpenseCreate,
    current_user: User = Depends(require_permission("expenses.record")),
    db: AsyncSession = Depends(get_db)
):
    exp_number = f"EXP-{uuid.uuid4().hex[:6].upper()}"
    expense = Expense(
        expense_number=exp_number,
        category=data.category,
        amount=data.amount,
        expense_date=data.expense_date,
        payment_method=data.payment_method,
        branch_id=data.branch_id,
        receipt_reference=data.receipt_reference,
        description=data.description,
        recorded_by_user_id=current_user.id
    )
    db.add(expense)
    await record_audit_log(
        db, action="EXPENSE_RECORDED", entity_name="Expense",
        user_id=current_user.id, user_email=current_user.email,
        details={"expense_number": exp_number, "category": data.category, "amount": float(data.amount)}
    )
    await db.commit()
    await db.refresh(expense)
    return expense
