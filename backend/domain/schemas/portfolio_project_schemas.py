# Portfolio Project Schemas
# Domain Layer - Request/Response schemas for Portfolio Projects API
# Implements RF-03: Portfólio Institucional - Portfolio Project Management
# Extracted from routers/portfolio_projects_router.py — Phase 9A
# Note: PortfolioProjectCreate/PortfolioProjectUpdate remain in domain/entities/ (pure domain DTOs)

from domain.schemas._base import *


class PortfolioProjectResponse(BaseModel):
    id: str
    tenant_id: str
    instituto_id: str
    nome: str
    descricao: str
    status: Optional[str] = None
    trl_entrada: Optional[str] = None
    trl_saida: Optional[str] = None
    categoria_solucao_resultante: Optional[str] = None
    modalidade_fomento: Optional[str] = None
    edital_fomento: Optional[str] = None
    empresa_atendida_nome: Optional[str] = None
    empresa_atendida_cnpj: Optional[str] = None
    empresa_atendida_tipo: Optional[str] = None
    empresa_atendida_cidade: Optional[str] = None
    empresa_atendida_uf: Optional[str] = None
    empresa_atendida_pais: Optional[str] = None
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None
    valor_total: Optional[float] = None
    parceiros: List[str] = []
    equipe_ids: List[str] = []
    infraestrutura_ids: List[str] = []
    tematicas: List[str] = []
    plataformas_tecnologicas: List[str] = []
    areas_conhecimento: List[str] = []
    midias: List[dict] = []
    indicadores: Optional[dict] = None
    licoes_aprendidas: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class PortfolioProjectStatsResponse(BaseModel):
    total: int
    total_value: float
    by_status: dict
    by_trl_entrada: dict
    by_trl_saida: dict
    by_category: dict


class TRLEvolutionResponse(BaseModel):
    id: str
    nome: str
    trl_entrada: str
    trl_saida: str
    delta: int


class PortfolioProjectCreateRequest(BaseModel):
    instituto_id: str
    nome: str
    descricao: str
    status: Optional[str] = "EmDesenvolvimento"
    trl_entrada: Optional[str] = None
    trl_saida: Optional[str] = None
    categoria_solucao_resultante: Optional[str] = None
    modalidade_fomento: Optional[str] = None
    edital_fomento: Optional[str] = None
    empresa_atendida_nome: Optional[str] = None
    empresa_atendida_cnpj: Optional[str] = None
    empresa_atendida_tipo: Optional[str] = None
    empresa_atendida_cidade: Optional[str] = None
    empresa_atendida_uf: Optional[str] = None
    empresa_atendida_pais: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    valor_total: Optional[float] = None
    parceiros: Optional[List[str]] = None
    equipe_ids: Optional[List[str]] = None
    infraestrutura_ids: Optional[List[str]] = None
    tematicas: Optional[List[str]] = None
    plataformas_tecnologicas: Optional[List[str]] = None
    areas_conhecimento: Optional[List[str]] = None
    midias: Optional[List[dict]] = None
    indicadores: Optional[dict] = None
    licoes_aprendidas: Optional[str] = None


class PortfolioProjectUpdateRequest(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    status: Optional[str] = None
    trl_entrada: Optional[str] = None
    trl_saida: Optional[str] = None
    categoria_solucao_resultante: Optional[str] = None
    modalidade_fomento: Optional[str] = None
    edital_fomento: Optional[str] = None
    empresa_atendida_nome: Optional[str] = None
    empresa_atendida_cnpj: Optional[str] = None
    empresa_atendida_tipo: Optional[str] = None
    empresa_atendida_cidade: Optional[str] = None
    empresa_atendida_uf: Optional[str] = None
    empresa_atendida_pais: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    valor_total: Optional[float] = None
    parceiros: Optional[List[str]] = None
    equipe_ids: Optional[List[str]] = None
    infraestrutura_ids: Optional[List[str]] = None
    tematicas: Optional[List[str]] = None
    plataformas_tecnologicas: Optional[List[str]] = None
    areas_conhecimento: Optional[List[str]] = None
    midias: Optional[List[dict]] = None
    indicadores: Optional[dict] = None
    licoes_aprendidas: Optional[str] = None
