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

from adapters.database.connection import engine
from adapters.database.models import Base
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
        logger.error(f"✗ Failed to start backend: {str(e)}")
        raise
    
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
    redirect_slashes=False  # Disable automatic trailing slash redirects for proxy compatibility
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
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
    # Extract tenant_id from JWT or header
    tenant_id = request.headers.get("X-Tenant-ID", "00000000-0000-0000-0000-000000000000")
    
    # Set in request state for use in routes
    request.state.tenant_id = tenant_id
    
    response = await call_next(request)
    return response


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
from adapters.api.funding_routes import router as funding_routes
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
from adapters.api.layout_routes import router as layout_routes
from adapters.api.calendar_routes import router as calendar_routes
from adapters.api.llm_config_routes import router as llm_config_routes
from adapters.api.ai_routes import router as ai_routes
from adapters.api.ingestion_routes import router as ingestion_routes
from adapters.api.feedback_routes import router as feedback_routes
from adapters.api.compatibility_routes import router as compatibility_routes
from routers.auth_router import router as auth_routes
from routers.contact_router import router as contact_routes
from routers.admin_settings_router import router as admin_settings_routes
from routers.notifications import router as notifications_routes

# Register API routers
app.include_router(auth_routes)
app.include_router(contact_routes)
app.include_router(admin_settings_routes)
app.include_router(funding_routes)
app.include_router(portfolio_routes)
app.include_router(crm_routes, prefix="/api/v1/crm")
app.include_router(opportunities_routes)
app.include_router(proposals_routes)
app.include_router(matching_routes)
app.include_router(chatbot_routes)
app.include_router(lgpd_routes)
app.include_router(analytics_routes)
app.include_router(report_routes)
app.include_router(file_routes)
app.include_router(translations_routes)
app.include_router(activity_routes)
app.include_router(acl_routes)
app.include_router(layout_routes)
app.include_router(calendar_routes)
app.include_router(llm_config_routes)
app.include_router(ai_routes)
app.include_router(ingestion_routes)
app.include_router(feedback_routes)
app.include_router(websocket_routes)
app.include_router(compatibility_routes)
app.include_router(notifications_routes)


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
            "crm": "/api/v1/crm",
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
