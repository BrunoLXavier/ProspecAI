# Implements RF-02, RF-03, RF-04: API router exports for FastAPI
from routers.funding import router as funding_routes
from routers.portfolio import router as portfolio_routes
from routers.crm import router as crm_routes
from routers.opportunities import router as opportunities_routes
from routers.matching import router as matching_routes
from routers.proposals import router as proposals_routes

# Other API routes (analytics, chatbot, etc.) are imported directly in main.py
