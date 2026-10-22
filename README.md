# NexaERP

A full-stack, multi-module ERP platform covering point of sale, inventory, procurement, finance and accounting, HR and payroll, manufacturing, compliance, and an AI assistant, with web and mobile clients.
### Passwords 
🔐 NexaERP — All User Profiles & Credentials
👑 System Administrator (Superuser)
Field	Value
Email	admin@nexaerp.internal
Password	Admin@NexaERP2026!
Name	Karthik Reddy
Role	System Administrator (full access)
👤 Demo Role Accounts (seeded by seed_demo_data.py)
Role	Email	Password	Name
Sales / Cashier	cashier@nexaerp.internal	Cashier@12345	Sunil Reddy
Inventory Clerk	inventory@nexaerp.internal	Inventory@12345	Meera Nair
Accountant	accountant@nexaerp.internal	Account@12345	Rajesh Sharma
HR Officer	hr@nexaerp.internal	Hr@12345	Kavita Rao
OTP for Now any 6 digit 

---

## Table of contents

1. [Overview](#overview)
2. [Repository layout](#repository-layout)
3. [Tech stack](#tech-stack)
4. [Features](#features)
5. [Getting started](#getting-started)
6. [Environment variables](#environment-variables)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Security](#security)
10. [Documentation](#documentation)
11. [Author](#author)
12. [License](#license)

---

## Overview

NexaERP is built to run day-to-day business operations from one system: selling, stocking, buying, accounting, hiring and paying people, and producing goods. This repository contains two backend services and three clients:

| Part | Folder | What it is |
|---|---|---|
| **Python API** | `backend/` | FastAPI service used by the React app in `frontend/`. POS, inventory, finance, HR, procurement, AI assistant, and more. |
| **Node API** | `server/` | Large Express + TypeScript + Prisma service with the enterprise modules (accounting, HCM, manufacturing, SCM, GRC, multi-tenancy, workflows, and others). |
| **React web app** | `frontend/` | Vite + React 19 single-page app that talks to the Python API. |
| **Static site** | repo root (`index.html`, `landing.html`, `dashboard.html`, `js/`, `css/`) | Landing page, docs page, and a lightweight dashboard. |
| **Mobile app** | `mobile/` | React Native app with barcode scanning, offline mode, and signature capture. |

---

## Repository layout

```
.
├── backend/            FastAPI service (app/, tests/, Dockerfile)
├── server/             Express + TypeScript + Prisma service
│   ├── src/            controllers, routes, services, models, middleware, tests
│   ├── prisma/         Prisma schema and migrations
│   └── *.md            per-module implementation guides
├── frontend/           React + Vite web app
├── mobile/             React Native app (android/, ios/, src/)
├── scripts/            seed and utility scripts
├── tests/              top-level tests
├── docs/               project documentation
├── js/  css/  assets/  static site assets
├── .github/workflows/  CI pipeline (ci.yml)
├── compose.yaml        Docker Compose (PostgreSQL, MongoDB, backend, frontend)
├── nginx.conf  render.yaml  vercel.json  netlify.toml  ecosystem.config.js
└── DEPLOYMENT.md
```

---

## Tech stack

**Python API (`backend/`)**
- FastAPI, Pydantic v2, SQLAlchemy 2.0 (async)
- PostgreSQL (production) or SQLite (development), MongoDB for document data
- PyJWT tokens with revocation, Argon2/Bcrypt password hashing

**Node API (`server/`)**
- Node.js 18+, Express, TypeScript
- Prisma with PostgreSQL, Mongoose for legacy MongoDB models
- Redis (caching and sessions), Socket.IO, node-cron
- Passport (local, Google, Microsoft), MFA via TOTP, Helmet, rate limiting
- PDFKit, Nodemailer, Twilio, Tesseract.js, TensorFlow.js

**Web (`frontend/`)**: React 19, Vite, Lucide icons, light and dark themes

**Mobile (`mobile/`)**: React Native, React Navigation, Vision Camera, Keychain, push notifications

**Infrastructure**: Docker Compose, Nginx, GitHub Actions, Render, Vercel, Netlify, PM2

---

## Features

### Operations
- **Point of sale and billing**: barcode lookup, tax calculation, checkout, receipts
- **Inventory and warehouse management**: stock levels, reorder alerts, stock movement ledger
- **Procurement and supply chain**: purchase orders, suppliers, goods receipt
- **Manufacturing**: production scheduling, monitoring, OEE, quality management, Industry 4.0

### Finance
- Chart of accounts, general ledger with double-entry validation
- Accounts payable and receivable, bank reconciliation, budgets, fixed assets
- Multi-currency, treasury, tax engine, financial consolidation and statements

### People
- Staff management, attendance, leave approvals, payroll (HRMS and HCM modules)

### Governance and security
- Role-based access control with just-in-time role elevation and no self-approval
- Audit trails, approval workflows, risk management, compliance reporting (GRC)
- Anomaly detection and encryption with key management

### Platform
- Multi-tenant support, custom entities, custom fields, formula fields, and a business rule engine
- Analytics and BI, notifications, document management, integrations (for example Razorpay)
- **AI assistant** that answers questions about live ERP data, such as sales summaries and low-stock warnings

### Mobile
- Barcode scanning, offline mode with sync, signature capture, mobile-first workflows

---

## Getting started

### Option A: Docker Compose (Python API + React app)

```bash
cp .env.example .env        # then edit values
docker compose up --build
```

This starts PostgreSQL 16, MongoDB 7, the FastAPI backend (port 8000), and the Nginx-served React frontend.

> The credentials in `compose.yaml` are development defaults. Replace them before any real deployment.

### Option B: Run each part locally

**Python API**

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python ../scripts/seed_demo_data.py
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**React web app**

```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

**Node API**

```bash
cd server
npm install
cp .env.example .env               # fill in DATABASE_URL, JWT_SECRET, etc.
npm run prisma:generate
npm run prisma:push
npm run dev                        # http://localhost:5000
```

**Mobile app**

```bash
cd mobile
npm install
npm run android                    # or: npm run ios
```

### Demo accounts

The seed script (`scripts/seed_demo_data.py`) creates sample accounts for each role: administrator, cashier, inventory manager, accountant, and HR manager. Check the script for the emails and passwords. They are for development only. Do not use them in production.

---

## Environment variables

Copy the relevant example file and fill in your own values. Never commit real secrets.

| File | Used by |
|---|---|
| `.env.example` | Python API and Docker Compose |
| `server/.env.example` | Node API |

Key variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL (or SQLite for local development) connection string |
| `MONGODB_URI` | MongoDB connection string |
| `SECRET_KEY` / `JWT_SECRET` | Token signing secret. Generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `FRONTEND_URL` / `CORS_ORIGINS` | Allowed browser origins |
| `REDIS_URL` | Optional caching and sessions (Node API) |
| `GROQ_API_KEY` and others | Optional AI providers. The assistant falls back to a built-in offline mode without them |
| `SMTP_*` | Optional email settings |

---

## Testing

```bash
# Python API
pytest backend/tests

# Node API
cd server && npm test
cd server && npm run type-check

# Mobile
cd mobile && npm test
```

CI runs on every push and pull request to `main` (see `.github/workflows/ci.yml`).

---

## Deployment

Configuration is included for several targets:

- **Render**: `render.yaml`
- **Vercel**: `vercel.json`
- **Netlify**: `netlify.toml`
- **Nginx and PM2**: `nginx.conf`, `ecosystem.config.js`
- **Docker**: `compose.yaml`

See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step instructions.

---

## Security

- Passwords hashed with Argon2/Bcrypt, signed JWTs, token revocation, account lockout after repeated failed logins
- RBAC, just-in-time role elevation, separation of duties (no self-approval)
- TOTP-based multi-factor authentication
- Helmet security headers, rate limiting, CORS allowlist
- Field-level encryption with key management (AWS KMS and Azure Key Vault supported)
- Tamper-evident audit logging

Found a vulnerability? Please open a private security advisory on GitHub instead of a public issue.

---

## Documentation

- `docs/`: project-level documentation
- `server/PROJECT_STRUCTURE.md`: layout of the Node API
- `server/*.md`: guides for individual modules (accounting, RBAC, encryption, multi-currency, manufacturing, and more)
- `docs.html`: browsable documentation page

---

## Author

Built by **Karri Karthik Reddy** ([@kk8761](https://github.com/kk8761)).

---

## License

No license has been specified yet. Add a `LICENSE` file (for example MIT) to state how others may use this code.
