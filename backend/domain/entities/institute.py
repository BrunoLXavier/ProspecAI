# Institute Entity
# Domain Layer - Institute management for multi-tenant isolation
# Implements RF-03: Portfólio Institucional

from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Optional, List
from uuid import UUID, uuid4
from pydantic import Field, field_validator
from .base import BaseEntity


class InstituteStatus(str, Enum):
    """Status options for institute."""
    ACTIVE = "Ativo"
    INACTIVE = "Inativo"


class OperationalStatus(str, Enum):
    """Operational status for institute."""
    OPERATIONAL = "Operacional"
    IMPLEMENTING = "Em Implantação"
    INACTIVE = "Inativo"


class Institute(BaseEntity):
    """
    Institute entity for institutional management.
    
    Implements RF-03: Gestão do Portfólio Institucional
    All portfolio items, teams, and infrastructure are scoped to an institute.
    Users can belong to one or more institutes via membership.
    """
    
    # Required fields
    nome: str = Field(..., min_length=1, max_length=200)
    isi_sigla: str = Field(..., min_length=1, max_length=100, description="ISI acronym, e.g. 'ISI em Sistemas Virtuais'")
    endereco_rua: str = Field(..., min_length=1, max_length=500)
    endereco_bairro: str = Field(..., min_length=1, max_length=200)
    endereco_cep: str = Field(..., min_length=8, max_length=10, pattern=r'^\d{5}-?\d{3}$')
    endereco_cidade: str = Field(..., min_length=1, max_length=200)
    endereco_uf: str = Field(..., min_length=2, max_length=2, pattern=r'^[A-Z]{2}$')
    descricao: str = Field(..., min_length=1, max_length=5000)
    
    # Optional fields
    nome_fantasia: Optional[str] = Field(None, max_length=150)
    endereco_numero: Optional[str] = Field(None, max_length=20)
    endereco_complemento: Optional[str] = Field(None, max_length=200)
    area_predial_m2: Optional[int] = Field(None, ge=0)
    
    # Status fields
    status_operacional: OperationalStatus = OperationalStatus.OPERATIONAL
    status: InstituteStatus = InstituteStatus.ACTIVE
    
    # Maturity fields (ISI maturity model)
    maturidade_gestao: Optional[str] = Field(None, max_length=10, description="e.g. 'M4c', 'M3b'")
    maturidade_base_tecnologica: Optional[Decimal] = Field(None, ge=0, le=5, description="Maturity score 0-5 with 1 decimal place")
    maturidade_produtos_servicos: Optional[Decimal] = Field(None, ge=0, le=5, description="Maturity score 0-5 with 1 decimal place")
    maturidade_cooperacao: Optional[Decimal] = Field(None, ge=0, le=5, description="Maturity score 0-5 with 1 decimal place")
    
    # Accreditation flags
    credenciamento_cati: bool = False
    credenciamento_ed: bool = False
    
    # Logo
    logo_url: Optional[str] = Field(None, max_length=1000)
    
    @field_validator('endereco_uf')
    @classmethod
    def uppercase_uf(cls, v: str) -> str:
        return v.upper() if v else v
    
    @field_validator('endereco_cep')
    @classmethod
    def format_cep(cls, v: str) -> str:
        """Ensure CEP is formatted as XXXXX-XXX."""
        if v and '-' not in v and len(v) == 8:
            return f"{v[:5]}-{v[5:]}"
        return v
    
    def get_full_address(self) -> str:
        """Get formatted full address."""
        parts = [self.endereco_rua]
        if self.endereco_numero:
            parts.append(self.endereco_numero)
        if self.endereco_complemento:
            parts.append(self.endereco_complemento)
        parts.append(self.endereco_bairro)
        parts.append(f"{self.endereco_cidade}/{self.endereco_uf}")
        parts.append(f"CEP: {self.endereco_cep}")
        return ", ".join(parts)
    
    def is_operational(self) -> bool:
        """Check if institute is operational."""
        return (
            self.status == InstituteStatus.ACTIVE and 
            self.status_operacional == OperationalStatus.OPERATIONAL
        )


class InstituteCreate(BaseEntity):
    """Schema for creating a new institute."""
    nome: str = Field(..., min_length=1, max_length=200)
    isi_sigla: str = Field(..., min_length=1, max_length=100)
    endereco_rua: str = Field(..., min_length=1, max_length=500)
    endereco_bairro: str = Field(..., min_length=1, max_length=200)
    endereco_cep: str = Field(..., min_length=8, max_length=10)
    endereco_cidade: str = Field(..., min_length=1, max_length=200)
    endereco_uf: str = Field(..., min_length=2, max_length=2)
    descricao: str = Field(..., min_length=1, max_length=5000)
    
    nome_fantasia: Optional[str] = None
    endereco_numero: Optional[str] = None
    endereco_complemento: Optional[str] = None
    area_predial_m2: Optional[int] = None
    status_operacional: OperationalStatus = OperationalStatus.IMPLEMENTING
    maturidade_gestao: Optional[str] = None
    maturidade_base_tecnologica: Optional[Decimal] = None
    maturidade_produtos_servicos: Optional[Decimal] = None
    maturidade_cooperacao: Optional[Decimal] = None
    credenciamento_cati: bool = False
    credenciamento_ed: bool = False
    logo_url: Optional[str] = None


class InstituteUpdate(BaseEntity):
    """Schema for updating an institute."""
    nome: Optional[str] = None
    nome_fantasia: Optional[str] = None
    isi_sigla: Optional[str] = None
    endereco_rua: Optional[str] = None
    endereco_numero: Optional[str] = None
    endereco_complemento: Optional[str] = None
    endereco_bairro: Optional[str] = None
    endereco_cep: Optional[str] = None
    endereco_cidade: Optional[str] = None
    endereco_uf: Optional[str] = None
    descricao: Optional[str] = None
    area_predial_m2: Optional[int] = None
    status_operacional: Optional[OperationalStatus] = None
    status: Optional[InstituteStatus] = None
    maturidade_gestao: Optional[str] = None
    maturidade_base_tecnologica: Optional[Decimal] = None
    maturidade_produtos_servicos: Optional[Decimal] = None
    maturidade_cooperacao: Optional[Decimal] = None
    credenciamento_cati: Optional[bool] = None
    credenciamento_ed: Optional[bool] = None
    logo_url: Optional[str] = None
