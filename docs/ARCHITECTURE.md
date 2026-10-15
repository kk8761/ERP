# NexaERP System Architecture

## 1. Architectural Philosophy & Overview
NexaERP is engineered as a high-integrity, modular monolith built for enterprise resource planning. It couples a modern asynchronous backend (Python FastAPI + SQLAlchemy 2.0 async + Pydantic v2) with an enterprise frontend designed around the SAP Fiori Horizon visual language (pure React + Vite + Vanilla CSS design tokens).

Key architectural tenets:
- **Zero TypeScript Policy**: Built purely in modern JavaScript/JSX and Python 3.14 to eliminate transpile overhead, complex typing artifacts, and compilation mismatches while maintaining strict runtime domain validation with Pydantic.
- **Server-Side Security Authority**: The client UI dynamically adapts according to the authenticated user's permissions, but all authorization, price validation, stock decrement, and ledger balancing are strictly enforced on the server.
- **Persistent Relational Integrity**: ACID-compliant transactional consistency across financial double-entry ledger lines, stock adjustments, and sales invoice generation.

---

## 2. System Architecture Diagram

```
+--------------------------------------------------------------------------------------------------+
|                                     Client Browser (React 19)                                    |
|  - TopNav (Global Search, Branch Switcher, Realtime Clock, Notifications, Profile)               |
|  - SAP Fiori Dashboard (5 KPIs, Multi-Wave Sales SVG, Expense Donut, Quick Actions Ribbon)     |
|  - Modules: POS, Sales, Inventory & Barcodes, Procurement, Finance Ledger, HR & Payroll        |
|  - Nexa AI Natural Language Assistant (Integrated Drawer)                                        |
+--------------------------------------------------------------------------------------------------+
                                                 |
                                HTTPS / REST API (JWT Bearer Token / Session Cookie)
                                                 v
+--------------------------------------------------------------------------------------------------+
|                                     FastAPI Backend Engine                                       |
|                                                                                                  |
|  [Security Middleware]                                                                           |
|   ├── OWASP Security Headers (CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff)   |
|   └── CORS Allowed Origins & Request Size Bounds                                                 |
|                                                                                                  |
|  [Authentication & Session Lifecycle]                                                            |
|   ├── Argon2id / Bcrypt Secure Password Hashing                                                  |
|   ├── PyJWT Signed Bearer Tokens with Expiration                                                 |
|   ├── Revoked Tokens Blacklist Database Storage                                                  |
|   └── Account Lockout (5 consecutive failed attempts => 15-minute lock)                          |
|                                                                                                  |
|  [Authorization & Governance]                                                                    |
|   ├── Granular Role-Based Access Control (RBAC Engine)                                           |
|   ├── Just-In-Time (JIT) Temporary Role Elevation Workflow (Mandatory Justification, Auto-Expiry)|
|   ├── No-Self-Approval Enforcement (Separation of Duties)                                        |
|   └── Immutable Audit Logging Service (User, Action, Resource, IP Address, Metadata)             |
|                                                                                                  |
|  [Domain Services & Business Transactions]                                                       |
|   ├── SalesService (Price recalculation, stock reservation, invoice issuance)                    |
|   ├── InventoryService (Concurrency protection, minimum reorder thresholds, audit movements)    |
|   ├── FinanceService (Double-entry balance verification, journal posting)                        |
|   └── AIAssistantService (Safe SQL/Query mapping, permission-aware business analytics)           |
+--------------------------------------------------------------------------------------------------+
                                                 |
                                Async Engine (SQLAlchemy 2.0 + aiosqlite / asyncpg)
                                                 v
+--------------------------------------------------------------------------------------------------+
|                                Relational Database (SQLite / PostgreSQL)                         |
|  - Multi-Branch & Multi-Tenant Entities (Organizations, Branches, Departments, Warehouses)       |
|  - Security & Governance (Users, Roles, Permissions, UserRoles, RolePermissions, AccessRequests) |
|  - Inventory & Supply Chain (ProductCategories, Products, StockMovements, Suppliers, POs)        |
|  - Sales & CRM (Customers, SalesOrders, SalesOrderItems)                                         |
|  - Financial Ledger (Accounts, JournalEntries, JournalEntryLines, Expenses)                      |
|  - Human Capital (Employees, AttendanceRecords, LeaveRequests, PayrollRecords)                   |
|  - System Audit (AuditLogs, RevokedTokens)                                                       |
+--------------------------------------------------------------------------------------------------+
```

---

## 3. Directory Layout & Module Responsibilities

```text
nexaerp/
├── backend/
│   ├── app/
│   │   ├── api/             # REST Routers (auth, dashboard, pos, sales, inventory, finance, hr, elevation, ai)
│   │   ├── auth/            # Password hashing, JWT token issuer, dependencies & security guards
│   │   ├── authorization/   # RBAC catalog, role templates, and JIT dynamic permission resolver
│   │   ├── config.py        # Centralized settings loaded via Pydantic (JWT secret, DB URL, CORS)
│   │   ├── database.py      # Async SQLAlchemy engine, session maker, Base declarative model
│   │   ├── middleware/      # Security headers middleware, request rate limiter
│   │   ├── models/          # Declarative relational models (auth, org, inventory, sales, procurement, etc.)
│   │   ├── schemas/         # Pydantic v2 validation contracts for API input/output
│   │   ├── services/        # Transactional business logic (Sales, Inventory, Audit, AI assistant)
│   │   └── main.py          # FastAPI application entrypoint with lifespan startup & routes
│   └── tests/               # Pytest automated test suite (auth, rbac, elevation, security, transactions)
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable Fiori components (TopNav, Sidebar, QuickActions, AIAssistantDrawer)
│   │   ├── contexts/        # AuthContext (user session, reactive permissions, login/logout)
│   │   ├── pages/           # Module pages (Dashboard, POS, Inventory, Sales, Procurement, Finance, HR, JIT)
│   │   ├── services/        # Axios/Fetch API wrapper with JWT headers and 401 handling
│   │   ├── styles/ & index.css # Fiori 3 design system, responsive grids, dark/light theme tokens
│   │   ├── App.jsx          # Route coordinator & layout manager
│   │   └── main.jsx         # React DOM mount point
├── database/                # Schema definitions and seed scripts
├── docs/                    # Complete architectural, security, RBAC, database, and deployment manuals
├── scripts/                 # Standalone administrative utilities (seed_demo_data.py, bootstrap_admin.py)
├── compose.yaml             # Production/Staging multi-container orchestration definition
└── README.md                # Comprehensive project documentation
```

---

## 4. Concurrency & Transaction Safety
- **Sales & Stock Integrity**: Every sales checkout and purchase goods receipt executes in an isolated database transaction. Stock decrements check available inventory (`product.current_stock >= requested_quantity`) before decrementing and issuing a `StockMovement` ledger entry.
- **Financial Balance Guarantee**: Double-entry journal entries compute `sum(debit) == sum(credit)` in Python using `decimal.Decimal` safe calculations before persisting. Unbalanced entries are rejected with HTTP 400.
- **Account Lockout Resilience**: Consecutive failed login attempts increment `failed_login_attempts`. Upon reaching 5 failures, `locked_until` is set to `now + 15 minutes`, blocking brute-force attacks.
