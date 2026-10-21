# NexaERP Deployment Guide

## 1. Production Readiness Checklist

- [x] Passwords hashed using Bcrypt/Argon2.
- [x] JWT tokens signed with secure, non-default secret key loaded via environment.
- [x] OWASP Security headers configured (CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff).
- [x] Strict CORS configured without wildcard origins.
- [x] Just-In-Time role elevation with mandatory justification and no-self-approval rule.
- [x] Automated test suite passing 100% across auth, RBAC, JIT elevation, and transactions.
- [x] Zero TypeScript runtime dependencies (pure JavaScript/JSX bundle).

---

## 2. Docker Compose Deployment

NexaERP includes a production-ready `compose.yaml` orchestrating PostgreSQL 16, the FastAPI backend, and an Nginx reverse proxy serving the optimized React frontend.

### To start all services:
```bash
docker compose up -d --build
```

### Initial database migration and seeding inside container:
```bash
docker compose exec backend python scripts/seed_demo_data.py
```

---

## 3. Environment Secrets & Configuration

Copy `.env.example` to `.env` and configure production secrets:

```ini
APP_NAME=NexaERP
ENVIRONMENT=production
DEBUG=False
SECRET_KEY=generate_with_openssl_rand_hex_32
ACCESS_TOKEN_EXPIRE_MINUTES=60
DATABASE_URL=postgresql+asyncpg://nexaerp:your_secure_password@postgres:5432/nexaerp_prod
CORS_ORIGINS=["https://erp.yourdomain.com"]
```

> **Warning**: Never commit `.env` or production credentials to version control.
