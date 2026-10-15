# NexaERP - Enterprise Resource Planning System

> **Grow Your Business** with an enterprise-grade ERP designed with modern web architecture and an enterprise visual interface inspired by SAP Fiori Horizon.

---

## 1. Project Overview & Architecture

NexaERP is a complete, secure, full-stack ERP application built from scratch to streamline enterprise business operations:
- **Point of Sale (POS) & Billing**: Real-time barcode lookup, tax calculation, checkout, and receipt issuance.
- **Inventory & Supply Chain**: Minimum stock alert monitoring, reorder level tracking, and stock movement ledgers.
- **Procurement**: Purchase orders, supplier directory, and goods receipt automated restocking.
- **Finance & Accounting**: Chart of accounts, double-entry journal posting (`debits == credits`), and expense tracking.
- **Human Resources & Payroll**: Staff management, daily attendance clocking, leave approvals, and automated payroll computations.
- **Security & JIT Elevation**: Role-Based Access Control (RBAC), Just-In-Time role elevation with **strict separation of duties (no-self-approval)**, and tamper-proof audit trails.
- **Nexa AI Assistant**: Contextual natural language assistant capable of querying live ERP data (sales summaries, low-stock warnings, expense breakdowns).

---

## 2. Technology Stack & Constraints

- **Zero TypeScript**: All frontend and backend code is written strictly in JavaScript/JSX and Python 3.14 to eliminate transpile and typing complexity while ensuring rapid execution.
- **Frontend**: React 19, Vite, Lucide React icons, and a custom SAP Fiori Horizon design system (`src/index.css`) supporting both Light and Dark modes.
- **Backend**: Python 3.14 + FastAPI + Pydantic v2 + SQLAlchemy 2.0 (asyncio with `aiosqlite` and `asyncpg`).
- **Database**: Persistent SQLite (`nexaerp.db`) for development; PostgreSQL 16 ready for production.
- **Security**: Argon2id/Bcrypt password hashing, PyJWT signed tokens, token revocation blacklist, account lockouts on consecutive failed logins, and OWASP security headers.

---

## 3. Seed Credentials (Development)

The database comes pre-seeded with an organization, multiple branches, products matching the dashboard screenshot (Basmati Rice, Sunflower Oil, Amul Milk, Atta, Sugar), recent sales (#INV-001241 through #INV-001245), and sample role accounts:

| Role | Email | Password |
|---|---|---|
| **System Administrator** | `admin@nexaerp.internal` | `Admin@NexaERP2026!` |
| **Cashier** | `cashier@nexaerp.internal` | `Cashier@NexaERP2026!` |
| **Inventory Manager** | `inventory@nexaerp.internal` | `Inventory@NexaERP2026!` |
| **Accountant** | `accountant@nexaerp.internal` | `Accountant@NexaERP2026!` |
| **HR Manager** | `hr@nexaerp.internal` | `HRManager@NexaERP2026!` |

*(Note: The login page also features convenient one-click demo persona quick-fill buttons).*

---

## 4. Local Development Quickstart

### Prerequisites
- Python 3.11+
- Node.js 18+

### Step 1: Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database seeder (populates products, accounts, roles, initial data)
python ../scripts/seed_demo_data.py

# Launch FastAPI development server (runs on port 8000)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Step 2: Frontend Setup
```bash
# In a new terminal window:
cd frontend

# Install npm dependencies
npm install

# Start Vite dev server (runs on port 5173)
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 5. Automated Testing Suite

All 13 comprehensive backend unit, integration, and security tests can be verified using Pytest:

```bash
# From the project root:
backend\venv\Scripts\pytest backend/tests -W ignore -v
```

### Covered Test Scenarios:
1. `test_health_check`: API availability and version probe.
2. `test_login_success`: Authentication and JWT issuance.
3. `test_login_invalid_credentials`: Negative authentication check.
4. `test_get_me`: Protected route verification.
5. `test_logout_revokes_token`: Token revocation and immediate invalidation.
6. `test_jit_elevation_lifecycle_and_no_self_approval`: JIT elevation request, approval by separate manager, and effective permission grant.
7. `test_admin_cannot_self_approve_elevation`: Enforced separation of duties preventing self-approval.
8. `test_admin_has_full_rbac_access`: Verification of master permissions for administrative role.
9. `test_cashier_denied_sensitive_operations`: Verification that cashier cannot access or modify finance journal entries (negative authorization).
10. `test_sales_and_inventory_transaction_integrity`: Atomic checkout, stock decrement, and negative stock rejection.
11. `test_security_headers_present`: Verification of OWASP CSP, HSTS, X-Frame-Options, and nosniff headers.
12. `test_sql_injection_defense`: Verification that SQL injection strings fail safely in parameterized ORM queries.
13. `test_account_lockout_on_consecutive_failed_logins`: Verification of brute-force mitigation after 5 failed attempts.

---

## 6. Project Documentation

Detailed technical manuals are located in the [`docs/`](file:///c:/Users/karth/OneDrive/Desktop/dream/docs) directory:
- [ARCHITECTURE.md](file:///c:/Users/karth/OneDrive/Desktop/dream/docs/ARCHITECTURE.md): System design, component diagrams, and concurrency safety.
- [SECURITY.md](file:///c:/Users/karth/OneDrive/Desktop/dream/docs/SECURITY.md): OWASP compliance, token revocation, and threat matrix.
- [RBAC.md](file:///c:/Users/karth/OneDrive/Desktop/dream/docs/RBAC.md): Granular permission catalog and JIT elevation rules.
- [API.md](file:///c:/Users/karth/OneDrive/Desktop/dream/docs/API.md): Full REST API endpoint reference and query schemas.
- [DATABASE.md](file:///c:/Users/karth/OneDrive/Desktop/dream/docs/DATABASE.md): ER diagrams, table schemas, and backup/restore steps.
- [DEPLOYMENT.md](file:///c:/Users/karth/OneDrive/Desktop/dream/docs/DEPLOYMENT.md): Container orchestration and production checklist.
