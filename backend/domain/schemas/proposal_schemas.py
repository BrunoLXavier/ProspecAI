# Proposal Schemas
# Domain Layer - Request/Response schemas for Proposals API
# Implements RF-08: Repositório de Propostas
# Extracted from routers/proposals_router.py — Phase 9A

from domain.schemas._base import *
from domain.entities.proposal import ProposalStatus, FieldType, ProposalTemplateType


# ============================================================================
# Core Proposal Schemas
# ============================================================================

class ProposalCreate(BaseModel):
    title: str
    funding_source_id: str
    project_id: str | None = None
    opportunity_id: str | None = None
    description: str
    objectives: List[str]
    methodology: str
    budget_breakdown: dict
    schedule: dict
    team: List[dict]


class ProposalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: ProposalStatus | None = None
    objectives: List[str] | None = None
    methodology: str | None = None
    budget_breakdown: dict | None = None


class VersionCreate(BaseModel):
    proposal_id: str
    changes_summary: str
    content_updates: dict


class AdherenceAnalysisResponse(BaseModel):
    overall_score: float
    criteria_scores: dict
    gaps: List[dict]
    recommendations: List[str]
    ai_confidence_score: float


class ProposalResponse(BaseModel):
    id: str
    title: str
    funding_source_id: str
    project_id: str | None
    opportunity_id: str | None
    status: str
    current_version: int
    adherence_score: float | None
    created_at: str
    updated_at: str
    submitted_at: str | None

    class Config:
        from_attributes = True


class ProposalVersionResponse(BaseModel):
    id: str
    proposal_id: str
    version_number: int
    changes_summary: str
    created_by: str
    created_at: str

    class Config:
        from_attributes = True


# ============================================================================
# Template and Auto-fill Schemas
# ============================================================================

class FieldTemplateCreate(BaseModel):
    """Schema for creating a field template within a proposal template."""
    field_key: str = Field(..., min_length=1, max_length=100)
    label: str = Field(..., min_length=1, max_length=255)
    field_type: FieldType
    order: int = Field(0, ge=0)
    required: bool = False
    help_text: Optional[str] = None
    placeholder: Optional[str] = None
    validation_rules: Optional[Dict[str, Any]] = None
    options: Optional[List[Dict[str, Any]]] = None
    auto_fill_prompt: Optional[str] = None


class ProposalTemplateCreate(BaseModel):
    """Schema for creating a proposal template (admin only)."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    template_type: ProposalTemplateType = ProposalTemplateType.GENERIC
    funding_source_id: Optional[str] = None
    is_default: bool = False
    fields: List[FieldTemplateCreate] = []


class ProposalTemplateUpdate(BaseModel):
    """Schema for updating a proposal template."""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProposalTemplateResponse(BaseModel):
    """Response schema for proposal template."""
    id: str
    name: str
    description: Optional[str]
    template_type: str
    funding_source_id: Optional[str]
    is_default: bool
    is_active: bool
    fields_count: int = 0
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class FieldTemplateResponse(BaseModel):
    """Response schema for field template."""
    id: str
    field_key: str
    label: str
    field_type: str
    order: int
    required: bool
    help_text: Optional[str]
    placeholder: Optional[str]
    validation_rules: Optional[Dict[str, Any]]
    options: Optional[List[Dict[str, Any]]]
    auto_fill_prompt: Optional[str]

    class Config:
        from_attributes = True


class FieldValueCreate(BaseModel):
    """Schema for setting a field value."""
    field_key: str
    value: Any
    is_ai_suggested: bool = False
    source_attachment_id: Optional[str] = None
    confidence_score: Optional[float] = None


class FieldValueResponse(BaseModel):
    """Response schema for field value."""
    id: str
    field_key: str
    value: Any
    is_ai_suggested: bool
    is_confirmed: bool
    confirmed_by: Optional[str]
    confirmed_at: Optional[str]
    confidence_score: Optional[float]
    source_attachment_id: Optional[str]

    class Config:
        from_attributes = True


class AttachmentResponse(BaseModel):
    """Response schema for proposal attachment."""
    id: str
    proposal_id: str
    file_name: str
    file_type: str
    file_size: int
    extraction_status: str
    extracted_fields_count: int = 0
    download_url: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class AutoFillSuggestionResponse(BaseModel):
    """Response schema for auto-fill suggestion."""
    id: str
    field_key: str
    field_label: str
    suggested_value: Any
    confidence_score: float
    confidence_badge: str  # green (>80%), yellow (60-80%), red (<60%)
    source_text: Optional[str]
    source_attachment_id: Optional[str]
    status: str  # pending, accepted, rejected

    class Config:
        from_attributes = True


class ProposalWithFieldsCreate(BaseModel):
    """Create proposal with template and initial field values."""
    title: str
    template_id: Optional[str] = None  # If None, uses funding source default or generic
    funding_source_id: str
    project_id: Optional[str] = None
    opportunity_id: Optional[str] = None
    description: Optional[str] = None
    initial_field_values: Optional[Dict[str, Any]] = None


class VersionCreateWithFields(BaseModel):
    """Create version with commit message and field updates."""
    commit_message: str = Field(..., min_length=1, max_length=500, description="Required commit message describing changes")
    field_updates: Dict[str, Any] = Field(default_factory=dict, description="Field values to update")


class ReportGenerateRequest(BaseModel):
    """Request to generate proposal report."""
    format: str = Field("pdf", pattern="^(pdf|docx)$", description="Output format: pdf or docx")
    include_versions: bool = Field(False, description="Include version history")
    include_attachments: bool = Field(False, description="Include attachment metadata")
    template_name: Optional[str] = None  # Custom Jinja2 template name
