# Implements RF-08: Gestão de Propostas e Conhecimento
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import Field, field_validator
from .base import BaseEntity


class ProposalStatus(str, Enum):
    """Status of proposals."""
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    SUBMITTED = "submitted"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class ProposalVersion(BaseEntity):
    """
    Versioned proposal document (Git-like versioning).
    Implements RF-08: Gestão de Propostas e Conhecimento
    """
    
    proposal_id: UUID
    version_number: int = Field(ge=1)
    parent_version_id: Optional[UUID] = None
    
    # Content
    title: str = Field(..., max_length=500)
    content: str  # Main proposal text
    attachments: List[str] = Field(default_factory=list)  # File references
    
    # Metadata
    author_id: UUID
    commit_message: str = Field(..., min_length=1, max_length=500)  # Required
    changes_summary: Optional[str] = None  # Detailed description of changes
    
    # AI analysis
    adherence_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    adherence_analysis: Optional[Dict[str, Any]] = None
    
    def create_next_version(
        self,
        new_content: str,
        author_id: UUID,
        commit_message: str
    ) -> "ProposalVersion":
        """Create a new version based on this one."""
        return ProposalVersion(
            proposal_id=self.proposal_id,
            version_number=self.version_number + 1,
            parent_version_id=self.id,
            title=self.title,
            content=new_content,
            author_id=author_id,
            commit_message=commit_message,
            tenant_id=self.tenant_id,
            created_by=author_id,
            updated_by=author_id,
        )


class Proposal(BaseEntity):
    """
    Proposal for funding or project.
    Implements RF-08: Gestão de Propostas e Conhecimento
    """
    
    title: str = Field(..., max_length=500)
    description: Optional[str] = None
    status: ProposalStatus = ProposalStatus.DRAFT
    
    # Template for dynamic fields
    template_id: Optional[UUID] = None
    
    # Related entities
    opportunity_id: Optional[UUID] = None
    funding_source_id: Optional[UUID] = None
    owner_id: Optional[UUID] = None
    
    # Current version
    current_version: int = Field(default=1, ge=1)
    current_version_id: Optional[UUID] = None
    head_version_id: Optional[UUID] = None
    
    # Content
    content: Optional[Dict[str, Any]] = Field(default_factory=dict)
    sections: Optional[Dict[str, Any]] = Field(default_factory=dict)
    executive_summary: Optional[str] = None
    technical_content: Optional[str] = None
    budget_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    # Collaboration
    collaborators: List[UUID] = Field(default_factory=list)
    locked_by: Optional[UUID] = None
    locked_at: Optional[datetime] = None
    
    # Files and submission
    attachments: List[str] = Field(default_factory=list)
    submitted_at: Optional[datetime] = None
    
    # Knowledge management
    tags: List[str] = Field(default_factory=list)
    lessons_learned: List[Dict[str, Any]] = Field(default_factory=list)
    
    # AI-assisted adherence check
    last_adherence_check: Optional[datetime] = None
    adherence_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    adherence_analysis: Optional[Dict[str, Any]] = None
    
    def add_collaborator(self, user_id: UUID) -> None:
        """Add a collaborator to the proposal."""
        if user_id not in self.collaborators:
            self.collaborators.append(user_id)
    
    def remove_collaborator(self, user_id: UUID) -> None:
        """Remove a collaborator."""
        if user_id in self.collaborators:
            self.collaborators.remove(user_id)
    
    def update_adherence_score(
        self,
        score: float,
        analysis: Dict[str, Any]
    ) -> None:
        """Update AI adherence analysis."""
        self.adherence_score = score
        self.adherence_analysis = analysis
        self.last_adherence_check = datetime.utcnow()
    
    def submit(self, user_id: UUID) -> None:
        """Submit the proposal."""
        if self.status != ProposalStatus.APPROVED:
            raise ValueError("Proposal must be approved before submission")
        self.status = ProposalStatus.SUBMITTED
        self.submitted_at = datetime.utcnow()
        self.updated_by = user_id
        self.updated_at = datetime.utcnow()


# ============================================================================
# PROPOSAL TEMPLATE SYSTEM
# Implements RF-08: Dynamic proposal fields based on funding source type
# ============================================================================

class FieldType(str, Enum):
    """Types of fields supported in proposal templates."""
    TEXT = "text"
    TEXTAREA = "textarea"
    NUMBER = "number"
    DECIMAL = "decimal"
    DATE = "date"
    DATETIME = "datetime"
    SELECT = "select"
    MULTISELECT = "multiselect"
    CHECKBOX = "checkbox"
    FILE = "file"
    ARRAY = "array"
    OBJECT = "object"
    CURRENCY = "currency"
    PERCENTAGE = "percentage"
    TRL = "trl"  # TRL selector (1-9)
    DURATION_MONTHS = "duration_months"
    RICH_TEXT = "rich_text"


class ProposalTemplateType(str, Enum):
    """Types of proposal templates linked to funding sources."""
    GENERIC = "generic"  # Default template for all proposals
    FINEP = "finep"
    EMBRAPII = "embrapii"
    BNDES = "bndes"
    FAPESP = "fapesp"
    DIRECT_CONTRACT = "direct_contract"  # Contratação direta
    LEI_DO_BEM = "lei_do_bem"
    LEI_INFORMATICA = "lei_informatica"
    CUSTOM = "custom"  # User-defined


class ProposalFieldTemplate(BaseEntity):
    """
    Template field definition for proposals.
    Implements RF-08: Dynamic proposal field structure based on funding source.
    """
    
    template_id: UUID
    field_key: str = Field(..., min_length=1, max_length=100)
    label: str = Field(..., min_length=1, max_length=200)
    field_type: FieldType
    
    # Field configuration
    required: bool = Field(default=False)
    order: int = Field(default=0, ge=0)
    section: str = Field(default="general", max_length=100)
    
    # Validation rules
    min_length: Optional[int] = Field(default=None, ge=0)
    max_length: Optional[int] = Field(default=None, ge=0)
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    pattern: Optional[str] = None  # Regex pattern
    
    # Select/multiselect options
    options: Optional[List[Dict[str, Any]]] = Field(default=None)
    
    # Dependencies (show if another field has specific value)
    depends_on_field: Optional[str] = None
    depends_on_value: Optional[Any] = None
    
    # Nested object/array configuration
    nested_fields: Optional[List["ProposalFieldTemplate"]] = Field(default=None)
    
    # UI hints
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    width: str = Field(default="full", pattern="^(full|half|third|quarter)$")
    
    # Auto-fill configuration
    auto_fill_enabled: bool = Field(default=True)
    auto_fill_prompt: Optional[str] = None  # Custom prompt for LLM extraction
    
    @field_validator("max_length")
    @classmethod
    def validate_max_length(cls, v: Optional[int], info) -> Optional[int]:
        """Ensure max_length >= min_length."""
        if v is not None and "min_length" in info.data and info.data["min_length"] is not None:
            if v < info.data["min_length"]:
                raise ValueError("max_length must be >= min_length")
        return v


class ProposalTemplate(BaseEntity):
    """
    Template for proposals linked to a specific funding source type.
    Implements RF-08: Dynamic proposal structure per funding source.
    """
    
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    template_type: ProposalTemplateType = ProposalTemplateType.GENERIC
    
    # Link to funding source (optional - generic templates have no link)
    funding_source_id: Optional[UUID] = None
    
    # Activation status
    is_active: bool = Field(default=True)
    is_default: bool = Field(default=False)  # Default template for this type
    
    # Version control for template itself
    version: int = Field(default=1, ge=1)
    
    # Sections configuration (order and labels)
    sections: List[Dict[str, Any]] = Field(default_factory=lambda: [
        {"key": "general", "label": "Informações Gerais", "order": 1},
        {"key": "technical", "label": "Informações Técnicas", "order": 2},
        {"key": "budget", "label": "Orçamento", "order": 3},
        {"key": "timeline", "label": "Cronograma", "order": 4},
        {"key": "team", "label": "Equipe", "order": 5},
    ])
    
    # Standard fields always included (merged with template-specific)
    include_standard_fields: bool = Field(default=True)
    
    def get_section_by_key(self, key: str) -> Optional[Dict[str, Any]]:
        """Get section configuration by key."""
        for section in self.sections:
            if section.get("key") == key:
                return section
        return None


class ProposalFieldValue(BaseEntity):
    """
    Normalized storage for proposal field values.
    Implements RF-08: Structured field value storage with auto-fill tracking.
    """
    
    proposal_id: UUID
    version_id: Optional[UUID] = None  # Links to specific version
    field_key: str = Field(..., min_length=1, max_length=100)
    
    # Value stored as JSON for flexibility
    value: Any = None
    
    # Auto-fill metadata
    extracted_from_file: Optional[str] = None  # File key if auto-extracted
    extraction_confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    
    # Confirmation tracking (human-in-the-loop)
    is_confirmed: bool = Field(default=False)
    confirmed_by: Optional[UUID] = None
    confirmed_at: Optional[datetime] = None
    
    # Previous value for audit
    previous_value: Optional[Any] = None
    
    def confirm(self, user_id: UUID) -> None:
        """Mark field value as confirmed by user."""
        self.is_confirmed = True
        self.confirmed_by = user_id
        self.confirmed_at = datetime.utcnow()
        self.updated_by = user_id
        self.updated_at = datetime.utcnow()
    
    def get_confidence_badge(self) -> str:
        """Return confidence badge based on extraction score."""
        if self.extraction_confidence is None:
            return "gray"
        if self.extraction_confidence >= 0.8:
            return "green"
        if self.extraction_confidence >= 0.6:
            return "yellow"
        return "red"


class AttachmentStatus(str, Enum):
    """Status of attachment processing for auto-fill."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ProposalAttachment(BaseEntity):
    """
    Attachment for proposals with extraction status.
    Implements RF-08.09: Upload de anexos with auto-fill support.
    """
    
    proposal_id: UUID
    version_id: Optional[UUID] = None  # Links to specific version
    
    # File metadata (stored in MinIO)
    file_key: str = Field(..., min_length=1)  # MinIO object key
    file_name: str = Field(..., min_length=1, max_length=255)
    file_type: str = Field(..., max_length=100)  # MIME type
    file_size: int = Field(..., ge=0)  # Size in bytes
    
    # Extraction status
    extraction_status: AttachmentStatus = AttachmentStatus.PENDING
    extraction_started_at: Optional[datetime] = None
    extraction_completed_at: Optional[datetime] = None
    extraction_error: Optional[str] = None
    
    # Extracted content (cached for reference)
    extracted_text: Optional[str] = None
    extracted_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    def start_extraction(self) -> None:
        """Mark extraction as started."""
        self.extraction_status = AttachmentStatus.PROCESSING
        self.extraction_started_at = datetime.utcnow()
    
    def complete_extraction(self, text: str, fields: Dict[str, Any]) -> None:
        """Mark extraction as completed with results."""
        self.extraction_status = AttachmentStatus.COMPLETED
        self.extraction_completed_at = datetime.utcnow()
        self.extracted_text = text
        self.extracted_fields = fields
    
    def fail_extraction(self, error: str) -> None:
        """Mark extraction as failed."""
        self.extraction_status = AttachmentStatus.FAILED
        self.extraction_completed_at = datetime.utcnow()
        self.extraction_error = error


# Standard fields applied to all proposals regardless of template
STANDARD_PROPOSAL_FIELDS = [
    {
        "field_key": "title",
        "label": "Título da Proposta",
        "field_type": FieldType.TEXT,
        "required": True,
        "section": "general",
        "order": 1,
        "max_length": 500,
        "help_text": "Título claro e descritivo da proposta",
    },
    {
        "field_key": "executive_summary",
        "label": "Resumo Executivo",
        "field_type": FieldType.TEXTAREA,
        "required": True,
        "section": "general",
        "order": 2,
        "max_length": 2000,
        "help_text": "Resumo conciso dos principais pontos da proposta",
    },
    {
        "field_key": "objectives",
        "label": "Objetivos",
        "field_type": FieldType.ARRAY,
        "required": True,
        "section": "general",
        "order": 3,
        "help_text": "Lista de objetivos específicos do projeto",
    },
    {
        "field_key": "justification",
        "label": "Justificativa",
        "field_type": FieldType.RICH_TEXT,
        "required": True,
        "section": "general",
        "order": 4,
        "help_text": "Justificativa técnica e econômica para o projeto",
    },
    {
        "field_key": "methodology",
        "label": "Metodologia",
        "field_type": FieldType.RICH_TEXT,
        "required": True,
        "section": "technical",
        "order": 1,
        "help_text": "Metodologia de desenvolvimento e execução",
    },
    {
        "field_key": "trl_current",
        "label": "TRL Atual",
        "field_type": FieldType.TRL,
        "required": True,
        "section": "technical",
        "order": 2,
        "help_text": "Nível de maturidade tecnológica atual (1-9)",
    },
    {
        "field_key": "trl_target",
        "label": "TRL Alvo",
        "field_type": FieldType.TRL,
        "required": True,
        "section": "technical",
        "order": 3,
        "help_text": "Nível de maturidade tecnológica esperado ao final (1-9)",
    },
    {
        "field_key": "total_budget",
        "label": "Orçamento Total",
        "field_type": FieldType.CURRENCY,
        "required": True,
        "section": "budget",
        "order": 1,
        "min_value": 0,
        "help_text": "Valor total do projeto em Reais (R$)",
    },
    {
        "field_key": "duration_months",
        "label": "Duração (meses)",
        "field_type": FieldType.DURATION_MONTHS,
        "required": True,
        "section": "timeline",
        "order": 1,
        "min_value": 1,
        "max_value": 60,
        "help_text": "Duração prevista do projeto em meses",
    },
    {
        "field_key": "start_date",
        "label": "Data de Início Prevista",
        "field_type": FieldType.DATE,
        "required": False,
        "section": "timeline",
        "order": 2,
    },
    {
        "field_key": "team_lead",
        "label": "Líder do Projeto",
        "field_type": FieldType.TEXT,
        "required": True,
        "section": "team",
        "order": 1,
        "help_text": "Nome do responsável técnico pelo projeto",
    },
    {
        "field_key": "team_members",
        "label": "Membros da Equipe",
        "field_type": FieldType.ARRAY,
        "required": False,
        "section": "team",
        "order": 2,
        "help_text": "Lista de membros da equipe com funções",
    },
]
