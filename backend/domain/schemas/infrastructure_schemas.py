# Infrastructure Schemas
# Domain Layer - Request/Response schemas for Infrastructure API
# Implements RF-03: Portfólio Institucional - Infrastructure Management
# Extracted from routers/infrastructures_router.py — Phase 9A
# Note: InfrastructureCreate/InfrastructureUpdate remain in domain/entities/ (pure domain DTOs)

from domain.schemas._base import *


class InfrastructureResponse(BaseModel):
    id: str
    tenant_id: str
    instituto_id: str
    nome: str
    descricao: str
    email_laboratorio: Optional[str] = None
    email_responsavel: Optional[str] = None
    telefone: Optional[str] = None
    site_url: Optional[str] = None
    endereco_completo: Optional[str] = None
    area_predial_m2: Optional[float] = None
    status_isi: Optional[str] = None
    maturidade_regulatoria: Optional[float] = None
    maturidade_laboratorial: Optional[float] = None
    maturidade_gestao: Optional[str] = None
    plataformas_tecnologicas: List[str] = []
    areas_conhecimento: List[str] = []
    macroareas_pesquisa: List[str] = []
    midias: List[dict] = []
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class InfrastructureStatsResponse(BaseModel):
    total: int
    total_area_m2: float
    by_status: dict


class InfrastructureCreateRequest(BaseModel):
    instituto_id: str
    nome: str
    descricao: str
    email_laboratorio: Optional[str] = None
    email_responsavel: Optional[str] = None
    telefone: Optional[str] = None
    site_url: Optional[str] = None
    endereco_completo: Optional[str] = None
    area_predial_m2: Optional[float] = None
    status_isi: Optional[str] = "Operacional"
    maturidade_regulatoria: Optional[float] = None
    maturidade_laboratorial: Optional[float] = None
    maturidade_gestao: Optional[str] = None
    plataformas_tecnologicas: Optional[List[str]] = None
    areas_conhecimento: Optional[List[str]] = None
    macroareas_pesquisa: Optional[List[str]] = None
    midias: Optional[List[dict]] = None


class InfrastructureUpdateRequest(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    email_laboratorio: Optional[str] = None
    email_responsavel: Optional[str] = None
    telefone: Optional[str] = None
    site_url: Optional[str] = None
    endereco_completo: Optional[str] = None
    area_predial_m2: Optional[float] = None
    status_isi: Optional[str] = None
    maturidade_regulatoria: Optional[float] = None
    maturidade_laboratorial: Optional[float] = None
    maturidade_gestao: Optional[str] = None
    plataformas_tecnologicas: Optional[List[str]] = None
    areas_conhecimento: Optional[List[str]] = None
    macroareas_pesquisa: Optional[List[str]] = None
    midias: Optional[List[dict]] = None
