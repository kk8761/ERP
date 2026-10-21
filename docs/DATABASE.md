# NexaERP Database Architecture & Multi-DBMS Strategy

## 1. Multi-DBMS Architecture & Purpose-Built Storage

NexaERP leverages a hybrid polyglot persistence architecture designed to align data access patterns with the optimal database engine:

| DBMS Engine | Protocol / Driver | Primary Domain & Workload | Concurrency & Isolation |
|---|---|---|---|
| **PostgreSQL 16** (Production) / **SQLite** (Local) | SQLAlchemy 2.0 Async (`asyncpg` / `aiosqlite`) | Core Relational ERP: `users`, `roles`, `permissions`, double-entry `journal_entries`, `sales_orders`, `inventory` catalog, and `access_requests`. | Serializable / Read Committed ACID transactions with row-level locking (`SELECT ... FOR UPDATE`) to eliminate race conditions in stock reservations and checkout. |
| **MongoDB / NoSQL** | MongoDB Driver / Motor Async | Unstructured document management, vendor contracts, PDF invoice archival, RAG unstructured corporate knowledge chunks, and variable dynamic product specifications. | Document-level atomicity, sharded horizontal scalability for multi-gigabyte document attachments and high-frequency IoT/POS telemetry logs. |
| **Redis** (In-Memory Cache) | Redis Async | Active user sessions, JWT token revocation blacklists, and distributed rate limiting buckets (5-attempt account lockout locks). | Sub-millisecond read throughput with atomic counter operations (`INCR`, `EXPIRE`). |

---

## 2. Where User IDs and Credentials are Stored

User profiles, cryptographic credentials, and tenancy identifiers are stored in the core relational schema under the **`users`** entity:

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- or BIGSERIAL in PostgreSQL
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- Salted Bcrypt / Argon2id hash (never plain text)
    is_active BOOLEAN NOT NULL DEFAULT 1, -- Admin status control (Active vs Suspended)
    is_superuser BOOLEAN NOT NULL DEFAULT 0, -- Master platform authority flag
    failed_login_attempts INTEGER DEFAULT 0, -- Lockout counter
    locked_until DATETIME,                -- Timestamp when brute-force lockout clears
    branch_id INTEGER REFERENCES branches(id), -- Scoped storefront assignment
    department_id INTEGER REFERENCES departments(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE INDEX ix_users_branch_id ON users (branch_id);
```

### Role & Permission Association (Many-to-Many):
- **`user_roles`**: Maps `user_id` to `role_id` (e.g., `System Administrator`, `Sales Representative / Cashier`, `Accountant`).
- **`role_permissions`**: Maps `role_id` to granular system capabilities (e.g., `users.manage`, `finance.post`, `sales.create`).

---

## 3. Concurrency Control Mechanisms

1. **Pessimistic Row-Level Locking (`SELECT ... FOR UPDATE`)**:
   - Used during checkout and inventory adjustment: When a cashier issues an order for 5 units of *Basmati Rice*, the inventory row is locked in a database transaction until stock is decremented and validated. Concurrent checkouts for the same SKU wait in queue, preventing negative inventory.
2. **Optimistic Locking via Version Stamps**:
   - High-throughput entities incorporate version numbers (`version_id`). If two operators modify customer information simultaneously, the first write succeeds and the second receives a `409 Conflict` response prompting a merge.
3. **Double-Entry Financial Invariants**:
   - Journal voucher postings are committed inside atomic transactions that assert `SUM(debit) == SUM(credit)` using Python `decimal.Decimal` calculations before committing.

---

## 4. Administrator Authority Model

The **System Administrator** possesses master authority across both profiles:

1. **Company HQ Control**: Full unrestricted access to executive KPIs, Chart of Accounts, payroll disbursements, vendor agreements, and audit trails.
2. **Shopkeeper & Storefront Control**: Full visibility into individual storefront POS registers, cashier shifts, barcode scanners, and inventory movements across all branches.
3. **User Status Governance**:
   - **Add Users**: Direct user provisioning with predefined roles (`POST /api/admin/users`).
   - **Modify User Status**: Activate or suspend accounts in real time (`PATCH /api/admin/users/{id}` with `is_active: false`). Suspended users are immediately denied login and active tokens fail validation.
   - **Delete Users**: Permanent deletion of decommissioned operators (`DELETE /api/admin/users/{id}`), guarded against self-deletion.
