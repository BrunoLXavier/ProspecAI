# Portfolio Schemas
# Domain Layer - Request/Response schemas for Portfolio API
# Implements RF-03: Gestão de Portfólio Institucional
# Extracted from routers/portfolio_router.py — Phase 9A

from domain.schemas._base import *


class ProjectCreate(BaseModel):
    title: str
    description: str
    research_area: str
    current_trl: int
    start_date: date
    end_date: date
    budget: float
    objectives: List[str]
    methodology: str
    expected_results: List[str]
    institute_id: str


class ProjectUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    current_trl: int | None = None
    budget: float | None = None
    lessons_learned: List[str] | None = None


class TRLAdvancement(BaseModel):
    new_trl: int
    evidence: str
    date_achieved: date


class ProjectResponse(BaseModel):
    id: str
    title: str
    description: str
    research_area: str
    current_trl: int
    status: str
    start_date: date
    end_date: date
    budget: float
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class PortfolioStatsResponse(BaseModel):
    total_projects: int
    active_projects: int
    total_budget: float
    average_trl: float
    projects_by_status: dict
    projects_by_trl: dict
