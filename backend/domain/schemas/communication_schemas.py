# Communication Schemas
# Domain Layer - Request/Response schemas for Communications API
# Implements RF-08: Communications and collaboration
# Extracted from routers/communications_router.py + domain/entities/communication.py — Phase 9A

from domain.schemas._base import *
from domain.entities.communication import (
    MessageType,
    LinkedEntityType,
    EmailMetadata,
)


# ============================================================================
# Request Schemas (moved from domain/entities/communication.py)
# ============================================================================

class CreateThreadRequest(BaseModel):
    """Request to create a new communication thread."""
    subject: str = Field(..., min_length=1, max_length=500)
    linked_entity_type: Optional[LinkedEntityType] = None
    linked_entity_id: Optional[UUID] = None
    initial_message: Optional[str] = None
    participant_ids: List[UUID] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class UpdateThreadRequest(BaseModel):
    """Request to update an existing communication thread."""
    subject: Optional[str] = Field(None, min_length=1, max_length=500)
    linked_entity_type: Optional[str] = None
    linked_entity_id: Optional[str] = None


class CreateMessageRequest(BaseModel):
    """Request to create a new message in a thread."""
    # Body is optional when sending only attachments
    body: str = Field(default="", min_length=0)
    message_type: MessageType = MessageType.TEXT
    email_metadata: Optional[EmailMetadata] = None
    attachments: List[Dict[str, Any]] = Field(default_factory=list)


class UpdateDraftRequest(BaseModel):
    """Request to update a draft message."""
    body: Optional[str] = None
    attachments: List[Dict[str, Any]] = Field(default_factory=list)


class ConfirmAutoCreatedRequest(BaseModel):
    """Request to confirm auto-created content."""
    confirmed: bool = True
    reassign_to_thread_id: Optional[UUID] = None  # Optional: move to different thread


class GenerateMeetingMinutesRequest(BaseModel):
    """Request to generate meeting minutes for a thread."""
    title: Optional[str] = None
    include_attachments: bool = True
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


# ============================================================================
# Response Schemas (moved from routers/communications_router.py)
# ============================================================================

class ThreadResponse(BaseModel):
    id: str
    subject: Optional[str] = None
    preview: Optional[str] = None
    last_message_at: Optional[str] = None
    linked_entity_type: Optional[str] = None
    linked_entity_id: Optional[str] = None
    is_auto_created: bool = False
    auto_created_confirmed: bool = False
    created_at: Optional[str] = None
    participant_count: int = 0


class MessageResponse(BaseModel):
    id: str
    thread_id: str
    author: str
    author_name: Optional[str] = None
    body: str
    message_type: str = "text"
    created_at: str
    attachments: List[Any] = []
    is_auto_created: bool = False
    auto_created_confirmed: bool = False
    email_metadata: Optional[dict] = None


class ParticipantResponse(BaseModel):
    id: str
    user_id: str
    role: str
    added_at: str


class DraftResponse(BaseModel):
    thread_id: str
    body: Optional[str] = None
    attachments: List[Any] = []
    last_updated_at: str


class MeetingMinutesResponse(BaseModel):
    id: str
    thread_id: str
    title: Optional[str] = None
    content: Optional[str] = None
    status: str
    generated_at: Optional[str] = None
    created_at: str


class ThreadListResponse(BaseModel):
    items: List[ThreadResponse]
    total: int
    skip: int
    limit: int


# ============================================================================
# Email / Transcription Schemas (moved from routers/communications_router.py)
# ============================================================================

class EmailConfigRequest(BaseModel):
    email_address: str
    imap_server: str
    imap_port: int = 993
    use_ssl: bool = True
    password: str
    folder: str = "INBOX"
    auto_create_threads: bool = True


class EmailConfigResponse(BaseModel):
    email_address: str
    imap_server: str
    imap_port: int
    use_ssl: bool
    folder: str
    auto_create_threads: bool
    last_sync_at: Optional[str] = None
    total_emails_processed: int = 0


class InboundEmailRequest(BaseModel):
    from_address: str
    from_name: Optional[str] = None
    to_addresses: List[str]
    cc_addresses: List[str] = []
    subject: str
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    received_at: Optional[str] = None
    message_id: Optional[str] = None
    in_reply_to: Optional[str] = None
    attachments: List[Dict[str, Any]] = []


class TranscriptionRequest(BaseModel):
    language: str = "pt"
    model_size: str = "base"
    generate_minutes: bool = True


class TranscriptionResponse(BaseModel):
    id: str
    thread_id: str
    message_id: str
    text: str
    language: str
    duration_seconds: Optional[float] = None
    minutes_id: Optional[str] = None


class TranscriptionReportRequest(BaseModel):
    template_name: str = "meeting_summary"
    include_action_items: bool = True
    language: str = "pt"


class TranscriptionReportResponse(BaseModel):
    thread_id: str
    template_name: str
    content: str
    format: str
    generated_at: str
