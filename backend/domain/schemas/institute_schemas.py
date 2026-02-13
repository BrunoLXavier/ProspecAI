# Institute Schemas
# Domain Layer - Response schemas for Institutes API
# Implements RF-03: Portfólio Institucional - Institute Management
# Extracted from routers/institutes_router.py — Phase 9A
# Note: InstituteCreate/InstituteUpdate remain in domain/entities/institute.py (pure domain DTOs)

from domain.schemas._base import *


class InstituteResponse(BaseModel):
    id: str
    tenant_id: str
    nome: str
    isi_sigla: str
    nome_fantasia: Optional[str] = None
    endereco_rua: str
    endereco_bairro: str
    endereco_cep: str
    endereco_cidade: str
    endereco_uf: str
    descricao: str
    status: str
    status_receita: Optional[str] = None
    status_operacional: str
    logo_url: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class InstituteDetailResponse(InstituteResponse):
    endereco_numero: Optional[str] = None
    endereco_complemento: Optional[str] = None
    area_predial_m2: Optional[int] = None
    maturidade_gestao: Optional[str] = None
    maturidade_base_tecnologica: Optional[float] = None
    maturidade_produtos_servicos: Optional[float] = None
    maturidade_cooperacao: Optional[float] = None
    credenciamento_cati: bool = False
    credenciamento_ed: bool = False
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class InstituteStatsResponse(BaseModel):
    total: int
    by_status: dict
    by_operational_status: dict
    total_area_m2: float


class MembershipResponse(BaseModel):
    id: str
    user_id: str
    institute_id: str
    role: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    institute_name: Optional[str] = None
    institute_sigla: Optional[str] = None
