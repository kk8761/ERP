import asyncio
import sys
import os
import logging
from decimal import Decimal
from datetime import datetime, timezone, date, timedelta

from sqlalchemy import select
from app.database import AsyncSessionLocal, engine, Base
from app.config import settings
from app.auth.security import hash_password
import app.models # Register all ORM models to Base.metadata
from app.models import (
    Organization, Branch, Department, Warehouse,
    User, Role, Permission, UserRole, RolePermission,
    ProductCategory, Product, StockMovement,
    Customer, SalesOrder, SalesOrderItem,
    Supplier, PurchaseOrder, PurchaseOrderItem,
    Account, Expense,
    Employee, Attendance, LeaveRequest, PayrollRecord
)
from app.authorization.permissions import PERMISSIONS, ROLE_TEMPLATES

async def seed():
    logging.info("[NexaERP] Initializing Database Schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        org_check = await db.execute(select(Organization).limit(1))
        if org_check.scalar_one_or_none():
            logging.info("[NexaERP] Database already contains data. Verifying operator accounts...")
            await ensure_essential_users(db)
            return

        logging.info("[NexaERP] Seeding Organization, Branches, and Departments...")
        org = Organization(
            name="Nexa Global Enterprises",
            code="NEXA-HQ",
            tax_identifier="GSTIN27AABCU9603R1ZM",
            currency="INR"
        )
        db.add(org)
        await db.flush()

        main_branch = Branch(
            organization_id=org.id,
            name="Main Store",
            code="BR-MAIN",
            city="Hyderabad",
            address="Plot 42, Hitech City Main Road"
        )
        north_branch = Branch(
            organization_id=org.id,
            name="North Warehouse",
            code="BR-NORTH",
            city="Secunderabad",
            address="Industrial Area, Phase 2"
        )
        db.add_all([main_branch, north_branch])
        await db.flush()

        sales_dept = Department(branch_id=main_branch.id, name="Sales & Operations", code="DEP-SALES")
        fin_dept = Department(branch_id=main_branch.id, name="Finance & Accounts", code="DEP-FIN")
        hr_dept = Department(branch_id=main_branch.id, name="Human Resources", code="DEP-HR")
        inv_dept = Department(branch_id=main_branch.id, name="Logistics & Warehousing", code="DEP-INV")
        db.add_all([sales_dept, fin_dept, hr_dept, inv_dept])
        await db.flush()

        warehouse_main = Warehouse(
            branch_id=main_branch.id,
            name="Main Store Front Storage",
            code="WH-FRONT",
            location="Aisle 1-6"
        )
        db.add(warehouse_main)
        await db.flush()

        logging.info("[NexaERP] Seeding Permissions & Roles...")
        perm_map = {}
        for p_def in PERMISSIONS:
            p = Permission(code=p_def["code"], module=p_def["module"], description=p_def["description"])
            db.add(p)
            await db.flush()
            perm_map[p.code] = p.id

        role_map = {}
        for role_name, perm_codes in ROLE_TEMPLATES.items():
            role = Role(
                name=role_name,
                description=f"Standard ERP role for {role_name}",
                is_system_role=True
            )
            db.add(role)
            await db.flush()
            role_map[role_name] = role.id

            for p_code in perm_codes:
                if p_code in perm_map:
                    db.add(RolePermission(role_id=role.id, permission_id=perm_map[p_code]))

        await db.flush()

        logging.info("[NexaERP] Bootstrapping Initial System Administrator...")
        admin_pass = hash_password(settings.BOOTSTRAP_ADMIN_PASSWORD)
        admin_user = User(
            email=settings.BOOTSTRAP_ADMIN_EMAIL,
            full_name=settings.BOOTSTRAP_ADMIN_NAME,
            password_hash=admin_pass,
            is_active=True,
            is_superuser=True,
            branch_id=main_branch.id,
            department_id=sales_dept.id
        )
        db.add(admin_user)
        await db.flush()

        db.add(UserRole(user_id=admin_user.id, role_id=role_map["System Administrator"]))

        # SEC-24: Only seed demo accounts in development/testing. Prohibit seeding fixed-password demo accounts in production.
        if settings.ENVIRONMENT.lower() != "production":
            demo_users = [
                ("cashier@nexaerp.internal", "Sunil Reddy", "Cashier@12345", "Sales Representative / Cashier", sales_dept.id),
                ("assistant@nexaerp.internal", "Arun Kumar (Shop Assistant)", "Assistant@12345", "Sales Representative / Cashier", sales_dept.id),
                ("inventory@nexaerp.internal", "Meera Nair", "Inventory@12345", "Inventory Clerk", inv_dept.id),
                ("accountant@nexaerp.internal", "Rajesh Sharma", "Account@12345", "Accountant", fin_dept.id),
                ("hr@nexaerp.internal", "Kavita Rao", "Hr@12345", "HR Officer", hr_dept.id),
            ]
            for email, name, pw, rname, d_id in demo_users:
                u = User(
                    email=email,
                    full_name=name,
                    password_hash=hash_password(pw),
                    is_active=True,
                    is_superuser=False,
                    branch_id=main_branch.id,
                    department_id=d_id
                )
                db.add(u)
                await db.flush()
                db.add(UserRole(user_id=u.id, role_id=role_map[rname]))

        logging.info("[NexaERP] Seeding Product Categories and Inventory...")
        categories = [
            ProductCategory(name="Grains & Flours", code="CAT-GRAIN", description="Staple food grains, flours, and cereals"),
            ProductCategory(name="Edible Oils", code="CAT-OIL", description="Cooking oils and ghee"),
            ProductCategory(name="Dairy", code="CAT-DAIRY", description="Fresh dairy, milk, butter, and cheese"),
            ProductCategory(name="Sweeteners", code="CAT-SWEET", description="Sugar, jaggery, and honey"),
            ProductCategory(name="Beverages", code="CAT-BEV", description="Tea, coffee, and soft drinks"),
            ProductCategory(name="Spices & Pulses", code="CAT-SPICE", description="Dals, lentils, and raw spices")
        ]
        db.add_all(categories)
        await db.flush()

        cat_grain, cat_oil, cat_dairy, cat_sweet, cat_bev, cat_spice = categories

        products = [
            Product(
                name="Basmati Rice (5kg)", sku="RIC-BAS-5K", barcode="890123456701",
                category_id=cat_grain.id, unit_of_measure="kg",
                selling_price=Decimal("450.00"), cost_price=Decimal("380.00"),
                reorder_level=10, current_stock=2, image_url="/assets/basmati.png"
            ),
            Product(
                name="Sunflower Oil (1L)", sku="OIL-SUN-1L", barcode="890123456702",
                category_id=cat_oil.id, unit_of_measure="ltr",
                selling_price=Decimal("165.00"), cost_price=Decimal("135.00"),
                reorder_level=25, current_stock=8, image_url="/assets/oil.png"
            ),
            Product(
                name="Amul Milk (1L)", sku="DAI-MIL-1L", barcode="890123456703",
                category_id=cat_dairy.id, unit_of_measure="ltr",
                selling_price=Decimal("68.00"), cost_price=Decimal("56.00"),
                reorder_level=20, current_stock=5, image_url="/assets/milk.png"
            ),
            Product(
                name="Atta (5kg)", sku="FLO-ATT-5K", barcode="890123456704",
                category_id=cat_grain.id, unit_of_measure="kg",
                selling_price=Decimal("260.00"), cost_price=Decimal("210.00"),
                reorder_level=30, current_stock=12, image_url="/assets/atta.png"
            ),
            Product(
                name="Sugar (1kg)", sku="SWE-SUG-1K", barcode="890123456705",
                category_id=cat_sweet.id, unit_of_measure="kg",
                selling_price=Decimal("48.00"), cost_price=Decimal("38.00"),
                reorder_level=15, current_stock=3, image_url="/assets/sugar.png"
            ),
            Product(
                name="Tata Tea Gold (500g)", sku="BEV-TEA-500G", barcode="890123456706",
                category_id=cat_bev.id, unit_of_measure="unit",
                selling_price=Decimal("290.00"), cost_price=Decimal("230.00"),
                reorder_level=15, current_stock=42
            ),
            Product(
                name="Toor Dal (1kg)", sku="DAL-TOO-1K", barcode="890123456707",
                category_id=cat_spice.id, unit_of_measure="kg",
                selling_price=Decimal("175.00"), cost_price=Decimal("140.00"),
                reorder_level=20, current_stock=55
            ),
            Product(
                name="Nescafe Classic (100g)", sku="BEV-NES-100G", barcode="890123456708",
                category_id=cat_bev.id, unit_of_measure="unit",
                selling_price=Decimal("320.00"), cost_price=Decimal("260.00"),
                reorder_level=12, current_stock=24
            ),
        ]
        db.add_all(products)
        await db.flush()

        logging.info("[NexaERP] Seeding Customers...")
        customers = [
            Customer(name="Walk-in Customer", phone="0000000000", total_spend=Decimal("2630.00")),
            Customer(name="Rajesh Kumar", phone="+91 98765 43210", email="rajesh.k@example.com", total_spend=Decimal("1250.00")),
            Customer(name="Priya Sharma", phone="+91 98765 43211", email="priya.s@example.com", total_spend=Decimal("380.00")),
            Customer(name="Amit Singh", phone="+91 98765 43212", email="amit.singh@example.com", total_spend=Decimal("890.00")),
            Customer(name="Rahul Verma", phone="+91 98765 43213", email="rahul.v@example.com", total_spend=Decimal("2180.00")),
        ]
        db.add_all(customers)
        await db.flush()

        c_walkin, c_rajesh, c_priya, c_amit, c_rahul = customers

        logging.info("[NexaERP] Seeding Recent Sales Transactions...")
        now = datetime.now(timezone.utc)
        recent_orders = [
            SalesOrder(
                invoice_number="#INV-001245", customer_id=c_walkin.id, cashier_user_id=admin_user.id,
                subtotal=Decimal("450.00"), discount_amount=Decimal("0.00"), tax_amount=Decimal("0.00"), total_amount=Decimal("450.00"),
                payment_method="UPI", payment_status="PAID", order_status="COMPLETED",
                created_at=now - timedelta(minutes=5)
            ),
            SalesOrder(
                invoice_number="#INV-001244", customer_id=c_rajesh.id, cashier_user_id=admin_user.id,
                subtotal=Decimal("1250.00"), discount_amount=Decimal("0.00"), tax_amount=Decimal("0.00"), total_amount=Decimal("1250.00"),
                payment_method="CARD", payment_status="PAID", order_status="COMPLETED",
                created_at=now - timedelta(minutes=18)
            ),
            SalesOrder(
                invoice_number="#INV-001243", customer_id=c_priya.id, cashier_user_id=admin_user.id,
                subtotal=Decimal("380.00"), discount_amount=Decimal("0.00"), tax_amount=Decimal("0.00"), total_amount=Decimal("380.00"),
                payment_method="CASH", payment_status="PAID", order_status="COMPLETED",
                created_at=now - timedelta(minutes=45)
            ),
            SalesOrder(
                invoice_number="#INV-001242", customer_id=c_walkin.id, cashier_user_id=admin_user.id,
                subtotal=Decimal("2180.00"), discount_amount=Decimal("0.00"), tax_amount=Decimal("0.00"), total_amount=Decimal("2180.00"),
                payment_method="UPI", payment_status="PAID", order_status="COMPLETED",
                created_at=now - timedelta(hours=1, minutes=10)
            ),
            SalesOrder(
                invoice_number="#INV-001241", customer_id=c_amit.id, cashier_user_id=admin_user.id,
                subtotal=Decimal("890.00"), discount_amount=Decimal("0.00"), tax_amount=Decimal("0.00"), total_amount=Decimal("890.00"),
                payment_method="CASH", payment_status="PAID", order_status="COMPLETED",
                created_at=now - timedelta(hours=1, minutes=30)
            )
        ]
        db.add_all(recent_orders)
        await db.flush()

        db.add(SalesOrderItem(
            order_id=recent_orders[0].id, product_id=products[0].id,
            product_name=products[0].name, quantity=1, unit_price=Decimal("450.00"), line_total=Decimal("450.00")
        ))
        await db.flush()

        logging.info("[NexaERP] Seeding Expenses...")
        expenses = [
            Expense(
                expense_number="EXP-00101", category="Inventory", amount=Decimal("32452.00"),
                description="Bulk grains and cooking oils wholesale procurement", recorded_by_user_id=admin_user.id
            ),
            Expense(
                expense_number="EXP-00102", category="Staff & Payroll", amount=Decimal("18788.00"),
                description="Staff overtime, incentives, and shift bonuses", recorded_by_user_id=admin_user.id
            ),
            Expense(
                expense_number="EXP-00103", category="Rent & Utilities", amount=Decimal("12810.00"),
                description="Storefront electricity, high-speed fiber, and water utility bills", recorded_by_user_id=admin_user.id
            ),
            Expense(
                expense_number="EXP-00104", category="Marketing", amount=Decimal("6832.00"),
                description="Local promotional campaigns, flyers, and SMS alerts", recorded_by_user_id=admin_user.id
            ),
            Expense(
                expense_number="EXP-00105", category="Other", amount=Decimal("14518.00"),
                description="Store maintenance, sanitization, and packaging supplies", recorded_by_user_id=admin_user.id
            ),
        ]
        db.add_all(expenses)
        await db.flush()

        logging.info("[NexaERP] Seeding Chart of Accounts...")
        accounts = [
            Account(code="1010", name="Cash on Hand", account_type="ASSET", balance=Decimal("45000.00")),
            Account(code="1020", name="HDFC Operating Bank Account", account_type="ASSET", balance=Decimal("250000.00")),
            Account(code="1030", name="Merchandise Inventory", account_type="ASSET", balance=Decimal("185000.00")),
            Account(code="2010", name="Accounts Payable (Suppliers)", account_type="LIABILITY", balance=Decimal("35000.00")),
            Account(code="3010", name="Owner Equity", account_type="EQUITY", balance=Decimal("300000.00")),
            Account(code="4010", name="Sales Revenue", account_type="REVENUE", balance=Decimal("350000.00")),
            Account(code="5010", name="Cost of Goods Sold (COGS)", account_type="EXPENSE", balance=Decimal("210000.00")),
            Account(code="6010", name="Operating Expenses", account_type="EXPENSE", balance=Decimal("85400.00")),
        ]
        db.add_all(accounts)
        await db.flush()

        logging.info("[NexaERP] Seeding Suppliers...")
        suppliers = [
            Supplier(
                name="Adani Wilmar Supplies Ltd", contact_person="Ramesh Patel",
                phone="+91 99887 76655", email="orders@adaniwilmar.internal",
                address="Port Area, Gujarat", gst_tax_number="24AAACA1234M1Z5"
            ),
            Supplier(
                name="ITC Agri Foods Distribution", contact_person="Sanjay Mehra",
                phone="+91 99887 76656", email="procurement@itcfoods.internal",
                address="Kolkata Central Hub", gst_tax_number="19AAACI5678K1Z2"
            )
        ]
        db.add_all(suppliers)
        await db.flush()

        logging.info("[NexaERP] Seeding Employees...")
        employees = [
            Employee(
                employee_code="EMP-1001", user_id=admin_user.id, first_name="Karthik", last_name="Reddy",
                email=settings.BOOTSTRAP_ADMIN_EMAIL, phone="+91 98765 00001", designation="System Administrator",
                department_id=sales_dept.id, basic_salary=Decimal("120000.00")
            ),
            Employee(
                employee_code="EMP-1002", first_name="Sunil", last_name="Reddy",
                email="sunil.r@nexaerp.internal", phone="+91 98765 00002", designation="Head Cashier & POS Operator",
                department_id=sales_dept.id, basic_salary=Decimal("35000.00")
            ),
            Employee(
                employee_code="EMP-1003", first_name="Meera", last_name="Nair",
                email="meera.n@nexaerp.internal", phone="+91 98765 00003", designation="Inventory & Warehouse Supervisor",
                department_id=inv_dept.id, basic_salary=Decimal("45000.00")
            ),
            Employee(
                employee_code="EMP-1004", first_name="Ananya", last_name="Sharma",
                email="ananya.s@nexaerp.internal", phone="+91 98765 00004", designation="Senior Accountant",
                department_id=fin_dept.id, basic_salary=Decimal("60000.00")
            )
        ]
        db.add_all(employees)
        await db.flush()

        today = date.today()
        for emp in employees:
            db.add(Attendance(
                employee_id=emp.id,
                date=today,
                check_in=now.replace(hour=9, minute=15, second=0),
                status="PRESENT"
            ))

        await db.commit()
        logging.info("[NexaERP] Database successfully initialized and seeded!")

async def ensure_essential_users(db):
    from sqlalchemy import select
    from app.models.org import Branch, Department
    from app.models.auth import Role, User, UserRole

    # Fetch main branch & sales dept
    b_res = await db.execute(select(Branch).limit(1))
    main_branch = b_res.scalar_one_or_none()
    
    d_res = await db.execute(select(Department).where(Department.code == "DEP-SALES").limit(1))
    sales_dept = d_res.scalar_one_or_none()
    
    r_res = await db.execute(select(Role).where(Role.name == "Sales Representative / Cashier").limit(1))
    sales_role = r_res.scalar_one_or_none()

    if not main_branch or not sales_dept or not sales_role:
        return

    # Check assistant@nexaerp.internal
    u_res = await db.execute(select(User).where(User.email == "assistant@nexaerp.internal").limit(1))
    if not u_res.scalar_one_or_none():
        assistant = User(
            email="assistant@nexaerp.internal",
            full_name="Arun Kumar (Shop Assistant)",
            password_hash=hash_password("Assistant@12345"),
            is_active=True,
            is_superuser=False,
            mfa_enabled=False,
            branch_id=main_branch.id,
            department_id=sales_dept.id
        )
        db.add(assistant)
        await db.flush()
        db.add(UserRole(user_id=assistant.id, role_id=sales_role.id))
        await db.commit()
        logging.info("[NexaERP] Successfully provisioned Shop Assistant account (assistant@nexaerp.internal)")

    # Ensure hierarchy roles and reporting lines on seeded employees
    from app.models.hr import Employee
    admin_emp_res = await db.execute(select(Employee).where(Employee.employee_code == "EMP-1001"))
    admin_emp = admin_emp_res.scalar_one_or_none()
    if admin_emp:
        admin_emp.hierarchy_role = "EXECUTIVE"
        admin_emp.reports_to_id = None
        for code, role, boss_name in [
            ("EMP-1002", "TEAM_LEAD", "Karthik Reddy"),
            ("EMP-1003", "MANAGER", "Karthik Reddy"),
            ("EMP-1004", "MANAGER", "Karthik Reddy"),
        ]:
            s_res = await db.execute(select(Employee).where(Employee.employee_code == code))
            s_emp = s_res.scalar_one_or_none()
            if s_emp:
                s_emp.hierarchy_role = role
                s_emp.reports_to_id = admin_emp.id
                s_emp.reporting_manager = boss_name
        await db.commit()
