# Opportunity Schemas
# Domain Layer - Request/Response schemas for Opportunities API
# Implements RF-05: Pipeline de Oportunidades
# Extracted from routers/opportunities_router.py — Phase 9A

from domain.schemas._base import *
from domain.entities.opportunity import OpportunityStage


class OpportunityCreate(BaseModel):
    title: str
    description: str
    client_id: str
    funding_source_id: str | None = None
    estimated_value: float
    probability: float
    priority_score: float | None = None


class OpportunityUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    estimated_value: float | None = None
    probability: float | None = None
    priority_score: float | None = None


class StageTransition(BaseModel):
    new_stage: OpportunityStage
    notes: str | None = None


class OpportunityResponse(BaseModel):
    id: str
    title: str
    description: str
    client_id: str
    funding_source_id: str | None
    current_stage: str
    estimated_value: float
    probability: float
    priority_score: float
    priority_factors: dict | None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class PipelineStatsResponse(BaseModel):
    total_opportunities: int
    total_estimated_value: float
    opportunities_by_stage: dict
    conversion_rates: dict
    average_time_by_stage: dict
