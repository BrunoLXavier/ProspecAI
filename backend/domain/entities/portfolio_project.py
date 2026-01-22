# Portfolio Project Entity (Enhanced)
# Domain Layer - Portfolio project management for institute scoping
# Implements RF-03: Portfólio Institucional

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from pydantic import Field
from .base import BaseEntity


class PortfolioProjectStatus(str, Enum):
    """Status options for portfolio project."""
    ACTIVE = "Ativo"
    INACTIVE = "Inativo"
    NOT_DISCLOSED = "Não Divulgado"


class SolutionCategory(str, Enum):
    """Category of the resulting solution."""
    PRODUCT = "Produto"
    PROCESS = "Processo"
    SERVICE = "Serviço"
    METHODOLOGY = "Metodologia"


class CompanyType(str, Enum):
    """Type of company served."""
    BRAZILIAN = "Brasileira"
    FOREIGN = "Estrangeira"


class TRLLevel(int, Enum):
    """Technology Readiness Level."""
    TRL_1 = 1
    TRL_2 = 2
    TRL_3 = 3
    TRL_4 = 4
    TRL_5 = 5
    TRL_6 = 6
    TRL_7 = 7
    TRL_8 = 8
    TRL_9 = 9


class PortfolioProject(BaseEntity):
    """
    Portfolio Project entity for institutional project management.
    
    Implements RF-03: Gestão do Portfólio Institucional
    All projects are scoped to a specific institute.
    """
    
    # Required fields
    instituto_id: UUID = Field(..., description="FK to Institute")
    nome: str = Field(..., min_length=1, max_length=500)
    descricao: str = Field(..., min_length=1, max_length=7000)
    trl_saida: TRLLevel = Field(..., description="TRL at project end (1-9)")
    
    # Optional identification
    id_projeto_sgt: Optional[str] = Field(None, max_length=100, description="SGT project ID")
    
    # Classification
    categoria_solucao_resultante: Optional[SolutionCategory] = None
    areas_conhecimento: List[str] = Field(default_factory=list)
    macroareas_pesquisa: List[str] = Field(default_factory=list)
    
    # Funding
    modalidade_fomento: Optional[str] = Field(None, max_length=200, description="e.g. Finep, BNDES, FAPERJ")
    
    # TRL tracking
    trl_entrada: Optional[TRLLevel] = Field(None, description="TRL at project start (1-9)")
    
    # Partnerships
    parceiros: List[str] = Field(default_factory=list, description="Partner names or IDs")
    
    # Themes
    tematicas: List[str] = Field(default_factory=list)
    
    # Critical information
    informacoes_criticas: Optional[str] = Field(None, max_length=7000)
    
    # Company served info
    empresa_atendida_tipo: Optional[CompanyType] = None
    empresa_atendida_nome: Optional[str] = Field(None, max_length=500)
    empresa_atendida_pais: Optional[str] = Field(None, max_length=100)
    empresa_atendida_setor_cnae: Optional[str] = Field(None, max_length=50, description="Complete CNAE code")
    empresa_atendida_depoimento: Optional[str] = Field(None, max_length=6000)
    
    # Visibility
    status: PortfolioProjectStatus = PortfolioProjectStatus.ACTIVE
    pode_ser_divulgado: bool = True
    
    # Media files
    midias: List[Dict[str, Any]] = Field(default_factory=list, description="List of media objects with url, type, description")
    
    # Legacy compatibility fields (from existing Project entity)
    team_members: List[UUID] = Field(default_factory=list)
    competencies: List[str] = Field(default_factory=list)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[Decimal] = None
    lessons_learned: List[Dict[str, str]] = Field(default_factory=list)
    
    class Config:
        from_attributes = True
        validate_assignment = True
    
    def get_trl_evolution(self) -> int:
        """Get TRL evolution (difference between output and input TRL)."""
        if self.trl_entrada:
            return self.trl_saida.value - self.trl_entrada.value
        return 0
    
    def is_publicly_visible(self) -> bool:
        """Check if project can be publicly displayed."""
        return (
            self.status != PortfolioProjectStatus.NOT_DISCLOSED and
            self.pode_ser_divulgado and
            self.deleted_at is None
        )
    
    def add_lesson_learned(self, title: str, description: str, category: str) -> None:
        """Add a lesson learned to the project."""
        self.lessons_learned.append({
            "title": title,
            "description": description,
            "category": category,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def add_media(self, url: str, media_type: str, description: Optional[str] = None) -> None:
        """Add a media file to the project."""
        self.midias.append({
            "url": url,
            "type": media_type,
            "description": description,
            "added_at": datetime.utcnow().isoformat()
        })


class PortfolioProjectCreate(BaseEntity):
    """Schema for creating a new portfolio project."""
    instituto_id: UUID
    nome: str = Field(..., min_length=1, max_length=500)
    descricao: str = Field(..., min_length=1, max_length=7000)
    trl_saida: TRLLevel
    
    id_projeto_sgt: Optional[str] = None
    categoria_solucao_resultante: Optional[SolutionCategory] = None
    areas_conhecimento: List[str] = Field(default_factory=list)
    macroareas_pesquisa: List[str] = Field(default_factory=list)
    modalidade_fomento: Optional[str] = None
    trl_entrada: Optional[TRLLevel] = None
    parceiros: List[str] = Field(default_factory=list)
    tematicas: List[str] = Field(default_factory=list)
    informacoes_criticas: Optional[str] = None
    empresa_atendida_tipo: Optional[CompanyType] = None
    empresa_atendida_nome: Optional[str] = None
    empresa_atendida_pais: Optional[str] = None
    empresa_atendida_setor_cnae: Optional[str] = None
    empresa_atendida_depoimento: Optional[str] = None
    pode_ser_divulgado: bool = True
    team_members: List[UUID] = Field(default_factory=list)
    competencies: List[str] = Field(default_factory=list)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[Decimal] = None


class PortfolioProjectUpdate(BaseEntity):
    """Schema for updating a portfolio project."""
    nome: Optional[str] = None
    descricao: Optional[str] = None
    trl_saida: Optional[TRLLevel] = None
    id_projeto_sgt: Optional[str] = None
    categoria_solucao_resultante: Optional[SolutionCategory] = None
    areas_conhecimento: Optional[List[str]] = None
    macroareas_pesquisa: Optional[List[str]] = None
    modalidade_fomento: Optional[str] = None
    trl_entrada: Optional[TRLLevel] = None
    parceiros: Optional[List[str]] = None
    tematicas: Optional[List[str]] = None
    informacoes_criticas: Optional[str] = None
    empresa_atendida_tipo: Optional[CompanyType] = None
    empresa_atendida_nome: Optional[str] = None
    empresa_atendida_pais: Optional[str] = None
    empresa_atendida_setor_cnae: Optional[str] = None
    empresa_atendida_depoimento: Optional[str] = None
    status: Optional[PortfolioProjectStatus] = None
    pode_ser_divulgado: Optional[bool] = None
    team_members: Optional[List[UUID]] = None
    competencies: Optional[List[str]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[Decimal] = None
