import asyncio
import logging
from decimal import Decimal
from datetime import date
from sqlalchemy import select, delete
from app.database import AsyncSessionLocal
from app.models.org import Organization, Branch, Department, Warehouse
from app.models.hr import Employee
from app.models.auth import User
from app.services.document_store import document_store

MNC_BRANCHES = [
    {
        "id": 1,
        "name": "Hyderabad Global HQ",
        "code": "BR-HYD-HQ",
        "city": "Hyderabad",
        "country": "IN",
        "currency": "INR",
        "address": "Plot 42, Hitech City Phase II, Madhapur, Hyderabad 500081, India",
        "is_hq": True
    },
    {
        "id": 2,
        "name": "Mumbai Financial Hub",
        "code": "BR-MUM-FIN",
        "city": "Mumbai",
        "country": "IN",
        "currency": "INR",
        "address": "BKC G-Block, Bandra Kurla Complex, Bandra East, Mumbai 400051, India",
        "is_hq": False
    },
    {
        "id": 3,
        "name": "Bengaluru Innovation Center",
        "code": "BR-BLR-TECH",
        "city": "Bengaluru",
        "country": "IN",
        "currency": "INR",
        "address": "Prestige Tech Park, Outer Ring Road, Bellandur, Bengaluru 560103, India",
        "is_hq": False
    },
    {
        "id": 4,
        "name": "Delhi NCR Regional Office",
        "code": "BR-DEL-NCR",
        "city": "Gurugram",
        "country": "IN",
        "currency": "INR",
        "address": "DLF Cyber City, Building 10, Tower B, Gurugram 122002, Haryana, India",
        "is_hq": False
    },
    {
        "id": 5,
        "name": "Chennai Port Logistics Hub",
        "code": "BR-CHE-SCM",
        "city": "Chennai",
        "country": "IN",
        "currency": "INR",
        "address": "OMR IT Corridor, Phase 1, Thoraipakkam, Chennai 600097, Tamil Nadu, India",
        "is_hq": False
    },
    {
        "id": 6,
        "name": "Dubai MENA Corporate Hub",
        "code": "BR-DXB-MENA",
        "city": "Dubai",
        "country": "AE",
        "currency": "AED",
        "address": "DIFC Gate Tower 4, Level 18, Sheikh Zayed Road, Dubai, United Arab Emirates",
        "is_hq": False
    },
    {
        "id": 7,
        "name": "Singapore APAC Headquarters",
        "code": "BR-SIN-APAC",
        "city": "Singapore",
        "country": "SG",
        "currency": "SGD",
        "address": "Marina Bay Financial Centre Tower 2, Marina Boulevard, Singapore 018983",
        "is_hq": False
    },
    {
        "id": 8,
        "name": "London European Operations",
        "code": "BR-LON-EUR",
        "city": "London",
        "country": "GB",
        "currency": "GBP",
        "address": "25 Canada Square, Canary Wharf, London E14 5LB, United Kingdom",
        "is_hq": False
    },
    {
        "id": 9,
        "name": "New York Americas Hub",
        "code": "BR-NYC-USA",
        "city": "New York",
        "country": "US",
        "currency": "USD",
        "address": "One World Trade Center, Floor 45, New York, NY 10007, United States",
        "is_hq": False
    },
    {
        "id": 10,
        "name": "Tokyo East Asia Center",
        "code": "BR-TYO-APAC",
        "city": "Tokyo",
        "country": "JP",
        "currency": "JPY",
        "address": "Roppongi Hills Mori Tower, 6-10-1 Roppongi, Minato-ku, Tokyo 106-6108, Japan",
        "is_hq": False
    }
]

BRANCH_EMPLOYEES = [
    # Hyderabad Global HQ (Branch 1)
    {
        "branch_id": 1,
        "branch_location": "Hyderabad Global HQ",
        "employee_code": "EMP-HYD-001",
        "first_name": "Karthik",
        "last_name": "Reddy",
        "email": "karthik.reddy@nexaerp.internal",
        "phone": "+91 98490 12345",
        "designation": "Chief Executive Officer & MD",
        "hierarchy_role": "EXECUTIVE",
        "dept_code": "DEP-EXEC",
        "dept_name": "Executive Leadership",
        "basic_salary": Decimal("350000.00"),
        "hra": Decimal("140000.00"),
        "net_salary": Decimal("450000.00"),
        "app_role": "System Administrator",
        "accessible_branches": ["ALL"]
    },
    {
        "branch_id": 1,
        "branch_location": "Hyderabad Global HQ",
        "employee_code": "EMP-HYD-002",
        "first_name": "Sunil",
        "last_name": "Reddy",
        "email": "sunil.reddy@nexaerp.internal",
        "phone": "+91 98490 23456",
        "designation": "Vice President of Engineering",
        "hierarchy_role": "MANAGER",
        "dept_code": "DEP-TECH",
        "dept_name": "Engineering & Technology",
        "basic_salary": Decimal("220000.00"),
        "hra": Decimal("88000.00"),
        "net_salary": Decimal("285000.00"),
        "app_role": "Manager",
        "accessible_branches": ["Hyderabad Global HQ", "Bengaluru Innovation Center"]
    },
    {
        "branch_id": 1,
        "branch_location": "Hyderabad Global HQ",
        "employee_code": "EMP-HYD-003",
        "first_name": "Ananya",
        "last_name": "Sharma",
        "email": "ananya.sharma@nexaerp.internal",
        "phone": "+91 98490 34567",
        "designation": "Head of Global People & Culture",
        "hierarchy_role": "MANAGER",
        "dept_code": "DEP-HR",
        "dept_name": "Human Resources",
        "basic_salary": Decimal("180000.00"),
        "hra": Decimal("72000.00"),
        "net_salary": Decimal("235000.00"),
        "app_role": "Manager",
        "accessible_branches": ["ALL"]
    },

    # Mumbai Financial Hub (Branch 2)
    {
        "branch_id": 2,
        "branch_location": "Mumbai Financial Hub",
        "employee_code": "EMP-MUM-001",
        "first_name": "Rohan",
        "last_name": "Verma",
        "email": "rohan.verma@nexaerp.internal",
        "phone": "+91 98200 45678",
        "designation": "Chief Financial Officer (MNC)",
        "hierarchy_role": "EXECUTIVE",
        "dept_code": "DEP-FIN",
        "dept_name": "Finance & Accounts",
        "basic_salary": Decimal("310000.00"),
        "hra": Decimal("124000.00"),
        "net_salary": Decimal("395000.00"),
        "app_role": "Executive",
        "accessible_branches": ["ALL"]
    },
    {
        "branch_id": 2,
        "branch_location": "Mumbai Financial Hub",
        "employee_code": "EMP-MUM-002",
        "first_name": "Vikram",
        "last_name": "Mehta",
        "email": "vikram.mehta@nexaerp.internal",
        "phone": "+91 98200 56789",
        "designation": "Director of Treasury & Taxation",
        "hierarchy_role": "MANAGER",
        "dept_code": "DEP-FIN",
        "dept_name": "Finance & Accounts",
        "basic_salary": Decimal("210000.00"),
        "hra": Decimal("84000.00"),
        "net_salary": Decimal("270000.00"),
        "app_role": "Manager",
        "accessible_branches": ["Mumbai Financial Hub", "Hyderabad Global HQ"]
    },
    {
        "branch_id": 2,
        "branch_location": "Mumbai Financial Hub",
        "employee_code": "EMP-MUM-003",
        "first_name": "Priya",
        "last_name": "Desai",
        "email": "priya.desai@nexaerp.internal",
        "phone": "+91 98200 67890",
        "designation": "Senior Financial Controller",
        "hierarchy_role": "TEAM_LEAD",
        "dept_code": "DEP-FIN",
        "dept_name": "Finance & Accounts",
        "basic_salary": Decimal("140000.00"),
        "hra": Decimal("56000.00"),
        "net_salary": Decimal("182000.00"),
        "app_role": "Team Lead / Shift Supervisor",
        "accessible_branches": ["Mumbai Financial Hub"]
    },

    # Bengaluru Innovation Center (Branch 3)
    {
        "branch_id": 3,
        "branch_location": "Bengaluru Innovation Center",
        "employee_code": "EMP-BLR-001",
        "first_name": "Meera",
        "last_name": "Nair",
        "email": "meera.nair@nexaerp.internal",
        "phone": "+91 98800 11223",
        "designation": "Director of AI Systems & Products",
        "hierarchy_role": "EXECUTIVE",
        "dept_code": "DEP-TECH",
        "dept_name": "Engineering & Technology",
        "basic_salary": Decimal("290000.00"),
        "hra": Decimal("116000.00"),
        "net_salary": Decimal("370000.00"),
        "app_role": "Executive",
        "accessible_branches": ["ALL"]
    },
    {
        "branch_id": 3,
        "branch_location": "Bengaluru Innovation Center",
        "employee_code": "EMP-BLR-002",
        "first_name": "Arjun",
        "last_name": "Sundaram",
        "email": "arjun.sundaram@nexaerp.internal",
        "phone": "+91 98800 22334",
        "designation": "Principal Cloud Infrastructure Architect",
        "hierarchy_role": "TEAM_LEAD",
        "dept_code": "DEP-TECH",
        "dept_name": "Engineering & Technology",
        "basic_salary": Decimal("195000.00"),
        "hra": Decimal("78000.00"),
        "net_salary": Decimal("252000.00"),
        "app_role": "Team Lead / Shift Supervisor",
        "accessible_branches": ["Bengaluru Innovation Center", "Hyderabad Global HQ"]
    },
    {
        "branch_id": 3,
        "branch_location": "Bengaluru Innovation Center",
        "employee_code": "EMP-BLR-003",
        "first_name": "Sneha",
        "last_name": "Rao",
        "email": "sneha.rao@nexaerp.internal",
        "phone": "+91 98800 33445",
        "designation": "Senior Full-Stack Cloud Engineer",
        "hierarchy_role": "MEMBER",
        "dept_code": "DEP-TECH",
        "dept_name": "Engineering & Technology",
        "basic_salary": Decimal("115000.00"),
        "hra": Decimal("46000.00"),
        "net_salary": Decimal("148000.00"),
        "app_role": "Staff",
        "accessible_branches": ["Bengaluru Innovation Center"]
    },

    # Delhi NCR Regional Office (Branch 4)
    {
        "branch_id": 4,
        "branch_location": "Delhi NCR Regional Office",
        "employee_code": "EMP-DEL-001",
        "first_name": "Rajesh",
        "last_name": "Malhotra",
        "email": "rajesh.malhotra@nexaerp.internal",
        "phone": "+91 98100 44556",
        "designation": "Regional Managing Director (North India)",
        "hierarchy_role": "MANAGER",
        "dept_code": "DEP-OPS",
        "dept_name": "Operations & Logistics",
        "basic_salary": Decimal("240000.00"),
        "hra": Decimal("96000.00"),
        "net_salary": Decimal("310000.00"),
        "app_role": "Store / Branch Manager",
        "accessible_branches": ["Delhi NCR Regional Office", "Hyderabad Global HQ"]
    },
    {
        "branch_id": 4,
        "branch_location": "Delhi NCR Regional Office",
        "employee_code": "EMP-DEL-002",
        "first_name": "Pooja",
        "last_name": "Kapoor",
        "email": "pooja.kapoor@nexaerp.internal",
        "phone": "+91 98100 55667",
        "designation": "Enterprise Sales Director (Public Sector)",
        "hierarchy_role": "TEAM_LEAD",
        "dept_code": "DEP-SALES",
        "dept_name": "Sales & Operations",
        "basic_salary": Decimal("165000.00"),
        "hra": Decimal("66000.00"),
        "net_salary": Decimal("215000.00"),
        "app_role": "Team Lead / Shift Supervisor",
        "accessible_branches": ["Delhi NCR Regional Office"]
    },

    # Chennai Port Logistics Hub (Branch 5)
    {
        "branch_id": 5,
        "branch_location": "Chennai Port Logistics Hub",
        "employee_code": "EMP-CHE-001",
        "first_name": "Murugan",
        "last_name": "Pillai",
        "email": "murugan.pillai@nexaerp.internal",
        "phone": "+91 98400 66778",
        "designation": "General Manager of Coastal Supply Chain",
        "hierarchy_role": "MANAGER",
        "dept_code": "DEP-SCM",
        "dept_name": "Logistics & Warehousing",
        "basic_salary": Decimal("185000.00"),
        "hra": Decimal("74000.00"),
        "net_salary": Decimal("240000.00"),
        "app_role": "Store / Branch Manager",
        "accessible_branches": ["Chennai Port Logistics Hub"]
    },
    {
        "branch_id": 5,
        "branch_location": "Chennai Port Logistics Hub",
        "employee_code": "EMP-CHE-002",
        "first_name": "Deepa",
        "last_name": "Krishnan",
        "email": "deepa.krishnan@nexaerp.internal",
        "phone": "+91 98400 77889",
        "designation": "Port Logistics & Freight Supervisor",
        "hierarchy_role": "TEAM_LEAD",
        "dept_code": "DEP-SCM",
        "dept_name": "Logistics & Warehousing",
        "basic_salary": Decimal("120000.00"),
        "hra": Decimal("48000.00"),
        "net_salary": Decimal("155000.00"),
        "app_role": "Team Lead / Shift Supervisor",
        "accessible_branches": ["Chennai Port Logistics Hub"]
    },

    # Dubai MENA Corporate Hub (Branch 6)
    {
        "branch_id": 6,
        "branch_location": "Dubai MENA Corporate Hub",
        "employee_code": "EMP-DXB-001",
        "first_name": "Tariq",
        "last_name": "Al-Mansoor",
        "email": "tariq.almansoor@nexaerp.internal",
        "phone": "+971 50 123 4567",
        "designation": "Managing Director (Middle East & North Africa)",
        "hierarchy_role": "EXECUTIVE",
        "dept_code": "DEP-EXEC",
        "dept_name": "Executive Leadership",
        "basic_salary": Decimal("420000.00"),
        "hra": Decimal("160000.00"),
        "net_salary": Decimal("550000.00"),
        "app_role": "Executive",
        "accessible_branches": ["Dubai MENA Corporate Hub", "Hyderabad Global HQ", "Singapore APAC Headquarters"]
    },
    {
        "branch_id": 6,
        "branch_location": "Dubai MENA Corporate Hub",
        "employee_code": "EMP-DXB-002",
        "first_name": "Fatima",
        "last_name": "Zahra",
        "email": "fatima.zahra@nexaerp.internal",
        "phone": "+971 50 234 5678",
        "designation": "Cross-Border Trade & Customs Lead",
        "hierarchy_role": "TEAM_LEAD",
        "dept_code": "DEP-FIN",
        "dept_name": "Finance & Accounts",
        "basic_salary": Decimal("260000.00"),
        "hra": Decimal("100000.00"),
        "net_salary": Decimal("340000.00"),
        "app_role": "Team Lead / Shift Supervisor",
        "accessible_branches": ["Dubai MENA Corporate Hub"]
    },

    # Singapore APAC Headquarters (Branch 7)
    {
        "branch_id": 7,
        "branch_location": "Singapore APAC Headquarters",
        "employee_code": "EMP-SIN-001",
        "first_name": "Kenji",
        "last_name": "Tan",
        "email": "kenji.tan@nexaerp.internal",
        "phone": "+65 6789 0123",
        "designation": "Managing Director (Asia-Pacific Operations)",
        "hierarchy_role": "EXECUTIVE",
        "dept_code": "DEP-EXEC",
        "dept_name": "Executive Leadership",
        "basic_salary": Decimal("380000.00"),
        "hra": Decimal("150000.00"),
        "net_salary": Decimal("500000.00"),
        "app_role": "Executive",
        "accessible_branches": ["Singapore APAC Headquarters", "Tokyo East Asia Center", "Hyderabad Global HQ"]
    },
    {
        "branch_id": 7,
        "branch_location": "Singapore APAC Headquarters",
        "employee_code": "EMP-SIN-002",
        "first_name": "Lin",
        "last_name": "Wei",
        "email": "lin.wei@nexaerp.internal",
        "phone": "+65 6789 0124",
        "designation": "Head of APAC Regional Treasury",
        "hierarchy_role": "MANAGER",
        "dept_code": "DEP-FIN",
        "dept_name": "Finance & Accounts",
        "basic_salary": Decimal("270000.00"),
        "hra": Decimal("105000.00"),
        "net_salary": Decimal("355000.00"),
        "app_role": "Manager",
        "accessible_branches": ["Singapore APAC Headquarters"]
    },

    # London European Operations (Branch 8)
    {
        "branch_id": 8,
        "branch_location": "London European Operations",
        "employee_code": "EMP-LON-001",
        "first_name": "Edward",
        "last_name": "Thornton",
        "email": "edward.thornton@nexaerp.internal",
        "phone": "+44 20 7946 0912",
        "designation": "Managing Director (Europe & UK Subsidiaries)",
        "hierarchy_role": "EXECUTIVE",
        "dept_code": "DEP-EXEC",
        "dept_name": "Executive Leadership",
        "basic_salary": Decimal("390000.00"),
        "hra": Decimal("150000.00"),
        "net_salary": Decimal("510000.00"),
        "app_role": "Executive",
        "accessible_branches": ["London European Operations", "Hyderabad Global HQ", "New York Americas Hub"]
    },
    {
        "branch_id": 8,
        "branch_location": "London European Operations",
        "employee_code": "EMP-LON-002",
        "first_name": "Charlotte",
        "last_name": "Brooks",
        "email": "charlotte.brooks@nexaerp.internal",
        "phone": "+44 20 7946 0913",
        "designation": "Global GRC & GDPR Compliance Officer",
        "hierarchy_role": "MANAGER",
        "dept_code": "DEP-GRC",
        "dept_name": "GRC & Risk Governance",
        "basic_salary": Decimal("230000.00"),
        "hra": Decimal("90000.00"),
        "net_salary": Decimal("300000.00"),
        "app_role": "Manager",
        "accessible_branches": ["London European Operations", "ALL"]
    },

    # New York Americas Hub (Branch 9)
    {
        "branch_id": 9,
        "branch_location": "New York Americas Hub",
        "employee_code": "EMP-NYC-001",
        "first_name": "David",
        "last_name": "Miller",
        "email": "david.miller@nexaerp.internal",
        "phone": "+1 212 555 0199",
        "designation": "Vice President of Americas Enterprise Sales",
        "hierarchy_role": "EXECUTIVE",
        "dept_code": "DEP-SALES",
        "dept_name": "Sales & Operations",
        "basic_salary": Decimal("440000.00"),
        "hra": Decimal("170000.00"),
        "net_salary": Decimal("575000.00"),
        "app_role": "Executive",
        "accessible_branches": ["New York Americas Hub", "ALL"]
    },

    # Tokyo East Asia Center (Branch 10)
    {
        "branch_id": 10,
        "branch_location": "Tokyo East Asia Center",
        "employee_code": "EMP-TYO-001",
        "first_name": "Hiroshi",
        "last_name": "Tanaka",
        "email": "hiroshi.tanaka@nexaerp.internal",
        "phone": "+81 3 5555 0143",
        "designation": "Japan & East Asia Regional Director",
        "hierarchy_role": "EXECUTIVE",
        "dept_code": "DEP-EXEC",
        "dept_name": "Executive Leadership",
        "basic_salary": Decimal("375000.00"),
        "hra": Decimal("145000.00"),
        "net_salary": Decimal("490000.00"),
        "app_role": "Executive",
        "accessible_branches": ["Tokyo East Asia Center", "Singapore APAC Headquarters"]
    }
]

async def migrate():
    logging.basicConfig(level=logging.INFO)
    logging.info("Starting MNC Branch & Employee real-world alignment...")

    async with AsyncSessionLocal() as db:
        # Check org 1
        org_res = await db.execute(select(Organization).where(Organization.id == 1))
        org = org_res.scalar_one_or_none()
        if not org:
            org = Organization(
                id=1,
                name="Nexa Global Enterprises",
                code="NEXA-HQ",
                tax_identifier="GSTIN27AABCU9603R1ZM",
                currency="INR"
            )
            db.add(org)
            await db.flush()

        # Update or insert MNC branches (id 1 to 10)
        branch_map = {}
        for b_def in MNC_BRANCHES:
            b_res = await db.execute(select(Branch).where(Branch.id == b_def["id"]))
            b_obj = b_res.scalar_one_or_none()
            if not b_obj:
                # also check by code
                b_code_res = await db.execute(select(Branch).where(Branch.code == b_def["code"]))
                b_obj = b_code_res.scalar_one_or_none()

            if b_obj:
                b_obj.name = b_def["name"]
                b_obj.code = b_def["code"]
                b_obj.city = b_def["city"]
                b_obj.address = b_def["address"]
                b_obj.organization_id = 1
                b_obj.is_active = True
            else:
                b_obj = Branch(
                    id=b_def["id"],
                    organization_id=1,
                    name=b_def["name"],
                    code=b_def["code"],
                    city=b_def["city"],
                    address=b_def["address"],
                    is_active=True
                )
                db.add(b_obj)
            await db.flush()
            branch_map[b_def["id"]] = b_obj

            # Ensure default departments for each branch
            for d_name, d_code in [
                ("Executive Leadership", "DEP-EXEC"),
                ("Sales & Operations", "DEP-SALES"),
                ("Finance & Accounts", "DEP-FIN"),
                ("Human Resources", "DEP-HR"),
                ("Engineering & Technology", "DEP-TECH"),
                ("Logistics & Warehousing", "DEP-SCM")
            ]:
                d_check = await db.execute(select(Department).where(Department.branch_id == b_obj.id, Department.code == d_code))
                if not d_check.scalar_one_or_none():
                    db.add(Department(branch_id=b_obj.id, name=d_name, code=d_code))

        # Clean up any leftover test dummy branches with "Branch A" or "Branch B" in name
        dummy_branches = await db.execute(
            select(Branch).where(Branch.name.like("Branch A%") | Branch.name.like("Branch B%"))
        )
        for d_branch in dummy_branches.scalars().all():
            if d_branch.id not in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]:
                await db.delete(d_branch)

        await db.commit()
        logging.info("Branches synced successfully.")

        # Clean out dummy test organizations
        dummy_orgs = await db.execute(select(Organization).where(Organization.id > 1))
        for d_org in dummy_orgs.scalars().all():
            await db.delete(d_org)
        await db.commit()

        # Seed & align Employees with their specific branches
        for emp_def in BRANCH_EMPLOYEES:
            e_res = await db.execute(select(Employee).where(Employee.email == emp_def["email"]))
            emp_obj = e_res.scalar_one_or_none()

            # Find matching department
            dept_res = await db.execute(
                select(Department).where(
                    Department.branch_id == emp_def["branch_id"],
                    Department.code == emp_def["dept_code"]
                )
            )
            dept = dept_res.scalar_one_or_none()
            dept_id = dept.id if dept else None

            if emp_obj:
                emp_obj.branch_id = emp_def["branch_id"]
                emp_obj.branch_location = emp_def["branch_location"]
                emp_obj.designation = emp_def["designation"]
                emp_obj.hierarchy_role = emp_def["hierarchy_role"]
                emp_obj.department_id = dept_id
                emp_obj.basic_salary = emp_def["basic_salary"]
                emp_obj.hra = emp_def["hra"]
                emp_obj.net_salary = emp_def["net_salary"]
                emp_obj.phone = emp_def["phone"]
                emp_obj.is_active = True
            else:
                emp_obj = Employee(
                    employee_code=emp_def["employee_code"],
                    first_name=emp_def["first_name"],
                    last_name=emp_def["last_name"],
                    email=emp_def["email"],
                    phone=emp_def["phone"],
                    branch_id=emp_def["branch_id"],
                    branch_location=emp_def["branch_location"],
                    designation=emp_def["designation"],
                    hierarchy_role=emp_def["hierarchy_role"],
                    department_id=dept_id,
                    basic_salary=emp_def["basic_salary"],
                    hra=emp_def["hra"],
                    net_salary=emp_def["net_salary"],
                    date_of_joining=date(2024, 1, 15),
                    is_active=True
                )
                db.add(emp_obj)
            await db.flush()

            # Store / update in MongoDB Community / Free Document Store
            doc_data = {
                "employee_code": emp_def["employee_code"],
                "email": emp_def["email"],
                "full_name": f"{emp_def['first_name']} {emp_def['last_name']}",
                "accessible_branches": emp_def["accessible_branches"],
                "branch_access_policy": "ALL_BRANCHES" if "ALL" in emp_def["accessible_branches"] else "ASSIGNED_ONLY",
                "app_role": emp_def["app_role"],
                "primary_branch": emp_def["branch_location"],
                "primary_branch_id": emp_def["branch_id"],
                "designation": emp_def["designation"],
                "hierarchy_role": emp_def["hierarchy_role"],
                "module_permissions": {
                    "pos": True, "inventory": True, "sales": True,
                    "finance": emp_def["hierarchy_role"] in ["EXECUTIVE", "MANAGER"],
                    "hr": emp_def["hierarchy_role"] in ["EXECUTIVE", "MANAGER"],
                    "procurement": True,
                    "manufacturing": True,
                    "grc": emp_def["hierarchy_role"] in ["EXECUTIVE", "MANAGER"],
                    "settings": emp_def["hierarchy_role"] == "EXECUTIVE",
                    "ai_copilot": True
                },
                "status": "ACTIVE"
            }
            await document_store.insert_document(
                "employee_access_authorizations",
                doc_data
            )

        await db.commit()
        logging.info("MNC Branches and segregated Employees successfully migrated!")

if __name__ == "__main__":
    asyncio.run(migrate())
