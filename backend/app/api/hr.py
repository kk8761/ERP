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
    LeaveCreate, LeaveOut, LeaveReviewAction,
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
            gender=emp.gender,
            date_of_birth=emp.date_of_birth,
            marital_status=emp.marital_status,
            current_address=emp.current_address,
            permanent_address=emp.permanent_address,
            emergency_contact_name=emp.emergency_contact_name,
            emergency_contact_phone=emp.emergency_contact_phone,
            emergency_contact_relation=emp.emergency_contact_relation,
            employment_type=emp.employment_type,
            work_mode=emp.work_mode,
            branch_location=emp.branch_location,
            reporting_manager=emp.reporting_manager,
            hra=emp.hra if can_view_payroll else None,
            conveyance_allowance=emp.conveyance_allowance if can_view_payroll else None,
            special_allowance=emp.special_allowance if can_view_payroll else None,
            medical_allowance=emp.medical_allowance if can_view_payroll else None,
            variable_pay=emp.variable_pay if can_view_payroll else None,
            pf_deduction=emp.pf_deduction if can_view_payroll else None,
            professional_tax=emp.professional_tax if can_view_payroll else None,
            tds_tax=emp.tds_tax if can_view_payroll else None,
            net_salary=emp.net_salary if can_view_payroll else None,
            bank_name=emp.bank_name,
            account_holder_name=emp.account_holder_name,
            bank_account_number=emp.bank_account_number if can_view_payroll else None,
            bank_ifsc=emp.bank_ifsc if can_view_payroll else None,
            account_type=emp.account_type,
            pan_tax_id=emp.pan_tax_id if can_view_payroll else None,
            aadhaar_id=emp.aadhaar_id if can_view_payroll else None,
            uan_number=emp.uan_number if can_view_payroll else None,
            documents_json=emp.documents_json,
            notes=emp.notes,
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
        department_name=emp.department.name if emp.department else None,
        date_of_joining=emp.date_of_joining,
        basic_salary=emp.basic_salary,
        gender=emp.gender,
        date_of_birth=emp.date_of_birth,
        marital_status=emp.marital_status,
        current_address=emp.current_address,
        permanent_address=emp.permanent_address,
        emergency_contact_name=emp.emergency_contact_name,
        emergency_contact_phone=emp.emergency_contact_phone,
        emergency_contact_relation=emp.emergency_contact_relation,
        employment_type=emp.employment_type,
        work_mode=emp.work_mode,
        branch_location=emp.branch_location,
        reporting_manager=emp.reporting_manager,
        hra=emp.hra,
        conveyance_allowance=emp.conveyance_allowance,
        special_allowance=emp.special_allowance,
        medical_allowance=emp.medical_allowance,
        variable_pay=emp.variable_pay,
        pf_deduction=emp.pf_deduction,
        professional_tax=emp.professional_tax,
        tds_tax=emp.tds_tax,
        net_salary=emp.net_salary,
        bank_name=emp.bank_name,
        account_holder_name=emp.account_holder_name,
        bank_account_number=emp.bank_account_number,
        bank_ifsc=emp.bank_ifsc,
        account_type=emp.account_type,
        pan_tax_id=emp.pan_tax_id,
        aadhaar_id=emp.aadhaar_id,
        uan_number=emp.uan_number,
        documents_json=emp.documents_json,
        notes=emp.notes,
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
            employee_code=l.employee.employee_code if l.employee else None,
            leave_type=l.leave_type,
            start_date=l.start_date,
            end_date=l.end_date,
            days_count=l.days_count,
            reason=l.reason,
            status=l.status,
            manager_comment=l.manager_comment,
            reviewed_by_name=l.reviewed_by_name,
            reviewed_at=l.reviewed_at,
            document_name=l.document_name,
            document_url=l.document_url,
            document_size=l.document_size
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

    emp_res = await db.execute(select(Employee).where(Employee.id == leave.employee_id))
    emp = emp_res.scalar_one_or_none()

    return LeaveOut(
        id=leave.id,
        employee_id=leave.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_code=emp.employee_code if emp else None,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        days_count=leave.days_count,
        reason=leave.reason,
        status=leave.status,
        manager_comment=leave.manager_comment,
        reviewed_by_name=leave.reviewed_by_name,
        reviewed_at=leave.reviewed_at,
        document_name=leave.document_name,
        document_url=leave.document_url,
        document_size=leave.document_size
    )

@router.post("/leaves/{leave_id}/approve", response_model=LeaveOut)
async def approve_leave(
    leave_id: int,
    action: Optional[LeaveReviewAction] = None,
    current_user: User = Depends(require_permission("leaves.manage")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(LeaveRequest).options(selectinload(LeaveRequest.employee)).where(LeaveRequest.id == leave_id)
    res = await db.execute(stmt)
    leave = res.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    leave.status = "APPROVED"
    leave.approved_by_user_id = current_user.id
    leave.reviewed_by_name = current_user.full_name or current_user.email
    leave.reviewed_at = datetime.now(timezone.utc)
    if action and action.comment:
        leave.manager_comment = action.comment

    await record_audit_log(
        db, action="LEAVE_APPROVED", entity_name="LeaveRequest",
        user_id=current_user.id, user_email=current_user.email,
        details={"leave_id": leave_id, "employee_id": leave.employee_id, "comment": leave.manager_comment}
    )
    await db.commit()
    await db.refresh(leave)

    return LeaveOut(
        id=leave.id,
        employee_id=leave.employee_id,
        employee_name=f"{leave.employee.first_name} {leave.employee.last_name}" if leave.employee else None,
        employee_code=leave.employee.employee_code if leave.employee else None,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        days_count=leave.days_count,
        reason=leave.reason,
        status=leave.status,
        manager_comment=leave.manager_comment,
        reviewed_by_name=leave.reviewed_by_name,
        reviewed_at=leave.reviewed_at,
        document_name=leave.document_name,
        document_url=leave.document_url,
        document_size=leave.document_size
    )

@router.post("/leaves/{leave_id}/reject", response_model=LeaveOut)
async def reject_leave(
    leave_id: int,
    action: Optional[LeaveReviewAction] = None,
    current_user: User = Depends(require_permission("leaves.manage")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(LeaveRequest).options(selectinload(LeaveRequest.employee)).where(LeaveRequest.id == leave_id)
    res = await db.execute(stmt)
    leave = res.scalar_one_or_none()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    leave.status = "REJECTED"
    leave.approved_by_user_id = current_user.id
    leave.reviewed_by_name = current_user.full_name or current_user.email
    leave.reviewed_at = datetime.now(timezone.utc)
    if action and action.comment:
        leave.manager_comment = action.comment

    await record_audit_log(
        db, action="LEAVE_REJECTED", entity_name="LeaveRequest",
        user_id=current_user.id, user_email=current_user.email,
        details={"leave_id": leave_id, "employee_id": leave.employee_id, "comment": leave.manager_comment}
    )
    await db.commit()
    await db.refresh(leave)

    return LeaveOut(
        id=leave.id,
        employee_id=leave.employee_id,
        employee_name=f"{leave.employee.first_name} {leave.employee.last_name}" if leave.employee else None,
        employee_code=leave.employee.employee_code if leave.employee else None,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        days_count=leave.days_count,
        reason=leave.reason,
        status=leave.status,
        manager_comment=leave.manager_comment,
        reviewed_by_name=leave.reviewed_by_name,
        reviewed_at=leave.reviewed_at,
        document_name=leave.document_name,
        document_url=leave.document_url,
        document_size=leave.document_size
    )

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
