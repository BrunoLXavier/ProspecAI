# Infrastructure Entity
# Domain Layer - Infrastructure management for institute scoping
# Implements RF-03: Portfólio Institucional

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from pydantic import Field, EmailStr
from .base import BaseEntity


class InfrastructureStatus(str, Enum):
    """Status options for infrastructure."""
    OPERATIONAL = "Operacional"
    MAINTENANCE = "Em Manutenção"
    INACTIVE = "Inativo"


class Infrastructure(BaseEntity):
    """
    Infrastructure entity for labs, equipment, and facilities.
    
    Implements RF-03: Gestão do Portfólio Institucional
    All infrastructure is scoped to a specific institute.
    """
    
    # Required fields
    instituto_id: UUID = Field(..., description="FK to Institute")
    nome: str = Field(..., min_length=1, max_length=300, description="e.g. 'Laboratório de Realidade Estendida'")
    descricao: str = Field(..., min_length=1, max_length=4000)
    email_laboratorio: EmailStr = Field(..., description="Lab contact email")
    email_responsavel: EmailStr = Field(..., description="Responsible person email")
    area_predial_m2: int = Field(..., ge=0)
    
    # Status
    status_isi: InfrastructureStatus = InfrastructureStatus.OPERATIONAL
    
    # Maturity fields
    maturidade_gestao: Optional[str] = Field(None, max_length=10, description="e.g. 'M4c'")
    maturidade_base_tecnologica: Optional[Decimal] = Field(None, ge=0, le=5, description="Maturity score 0-5 with 1 decimal place")
    maturidade_produtos_servicos: Optional[Decimal] = Field(None, ge=0, le=5, description="Maturity score 0-5 with 1 decimal place")
    maturidade_cooperacao: Optional[Decimal] = Field(None, ge=0, le=5, description="Maturity score 0-5 with 1 decimal place")
    
    # Technology platforms (ManyToMany or Array)
    plataformas_tecnologicas: List[str] = Field(default_factory=list)
    
    # Knowledge areas (ManyToMany or JSON)
    areas_conhecimento: List[str] = Field(default_factory=list)
    
    # Research macro-areas (ManyToMany or JSON)
    macroareas_pesquisa: List[str] = Field(default_factory=list)
    
    # Media files (OneToMany - stored as URLs/references)
    midias: List[Dict[str, Any]] = Field(default_factory=list, description="List of media objects with url, type, description")
    # Equipments attached to this infrastructure
    equipamentos: List[Dict[str, Any]] = Field(default_factory=list, description="List of equipment objects with name, serial, description, status")
    
    class Config:
        from_attributes = True
        validate_assignment = True
    
    def is_operational(self) -> bool:
        """Check if infrastructure is operational."""
        return self.status_isi == InfrastructureStatus.OPERATIONAL and self.deleted_at is None
    
    def add_media(self, url: str, media_type: str, description: Optional[str] = None) -> None:
        """Add a media file to the infrastructure."""
        self.midias.append({
            "url": url,
            "type": media_type,
            "description": description,
            "added_at": datetime.utcnow().isoformat()
        })


class InfrastructureCreate(BaseEntity):
    """Schema for creating a new infrastructure."""
    instituto_id: UUID
    nome: str = Field(..., min_length=1, max_length=300)
    descricao: str = Field(..., min_length=1, max_length=4000)
    email_laboratorio: EmailStr
    email_responsavel: EmailStr
    area_predial_m2: int = Field(..., ge=0)
    
    status_isi: InfrastructureStatus = InfrastructureStatus.OPERATIONAL
    maturidade_gestao: Optional[str] = None
    maturidade_base_tecnologica: Optional[Decimal] = None
    maturidade_produtos_servicos: Optional[Decimal] = None
    maturidade_cooperacao: Optional[Decimal] = None
    plataformas_tecnologicas: List[str] = Field(default_factory=list)
    areas_conhecimento: List[str] = Field(default_factory=list)
    macroareas_pesquisa: List[str] = Field(default_factory=list)
    equipamentos: List[Dict[str, Any]] = Field(default_factory=list)


class InfrastructureUpdate(BaseEntity):
    """Schema for updating an infrastructure."""
    nome: Optional[str] = None
    descricao: Optional[str] = None
    email_laboratorio: Optional[EmailStr] = None
    email_responsavel: Optional[EmailStr] = None
    area_predial_m2: Optional[int] = None
    status_isi: Optional[InfrastructureStatus] = None
    maturidade_gestao: Optional[str] = None
    maturidade_base_tecnologica: Optional[Decimal] = None
    maturidade_produtos_servicos: Optional[Decimal] = None
    maturidade_cooperacao: Optional[Decimal] = None
    plataformas_tecnologicas: Optional[List[str]] = None
    areas_conhecimento: Optional[List[str]] = None
    macroareas_pesquisa: Optional[List[str]] = None
    equipamentos: Optional[List[Dict[str, Any]]] = None
