# Team Schemas
# Domain Layer - Request/Response schemas for Teams API
# Implements RF-03: Portfólio Institucional - Team Management
# Extracted from routers/teams_router.py — Phase 9A
# Note: TeamCreate/TeamUpdate remain in domain/entities/team.py (pure domain DTOs)

from domain.schemas._base import *


class TeamResponse(BaseModel):
    id: str
    tenant_id: str
    usuario_id: str
    instituto_id: str
    cargo: str
    funcao_principal: str
    vinculo_principal: bool = False
    email_profissional: Optional[str] = None
    telefone_celular: Optional[str] = None
    linkedin_url: Optional[str] = None
    lattes_url: Optional[str] = None
    orcid_id: Optional[str] = None
    researchgate_url: Optional[str] = None
    scopus_author_id: Optional[str] = None
    web_of_science_researcher_id: Optional[str] = None
    foto_perfil_url: Optional[str] = None
    data_vinculo_inicio: Optional[str] = None
    data_vinculo_fim: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class TeamStatsResponse(BaseModel):
    total: int
    primary_links: int
    distinct_users: int


class TeamCreateRequest(BaseModel):
    usuario_id: str
    instituto_id: str
    cargo: str
    funcao_principal: str
    vinculo_principal: bool = False
    email_profissional: Optional[str] = None
    telefone_celular: Optional[str] = None
    linkedin_url: Optional[str] = None
    lattes_url: Optional[str] = None
    orcid_id: Optional[str] = None
    researchgate_url: Optional[str] = None
    scopus_author_id: Optional[str] = None
    web_of_science_researcher_id: Optional[str] = None
    foto_perfil_url: Optional[str] = None
    data_vinculo_inicio: Optional[date] = None
    data_vinculo_fim: Optional[date] = None


class TeamUpdateRequest(BaseModel):
    cargo: Optional[str] = None
    funcao_principal: Optional[str] = None
    vinculo_principal: Optional[bool] = None
    email_profissional: Optional[str] = None
    telefone_celular: Optional[str] = None
    linkedin_url: Optional[str] = None
    lattes_url: Optional[str] = None
    orcid_id: Optional[str] = None
    researchgate_url: Optional[str] = None
    scopus_author_id: Optional[str] = None
    web_of_science_researcher_id: Optional[str] = None
    foto_perfil_url: Optional[str] = None
    data_vinculo_inicio: Optional[date] = None
    data_vinculo_fim: Optional[date] = None
