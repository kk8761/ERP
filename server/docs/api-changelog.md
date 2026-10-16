# NexaERP API Changelog

All notable API changes are documented here. The versioning follows [Semantic Versioning](https://semver.org/).

- **BREAKING** — changes that require client code updates
- **New** — new endpoints or fields added (backwards-compatible)
- **Changed** — modified behaviour that is still backwards-compatible
- **Deprecated** — features that will be removed in a future version
- **Fixed** — bug fixes

---

## [2.0.0] — 2024-12-01

### BREAKING Changes

- **Authentication**: Migrated from pure JWT to **session-based authentication** with Redis.
  - Clients must now handle the `Set-Cookie` header from `POST /api/auth/login` instead of storing a raw JWT.
  - Bearer token auth is still supported via `Authorization: Bearer <token>` for API integrations.
  - The old `/api/auth/refresh` endpoint is removed; sessions are extended automatically.

- **Response Envelope**: All endpoints now return the standardised envelope:
  ```json
  { "success": true, "data": { ... }, "message": "..." }
  ```
  Previously some endpoints returned bare objects.

- **Pagination**: List endpoints that previously returned an array now return:
  ```json
  { "items": [...], "pagination": { "page", "pageSize", "total", "totalPages" } }
  ```
  Affected endpoints: `GET /api/inventory`, `GET /api/orders`, `GET /api/crm/customers`, `GET /api/hcm/employees`.

- **Product fields renamed**:
  - `costPrice` → `purchasePrice`
  - `quantity` → `stock`
  - `alertQty` → `reorderLevel`

- **Order field renamed**: `totalAmount` → `grandTotal`

### New

- `POST /api/auth/mfa/confirm` — Confirm TOTP MFA setup
- `GET /api/auth/mfa/status` — Check whether MFA is enabled for the current user
- `POST /api/auth/mfa/sms/send` and `/verify` — SMS-based MFA
- `POST /api/auth/mfa/email/send` and `/verify` — Email-based MFA
- `GET /api/auth/sessions` — List active sessions
- `DELETE /api/auth/sessions/:token` — Revoke a specific session
- `PATCH /api/inventory/:id/stock` — Stock adjustment endpoint (replaces manual PUT updates)
- `GET /api/orders/:id/invoice` — Download GST invoice as PDF
- `POST /api/orders/purchase` — Create purchase orders
- `POST /api/orders/:id/receive` — Record goods received (GRN)
- `GET /api/accounting/trial-balance` — Trial balance for a date range
- `GET /api/accounting/profit-loss` — P&L statement
- `POST /api/crm/activities` — Log customer interactions
- `GET /api/crm/customers/:id/orders` — Customer purchase history
- `POST /api/hcm/payroll/process` — Process monthly payroll
- `GET /api/analytics/kpis` — Dashboard KPI endpoint
- `GET /api/analytics/gst-report` — GST report (JSON or Excel)
- `GET /api/analytics/inventory-valuation` — Inventory valuation (FIFO/LIFO/weighted avg)
- `GET /api/docs` — Interactive developer documentation portal
- `GET /api/docs/openapi.yaml` — OpenAPI 3.0 specification

### Changed

- Rate limits tightened: auth endpoints reduced from 100 to **30 requests per 15 minutes**.
- `DELETE /api/inventory/:id` now soft-deletes (sets `isActive: false`) instead of permanent deletion.
- `GET /api/orders` now requires at least one filter param to prevent unbounded queries in production.

### Deprecated

- `GET /api/auth/refresh` — Removed in 2.0. Use session-based auth.
- `POST /api/pos/sale` — Merged into `POST /api/orders`. Remove by v2.1.

---

## [1.5.0] — 2024-09-15

### New

- `GET /api/audit` — Audit log endpoint with filtering by user, action, and date range
- `GET /api/monitoring/health` — Extended health check with DB/Redis status
- `POST /api/workflow` — Workflow trigger endpoint
- `GET /api/analytics` — Basic revenue analytics
- Google and Microsoft SSO via `GET /api/auth/google` and `/api/auth/microsoft`

### Changed

- Helmet security headers added to all responses.
- Morgan request logging enabled.

### Fixed

- `GET /api/inventory` no longer returns deleted products.
- CORS configuration now correctly restricts origins in production.

---

## [1.2.0] — 2024-07-01

### New

- `POST /api/crm/customers` — Customer management
- `GET /api/crm/customers` — Customer list with search
- `POST /api/accounting/journal-entries` — Manual journal entries
- `GET /api/accounting/accounts` — Chart of accounts

### Changed

- Order status values standardised to `PENDING | COMPLETED | CANCELLED | RETURNED`.

### Fixed

- Stock not updating when creating a sale via POS.

---

## [1.0.0] — 2024-04-01

Initial release of the NexaERP API.

### Endpoints available

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/inventory` — Product list
- `POST /api/inventory` — Create product
- `PUT /api/inventory/:id` — Update product
- `DELETE /api/inventory/:id` — Delete product
- `POST /api/orders` — Create sale
- `GET /api/orders` — List orders
- `GET /health` — Server health check

---

## Migration Guides

### v1.x → v2.0

1. **Update authentication**: Replace JWT storage/refresh logic with cookie-based sessions.
   ```javascript
   // Before (v1)
   const token = localStorage.getItem('token');
   headers['Authorization'] = `Bearer ${token}`;

   // After (v2)
   // Cookies are sent automatically if withCredentials: true
   axios.defaults.withCredentials = true;
   ```

2. **Update response parsing**: Unwrap the `data` field from the envelope.
   ```javascript
   // Before
   const products = await api.get('/inventory'); // returns array

   // After
   const { data } = await api.get('/inventory');
   const products = data.data.items;
   const pagination = data.data.pagination;
   ```

3. **Rename product fields** in your data models:
   - `costPrice` → `purchasePrice`
   - `quantity` → `stock`
   - `alertQty` → `reorderLevel`

4. **Update pagination handling**: All list responses now include a `pagination` object.

---

*NexaERP API — maintained by the NexaERP team*
