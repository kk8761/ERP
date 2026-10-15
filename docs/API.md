# NexaERP REST API Specification

## 1. Overview
NexaERP provides a clean RESTful JSON API. All protected endpoints expect a standard HTTP `Authorization` header containing a valid JSON Web Token:
```http
Authorization: Bearer <jwt_access_token>
```
Alternatively, browser requests can authenticate via the `session_token` cookie.

---

## 2. API Endpoints Reference

### Authentication (`/api/auth`)
- `POST /api/auth/login`: Authenticate with email and password. Returns JWT token, expiration, user profile, and effective permissions.
- `GET /api/auth/me`: Retrieve currently authenticated user profile and permissions.
- `POST /api/auth/logout`: Revoke active session token and blacklist `jti`.

### Dashboard (`/api/dashboard`)
- `GET /api/dashboard/summary`: Retrieve 5 core KPIs (Total Sales, Total Orders, Inventory Items, Customers, Monthly Profit), 30-day sales overview trend data, expense breakdown categories, low stock alerts, and recent sales transactions.

### Point of Sale & Sales (`/api/pos`, `/api/sales`)
- `GET /api/pos/products`: Search and retrieve products with stock and unit pricing for the POS register.
- `POST /api/pos/checkout`: Process an instant sale. Atomically recalculates totals, validates inventory availability, generates `#INV-XXXXXX` invoice, decrements stock, and logs stock movements.
- `GET /api/sales/orders`: List all sales orders with pagination, status, and search filters.
- `GET /api/sales/customers`: List active customers directory.
- `POST /api/sales/orders/{id}/refund`: Process a sales return and refund items back into inventory.

### Inventory (`/api/inventory`)
- `GET /api/inventory/products`: List all catalog products with current stock, reorder levels, category, and pricing.
- `POST /api/inventory/products`: Create a new product.
- `POST /api/inventory/adjust`: Perform manual inventory count adjustments with reason tracking.
- `GET /api/inventory/movements`: Retrieve chronological stock audit ledger.

### Procurement (`/api/procurement`)
- `GET /api/procurement/orders`: List purchase orders and status (`DRAFT`, `APPROVED`, `RECEIVED`).
- `POST /api/procurement/orders`: Create a purchase order to a supplier.
- `POST /api/procurement/orders/{id}/receive`: Receive goods at warehouse and automatically increment product stock levels.
- `GET /api/procurement/suppliers`: List registered vendors.

### Finance & Accounting (`/api/finance`)
- `GET /api/finance/accounts`: Retrieve master Chart of Accounts with account types and balances.
- `POST /api/finance/journal-entries`: Post balanced double-entry journal lines (`debits == credits`).
- `GET /api/finance/expenses`: List operating expense records.

### Human Resources (`/api/hr`)
- `GET /api/hr/employees`: List active staff, departments, positions, and base compensation.
- `POST /api/hr/attendance`: Record daily clock-in/clock-out events.
- `POST /api/hr/leave-requests`: Submit leave requests.
- `POST /api/hr/leave-requests/{id}/approve`: Manager approval for employee leave.
- `GET /api/hr/payroll`: View employee payslips and monthly payroll calculation.

### Just-In-Time Role Elevation (`/api/elevation`)
- `GET /api/elevation/requests`: List pending, approved, and expired elevation requests.
- `POST /api/elevation/request`: Submit a temporary role elevation request with justification and duration.
- `POST /api/elevation/approve`: Approve a pending elevation request (strict no-self-approval rule enforced).
- `POST /api/elevation/revoke`: Revoke an active temporary elevation grant.

### Nexa AI Assistant (`/api/ai`)
- `POST /api/ai/query`: Natural language query processor against ERP business data (e.g., "Which items are low in stock?", "Show today's sales summary").

### Reports & Compliance (`/api/reports`, `/api/audit`)
- `GET /api/reports/sales/csv`: Export sales ledger to CSV format.
- `GET /api/reports/inventory/csv`: Export current stock list to CSV format.
- `GET /api/audit/logs`: Retrieve immutable system audit log entries.
