from typing import List, Optional
from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth.dependencies import get_current_user, require_permission
from app.models.auth import User
from app.models.hr import Employee, Attendance, LeaveRequest, PayrollRecord
from app.models.org import Department
from app.schemas.hr import (
    EmployeeCreate, EmployeeOut,
    AttendanceIn, AttendanceOut,
    LeaveCreate, LeaveOut,
    PayrollCreate, PayrollOut
)
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/api/hr", tags=["HR and Payroll"])

@router.get("/employees", response_model=List[EmployeeOut])
async def list_employees(
    department_id: Optional[int] = Query(None),
    current_user: User = Depends(require_permission("hr.view")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Employee).options(selectinload(Employee.department)).order_by(Employee.first_name.asc())
    if department_id:
        stmt = stmt.where(Employee.department_id == department_id)
    res = await db.execute(stmt)
    employees = res.scalars().all()

    can_view_payroll = (
        current_user.is_superuser or
        "payroll.view" in getattr(current_user, "effective_permissions", set())
    )

    out = []
    for emp in employees:
        out.append(EmployeeOut(
            id=emp.id,
            employee_code=emp.employee_code,
            first_name=emp.first_name,
            last_name=emp.last_name,
            full_name=f"{emp.first_name} {emp.last_name}",
            email=emp.email,
            phone=emp.phone,
            designation=emp.designation,
            department_id=emp.department_id,
            department_name=emp.department.name if emp.department else None,
            date_of_joining=emp.date_of_joining,
            basic_salary=emp.basic_salary if can_view_payroll else None,
            is_active=emp.is_active
        ))
    return out

@router.post("/employees", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
async def create_employee(
    data: EmployeeCreate,
    current_user: User = Depends(require_permission("hr.manage")),
    db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(select(Employee).where(
        (Employee.employee_code == data.employee_code) | (Employee.email == data.email)
    ))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Employee code or email already in use")

    emp = Employee(**data.model_dump())
    db.add(emp)
    await record_audit_log(
        db, action="EMPLOYEE_CREATED", entity_name="Employee",
        user_id=current_user.id, user_email=current_user.email,
        details={"code": emp.employee_code, "name": f"{emp.first_name} {emp.last_name}"}
    )
    await db.commit()
    await db.refresh(emp)

    return EmployeeOut(
        id=emp.id,
        employee_code=emp.employee_code,
        first_name=emp.first_name,
        last_name=emp.last_name,
        full_name=f"{emp.first_name} {emp.last_name}",
        email=emp.email,
        phone=emp.phone,
        designation=emp.designation,
        department_id=emp.department_id,
        date_of_joining=emp.date_of_joining,
        basic_salary=emp.basic_salary,
        is_active=emp.is_active
    )

@router.get("/attendance", response_model=List[AttendanceOut])
async def list_attendance(
    target_date: Optional[date] = Query(None),
    current_user: User = Depends(require_permission("attendance.record")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Attendance).options(selectinload(Attendance.employee)).order_by(desc(Attendance.date))
    if target_date:
        stmt = stmt.where(Attendance.date == target_date)
    res = await db.execute(stmt)
    records = res.scalars().all()

    return [
        AttendanceOut(
            id=r.id,
            employee_id=r.employee_id,
            employee_name=f"{r.employee.first_name} {r.employee.last_name}" if r.employee else None,
            date=r.date,
            check_in=r.check_in,
            check_out=r.check_out,
            status=r.status
        )
        for r in records
    ]

@router.post("/attendance", response_model=AttendanceOut)
async def record_attendance(
    data: AttendanceIn,
    current_user: User = Depends(require_permission("attendance.record")),
    db: AsyncSession = Depends(get_db)
):
    today = date.today()
    existing_res = await db.execute(select(Attendance).where(
        Attendance.employee_id == data.employee_id,
        Attendance.date == today
    ))
    att = existing_res.scalar_one_or_none()
    now = datetime.now(timezone.utc)

    if not att:
        att = Attendance(
            employee_id=data.employee_id,
            date=today,
            check_in=now,
            status=data.status
        )
        db.add(att)
    else:
        att.check_out = now
        att.status = data.status

    await db.commit()
    await db.refresh(att)
    return AttendanceOut(
        id=att.id,
        employee_id=att.employee_id,
        date=att.date,
        check_in=att.check_in,
        check_out=att.check_out,
        status=att.status
    )

@router.get("/leaves", response_model=List[LeaveOut])
async def list_leaves(
    current_user: User = Depends(require_permission("hr.view")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(LeaveRequest).options(selectinload(LeaveRequest.employee)).order_by(desc(LeaveRequest.created_at))
    res = await db.execute(stmt)
    leaves = res.scalars().all()

    return [
        LeaveOut(
            id=l.id,
            employee_id=l.employee_id,
            employee_name=f"{l.employee.first_name} {l.employee.last_name}" if l.employee else None,
            leave_type=l.leave_type,
            start_date=l.start_date,
            end_date=l.end_date,
            days_count=l.days_count,
            reason=l.reason,
            status=l.status
        )
        for l in leaves
    ]

@router.post("/leaves", response_model=LeaveOut, status_code=status.HTTP_201_CREATED)
async def submit_leave(
    data: LeaveCreate,
    current_user: User = Depends(require_permission("hr.view")),
    db: AsyncSession = Depends(get_db)
):
    leave = LeaveRequest(**data.model_dump(), status="PENDING")
    db.add(leave)
    await db.commit()
    await db.refresh(leave)
    return LeaveOut(
        id=leave.id,
        employee_id=leave.employee_id,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        days_count=leave.days_count,
        reason=leave.reason,
        status=leave.status
    )

@router.post("/leaves/{leave_id}/approve")
async def approve_leave(
    leave_id: int,
    current_user: User = Depends(require_permission("leaves.manage")),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(LeaveRequest).where(LeaveRequest.id == leave_id))
    leave = res.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    leave.status = "APPROVED"
    leave.approved_by_user_id = current_user.id
    await db.commit()
    return {"message": "Leave request approved"}

@router.get("/payroll", response_model=List[PayrollOut])
async def list_payroll(
    month_year: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("payroll.view")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PayrollRecord).options(selectinload(PayrollRecord.employee)).order_by(desc(PayrollRecord.created_at))
    if month_year:
        stmt = stmt.where(PayrollRecord.month_year == month_year)
    res = await db.execute(stmt)
    records = res.scalars().all()

    return [
        PayrollOut(
            id=r.id,
            employee_id=r.employee_id,
            employee_name=f"{r.employee.first_name} {r.employee.last_name}" if r.employee else None,
            employee_code=r.employee.employee_code if r.employee else None,
            month_year=r.month_year,
            basic_pay=r.basic_pay,
            allowances=r.allowances,
            deductions=r.deductions,
            net_pay=r.net_pay,
            status=r.status,
            payment_date=r.payment_date
        )
        for r in records
    ]

@router.post("/payroll", response_model=PayrollOut, status_code=status.HTTP_201_CREATED)
async def process_payroll(
    data: PayrollCreate,
    current_user: User = Depends(require_permission("payroll.process")),
    db: AsyncSession = Depends(get_db)
):
    net_pay = data.basic_pay + data.allowances - data.deductions
    pr = PayrollRecord(
        employee_id=data.employee_id,
        month_year=data.month_year,
        basic_pay=data.basic_pay,
        allowances=data.allowances,
        deductions=data.deductions,
        net_pay=net_pay,
        status="PROCESSED",
        payment_date=date.today()
    )
    db.add(pr)
    await record_audit_log(
        db, action="PAYROLL_PROCESSED", entity_name="PayrollRecord",
        user_id=current_user.id, user_email=current_user.email,
        details={"employee_id": data.employee_id, "net_pay": float(net_pay)}
    )
    await db.commit()
    await db.refresh(pr)
    return PayrollOut(
        id=pr.id,
        employee_id=pr.employee_id,
        month_year=pr.month_year,
        basic_pay=pr.basic_pay,
        allowances=pr.allowances,
        deductions=pr.deductions,
        net_pay=pr.net_pay,
        status=pr.status,
        payment_date=pr.payment_date
    )
