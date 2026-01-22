# Communication Domain Entities
# Domain Layer - Communication threads, messages, and meeting minutes
# Implements RF-08: Communications and collaboration

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from pydantic import BaseModel, Field
from enum import Enum


class MessageType(str, Enum):
    """Types of communication messages."""
    TEXT = "text"
    EMAIL = "email"
    MEETING = "meeting"
    AUDIO = "audio"
    VIDEO = "video"
    SYSTEM = "system"


class LinkedEntityType(str, Enum):
    """Types of entities a thread can be linked to."""
    PROPOSAL = "proposal"
    OPPORTUNITY = "opportunity"
    CLIENT = "client"
    PROJECT = "project"


class ParticipantRole(str, Enum):
    """Roles for thread participants."""
    OWNER = "owner"
    EDITOR = "editor"
    VIEWER = "viewer"


class MeetingMinutesStatus(str, Enum):
    """Status of meeting minutes generation."""
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"
    CONFIRMED = "confirmed"


class CommunicationAttachment(BaseModel):
    """Attachment entity for messages and threads."""
    
    id: UUID = Field(default_factory=uuid4)
    thread_id: UUID
    message_id: Optional[UUID] = None
    filename: str
    object_name: str
    bucket: str = "attachments"
    url: Optional[str] = None
    content_type: Optional[str] = None
    size: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[UUID] = None


class EmailMetadata(BaseModel):
    """Metadata for email-type messages."""
    
    from_address: Optional[str] = None
    from_name: Optional[str] = None
    to_addresses: List[str] = Field(default_factory=list)
    cc_addresses: List[str] = Field(default_factory=list)
    bcc_addresses: List[str] = Field(default_factory=list)
    subject: Optional[str] = None
    received_at: Optional[datetime] = None
    message_id: Optional[str] = None  # Email message-id header
    in_reply_to: Optional[str] = None


class CommunicationMessage(BaseModel):
    """Communication message entity."""
    
    id: UUID = Field(default_factory=uuid4)
    thread_id: UUID
    tenant_id: Optional[UUID] = None
    author: str  # User ID as string
    author_name: Optional[str] = None
    body: str
    attachments: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Message type and metadata
    message_type: MessageType = MessageType.TEXT
    email_metadata: Optional[EmailMetadata] = None
    
    # Human-in-the-loop flags
    is_auto_created: bool = False
    auto_created_confirmed: bool = False
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    
    class Config:
        use_enum_values = True


class ThreadParticipant(BaseModel):
    """Participant in a communication thread."""
    
    id: UUID = Field(default_factory=uuid4)
    thread_id: UUID
    user_id: UUID
    role: ParticipantRole = ParticipantRole.VIEWER
    added_at: datetime = Field(default_factory=datetime.utcnow)
    added_by: Optional[UUID] = None
    
    class Config:
        use_enum_values = True


class MeetingMinutes(BaseModel):
    """Meeting minutes entity (AI-generated)."""
    
    id: UUID = Field(default_factory=uuid4)
    thread_id: UUID
    tenant_id: Optional[UUID] = None
    title: Optional[str] = None
    content: Optional[str] = None
    status: MeetingMinutesStatus = MeetingMinutesStatus.PENDING
    generated_at: Optional[datetime] = None
    generated_by: Optional[UUID] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    
    class Config:
        use_enum_values = True


class CommunicationThread(BaseModel):
    """Communication thread entity (forum/conversation)."""
    
    id: UUID = Field(default_factory=uuid4)
    tenant_id: Optional[UUID] = None
    subject: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    last_message_preview: Optional[str] = None
    last_message_at: Optional[datetime] = None
    
    # Linked entity (polymorphic)
    linked_entity_type: Optional[LinkedEntityType] = None
    linked_entity_id: Optional[UUID] = None
    
    # Human-in-the-loop flags
    is_auto_created: bool = False
    auto_created_confirmed: bool = False
    
    # Relationships (loaded separately)
    messages: List[CommunicationMessage] = Field(default_factory=list)
    participants: List[ThreadParticipant] = Field(default_factory=list)
    meeting_minutes: List[MeetingMinutes] = Field(default_factory=list)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    
    # Versioning
    version: int = 1
    
    class Config:
        use_enum_values = True


class CommunicationDraft(BaseModel):
    """Draft message for persistence."""
    
    id: UUID = Field(default_factory=uuid4)
    tenant_id: UUID
    thread_id: UUID
    user_id: UUID
    body: Optional[str] = None
    attachments: List[Dict[str, Any]] = Field(default_factory=list)
    last_updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Request/Response DTOs

class CreateThreadRequest(BaseModel):
    """Request to create a new communication thread."""
    
    subject: str = Field(..., min_length=1, max_length=500)
    linked_entity_type: Optional[LinkedEntityType] = None
    linked_entity_id: Optional[UUID] = None
    initial_message: Optional[str] = None
    participant_ids: List[UUID] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CreateMessageRequest(BaseModel):
    """Request to create a new message in a thread."""
    
    body: str = Field(..., min_length=1)
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
