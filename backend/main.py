# FastAPI Main Application
# Infrastructure Layer - Framework Integration
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import time
import os
from dotenv import load_dotenv
import logging
from fastapi.responses import JSONResponse

from adapters.database.connection import engine
# Use the enhanced schema when available so repositories and models stay in sync
# `models_new` exposes `BaseModel` as the declarative base; alias it to `Base`
from adapters.database.models_new import BaseModel as Base
from adapters.database.neo4j_connection import neo4j_connection

load_dotenv()
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting ProspecAI backend...")
    
    try:
        # Initialize database
        logger.info("Initializing PostgreSQL database...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("✓ PostgreSQL database initialized")
        
        # Connect to Neo4j
        logger.info("Connecting to Neo4j...")
        await neo4j_connection.connect()
        logger.info("✓ Neo4j connected")
        
        logger.info("ProspecAI backend started successfully")
        
    except Exception as e:
        # Do not abort process startup in development: record the error and
        # continue so that the app can return structured 5xx responses with
        # proper CORS headers. In production, re-raise to prevent degraded
        # startups.
        logger.error(f"✗ Failed to start backend: {str(e)}")
        if os.getenv("ENVIRONMENT", "development") == "production":
            raise
        app.state.startup_error = True
    
    yield
    
    # Shutdown
    logger.info("Shutting down ProspecAI backend...")
    try:
        await neo4j_connection.close()
        await engine.dispose()
        logger.info("ProspecAI backend shut down successfully")
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}")


# Create FastAPI app
app = FastAPI(
    title="ProspecAI API",
    description="Intelligent R&D Project Prospecting Platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
    redirect_slashes=True  # Allow automatic trailing-slash redirects so both variants work
)

# track startup state so endpoints can respond gracefully if infra is down
app.state.startup_error = False


@app.middleware("http")
async def startup_health_gate(request: Request, call_next):
    """Return 503 if startup encountered infra errors (dev-friendly)."""
    if getattr(app.state, "startup_error", False):
        allow = "*" if os.getenv("ENVIRONMENT", "development") != "production" else (os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")[0] if os.getenv("CORS_ORIGINS") else "*")
        return JSONResponse(status_code=503, content={"detail": "Service starting - infrastructure not ready"}, headers={"Access-Control-Allow-Origin": allow})
    return await call_next(request)

# CORS Middleware
# In development allow all origins to avoid brittle CORS issues. In production
# honor the `CORS_ORIGINS` environment variable.
if os.getenv("ENVIRONMENT", "development") != "production":
    allow_origins = ["*"]
else:
    allow_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gzip Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add processing time to response headers."""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Tenant context middleware (for RLS)
@app.middleware("http")
async def set_tenant_context(request: Request, call_next):
    """Set tenant context for Row-Level Security."""
    # Extract tenant_id from header (auth should provide it). Do not fall back
    # to placeholder values - require upstream auth to populate header.
    tenant_id = request.headers.get("X-Tenant-ID")

    # Set in request state for use in routes
    request.state.tenant_id = tenant_id
    
    response = await call_next(request)
    return response


# Global exception handler to ensure JSON responses include CORS headers.
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)

    # Prefer wildcard in non-production to avoid invalid multi-origin headers
    if os.getenv("ENVIRONMENT", "development") != "production":
        allow = "*"
    else:
        origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
        allow = origins[0] if origins else "*"

    headers = {"Access-Control-Allow-Origin": allow}
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"}, headers=headers)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": "ProspecAI",
        "version": "1.0.0"
    }


# API Routes (to be implemented)
from routers.funding import router as funding_routes
from adapters.api.portfolio_routes import router as portfolio_routes
from routers.crm import router as crm_routes
from routers.opportunities import router as opportunities_routes
from adapters.api.proposals_routes import router as proposals_routes
from adapters.api.matching_routes import router as matching_routes
from adapters.api.websocket_routes import router as websocket_routes
from adapters.api.chatbot_routes import router as chatbot_routes
from adapters.api.lgpd_routes import router as lgpd_routes
from adapters.api.analytics_routes import router as analytics_routes
from adapters.api.report_routes import router as report_routes
from adapters.api.file_routes import router as file_routes
from adapters.api.activity_routes import router as activity_routes
from adapters.api.translations_routes import router as translations_routes
from adapters.api.acl_routes import router as acl_routes
from adapters.api.institutes_routes import router as institutes_routes
from adapters.api.layout_routes import router as layout_routes
from adapters.api.preferences_routes import router as preferences_routes
from adapters.api.calendar_routes import router as calendar_routes
from adapters.api.llm_config_routes import router as llm_config_routes
from adapters.api.admin_users_routes import router as admin_users_routes
from adapters.api.users_routes import router as users_routes
from adapters.api.ai_routes import router as ai_routes
from adapters.api.ingestion_routes import router as ingestion_routes
from adapters.api.feedback_routes import router as feedback_routes
from adapters.api.compatibility_routes import router as compatibility_routes
from routers.auth_router import router as auth_routes
from routers.contact_router import router as contact_routes
from routers.admin_settings_router import router as admin_settings_routes
from adapters.api.teams_routes import router as teams_routes
from adapters.api.infrastructures_routes import router as infrastructures_routes
from routers.notifications import router as notifications_routes
from routers.communications import router as communications_routes

# Register API routers
app.include_router(auth_routes)
app.include_router(contact_routes)
app.include_router(admin_settings_routes)
app.include_router(funding_routes, prefix="/api/v1/funding")
app.include_router(portfolio_routes)
app.include_router(crm_routes, prefix="/api/v1/clients")
app.include_router(opportunities_routes, prefix="/api/v1/opportunities")
app.include_router(proposals_routes)
app.include_router(matching_routes)
app.include_router(teams_routes)
app.include_router(infrastructures_routes)
app.include_router(chatbot_routes)
app.include_router(lgpd_routes)
app.include_router(analytics_routes)
app.include_router(report_routes)
app.include_router(file_routes)
app.include_router(translations_routes)
app.include_router(activity_routes)
app.include_router(acl_routes)
app.include_router(layout_routes)
app.include_router(preferences_routes)
app.include_router(calendar_routes)
app.include_router(llm_config_routes)
app.include_router(admin_users_routes)
app.include_router(users_routes)
app.include_router(institutes_routes)
app.include_router(ai_routes)
app.include_router(ingestion_routes)
app.include_router(feedback_routes)
app.include_router(websocket_routes)
app.include_router(compatibility_routes)
app.include_router(notifications_routes)
app.include_router(communications_routes)


@app.get("/api/v1")
async def api_root():
    """API root endpoint."""
    return {
        "message": "ProspecAI API v1",
        "endpoints": {
            "auth": "/api/v1/auth",
            "contact": "/api/v1/contact",
            "admin_settings": "/api/v1/admin/settings",
            "funding": "/api/v1/funding",
            "portfolio": "/api/v1/portfolio",
            "crm": "/api/v1/clients",
            "opportunities": "/api/v1/opportunities",
            "matching": "/api/v1/matching",
            "proposals": "/api/v1/proposals",
            "chatbot": "/api/v1/chatbot",
            "lgpd": "/api/v1/lgpd",
            "analytics": "/api/v1/analytics",
            "reports": "/api/v1/reports",
            "files": "/api/v1/files",
            "ingestion": "/api/v1/ingestion",
            "feedback": "/api/v1/feedback",
            "llm_config": "/api/v1/admin/llm-config",
            "websocket": "/ws/proposals/{id}",
            "ingestion_ws": "/ws/ingestion/{job_id}",
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
