"""
FastAPI Routers Setup
Creates all API routers for the application
"""
from fastapi import APIRouter

from .funding import router as funding_router
from .portfolio import router as portfolio_router
from .crm import router as crm_router
from .opportunities import router as opportunities_router
from .matching import router as matching_router
from .proposals import router as proposals_router

# Main API router
api_router = APIRouter(prefix="/api/v1")

# Register all module routers
api_router.include_router(funding_router, prefix="/funding", tags=["Funding"])
api_router.include_router(portfolio_router, prefix="/portfolio", tags=["Portfolio"])
api_router.include_router(crm_router, prefix="/crm", tags=["CRM"])
api_router.include_router(opportunities_router, prefix="/opportunities", tags=["Opportunities"])
api_router.include_router(matching_router, prefix="/matching", tags=["Matching"])
api_router.include_router(proposals_router, prefix="/proposals", tags=["Proposals"])
