# CRM Schemas
# Domain Layer - Request/Response schemas for CRM API
# Implements RF-04: CRM Inteligente
# Extracted from routers/crm_router.py — Phase 9A

from domain.schemas._base import *


class ClientCreate(BaseModel):
    name: str
    cnpj: str
    segment: str
    contact_email: str
    contact_phone: str
    annual_revenue: float | None = None
    maturity_level: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    annual_revenue: float | None = None
    maturity_level: str | None = None


class InteractionCreate(BaseModel):
    client_id: str
    interaction_type: str
    channel: str
    summary: str
    notes: str | None = None
    next_steps: List[str] | None = None


class ClientResponse(BaseModel):
    id: str
    name: str
    cnpj: str
    segment: str
    contact_email: str
    contact_phone: str
    annual_revenue: float | None
    maturity_level: str | None
    ai_enriched_data: dict | None
    ai_confidence_score: float | None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class InteractionResponse(BaseModel):
    id: str
    client_id: str
    interaction_type: str
    channel: str
    summary: str
    implicit_demands: List[str] | None
    ai_confidence_score: float | None
    occurred_at: str
    created_at: str

    class Config:
        from_attributes = True


class CNPJEnrichmentResponse(BaseModel):
    company_name: str
    legal_nature: str
    establishment_date: str
    address: dict
    activities: List[str]
    employees_range: str | None
    confidence_score: float
