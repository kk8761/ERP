# NexaERP API Reference

**Version:** 2.0.0  
**Base URL:** `https://your-domain.com/api`  
**Content-Type:** `application/json`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Error Codes](#error-codes)
4. [Response Format](#response-format)
5. [Modules](#modules)
   - [POS / Billing](#pos--billing)
   - [Inventory](#inventory)
   - [Orders](#orders)
   - [Accounting](#accounting)
   - [CRM](#crm)
   - [Staff & HCM](#staff--hcm)
   - [Analytics](#analytics)
6. [Webhooks](#webhooks)

---

## Authentication

NexaERP supports two authentication mechanisms: **JWT Bearer tokens** and **OAuth 2.0 / SSO**.

### JWT Authentication

#### Login

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "admin@store.com",
  "password": "SecurePass123!"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_01HX9KZPQR",
      "email": "admin@store.com",
      "name": "Store Admin",
      "role": "ADMIN"
    },
    "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

**Error `401 Unauthorized`:**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

#### Using the Token

Include the session cookie or pass the token in the `Authorization` header:

```http
Authorization: Bearer <token>
```

#### Logout

```http
POST /api/auth/logout
```

#### Refresh / Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

---

### Multi-Factor Authentication (MFA)

NexaERP supports TOTP, SMS, and email-based MFA.

#### Setup TOTP MFA

```http
GET /api/auth/mfa/setup
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCodeUrl": "data:image/png;base64,...",
    "secret": "JBSWY3DPEHPK3PXP"
  }
}
```

#### Confirm MFA Setup

```http
POST /api/auth/mfa/confirm
Authorization: Bearer <token>
Content-Type: application/json

{ "token": "123456" }
```

#### Verify MFA (post-login)

```http
POST /api/auth/mfa/verify
Content-Type: application/json

{ "token": "123456", "sessionId": "sess_..." }
```

---

### OAuth 2.0 / SSO

#### Google SSO

```
GET /api/auth/google
```
Redirects user to Google OAuth consent screen. Callback returns authenticated session.

#### Microsoft SSO

```
GET /api/auth/microsoft
```
Redirects user to Microsoft consent screen.

---

## Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| General API | 500 requests | 15 minutes |
| Authentication | 30 requests | 15 minutes |

Rate limit headers are included in every response:

```
RateLimit-Limit: 500
RateLimit-Remaining: 487
RateLimit-Reset: 1714500000
```

When exceeded, the API returns:

```json
{
  "success": false,
  "error": "Too many requests, please try again later."
}
```

HTTP status: `429 Too Many Requests`

---

## Error Codes

| HTTP Status | Code | Meaning |
|-------------|------|---------|
| 400 | `VALIDATION_ERROR` | Request body failed validation |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Authenticated but lacks permission |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Resource already exists |
| 422 | `UNPROCESSABLE` | Business logic rejection |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

**Validation error example:**
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    "name is required",
    "price must be a positive number"
  ]
}
```

---

## Response Format

All endpoints follow a consistent envelope:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Paginated list:**
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "errors": ["Detail 1", "Detail 2"]
}
```

---

## Modules

### POS / Billing

Base path: `/api/orders`

#### Create a Sale (POS Transaction)

```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "customerId": "cust_01HX",
  "items": [
    {
      "productId": "prod_01HX",
      "quantity": 2,
      "unitPrice": 45.00,
      "discount": 0
    }
  ],
  "paymentMethod": "CASH",
  "notes": "Walk-in customer"
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": "ord_01HX9K",
    "orderNumber": "POS-2024-0042",
    "total": 90.00,
    "tax": 16.20,
    "grandTotal": 106.20,
    "status": "COMPLETED",
    "invoiceUrl": "/api/orders/ord_01HX9K/invoice"
  },
  "message": "Sale completed"
}
```

#### Generate GST Invoice (PDF)

```http
GET /api/orders/:id/invoice
Authorization: Bearer <token>
Accept: application/pdf
```

Returns a PDF binary stream with `Content-Disposition: attachment`.

---

### Inventory

Base path: `/api/inventory`

#### List Products

```http
GET /api/inventory?page=1&pageSize=20&search=rice&category=grocery
Authorization: Bearer <token>
```

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `pageSize` | integer | Items per page (default: 20, max: 100) |
| `search` | string | Search by name or SKU |
| `category` | string | Filter by category |
| `lowStock` | boolean | Show only low-stock items |

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "prod_01HX",
        "name": "Basmati Rice 5kg",
        "sku": "RICE-BSMT-5KG",
        "category": "Grocery",
        "price": 450.00,
        "stock": 120,
        "reorderLevel": 20,
        "unit": "bag"
      }
    ],
    "pagination": { "page": 1, "pageSize": 20, "total": 85 }
  }
}
```

#### Create Product

```http
POST /api/inventory
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "name": "Organic Wheat Flour 2kg",
  "sku": "FLOUR-ORG-2KG",
  "category": "Grocery",
  "price": 120.00,
  "purchasePrice": 95.00,
  "stock": 50,
  "reorderLevel": 10,
  "unit": "bag",
  "barcode": "8901234567890",
  "taxRate": 5,
  "supplier": "Nature Fresh Co."
}
```

#### Update Stock

```http
PATCH /api/inventory/:id/stock
Authorization: Bearer <token>
Content-Type: application/json

{ "adjustment": 100, "reason": "Received stock from supplier" }
```

#### Get Single Product

```http
GET /api/inventory/:id
Authorization: Bearer <token>
```

#### Update Product

```http
PUT /api/inventory/:id
Authorization: Bearer <token>
Content-Type: application/json
```

#### Delete Product

```http
DELETE /api/inventory/:id
Authorization: Bearer <token>
```

---

### Orders

Base path: `/api/orders`

#### Create Purchase Order

```http
POST /api/orders/purchase
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "supplierId": "sup_01HX",
  "expectedDelivery": "2024-12-15",
  "items": [
    { "productId": "prod_01HX", "quantity": 200, "unitPrice": 42.00 }
  ],
  "notes": "Urgent restocking"
}
```

#### Receive Goods (GRN)

```http
POST /api/orders/:id/receive
Authorization: Bearer <token>
Content-Type: application/json

{
  "receivedItems": [
    { "productId": "prod_01HX", "receivedQty": 200, "batchNo": "B24-001" }
  ],
  "receivedAt": "2024-12-15T10:30:00Z"
}
```

#### List Orders

```http
GET /api/orders?type=PURCHASE&status=PENDING&page=1
Authorization: Bearer <token>
```

---

### Accounting

Base path: `/api/accounting`

#### Create Journal Entry

```http
POST /api/accounting/journal-entries
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "date": "2024-12-01",
  "description": "Monthly rent payment",
  "reference": "RENT-DEC-2024",
  "lines": [
    { "accountId": "acc_rent", "debit": 25000, "credit": 0 },
    { "accountId": "acc_cash", "debit": 0, "credit": 25000 }
  ]
}
```

#### Get Trial Balance

```http
GET /api/accounting/trial-balance?from=2024-12-01&to=2024-12-31
Authorization: Bearer <token>
```

#### Get P&L Statement

```http
GET /api/accounting/profit-loss?from=2024-01-01&to=2024-12-31
Authorization: Bearer <token>
```

#### List Accounts (Chart of Accounts)

```http
GET /api/accounting/accounts
Authorization: Bearer <token>
```

---

### CRM

Base path: `/api/crm`

#### Create Customer

```http
POST /api/crm/customers
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "name": "Ramesh Kumar",
  "email": "ramesh@example.com",
  "phone": "+91-9876543210",
  "address": "12 MG Road, Bengaluru",
  "loyaltyTier": "SILVER",
  "notes": "Regular customer, prefers organic products"
}
```

#### Log Customer Activity

```http
POST /api/crm/activities
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "customerId": "cust_01HX",
  "type": "CALL",
  "subject": "Follow-up on bulk order",
  "description": "Customer confirmed order for next week.",
  "outcome": "POSITIVE",
  "scheduledAt": "2024-12-10T14:00:00Z"
}
```

#### List Customers

```http
GET /api/crm/customers?search=ramesh&tier=SILVER&page=1
Authorization: Bearer <token>
```

#### Get Customer Purchase History

```http
GET /api/crm/customers/:id/orders
Authorization: Bearer <token>
```

---

### Staff & HCM

Base path: `/api/hcm`

#### List Employees

```http
GET /api/hcm/employees?department=Sales&status=ACTIVE
Authorization: Bearer <token>
```

#### Create Employee

```http
POST /api/hcm/employees
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "firstName": "Priya",
  "lastName": "Sharma",
  "email": "priya.sharma@store.com",
  "department": "Sales",
  "designation": "Sales Associate",
  "joinDate": "2024-01-15",
  "salary": 35000,
  "phone": "+91-9876543211"
}
```

#### Process Payroll

```http
POST /api/hcm/payroll/process
Authorization: Bearer <token>
Content-Type: application/json

{ "month": 12, "year": 2024, "departmentId": "dept_sales" }
```

---

### Analytics

Base path: `/api/analytics`

#### Dashboard KPIs

```http
GET /api/analytics/kpis?period=MONTH&from=2024-12-01&to=2024-12-31
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 450000,
    "totalOrders": 1240,
    "averageOrderValue": 362.90,
    "topProducts": [
      { "name": "Basmati Rice 5kg", "revenue": 54000, "units": 120 }
    ],
    "revenueByDay": [ ... ],
    "inventoryTurnover": 4.2,
    "grossMargin": 0.28
  }
}
```

#### GST Report

```http
GET /api/analytics/gst-report?from=2024-12-01&to=2024-12-31&format=json
Authorization: Bearer <token>
```

Use `format=excel` to download an Excel file.

#### Inventory Valuation Report

```http
GET /api/analytics/inventory-valuation?method=FIFO
Authorization: Bearer <token>
```

---

## Webhooks

NexaERP can POST events to your configured endpoint in real-time.

### Configuration

Set webhook endpoints in Settings → Integrations → Webhooks.

### Supported Events

| Event | Trigger |
|-------|---------|
| `order.created` | New sale or purchase order |
| `order.completed` | Order marked as completed |
| `inventory.low_stock` | Product stock falls below reorder level |
| `inventory.out_of_stock` | Product stock reaches zero |
| `payment.received` | Payment recorded against an order |
| `customer.created` | New CRM customer record |
| `employee.payroll_processed` | Payroll run completed |

### Payload Format

```json
{
  "event": "order.created",
  "timestamp": "2024-12-10T08:23:11Z",
  "version": "2.0",
  "data": {
    "orderId": "ord_01HX9K",
    "orderNumber": "POS-2024-0042",
    "total": 106.20
  }
}
```

### Signature Verification

Each webhook POST includes an `X-NexaERP-Signature` header:

```
X-NexaERP-Signature: sha256=<HMAC-SHA256 of raw body using your webhook secret>
```

**Verification example (Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhook(rawBody, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}
```

### Retry Policy

Failed deliveries (non-2xx or timeout) are retried up to **5 times** with exponential back-off: 30s, 2m, 10m, 1h, 6h.

---

*Last updated: December 2024 | NexaERP v2.0.0*
