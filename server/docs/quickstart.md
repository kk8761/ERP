# NexaERP Developer Quick-Start Guide

Get your first API call running in under 5 minutes.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |
| Git | Any recent version |

---

## 1. Environment Setup

### Clone and install

```bash
git clone https://github.com/your-org/NexaERP.git
cd NexaERP/server
npm install
```

### Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/nexaerp
MONGODB_URI=mongodb://localhost:27017/nexaerp

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=change-me-to-a-long-random-string
COOKIE_SECRET=another-long-random-string

# Frontend (for CORS)
FRONTEND_URL=http://localhost:8080
```

### Set up the database

```bash
# Generate Prisma client
npm run prisma:generate

# Push schema to your PostgreSQL instance
npm run prisma:push
```

### Start the development server

```bash
npm run dev
```

You should see:
```
🚀 NexaERP Server running on port 5000
🌍 Environment: development
```

---

## 2. Authentication Flow

NexaERP uses **session-based authentication** backed by Redis. The flow is:

```
1. POST /api/auth/login  →  server sets a session cookie
2. Include that cookie in subsequent requests (browser does this automatically)
3. Or pass the token as: Authorization: Bearer <token>
```

### Step-by-step

#### a) Login

```bash
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@store.com","password":"SecurePass123!"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "usr_01HX", "email": "admin@store.com", "role": "ADMIN" }
  },
  "message": "Login successful"
}
```

The `-c cookies.txt` flag saves the session cookie for reuse.

#### b) Make an authenticated request

```bash
curl -b cookies.txt http://localhost:5000/api/auth/me
```

```json
{
  "success": true,
  "data": {
    "user": { "id": "usr_01HX", "email": "admin@store.com", "name": "Store Admin" }
  }
}
```

#### c) Logout

```bash
curl -b cookies.txt -X POST http://localhost:5000/api/localhost:5000/api/auth/logout
```

---

## 3. Your First API Call

Let's create a product and then create a POS sale.

### Create a product

```bash
curl -b cookies.txt -X POST http://localhost:5000/api/inventory \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Basmati Rice 5kg",
    "sku": "RICE-BSMT-5KG",
    "category": "Grocery",
    "price": 450.00,
    "purchasePrice": 380.00,
    "stock": 100,
    "reorderLevel": 10,
    "unit": "bag",
    "taxRate": 5
  }'
```

**Response `201`:**
```json
{
  "success": true,
  "data": { "id": "prod_01HX", "name": "Basmati Rice 5kg", ... },
  "message": "Product created successfully"
}
```

### Create a POS sale

```bash
curl -b cookies.txt -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "productId": "prod_01HX", "quantity": 2, "unitPrice": 450.00 }
    ],
    "paymentMethod": "CASH"
  }'
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "ord_01HX9K",
    "orderNumber": "POS-2024-0001",
    "grandTotal": 945.00
  },
  "message": "Sale completed"
}
```

### Download the invoice

```bash
curl -b cookies.txt http://localhost:5000/api/orders/ord_01HX9K/invoice \
  -o invoice.pdf
```

---

## 4. Using the TypeScript Client (Optional)

If you're building an integration in TypeScript/JavaScript, use the `fetch` API or `axios`.

### Install axios

```bash
npm install axios
```

### Example client setup

```typescript
// nexaerp-client.ts
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,          // include session cookies
  headers: { 'Content-Type': 'application/json' },
});

// Login first
const { data: loginData } = await client.post('/auth/login', {
  email: 'admin@store.com',
  password: 'SecurePass123!',
});

console.log('Logged in as:', loginData.data.user.name);

// Fetch products
const { data: products } = await client.get('/inventory?pageSize=5');
console.log('Products:', products.data.items);
```

---

## 5. API Documentation

Once the server is running, visit:

- **Interactive Docs:** `http://localhost:5000/api/docs`
- **OpenAPI Spec (YAML):** `http://localhost:5000/api/docs/openapi.yaml`
- **Reference (Markdown):** `server/docs/api-reference.md`

---

## 6. Common Issues

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| `ECONNREFUSED 5432` | PostgreSQL not running | Start PostgreSQL or update `DATABASE_URL` |
| `ECONNREFUSED 6379` | Redis not running | Start Redis or comment out Redis config |
| `401 Unauthorized` | Session expired or missing cookie | Re-login and pass `-b cookies.txt` |
| `429 Too Many Requests` | Rate limit hit | Wait 15 minutes or increase limit in dev |
| `Prisma Client not found` | Client not generated | Run `npm run prisma:generate` |

---

## 7. Next Steps

- Read the full [API Reference](./api-reference.md)
- Explore [code examples](./examples/) for each module
- Review the [OpenAPI spec](./openapi.yaml) to generate a client SDK
- Check the [changelog](./api-changelog.md) before upgrading

---

*Last updated: December 2024 | NexaERP v2.0.0*
