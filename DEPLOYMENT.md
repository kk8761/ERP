# 🚀 NexaERP Cloud Deployment & Infrastructure Guide

Complete guide for publishing **NexaERP Enterprise** to production using free cloud hosting platforms (**Render**, **Vercel**, **Netlify**), configuring **PostgreSQL** and **MongoDB** (Polyglot DBMS architecture), and enabling **Multi-Provider AI** (Google Gemini & Groq).

---

## 🏗️ Architecture Overview

NexaERP uses an enterprise polyglot persistence and AI-orchestrated architecture:

```
                  ┌───────────────────────────────┐
                  │    React SPA Frontend (Vite)  │
                  │   Render Static / Vercel / Netlify
                  └──────────────┬────────────────┘
                                 │ HTTPS / REST
                                 ▼
                  ┌───────────────────────────────┐
                  │    FastAPI Enterprise Core    │
                  │       Render Web Service      │
                  └──────┬─────────────────┬──────┘
                         │                 │
            Relational   │                 │ Unstructured / Docs
                         ▼                 ▼
             ┌─────────────────────┐   ┌───────────────────────┐
             │    PostgreSQL 16    │   │    MongoDB Atlas M0   │
             │   Primary DBMS      │   │  Polyglot Doc Store   │
             │ (RBAC, Ledger, POs, │   │  (Emails, AI logs,    │
             │  Inventory, Sales)  │   │  Audit Telemetry)     │
             └─────────────────────┘   └───────────────────────┘
                         ▲
                         │
             ┌─────────────────────┐
             │ AI Multi-Provider   │
             │  • Google Gemini    │
             │  • Groq Cloud       │
             │  • Offline Copilot  │
             └─────────────────────┘
```

---

## ⚡ Option 1: 1-Click Deployment via Render Blueprint (Recommended)

Render provides free hosting for Web Services, Static Sites, and PostgreSQL databases. The repository includes an official Render Blueprint ([`render.yaml`](./render.yaml)).

### Step 1: Push Repository to GitHub
Ensure all recent changes are on your GitHub repository:
```bash
git push origin main
```

### Step 2: Connect to Render
1. Visit [dashboard.render.com](https://dashboard.render.com/) and sign in (free account).
2. Click **New +** in the top navigation and select **Blueprint**.
3. Connect your GitHub repository (`kk8761/ERP`).
4. Render will automatically parse [`render.yaml`](./render.yaml) and display 3 resources:
   - **`nexaerp-postgres`** (Managed PostgreSQL database, Free plan)
   - **`nexaerp-backend`** (Python 3 Web Service, Free plan)
   - **`nexaerp-frontend`** (React Static Site, Free plan)
5. Click **Apply**.

Render will provision the PostgreSQL database, automatically inject `DATABASE_URL` into the backend, build the backend, and deploy the frontend.

---

## 🗄️ Setting Up Free Databases

### 1. PostgreSQL (Primary Relational DBMS)
NexaERP supports standard PostgreSQL connection strings (`postgresql+asyncpg://...` or `postgres://...`).

- **Via Render (Included in `render.yaml`)**:
  - Automatically created when you launch the Blueprint.
- **Via Neon.tech (Free Serverless Postgres alternative)**:
  1. Sign up at [neon.tech](https://neon.tech/) (free tier includes 0.5 GB storage).
  2. Create a project named `nexaerp`.
  3. Copy the connection string (select **SQLAlchemy / asyncpg**).
  4. Paste into your environment variables as `DATABASE_URL`.
- **Via Supabase (Free Postgres alternative)**:
  1. Sign up at [supabase.com](https://supabase.com/).
  2. Create a project and navigate to **Project Settings > Database > Connection String (URI)**.
  3. Use `postgresql+asyncpg://postgres:[PASSWORD]@[HOST]:5432/postgres`.

*Note: NexaERP automatically detects fresh PostgreSQL databases on startup and seeds the default Organization ("Nexa Global Enterprises"), branches, master catalogs, and default administrator credentials.*

---

### 2. MongoDB (Polyglot Document Store)
MongoDB stores full RFC 5322 MIME email payloads, attachment metadata, AI conversational history, and system audit telemetry.

1. Sign up at [cloud.mongodb.com](https://www.mongodb.com/cloud/atlas/register) (MongoDB Atlas).
2. Create a **Free Shared Cluster (M0 Sandbox)** (free forever, 512 MB storage).
3. Under **Security > Database Access**:
   - Create a database user (e.g. `nexa_admin` with a secure password).
4. Under **Security > Network Access**:
   - Click **Add IP Address** and select **Allow Access from Anywhere** (`0.0.0.0/0`) so cloud servers (Render / Vercel) can connect.
5. In **Clusters**, click **Connect > Drivers > Python**:
   - Copy your connection string:
     ```
     mongodb+srv://nexa_admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
     ```
6. Set this value in your environment variables as `MONGODB_URI`:
   - In Render dashboard: Navigate to `nexaerp-backend` > **Environment** > Add `MONGODB_URI`.

*Note: If `MONGODB_URI` is not provided, NexaERP operates seamlessly in relational mode without errors.*

---

## 🤖 Configuring Free AI APIs

NexaERP includes a unified multi-provider AI gateway that automatically routes queries between configured providers with graceful failover.

### 1. Google Gemini API (Recommended - Free Tier)
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Click **Get API key** and create a free key.
3. Add to your backend environment variables:
   ```bash
   GEMINI_API_KEY=AIzaSy...your_gemini_key
   GEMINI_MODEL=gemini-1.5-flash
   ```

### 2. Groq Cloud API (Ultra Fast - Free Tier)
1. Go to [console.groq.com](https://console.groq.com/).
2. Navigate to **API Keys** and generate a free API key.
3. Add to your backend environment variables:
   ```bash
   GROQ_API_KEY=gsk_...your_groq_key
   GROQ_MODEL=qwen/qwen3.8-27b
   ```

### 3. Autonomous Offline Copilot
If no external AI API key is configured or the network is offline, NexaERP automatically falls back to its built-in deterministic RAG Copilot. All actions (creating POs, checking inventory levels, calculating valuations) continue to work 100% offline.

---

## 🌐 Alternative Frontend Deployment: Vercel / Netlify

If you prefer hosting the frontend on **Vercel** or **Netlify** while keeping the backend on Render:

### Deploying Frontend to Vercel
1. Import `kk8761/ERP` into [Vercel](https://vercel.com/new).
2. Set **Root Directory** to `frontend` (or leave root since [`vercel.json`](./vercel.json) is pre-configured).
3. Add Environment Variable:
   - `VITE_API_URL` = `https://your-nexaerp-backend.onrender.com`
4. Click **Deploy**.

### Deploying Frontend to Netlify
1. Import `kk8761/ERP` into [Netlify](https://app.netlify.com/).
2. Netlify will automatically detect [`netlify.toml`](./netlify.toml).
3. Add Environment Variable:
   - `VITE_API_URL` = `https://your-nexaerp-backend.onrender.com`
4. Click **Deploy Site**.

---

## 🐳 Option 2: Full Stack via Docker Compose (Local or VPS)

To run the complete stack locally with PostgreSQL 16, MongoDB 7, FastAPI, and Nginx-served React:

```bash
# Clone repository
git clone https://github.com/kk8761/ERP.git
cd ERP

# Start all 4 services
docker compose up --build -d
```

- **Frontend UI**: [http://localhost:5173](http://localhost:5173)
- **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostgreSQL**: `localhost:5432`
- **MongoDB**: `localhost:27017`

---

## 🔍 Diagnostics & Health Verification

Verify your cloud connections anytime by running the built-in diagnostics utility:

```bash
python scripts/test_cloud_dbs_and_ai.py
```

Or query the public API health endpoint:
```bash
curl https://your-nexaerp-backend.onrender.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "app": "NexaERP",
  "environment": "production",
  "version": "2.1.0",
  "database": {
    "type": "PostgreSQL",
    "connected": true
  },
  "mongodb": {
    "status": "connected",
    "connected": true,
    "database": "nexaerp",
    "collections": ["email_documents", "ai_conversations", "audit_events"],
    "message": "MongoDB cluster is healthy and active."
  },
  "ai_engine": {
    "active_providers": [
      "Groq Cloud (qwen/qwen3.8-27b)",
      "Google Gemini (gemini-1.5-flash)"
    ],
    "status": "operational"
  }
}
```

---

## 🔑 Default Administrator Credentials

Upon first startup, the database is automatically seeded with:
- **Email**: `admin@nexaerp.internal`
- **Password**: `Admin@NexaERP2026!`
- **Role**: Global Superadministrator / Tenant Owner
