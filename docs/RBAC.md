# NexaERP Role-Based Access Control (RBAC) Specification

## 1. Overview
NexaERP implements a granular, zero-trust Role-Based Access Control engine. All API routes require explicit authorization checks using the `require_permission(permission_codename)` dependency. Browser visibility is treated as a presentation detail; the server is the sole arbiter of authorization.

---

## 2. Granular Permissions Catalog

| Permission Code | Display Name | Module | Description |
|---|---|---|---|
| `dashboard.view` | View Dashboard | Dashboard | View role-specific KPIs, sales summaries, and analytics |
| `sales.view` | View Sales | Sales & POS | View sales orders, receipts, and customer transactions |
| `sales.create` | Create Sales Orders | Sales & POS | Process orders, ring up checkout in POS terminal |
| `sales.refund` | Process Sales Refunds | Sales & POS | Authorize and execute returns and refunds |
| `inventory.view` | View Inventory | Inventory | Access catalog, current stock levels, and warehouse views |
| `inventory.create` | Create Products | Inventory | Add new products, SKUs, and pricing specifications |
| `inventory.adjust` | Adjust Stock | Inventory | Perform manual stock adjustments, counts, and write-offs |
| `purchasing.view` | View Procurement | Procurement | View purchase orders, requisitions, and vendor catalog |
| `purchasing.create` | Create Purchase Orders | Procurement | Draft purchase orders to suppliers |
| `purchasing.approve` | Approve Purchase Orders | Procurement | Review, sign off, and approve high-value POs |
| `finance.view` | View Finance | Finance | View chart of accounts, expenses, balance sheets |
| `finance.post` | Post Journal Entries | Finance | Create balanced general ledger entries and record payments |
| `payroll.view` | View Payroll | HR & Payroll | View compensation records, payslips, and salary sheets |
| `payroll.process` | Process Payroll | HR & Payroll | Execute monthly payroll runs and disburse funds |
| `users.manage` | Manage Users | Administration | Invite users, deactivate accounts, reset passwords |
| `roles.manage` | Manage Roles | Administration | Create roles and reassign permission sets |
| `access_requests.approve` | Approve JIT Elevation | Security | Review, approve, or reject temporary elevation requests |
| `audit_logs.view` | View Audit Logs | Security | Inspect immutable compliance and system activity logs |

---

## 3. Standard Role Templates

| Role Name | Key Permissions | Target Persona |
|---|---|---|
| **System Administrator** | `*` (All system permissions) | Platform operators, IT administrators |
| **Cashier** | `dashboard.view`, `sales.view`, `sales.create`, `inventory.view` | Retail store operators, checkout counters |
| **Sales Representative** | `dashboard.view`, `sales.view`, `sales.create`, `sales.refund` | B2B sales agents, account executives |
| **Inventory Manager** | `dashboard.view`, `inventory.view`, `inventory.create`, `inventory.adjust`, `purchasing.view` | Warehouse supervisors, logistics leads |
| **Procurement Officer**| `dashboard.view`, `purchasing.view`, `purchasing.create`, `purchasing.approve`, `inventory.view` | Purchasing agents, vendor managers |
| **Accountant** | `dashboard.view`, `finance.view`, `finance.post`, `sales.view`, `purchasing.view` | Financial bookkeepers, general ledger clerks |
| **HR Manager** | `dashboard.view`, `payroll.view`, `payroll.process` | Human resources directors, talent managers |
| **Auditor** | `dashboard.view`, `audit_logs.view`, `finance.view`, `inventory.view`, `sales.view` | External and internal compliance auditors |

---

## 4. JIT Role Elevation Workflow

```
[Employee / User]
       |
       | 1. Submit Elevation Request (/api/elevation/request)
       |    - Requested Role: "Accountant" or "Inventory Manager"
       |    - Reason: "Year-end stock reconciliation"
       |    - Duration: 120 minutes
       v
[Pending Queue in Security Elevation Center]
       |
       | 2. Designated Approver Reviews (/api/elevation/approve)
       |    * Enforced Check: approver_id != requester_id (No self-approval!)
       v
[Grant Activated]
       |
       | 3. Effective Permissions recalculate on next request
       |    Effective = Base Permissions ∪ Active Elevation Permissions
       v
[Automatic Expiration]
       |
       | 4. System clock reaches expires_at timestamp
       |    Grant excluded from effective permission resolution immediately
```
