# Implements RF-02: Gestão de Fontes de Fomento
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, Dict, Any
from pydantic import Field, field_validator
from .base import BaseEntity


class InstrumentType(str, Enum):
    """Types of funding instruments."""
    GRANT = "grant"
    LOAN = "loan"
    EQUITY = "equity"
    TAX_INCENTIVE = "tax_incentive"
    MIXED = "mixed"


class FundingStatus(str, Enum):
    """Status of funding opportunities."""
    DRAFT = "draft"
    OPEN = "open"
    CLOSED = "closed"
    SUSPENDED = "suspended"


class FundingSource(BaseEntity):
    """
    Funding source entity for managing grants, loans, and other R&D funding opportunities.
    Implements RF-02: Gestão de Fontes de Fomento
    """
    
    name: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    instrument_type: InstrumentType
    
    # TRL Requirements (1-9 scale)
    trl_min: int = Field(ge=1, le=9)
    trl_max: int = Field(ge=1, le=9)
    
    # Financial Information (encrypted in database)
    total_amount: Decimal = Field(gt=0)
    available_amount: Decimal = Field(ge=0)
    currency: str = Field(default="BRL", pattern="^[A-Z]{3}$")
    
    # Deadlines
    submission_start: datetime
    submission_end: datetime
    execution_start: Optional[datetime] = None
    execution_end: Optional[datetime] = None
    
    # Status and metadata
    status: FundingStatus = FundingStatus.DRAFT
    source_organization: str
    url: Optional[str] = None
    
    # AI-assisted fields
    ai_extracted_data: Optional[Dict[str, Any]] = Field(default=None)
    ai_confidence_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    
    @field_validator("trl_max")
    @classmethod
    def validate_trl_range(cls, v: int, info) -> int:
        """Ensure TRL max is greater than or equal to TRL min."""
        if "trl_min" in info.data and v < info.data["trl_min"]:
            raise ValueError("trl_max must be >= trl_min")
        return v
    
    @field_validator("available_amount")
    @classmethod
    def validate_available_amount(cls, v: Decimal, info) -> Decimal:
        """Ensure available amount doesn't exceed total."""
        if "total_amount" in info.data and v > info.data["total_amount"]:
            raise ValueError("available_amount cannot exceed total_amount")
        return v
    
    def is_open_for_submission(self) -> bool:
        """Check if funding is currently accepting submissions."""
        now = datetime.utcnow()
        return (
            self.status == FundingStatus.OPEN
            and self.submission_start <= now <= self.submission_end
            and not self.is_deleted()
        )
    
    def get_ai_confidence_badge(self) -> str:
        """Return confidence badge color based on AI score."""
        if self.ai_confidence_score is None:
            return "gray"
        if self.ai_confidence_score >= 0.8:
            return "green"
        if self.ai_confidence_score >= 0.6:
            return "yellow"
        return "red"
