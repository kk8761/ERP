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
    PayrollCreate, PayrollOut,
    ReportingLineUpdateRequest
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

    # Name mapping and direct reports count
    emp_map = {e.id: f"{e.first_name} {e.last_name}" for e in employees}
    reports_count = {}
    for e in employees:
        rep_id = getattr(e, "reports_to_id", None)
        if rep_id:
            reports_count[rep_id] = reports_count.get(rep_id, 0) + 1

    out = []
    for emp in employees:
        rep_id = getattr(emp, "reports_to_id", None)
        h_role = getattr(emp, "hierarchy_role", "MEMBER") or "MEMBER"
        boss_name = emp_map.get(rep_id) or emp.reporting_manager

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
            reporting_manager=boss_name,
            reports_to_id=rep_id,
            reports_to_name=boss_name,
            hierarchy_role=h_role,
            direct_reports_count=reports_count.get(emp.id, 0),
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
    emp_res = await db.execute(select(Employee).where(Employee.id == data.employee_id))
    emp = emp_res.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail=f"Employee with ID {data.employee_id} not found")

    # If basic_pay was not explicitly supplied or 0, compute from contract structure
    basic_pay = data.basic_pay if (data.basic_pay and data.basic_pay > 0) else (emp.basic_salary or Decimal("30000.00"))
    
    # Calculate allowances
    if data.allowances and data.allowances > 0:
        allowances = data.allowances
    else:
        allowances = (
            (emp.hra or Decimal("0.00")) +
            (emp.conveyance_allowance or Decimal("0.00")) +
            (emp.special_allowance or Decimal("0.00")) +
            (emp.medical_allowance or Decimal("0.00")) +
            (emp.variable_pay or Decimal("0.00"))
        )

    # Calculate statutory deductions (PF, Professional Tax, TDS)
    if data.deductions and data.deductions > 0:
        deductions = data.deductions
    else:
        deductions = (
            (emp.pf_deduction or Decimal("0.00")) +
            (emp.professional_tax or Decimal("0.00")) +
            (emp.tds_tax or Decimal("0.00"))
        )

    net_pay = max(Decimal("0.00"), basic_pay + allowances - deductions)

    pr = PayrollRecord(
        employee_id=data.employee_id,
        month_year=data.month_year,
        basic_pay=basic_pay,
        allowances=allowances,
        deductions=deductions,
        net_pay=net_pay,
        status="PROCESSED",
        payment_date=date.today()
    )
    db.add(pr)

    # Update employee's active net salary cached record
    emp.net_salary = net_pay

    await record_audit_log(
        db, action="PAYROLL_PROCESSED", entity_name="PayrollRecord",
        user_id=current_user.id, user_email=current_user.email,
        details={
            "employee_id": data.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}",
            "basic_pay": float(basic_pay),
            "allowances": float(allowances),
            "deductions": float(deductions),
            "net_pay": float(net_pay)
        }
    )
    await db.commit()
    await db.refresh(pr)

    return PayrollOut(
        id=pr.id,
        employee_id=pr.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}",
        employee_code=emp.employee_code,
        month_year=pr.month_year,
        basic_pay=pr.basic_pay,
        allowances=pr.allowances,
        deductions=pr.deductions,
        net_pay=pr.net_pay,
        status=pr.status,
        payment_date=pr.payment_date
    )

@router.post("/payroll/process-all", response_model=List[PayrollOut])
async def process_all_payroll(
    month_year: str = Query("October 2026"),
    current_user: User = Depends(require_permission("payroll.process")),
    db: AsyncSession = Depends(get_db)
):
    """
    Automated batch payroll execution for all active employees.
    Computes statutory components, allowances, and tax deductions from employee master profiles.
    """
    res = await db.execute(select(Employee).where(Employee.is_active == True))
    active_employees = res.scalars().all()

    processed_records: List[PayrollOut] = []
    for emp in active_employees:
        basic_pay = emp.basic_salary or Decimal("30000.00")
        allowances = (
            (emp.hra or Decimal("0.00")) +
            (emp.conveyance_allowance or Decimal("0.00")) +
            (emp.special_allowance or Decimal("0.00")) +
            (emp.medical_allowance or Decimal("0.00")) +
            (emp.variable_pay or Decimal("0.00"))
        )
        deductions = (
            (emp.pf_deduction or Decimal("0.00")) +
            (emp.professional_tax or Decimal("0.00")) +
            (emp.tds_tax or Decimal("0.00"))
        )
        net_pay = max(Decimal("0.00"), basic_pay + allowances - deductions)

        pr = PayrollRecord(
            employee_id=emp.id,
            month_year=month_year,
            basic_pay=basic_pay,
            allowances=allowances,
            deductions=deductions,
            net_pay=net_pay,
            status="PROCESSED",
            payment_date=date.today()
        )
        db.add(pr)
        emp.net_salary = net_pay
        await db.flush()

        processed_records.append(PayrollOut(
            id=pr.id,
            employee_id=emp.id,
            employee_name=f"{emp.first_name} {emp.last_name}",
            employee_code=emp.employee_code,
            month_year=pr.month_year,
            basic_pay=pr.basic_pay,
            allowances=pr.allowances,
            deductions=pr.deductions,
            net_pay=pr.net_pay,
            status=pr.status,
            payment_date=pr.payment_date
        ))

    await record_audit_log(
        db, action="PAYROLL_BATCH_PROCESSED", entity_name="PayrollRecord",
        user_id=current_user.id, user_email=current_user.email,
        details={"month_year": month_year, "employees_count": len(processed_records)}
    )
    await db.commit()
    return processed_records


# ----------------------------------------------------
# ORGANIZATIONAL HIERARCHY & REPORTING CHAIN (CENTRALIZED)
# ----------------------------------------------------

@router.get("/org-hierarchy")
async def get_org_hierarchy(
    current_user: User = Depends(require_permission("hr.view")),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the centralized, complete company organizational hierarchy tree and tier matrix.
    Shows executives, department managers, team leads, and staff members, with
    direct reporting chains (who reports to who). Centralized and consistent across all devices.
    """
    stmt = select(Employee).options(selectinload(Employee.department)).where(Employee.is_active == True).order_by(Employee.first_name.asc())
    res = await db.execute(stmt)
    employees = res.scalars().all()

    # Build node map
    emp_map = {}
    reports_map = {} # manager_id -> list of subordinates
    for e in employees:
        rep_id = getattr(e, "reports_to_id", None)
        h_role = (getattr(e, "hierarchy_role", None) or "MEMBER").upper()

        # Dynamic smart hierarchy categorization if still set to default
        if h_role == "MEMBER":
            desig = e.designation.lower()
            if any(k in desig for k in ["director", "administrator", "general manager", "chief", "vp", "president"]):
                h_role = "EXECUTIVE"
            elif any(k in desig for k in ["manager", "supervisor", "head of"]):
                h_role = "MANAGER"
            elif any(k in desig for k in ["lead", "senior", "coordinator", "officer"]):
                h_role = "TEAM_LEAD"

        node = {
            "id": e.id,
            "employee_code": e.employee_code,
            "first_name": e.first_name,
            "last_name": e.last_name,
            "full_name": f"{e.first_name} {e.last_name}",
            "designation": e.designation,
            "department_id": e.department_id,
            "department_name": e.department.name if e.department else "Corporate Headquarters",
            "branch_location": e.branch_location or "Hyderabad HQ",
            "email": e.email,
            "phone": e.phone or "+91 98765 00000",
            "employment_type": e.employment_type or "Full-Time",
            "work_mode": e.work_mode or "In-Office",
            "hierarchy_role": h_role,
            "reports_to_id": rep_id,
            "reports_to_name": None,
            "direct_reports_count": 0,
            "subordinates": []
        }
        emp_map[e.id] = node
        if rep_id:
            reports_map.setdefault(rep_id, []).append(e.id)

    # Resolve boss names & direct reports counts
    for emp_id, node in emp_map.items():
        if node["reports_to_id"] and node["reports_to_id"] in emp_map:
            node["reports_to_name"] = emp_map[node["reports_to_id"]]["full_name"]
        elif not node["reports_to_id"] and node["hierarchy_role"] != "EXECUTIVE":
            # For demonstration and bootstrap completeness, if not explicitly mapped, assign to root executive
            execs = [n for n in emp_map.values() if n["hierarchy_role"] == "EXECUTIVE"]
            if execs and execs[0]["id"] != emp_id:
                node["reports_to_id"] = execs[0]["id"]
                node["reports_to_name"] = execs[0]["full_name"]
                reports_map.setdefault(execs[0]["id"], []).append(emp_id)

        subs = reports_map.get(emp_id, [])
        node["direct_reports_count"] = len(subs)

    # Build hierarchical tree starting from roots
    roots = []
    for emp_id, node in emp_map.items():
        if not node["reports_to_id"] or node["reports_to_id"] not in emp_map:
            roots.append(node)

    # If no root found, pick the highest executive
    if not roots and emp_map:
        roots = [list(emp_map.values())[0]]

    def attach_subordinates(parent_node, visited=None):
        if visited is None:
            visited = set()
        visited.add(parent_node["id"])
        child_ids = reports_map.get(parent_node["id"], [])
        children = []
        for cid in child_ids:
            if cid in emp_map and cid not in visited:
                child_node = dict(emp_map[cid])
                child_node["subordinates"] = attach_subordinates(child_node, visited.copy())
                children.append(child_node)
        return children

    tree = []
    for r in roots:
        root_copy = dict(r)
        root_copy["subordinates"] = attach_subordinates(root_copy)
        tree.append(root_copy)

    # Group by tiers
    executives = [n for n in emp_map.values() if n["hierarchy_role"] == "EXECUTIVE"]
    managers = [n for n in emp_map.values() if n["hierarchy_role"] == "MANAGER"]
    team_leads = [n for n in emp_map.values() if n["hierarchy_role"] == "TEAM_LEAD"]
    members = [n for n in emp_map.values() if n["hierarchy_role"] == "MEMBER"]

    can_edit = bool(
        current_user.is_superuser or
        "hr.manage" in getattr(current_user, "effective_permissions", set()) or
        "roles.manage" in getattr(current_user, "effective_permissions", set())
    )

    return {
        "tree": tree,
        "flat": list(emp_map.values()),
        "tiers": {
            "executives": executives,
            "managers": managers,
            "team_leads": team_leads,
            "members": members
        },
        "stats": {
            "total_headcount": len(employees),
            "executives_count": len(executives),
            "managers_count": len(managers),
            "team_leads_count": len(team_leads),
            "members_count": len(members),
            "reporting_completeness": f"{round((len([e for e in employees if getattr(e, 'reports_to_id', None)]) / max(1, len(employees)-1)) * 100)}%" if len(employees) > 1 else "100%"
        },
        "permissions": {
            "can_edit_hierarchy": can_edit,
            "user_id": current_user.id,
            "user_email": current_user.email,
            "is_superuser": current_user.is_superuser
        }
    }


@router.put("/employees/{employee_id}/reporting-line")
async def update_reporting_line(
    employee_id: int,
    payload: ReportingLineUpdateRequest,
    current_user: User = Depends(require_permission("hr.manage")),
    db: AsyncSession = Depends(get_db)
):
    """
    Role-Based Hierarchy Editor:
    Updates who is the boss / manager of an employee, and adjusts their hierarchy tier.
    Guarded with loop detection so cyclical reporting (A -> B -> A) is rejected.
    """
    if payload.reports_to_id == employee_id:
        raise HTTPException(status_code=400, detail="An employee cannot report to themselves.")

    emp_res = await db.execute(select(Employee).where(Employee.id == employee_id))
    emp = emp_res.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    target_manager = None
    if payload.reports_to_id:
        mgr_res = await db.execute(select(Employee).where(Employee.id == payload.reports_to_id))
        target_manager = mgr_res.scalar_one_or_none()
        if not target_manager:
            raise HTTPException(status_code=400, detail="Target reporting manager does not exist.")

        # Cyclical loop check: trace upward from target_manager
        curr_id = target_manager.reports_to_id
        visited = {employee_id, target_manager.id}
        while curr_id:
            if curr_id == employee_id:
                raise HTTPException(status_code=400, detail=f"Circular reporting detected: {target_manager.first_name} already reports up the chain to {emp.first_name}.")
            if curr_id in visited:
                break
            visited.add(curr_id)
            c_res = await db.execute(select(Employee.reports_to_id).where(Employee.id == curr_id))
            curr_id = c_res.scalar_one_or_none()

    old_boss = emp.reporting_manager
    old_role = getattr(emp, "hierarchy_role", "MEMBER")

    emp.reports_to_id = payload.reports_to_id
    if target_manager:
        emp.reporting_manager = f"{target_manager.first_name} {target_manager.last_name}"
    else:
        emp.reporting_manager = None

    if payload.hierarchy_role:
        emp.hierarchy_role = payload.hierarchy_role.upper()

    await record_audit_log(
        db, action="EMPLOYEE_REPORTING_LINE_UPDATED", entity_name="Employee",
        entity_id=str(emp.id), user_id=current_user.id, user_email=current_user.email,
        details={
            "employee": f"{emp.first_name} {emp.last_name} ({emp.employee_code})",
            "old_role": old_role, "new_role": emp.hierarchy_role,
            "new_boss": emp.reporting_manager
        }
    )
    await db.commit()

    return {
        "success": True,
        "message": f"Successfully updated reporting chain for {emp.first_name} {emp.last_name}.",
        "employee_id": emp.id,
        "reports_to_id": emp.reports_to_id,
        "reporting_manager": emp.reporting_manager,
        "hierarchy_role": emp.hierarchy_role
    }

