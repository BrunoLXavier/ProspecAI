# Admin Settings Schemas
# Domain Layer - Request/Response schemas for Admin Settings API
# Implements RF-09: Admin-configurable settings
# Extracted from routers/admin_settings_router.py — Phase 9A

from domain.schemas._base import *


class EmailConfigUpdate(BaseModel):
    """Email configuration update request."""
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None  # Will be encrypted
    smtp_use_tls: Optional[bool] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    app_name: Optional[str] = None
    app_url: Optional[str] = None
    support_email: Optional[str] = None
    smtp_fallback_host: Optional[str] = None
    smtp_fallback_port: Optional[int] = None
    smtp_fallback_username: Optional[str] = None
    smtp_fallback_password: Optional[str] = None  # Will be encrypted


class SecurityConfigUpdate(BaseModel):
    """Security configuration update request."""
    max_login_attempts: Optional[int] = Field(default=None, ge=1, le=20)
    lockout_duration_minutes: Optional[int] = Field(default=None, ge=1, le=1440)
    password_min_length: Optional[int] = Field(default=None, ge=6, le=32)
    password_require_uppercase: Optional[bool] = None
    password_require_lowercase: Optional[bool] = None
    password_require_number: Optional[bool] = None
    password_require_special_char: Optional[bool] = None
    password_reset_expiry_hours: Optional[int] = Field(default=None, ge=1, le=72)
    email_verification_expiry_hours: Optional[int] = Field(default=None, ge=1, le=168)
    session_timeout_minutes: Optional[int] = Field(default=None, ge=5, le=1440)
    refresh_token_expire_days: Optional[int] = Field(default=None, ge=1, le=90)


class ContactFormConfigUpdate(BaseModel):
    """Contact form configuration update request."""
    enabled: Optional[bool] = None
    recipients: Optional[list[str]] = None
    max_requests_per_period: Optional[int] = Field(default=None, ge=1, le=100)
    rate_limit_per_email_minutes: Optional[int] = Field(default=None, ge=1, le=1440)
    fields: Optional[list[Dict[str, Any]]] = None  # Custom fields


class EmailTemplatesUpdate(BaseModel):
    """Email templates update request."""
    verification_email: Optional[str] = None
    password_reset_email: Optional[str] = None
    welcome_email: Optional[str] = None
    contact_notification_email: Optional[str] = None


class TestEmailRequest(BaseModel):
    """Request to send test email."""
    to_email: str
