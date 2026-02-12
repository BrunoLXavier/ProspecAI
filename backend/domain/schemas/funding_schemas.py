# Funding Schemas
# Domain Layer - Request/Response schemas for Funding Sources API
# Implements RF-02: Gestão de Fontes de Fomento
# Extracted from routers/funding_router.py — Phase 9A

from domain.schemas._base import *
from domain.entities.funding_source import InstrumentType


class FundingSourceCreate(BaseModel):
    name: str
    institution: str
    instrument_type: InstrumentType
    total_amount: float
    submission_start: datetime
    submission_end: datetime
    trl_min: int = Field(ge=1, le=9)
    trl_max: int = Field(ge=1, le=9)
    description: str
    requirements: dict = Field(default_factory=dict)
    eligibility_criteria: dict = Field(default_factory=dict)


class FundingSourceUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    total_amount: Optional[float] = None
    submission_end: Optional[datetime] = None
    description: Optional[str] = None


class FundingSourceResponse(BaseModel):
    """Response model for funding sources with camelCase aliases for frontend compatibility."""
    id: str = Field(alias="id")
    name: str = Field(alias="name")
    institution: str = Field(alias="institution")
    instrument_type: str = Field(alias="instrumentType")
    status: str = Field(alias="status")
    total_amount: float = Field(alias="totalAmount")
    submission_start: datetime = Field(alias="submissionStart")
    submission_end: datetime = Field(alias="submissionEnd")
    trl_min: Optional[int] = Field(alias="trlMin")
    trl_max: Optional[int] = Field(alias="trlMax")
    ai_confidence_score: Optional[float] = Field(default=None, alias="aiConfidenceScore")
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")

    model_config = {
        "from_attributes": True,
        "populate_by_name": True  # Allow both snake_case and camelCase
    }


class FundingListResponse(BaseModel):
    """Paginated list response with metadata."""
    items: List[FundingSourceResponse]
    total: int
    page: int
    page_size: int
    has_next: bool
