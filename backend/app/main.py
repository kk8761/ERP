import os
import uuid
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from sqlalchemy import text
from app.config import settings
from app.database import engine, Base
from app.middleware.security_headers import SecurityHeadersMiddleware

# Import API Routers
from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.sales import router as sales_router
from app.api.pos import router as pos_router
from app.api.inventory import router as inventory_router
from app.api.procurement import router as procurement_router
from app.api.finance import router as finance_router
from app.api.hr import router as hr_router
from app.api.elevation import router as elevation_router
from app.api.users import router as users_router
from app.api.audit import router as audit_router
from app.api.reports import router as reports_router
from app.api.ai_assistant import router as ai_router
from app.api.manufacturing import router as manufacturing_router
from app.api.grc import router as grc_router
from app.api.predictive import router as predictive_router
from app.api.disaster_recovery import router as disaster_recovery_router
from app.api.forum import router as forum_router
from app.api.system_admin import router as system_admin_router
from app.api.vision import router as vision_router
from app.api.security import router as security_router
from app.api.sync import router as sync_router
from app.api.emails import router as emails_router
from app.api.workflows import router as workflows_router
from app.api.alexa import router as alexa_router
from app.api.aws import router as aws_router
from app.api.mcp import router as mcp_router
from app.api.data_import import router as data_import_router
from app.api.branches import router as branches_router
from app.api.settings import router as settings_router

from app.mongodb import init_mongodb, close_mongodb, check_mongodb_status

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Connect MongoDB Document Store (if configured)
    await init_mongodb()

    # 2. Initialize Relational DB (PostgreSQL / SQLite) tables automatically on startup
    import app.models
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2b. Migrate incremental schema changes safely across PostgreSQL and SQLite
    is_postgres = "postgres" in settings.DATABASE_URL.lower()
    migrations = [
        ("audit_logs", "prev_hash", "VARCHAR(64)", "VARCHAR(64)"),
        ("audit_logs", "record_hash", "VARCHAR(64)", "VARCHAR(64)"),
        ("users", "mfa_enabled", "BOOLEAN DEFAULT FALSE", "BOOLEAN DEFAULT 0"),
        ("users", "mfa_secret", "VARCHAR(64)", "VARCHAR(64)"),
        ("compliance_frameworks", "framework_code", "VARCHAR(50)", "VARCHAR(50)"),
        ("compliance_frameworks", "scope", "TEXT", "TEXT"),
        ("compliance_frameworks", "compliance_rate", "FLOAT", "FLOAT"),
        ("compliance_frameworks", "next_audit_date", "VARCHAR(50)", "VARCHAR(50)"),
        ("purchase_orders", "expected_delivery_date", "TIMESTAMP WITH TIME ZONE", "TIMESTAMP"),
        ("purchase_orders", "actual_delivery_date", "TIMESTAMP WITH TIME ZONE", "TIMESTAMP"),
        ("purchase_orders", "inspection_status", "VARCHAR(30) DEFAULT 'PENDING'", "VARCHAR(30) DEFAULT 'PENDING'"),
        ("purchase_orders", "defect_count", "INTEGER DEFAULT 0", "INTEGER DEFAULT 0"),
        ("purchase_orders", "invoiced_amount", "NUMERIC(12, 2)", "NUMERIC(12, 2)"),
        ("purchase_orders", "shipping_cost", "NUMERIC(12, 2) DEFAULT 0", "NUMERIC(12, 2) DEFAULT 0"),
        ("purchase_orders", "tax_duties_cost", "NUMERIC(12, 2) DEFAULT 0", "NUMERIC(12, 2) DEFAULT 0"),
        ("employees", "reports_to_id", "INTEGER REFERENCES employees(id)", "INTEGER REFERENCES employees(id)"),
        ("employees", "hierarchy_role", "VARCHAR(30) DEFAULT 'MEMBER'", "VARCHAR(30) DEFAULT 'MEMBER'"),
    ]
    for tbl, col, pg_def, sqlite_def in migrations:
        try:
            async with engine.begin() as conn:
                if is_postgres:
                    # PostgreSQL natively supports ADD COLUMN IF NOT EXISTS
                    await conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS {col} {pg_def}"))
                else:
                    # SQLite: dynamically check column existence via PRAGMA
                    res = await conn.execute(text(f"PRAGMA table_info({tbl})"))
                    existing = [r[1] for r in res.fetchall()]
                    if col not in existing:
                        await conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {sqlite_def}"))
        except Exception as mig_err:
            logging.warning(f"[NexaERP DB Migration] Safe migration notice for {tbl}.{col}: {mig_err}")

    # 3. Auto-seed initial enterprise admin and catalog if database is fresh (e.g. newly provisioned Postgres on Render)
    try:
        from app.seed_data import seed
        await seed()
    except Exception as seed_err:
        logging.warning(f"[NexaERP] Startup auto-seed notice: {seed_err}")

    # 4. Restore active IP quarantines from database into memory/WAF
    try:
        from app.database import AsyncSessionLocal
        from app.services.intrusion_defense_service import sync_quarantined_ips_from_db
        async with AsyncSessionLocal() as session:
            q_count = await sync_quarantined_ips_from_db(session)
            if q_count > 0:
                logging.info(f"[NexaERP WAF] Restored {q_count} active quarantined IPs from database")
    except Exception as q_err:
        logging.warning(f"[NexaERP WAF] IP quarantine sync notice: {q_err}")

    # 5. Start persistent background workflow automation runner
    try:
        from app.services.workflow_engine import start_workflow_scheduler, stop_workflow_scheduler
        start_workflow_scheduler()
        logging.info("[NexaERP Engine] Background workflow automation runner started")
    except Exception as wf_err:
        logging.warning(f"[NexaERP Engine] Workflow runner startup notice: {wf_err}")

    yield
    try:
        from app.services.workflow_engine import stop_workflow_scheduler
        stop_workflow_scheduler()
    except Exception:
        pass
    await close_mongodb()
    await engine.dispose()

app = FastAPI(
    title="NexaERP Enterprise API",
    description="Enterprise ERP backend supporting modern NexaERP with RBAC, Just-In-Time Role Elevation, and Intelligent Copilot.",
    version="2.1.0",
    lifespan=lifespan
)

# OWASP Security Headers Middleware (Inner)
app.add_middleware(SecurityHeadersMiddleware)

# CORS Middleware (Outer - handles browser preflight requests)
_cors_exact_origins = [o.strip().rstrip("/") for o in settings.cors_origins_list if "*" not in o]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_exact_origins,
    allow_origin_regex=(
        r"^https://[a-zA-Z0-9_.-]+\.onrender\.com$"
        r"|^https://[a-zA-Z0-9_.-]+\.vercel\.app$"
        r"|^https://[a-zA-Z0-9_.-]+\.netlify\.app$"
        r"|^http://localhost:\d+$"
        r"|^http://127\.0\.0\.1:\d+$"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

# Enterprise Global Security Exception Shield (Prevents stack trace / internal path exposure)
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()}
    )

@app.exception_handler(Exception)
async def global_unhandled_exception_shield(request: Request, exc: Exception):
    incident_id = str(uuid.uuid4())
    logging.error(f"[SECURITY SHIELD - INCIDENT {incident_id}] Unhandled error at {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal system exception occurred. It has been securely logged.",
            "incident_id": incident_id
        }
    )

# Mount API Routers
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(sales_router)
app.include_router(pos_router)
app.include_router(inventory_router)
app.include_router(procurement_router)
app.include_router(finance_router)
app.include_router(hr_router)
app.include_router(elevation_router)
app.include_router(users_router)
app.include_router(audit_router)
app.include_router(reports_router)
app.include_router(ai_router)
app.include_router(manufacturing_router)
app.include_router(grc_router)
app.include_router(predictive_router)
app.include_router(disaster_recovery_router)
app.include_router(forum_router)
app.include_router(system_admin_router)
app.include_router(vision_router)
app.include_router(security_router)
app.include_router(sync_router)
app.include_router(emails_router)
app.include_router(workflows_router)
app.include_router(alexa_router)
app.include_router(aws_router)
app.include_router(mcp_router)
app.include_router(data_import_router)
app.include_router(branches_router)
app.include_router(settings_router)

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
_repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_dist_dir = os.path.join(_repo_root, "frontend", "dist")
_dist_assets = os.path.join(_dist_dir, "assets")

if os.path.exists(_dist_assets):
    app.mount("/assets", StaticFiles(directory=_dist_assets), name="react_assets")

for _s_dir in ["css", "js"]:
    _f_path = os.path.join(_repo_root, _s_dir)
    if os.path.exists(_f_path):
        app.mount(f"/{_s_dir}", StaticFiles(directory=_f_path), name=_s_dir)

@app.get("/", include_in_schema=False)
@app.get("/login", include_in_schema=False)
@app.get("/app", include_in_schema=False)
async def serve_react_root():
    if os.path.exists(os.path.join(_dist_dir, "index.html")):
        return FileResponse(os.path.join(_dist_dir, "index.html"))
    return FileResponse(os.path.join(_repo_root, "dashboard.html"))

@app.get("/dashboard.html", include_in_schema=False)
async def serve_dashboard_html():
    return FileResponse(os.path.join(_repo_root, "dashboard.html"))

@app.get("/landing.html", include_in_schema=False)
async def serve_landing_html():
    return FileResponse(os.path.join(_repo_root, "landing.html"))


@app.get("/api/health", tags=["Health"])
async def health_check():
    db_type = "PostgreSQL" if "postgres" in settings.DATABASE_URL.lower() else "SQLite"
    mongo_status = await check_mongodb_status()

    # Detect active AI providers
    ai_providers = []
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        ai_providers.append(f"AWS Bedrock ({settings.AWS_BEDROCK_MODEL_ID})")
    if settings.GROQ_API_KEY:
        ai_providers.append(f"Groq Cloud ({settings.GROQ_MODEL})")
    if settings.GEMINI_API_KEY:
        ai_providers.append(f"Google Gemini ({settings.GEMINI_MODEL})")
    if settings.OPENAI_API_KEY:
        ai_providers.append(f"OpenAI ({settings.OPENAI_MODEL})")
    if not ai_providers:
        ai_providers.append("Autonomous Offline Domain Copilot (Built-in RAG)")

    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "version": "2.1.0",
        "database": {
            "type": db_type,
            "connected": True
        },
        "mongodb": mongo_status,
        "ai_engine": {
            "active_providers": ai_providers,
            "status": "operational"
        }
    }
