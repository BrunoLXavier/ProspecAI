# Matching Schemas
# Domain Layer - Request/Response schemas for Matching API
# Implements RF-06: Algoritmos de Matching
# Extracted from routers/matching_router.py — Phase 9A

from domain.schemas._base import *


class MatchingRequest(BaseModel):
    project_id: str | None = None
    funding_source_id: str | None = None
    min_score: float = 0.6
    max_results: int = 10


class MatchingScoreResponse(BaseModel):
    project_id: str
    funding_source_id: str
    composite_score: float
    technical_viability: float
    financial_viability: float
    strategic_alignment: float
    components: dict
    ai_confidence_score: float
    calculated_at: str

    class Config:
        from_attributes = True


class MatchingResultResponse(BaseModel):
    id: str
    project_id: str | None
    funding_source_id: str | None
    matches: List[MatchingScoreResponse]
    total_matches: int
    executed_at: str
    parameters: dict

    class Config:
        from_attributes = True


class MatchingExplanation(BaseModel):
    score: float
    components: dict
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]
