from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables automatically on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

app = FastAPI(
    title="NexaERP Enterprise API",
    description="Enterprise ERP backend supporting SAP Fiori-inspired NexaERP with RBAC and JIT Role Elevation.",
    version="2.1.0",
    lifespan=lifespan
)

# CORS Middleware with strict origin allowlist
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

# OWASP Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

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

@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "version": "2.1.0"
    }
