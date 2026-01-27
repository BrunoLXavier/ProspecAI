# Implements RF-02, RF-03, RF-04: API router exports for FastAPI
from routers.funding_router import router as funding_routes
from routers.portfolio_router import router as portfolio_routes
from routers.crm_router import router as crm_routes
from routers.opportunities_router import router as opportunities_routes
from routers.matching_router import router as matching_routes
from routers.proposals_router import router as proposals_routes

# Other API routes (analytics, chatbot, etc.) are imported directly in main.py
