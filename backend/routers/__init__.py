"""
FastAPI Routers Setup
Creates all API routers for the application

Note: The notifications and reports routers are included directly in main.py
with their own prefixes (/api/v1/notifications and /api/v1/reports).
"""
from fastapi import APIRouter

from .funding_router import router as funding_router
from .portfolio_router import router as portfolio_router
from .crm_router import router as crm_router
from .opportunities_router import router as opportunities_router
from .matching_router import router as matching_router
from .proposals_router import router as proposals_router
from .communications_router import router as communications_router

# Main API router (not currently used - routers registered directly in main.py)
api_router = APIRouter(prefix="/api/v1")

# Register all module routers
api_router.include_router(funding_router, prefix="/funding", tags=["Funding"])
api_router.include_router(portfolio_router, prefix="/portfolio", tags=["Portfolio"])
api_router.include_router(crm_router, prefix="/crm", tags=["CRM"])
api_router.include_router(opportunities_router, prefix="/opportunities", tags=["Opportunities"])
api_router.include_router(matching_router, prefix="/matching", tags=["Matching"])
api_router.include_router(proposals_router, prefix="/proposals", tags=["Proposals"])
api_router.include_router(communications_router, prefix="/communications", tags=["Communications"])
