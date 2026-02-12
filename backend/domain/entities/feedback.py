# Implements: User Feedback System with Screenshots & Annotations
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List
from uuid import UUID
from pydantic import Field, field_validator
from .base import BaseEntity


class FeedbackType(str, Enum):
    """Types of user feedback."""
    BUG_REPORT = "bug_report"
    FEATURE_REQUEST = "feature_request"
    UI_FEEDBACK = "ui_feedback"
    PERFORMANCE = "performance"
    USABILITY = "usability"
    IMPROVEMENT = "improvement"
    OTHER = "other"


class FeedbackSeverity(str, Enum):
    """Severity levels for feedback."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class FeedbackStatus(str, Enum):
    """Status of feedback in workflow."""
    OPEN = "open"
    IN_REVIEW = "in_review"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"
    WONT_FIX = "wont_fix"


class AnnotationStroke(BaseEntity):
    """
    Represents a single stroke in the annotation canvas.
    Stores path data for yellow marker annotations.
    """
    id: UUID
    tenant_id: Optional[UUID] = None
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    
    # Stroke data
    paths: List[Dict[str, Any]]  # Array of {x, y} coordinates
    stroke_width: float = 3.0
    stroke_color: str = "#FCD34D"  # Yellow marker color


class Feedback(BaseEntity):
    """
    User feedback with screenshot and annotations.
    Captures user-submitted issues, suggestions, or comments with visual context.
    
    Features:
    - Screenshot of page at moment of feedback (without feedback modal)
    - Yellow marker annotations for highlighting areas
    - Comment with 500 character limit
    - Full audit trail with user identification
    """
    
    # User identification
    user_id: UUID
    
    # Feedback content
    feedback_type: FeedbackType = FeedbackType.UI_FEEDBACK
    severity: FeedbackSeverity = FeedbackSeverity.MEDIUM
    description: str = Field(..., max_length=500)
    
    # Page context
    page_url: str
    page_title: Optional[str] = None
    entity_type: Optional[str] = None  # e.g., 'proposal', 'funding', 'crm'
    entity_id: Optional[UUID] = None
    
    # Screenshot and annotations
    screenshot_url: Optional[str] = None  # MinIO presigned URL for original screenshot
    annotation_image_url: Optional[str] = None  # MinIO presigned URL for annotated PNG
    annotation_data: Optional[Dict[str, Any]] = None  # JSON strokes for traceability
    
    # Browser/device context
    user_agent: Optional[str] = None
    screen_width: Optional[int] = None
    screen_height: Optional[int] = None
    
    # Status and workflow
    status: FeedbackStatus = FeedbackStatus.OPEN
    
    # Admin response
    response: Optional[str] = None
    responded_by: Optional[UUID] = None
    responded_at: Optional[datetime] = None
    
    # Resolution
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    
    @field_validator('description')
    @classmethod
    def validate_description_length(cls, v: Optional[str]) -> Optional[str]:
        """Ensure description does not exceed 500 characters."""
        if v and len(v) > 500:
            raise ValueError('Description must not exceed 500 characters')
        return v
    
    def respond(self, response: str, responder_id: UUID) -> None:
        """Add admin response to feedback."""
        self.response = response
        self.responded_by = responder_id
        self.responded_at = datetime.utcnow()
        self.status = FeedbackStatus.ACKNOWLEDGED
        self.updated_by = responder_id
        self.updated_at = datetime.utcnow()
    
    def resolve(self, resolution_notes: Optional[str], resolver_id: UUID) -> None:
        """Mark feedback as resolved."""
        self.status = FeedbackStatus.RESOLVED
        self.resolution_notes = resolution_notes
        self.resolved_at = datetime.utcnow()
        self.updated_by = resolver_id
        self.updated_at = datetime.utcnow()
    
    def update_status(self, new_status: FeedbackStatus, user_id: UUID) -> None:
        """Update feedback status."""
        self.status = new_status
        self.updated_by = user_id
        self.updated_at = datetime.utcnow()
        
        if new_status == FeedbackStatus.RESOLVED:
            self.resolved_at = datetime.utcnow()


class FeedbackCreate(BaseEntity):
    """DTO for creating new feedback."""
    id: Optional[UUID] = None
    tenant_id: Optional[UUID] = None
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    
    feedback_type: FeedbackType = FeedbackType.UI_FEEDBACK
    severity: FeedbackSeverity = FeedbackSeverity.MEDIUM
    description: str = Field(..., max_length=500)
    
    page_url: str
    page_title: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    
    # Screenshot data (base64 or URL)
    screenshot_base64: Optional[str] = None
    annotation_image_base64: Optional[str] = None
    annotation_data: Optional[Dict[str, Any]] = None
    
    user_agent: Optional[str] = None
    screen_width: Optional[int] = None
    screen_height: Optional[int] = None
    
    class Config:
        from_attributes = True


class FeedbackResponse(BaseEntity):
    """DTO for admin response to feedback."""
    id: Optional[UUID] = None
    tenant_id: Optional[UUID] = None
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    
    response: str = Field(..., max_length=2000)
    
    class Config:
        from_attributes = True


class FeedbackStatistics(BaseEntity):
    """Aggregated feedback statistics for dashboard."""
    id: Optional[UUID] = None
    tenant_id: Optional[UUID] = None
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    
    total_feedbacks: int = 0
    open_feedbacks: int = 0
    in_progress_feedbacks: int = 0
    resolved_feedbacks: int = 0
    
    by_type: Dict[str, int] = Field(default_factory=dict)
    by_severity: Dict[str, int] = Field(default_factory=dict)
    
    avg_resolution_time_hours: Optional[float] = None
    
    class Config:
        from_attributes = True
