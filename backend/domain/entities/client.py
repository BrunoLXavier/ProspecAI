# Implements RF-04: CRM Inteligente
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import Field, EmailStr
from .base import BaseEntity


class ClientType(str, Enum):
    """Types of clients in the CRM."""
    COMPANY = "company"
    UNIVERSITY = "university"
    RESEARCH_CENTER = "research_center"
    GOVERNMENT = "government"
    STARTUP = "startup"
    OTHER = "other"


class InteractionType(str, Enum):
    """Types of client interactions."""
    EMAIL = "email"
    MEETING = "meeting"
    PHONE = "phone"
    PROPOSAL = "proposal"
    CONTRACT = "contract"
    OTHER = "other"


class Interaction(BaseEntity):
    """Client interaction record."""
    
    client_id: str  # Reference to Client
    interaction_type: InteractionType
    subject: str = Field(..., max_length=500)
    description: str
    interaction_date: datetime
    participants: List[str] = Field(default_factory=list)
    attachments: List[str] = Field(default_factory=list)
    
    # AI-extracted implicit demands
    implicit_demands: Optional[List[Dict[str, Any]]] = None
    ai_confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class Client(BaseEntity):
    """
    Client entity for intelligent CRM.
    Implements RF-04: CRM Inteligente
    """
    
    # Basic Information
    name: str = Field(..., min_length=1, max_length=500)
    client_type: ClientType
    
    # Institute scope (RF-04: institute-level CRM filtering)
    institute_id: Optional[UUID] = None
    
    # Company/Organization Data (encrypted in database per RNF-01)
    cnpj: Optional[str] = Field(default=None, pattern=r"^\d{14}$")
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    
    # Address
    address: Optional[Dict[str, str]] = None
    
    # AI-assisted auto-fill from CNPJ API (RF-04)
    auto_filled_data: Optional[Dict[str, Any]] = None
    auto_fill_confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    
    # Relationship data
    contact_person: Optional[str] = None
    sector: Optional[str] = None
    website: Optional[str] = None
    
    # Interaction history (references)
    interaction_ids: List[str] = Field(default_factory=list)
    
    # AI-detected implicit demands
    detected_demands: List[Dict[str, Any]] = Field(default_factory=list)
    
    def add_interaction(self, interaction_id: str) -> None:
        """Add an interaction reference."""
        if interaction_id not in self.interaction_ids:
            self.interaction_ids.append(interaction_id)
    
    def update_from_cnpj_api(self, api_data: Dict[str, Any], confidence: float) -> None:
        """Update client data from CNPJ API (RF-04 requirement)."""
        self.auto_filled_data = api_data
        self.auto_fill_confidence = confidence
        
        # Update main fields if confidence is high
        if confidence >= 0.8:
            if "nome" in api_data:
                self.name = api_data["nome"]
            if "email" in api_data:
                self.email = api_data["email"]
