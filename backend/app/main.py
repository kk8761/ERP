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

from app.mongodb import init_mongodb, close_mongodb, check_mongodb_status

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Connect MongoDB Document Store (if configured)
    await init_mongodb()

    # 2. Initialize Relational DB (PostgreSQL / SQLite) tables automatically on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Safe schema sync for newly added columns
        for col, col_type in [
            ("sender_email", "VARCHAR(150)"), ("sender_name", "VARCHAR(150)"), ("raw_headers", "TEXT"),
            ("cc_recipients", "TEXT"), ("bcc_recipients", "TEXT"), ("attachments_data", "TEXT"), ("priority", "VARCHAR(20) DEFAULT 'NORMAL'")
        ]:
            try:
                await conn.execute(text(f"ALTER TABLE outgoing_email_logs ADD COLUMN {col} {col_type}"))
            except Exception:
                pass # column already exists
        for col, col_type in [
            ("original_mail_id", "INTEGER"), ("original_message_body", "TEXT"), ("raw_headers", "TEXT"),
            ("cc_recipients", "TEXT"), ("bcc_recipients", "TEXT"), ("attachments_data", "TEXT"),
            ("priority", "VARCHAR(20) DEFAULT 'NORMAL'"), ("is_trash", "BOOLEAN DEFAULT 0"), ("is_archived", "BOOLEAN DEFAULT 0")
        ]:
            try:
                await conn.execute(text(f"ALTER TABLE received_emails ADD COLUMN {col} {col_type}"))
            except Exception:
                pass # column already exists

    # 3. Auto-seed initial enterprise admin and catalog if database is fresh (e.g. newly provisioned Postgres on Render)
    try:
        from app.database import AsyncSessionLocal
        from app.models.org import Organization
        async with AsyncSessionLocal() as session:
            res = await session.execute(text("SELECT count(*) FROM organizations"))
            count = res.scalar() or 0
            if count == 0:
                logging.info("[NexaERP] Fresh database detected. Auto-seeding initial master records and admin...")
                try:
                    import sys, os
                    scripts_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
                    if scripts_dir not in sys.path:
                        sys.path.insert(0, scripts_dir)
                    from seed_demo_data import seed
                    await seed()
                except Exception as seed_err:
                    logging.warning(f"[NexaERP] Auto-seed notice: {seed_err}")
    except Exception as check_err:
        logging.debug(f"[NexaERP] DB check notice: {check_err}")

    yield
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
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

@app.get("/api/health", tags=["Health"])
async def health_check():
    db_type = "PostgreSQL" if "postgres" in settings.DATABASE_URL.lower() else "SQLite"
    mongo_status = await check_mongodb_status()

    # Detect active AI providers
    ai_providers = []
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
