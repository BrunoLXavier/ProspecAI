# Team (Equipe) Entity
# Domain Layer - Team management for institute scoping
# Implements RF-03: Portfólio Institucional

from datetime import datetime, date
from typing import Optional, List
from uuid import UUID, uuid4
from pydantic import Field, EmailStr, field_validator
from .base import BaseEntity


class Team(BaseEntity):
    """
    Team entity for linking users to institutes with roles.
    
    Implements RF-03: Gestão do Portfólio Institucional
    Represents the professional link between a user and an institute.
    """
    
    # Required fields
    usuario_id: UUID = Field(..., description="FK to User")
    instituto_id: UUID = Field(..., description="FK to Institute")
    cargo: str = Field(..., min_length=1, max_length=200, description="e.g. Coordenador, Pesquisador Chefe, CTO")
    funcao_principal: str = Field(..., min_length=1, max_length=500)
    
    # Optional professional info
    vinculo_principal: bool = Field(default=False, description="Primary institute link")
    email_profissional: Optional[EmailStr] = None
    telefone_celular: Optional[str] = Field(None, max_length=20, pattern=r'^\(\d{2}\)\s?\d{4,5}-?\d{4}$')
    
    # Academic profiles
    linkedin_url: Optional[str] = Field(None, max_length=500)
    lattes_url: Optional[str] = Field(None, max_length=500)
    orcid_id: Optional[str] = Field(None, max_length=50)
    researchgate_url: Optional[str] = Field(None, max_length=500)
    scopus_author_id: Optional[str] = Field(None, max_length=50)
    web_of_science_researcher_id: Optional[str] = Field(None, max_length=50)
    
    # Profile photo
    foto_perfil_url: Optional[str] = Field(None, max_length=1000)
    
    # Link dates
    data_vinculo_inicio: Optional[date] = None
    data_vinculo_fim: Optional[date] = None
    
    @field_validator('telefone_celular')
    @classmethod
    def format_phone(cls, v: Optional[str]) -> Optional[str]:
        """Format phone number to (XX) XXXXX-XXXX pattern."""
        if not v:
            return v
        # Remove non-numeric characters for validation
        digits = ''.join(filter(str.isdigit, v))
        if len(digits) == 11:
            return f"({digits[:2]}) {digits[2:7]}-{digits[7:]}"
        elif len(digits) == 10:
            return f"({digits[:2]}) {digits[2:6]}-{digits[6:]}"
        return v
    
    def is_active_link(self) -> bool:
        """Check if the team link is currently active."""
        today = date.today()
        if self.data_vinculo_fim and self.data_vinculo_fim < today:
            return False
        if self.data_vinculo_inicio and self.data_vinculo_inicio > today:
            return False
        return self.deleted_at is None


class TeamCreate(BaseEntity):
    """Schema for creating a new team member link."""
    usuario_id: UUID
    instituto_id: UUID
    cargo: str = Field(..., min_length=1, max_length=200)
    funcao_principal: str = Field(..., min_length=1, max_length=500)
    
    vinculo_principal: bool = False
    email_profissional: Optional[EmailStr] = None
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


class TeamUpdate(BaseEntity):
    """Schema for updating a team member link."""
    cargo: Optional[str] = None
    funcao_principal: Optional[str] = None
    vinculo_principal: Optional[bool] = None
    email_profissional: Optional[EmailStr] = None
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
