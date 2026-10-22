# Standard NexaERP Permissions Catalog

PERMISSIONS = [
    # Dashboard & Analytics
    {"code": "dashboard.view", "module": "dashboard", "description": "View executive and operational dashboard"},
    {"code": "reports.view", "module": "reports", "description": "View operational and financial reports"},
    {"code": "reports.export", "module": "reports", "description": "Export reports to CSV/Excel"},

    # Sales & POS
    {"code": "sales.view", "module": "sales", "description": "View sales orders, invoices, and quotes"},
    {"code": "sales.create", "module": "sales", "description": "Create new sales transactions and POS receipts"},
    {"code": "sales.update", "module": "sales", "description": "Edit draft sales orders"},
    {"code": "sales.refund", "module": "sales", "description": "Process returns and refunds"},
    {"code": "sales.manage", "module": "sales", "description": "Manage sales records, clients, and pipelines"},
    {"code": "customers.manage", "module": "sales", "description": "Create and manage customer profiles"},

    # Inventory
    {"code": "inventory.view", "module": "inventory", "description": "View products catalog and stock levels"},
    {"code": "inventory.create", "module": "inventory", "description": "Add new products and categories"},
    {"code": "inventory.update", "module": "inventory", "description": "Update product details and pricing"},
    {"code": "inventory.adjust", "module": "inventory", "description": "Perform manual stock adjustments"},
    {"code": "warehouses.manage", "module": "inventory", "description": "Create and configure warehouse storage locations"},
    {"code": "inventory.manage", "module": "inventory", "description": "Full inventory lifecycle management"},

    # Procurement
    {"code": "procurement.view", "module": "procurement", "description": "View suppliers and purchase orders"},
    {"code": "procurement.create", "module": "procurement", "description": "Create purchase requisitions & orders"},
    {"code": "procurement.approve", "module": "procurement", "description": "Approve purchase orders for fulfillment"},
    {"code": "procurement.receive", "module": "procurement", "description": "Record goods receipts into inventory"},
    {"code": "suppliers.manage", "module": "procurement", "description": "Create and manage suppliers and vendors"},
    {"code": "procurement.manage", "module": "procurement", "description": "Manage procurement policies, vendor ratings, and approvals"},

    # Finance & Accounting
    {"code": "finance.view", "module": "finance", "description": "View chart of accounts, expenses, and ledger"},
    {"code": "finance.post", "module": "finance", "description": "Create journal entries and post financial records"},
    {"code": "expenses.record", "module": "finance", "description": "Record operational expenses"},
    {"code": "accounts.manage", "module": "finance", "description": "Manage chart of accounts and live ledger configurations"},
    {"code": "finance.manage", "module": "finance", "description": "Manage corporate financial records and general ledger"},

    # Human Resources & Payroll
    {"code": "hr.view", "module": "hr", "description": "View employee list and directory"},
    {"code": "hr.manage", "module": "hr", "description": "Create, edit employee profiles and positions"},
    {"code": "attendance.record", "module": "hr", "description": "Record and manage employee attendance"},
    {"code": "leaves.manage", "module": "hr", "description": "Approve or reject employee leave requests"},
    {"code": "payroll.view", "module": "hr", "description": "View payroll summaries and payslips"},
    {"code": "payroll.process", "module": "hr", "description": "Calculate and process employee payroll"},

    # Administration & Security
    {"code": "users.view", "module": "admin", "description": "View user accounts and profiles"},
    {"code": "users.manage", "module": "admin", "description": "Create, edit, suspend, and reset user accounts"},
    {"code": "roles.manage", "module": "admin", "description": "Create and configure roles and permissions"},
    {"code": "access_requests.request", "module": "admin", "description": "Request temporary role elevation"},
    {"code": "access_requests.approve", "module": "admin", "description": "Approve or deny temporary access requests"},
    {"code": "audit_logs.view", "module": "admin", "description": "Inspect system and security audit logs"},
    {"code": "settings.manage", "module": "admin", "description": "Configure company branches and system settings"},
    {"code": "ai.use", "module": "ai", "description": "Interact with Nexa AI business query assistant"},
    {"code": "workflows.view", "module": "workflows", "description": "View automated workflows and execution history"},
    {"code": "workflows.manage", "module": "workflows", "description": "Create, schedule, pause, and run workflows"},
]

# Standard Role Templates and their pre-assigned permissions
ROLE_TEMPLATES = {
    "System Administrator": [p["code"] for p in PERMISSIONS],
    "Branch Manager": [
        "dashboard.view", "reports.view", "reports.export",
        "sales.view", "sales.create", "sales.update", "sales.refund", "sales.manage", "customers.manage",
        "inventory.view", "inventory.create", "inventory.update", "inventory.adjust", "warehouses.manage", "inventory.manage",
        "procurement.view", "procurement.create", "procurement.approve", "procurement.receive", "suppliers.manage", "procurement.manage",
        "finance.view", "expenses.record",
        "hr.view", "attendance.record", "leaves.manage",
        "users.view", "access_requests.request", "ai.use",
        "workflows.view", "workflows.manage"
    ],
    "Sales Representative / Cashier": [
        "dashboard.view",
        "sales.view", "sales.create", "customers.manage",
        "inventory.view",
        "attendance.record",
        "access_requests.request", "ai.use"
    ],
    "Inventory Clerk": [
        "dashboard.view",
        "inventory.view", "inventory.create", "inventory.update", "inventory.adjust", "warehouses.manage",
        "procurement.view", "procurement.receive",
        "attendance.record",
        "access_requests.request", "ai.use"
    ],
    "Accountant": [
        "dashboard.view", "reports.view", "reports.export",
        "sales.view",
        "finance.view", "finance.post", "expenses.record", "accounts.manage", "finance.manage",
        "payroll.view",
        "attendance.record",
        "access_requests.request", "ai.use"
    ],
    "HR Officer": [
        "dashboard.view",
        "hr.view", "hr.manage", "attendance.record", "leaves.manage",
        "payroll.view", "payroll.process",
        "access_requests.request", "ai.use"
    ],
    "Auditor": [
        "dashboard.view", "reports.view", "reports.export",
        "sales.view", "inventory.view", "procurement.view", "finance.view", "hr.view",
        "audit_logs.view", "ai.use"
    ]
}
