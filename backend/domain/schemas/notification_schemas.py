# Notification Schemas
# Domain Layer - Request/Response schemas for Notifications API
# Implements RF-07: Active notifications
# Extracted from routers/notifications_router.py — Phase 9A

from domain.schemas._base import *


class NotificationCreate(BaseModel):
    """Schema for creating a notification."""
    user_id: UUID
    title: str = Field(..., max_length=300)
    body: str
    notification_type: str = Field(default='info', pattern='^(info|warning|success|error|deadline|matching)$')
    priority: str = Field(default='normal', pattern='^(low|normal|high|urgent)$')
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    action_url: Optional[str] = None
    institute_id: Optional[UUID] = None
    scheduled_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    channels: Optional[List[str]] = Field(default=['in_app'])


class NotificationResponse(BaseModel):
    """Schema for notification response."""
    id: UUID
    user_id: UUID
    title: str
    body: str
    notification_type: str
    priority: str
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    action_url: Optional[str] = None
    institute_id: Optional[UUID] = None
    read: bool
    read_at: Optional[datetime] = None
    dismissed: bool
    dismissed_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    channels: List[str]
    delivery_status: dict
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Schema for paginated notification list."""
    items: List[NotificationResponse]
    total: int
    unread_count: int


class MarkReadRequest(BaseModel):
    """Schema for marking notifications as read."""
    notification_ids: List[UUID]


class NotificationPreferencesUpdate(BaseModel):
    """Schema for updating notification preferences."""
    type_preferences: Optional[dict] = None
    email_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    quiet_hours: Optional[dict] = None
    email_digest_frequency: Optional[str] = Field(default=None, pattern='^(immediate|daily|weekly)$')
    digest_time: Optional[str] = None


class NotificationPreferencesResponse(BaseModel):
    """Schema for notification preferences response."""
    id: UUID
    user_id: UUID
    type_preferences: dict
    email_enabled: bool
    push_enabled: bool
    in_app_enabled: bool
    quiet_hours: Optional[dict] = None
    email_digest_frequency: str
    digest_time: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    """Schema for unread count response."""
    count: int
