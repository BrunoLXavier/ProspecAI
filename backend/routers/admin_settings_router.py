# Admin Settings Router
# Adapters Layer - FastAPI endpoints for system configuration
# Implements RF-09: Admin-configurable settings

from typing import Optional, Dict, Any
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from adapters.database.connection import get_session
from adapters.repositories.system_config_repository import SystemConfigRepository
from adapters.api.auth_middleware import require_admin, AuthenticatedUser
from domain.entities.system_config import (
    EmailConfig, SecurityConfig, ContactFormConfig, EmailTemplates, FormField
)
from infrastructure.email_service import get_email_service
from infrastructure.encryption_service import EncryptionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin/settings", tags=["Admin Settings"])


# ============================================================================
# Request/Response Models
# ============================================================================

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
    password_require_numbers: Optional[bool] = None
    password_require_special: Optional[bool] = None
    password_reset_expiry_hours: Optional[int] = Field(default=None, ge=1, le=72)
    email_verification_expiry_hours: Optional[int] = Field(default=None, ge=1, le=168)
    session_timeout_minutes: Optional[int] = Field(default=None, ge=5, le=1440)
    refresh_token_expire_days: Optional[int] = Field(default=None, ge=1, le=90)


class ContactFormConfigUpdate(BaseModel):
    """Contact form configuration update request."""
    enabled: Optional[bool] = None
    admin_notification_email: Optional[str] = None
    rate_limit_requests: Optional[int] = Field(default=None, ge=1, le=100)
    rate_limit_window_minutes: Optional[int] = Field(default=None, ge=1, le=1440)
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


# ============================================================================
# Email Configuration
# ============================================================================

@router.get(
    "/email",
    summary="Get email configuration",
    description="Get current email/SMTP configuration."
)
async def get_email_config(
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """
    Get email configuration.
    
    Password is masked for security.
    """
    config_repo = SystemConfigRepository(session)
    config = await config_repo.get_email_config(user.tenant_id)
    
    # Mask passwords
    result = config.model_dump()
    if result.get("smtp_password"):
        result["smtp_password"] = "********"
    if result.get("smtp_fallback_password"):
        result["smtp_fallback_password"] = "********"
    
    return result


@router.put(
    "/email",
    summary="Update email configuration",
    description="Update email/SMTP configuration."
)
async def update_email_config(
    data: EmailConfigUpdate,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """
    Update email configuration.
    
    Passwords are encrypted before storage.
    """
    config_repo = SystemConfigRepository(session)
    encryption = EncryptionService()
    
    # Get current config
    current = await config_repo.get_email_config(user.tenant_id)
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    
    # Encrypt passwords if provided
    if "smtp_password" in update_data and update_data["smtp_password"]:
        update_data["smtp_password"] = encryption.encrypt(update_data["smtp_password"])
    elif "smtp_password" in update_data:
        # Keep existing if not updating
        update_data["smtp_password"] = current.smtp_password
    
    if "smtp_fallback_password" in update_data and update_data["smtp_fallback_password"]:
        update_data["smtp_fallback_password"] = encryption.encrypt(
            update_data["smtp_fallback_password"]
        )
    elif "smtp_fallback_password" in update_data:
        update_data["smtp_fallback_password"] = current.smtp_fallback_password
    
    # Merge with current
    current_data = current.model_dump()
    current_data.update(update_data)
    
    new_config = EmailConfig(**current_data)
    await config_repo.save_email_config(new_config, user.tenant_id, user.user_id)
    
    await session.commit()
    
    logger.info(f"Email config updated by user: {user.user_id}")
    
    return {"message": "Email configuration updated"}


@router.post(
    "/email/test",
    summary="Test email configuration",
    description="Send a test email to verify SMTP configuration."
)
async def test_email_config(
    data: TestEmailRequest,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """
    Send test email.
    
    Verifies SMTP configuration works.
    """
    config_repo = SystemConfigRepository(session)
    config = await config_repo.get_email_config(user.tenant_id)
    templates = await config_repo.get_email_templates(user.tenant_id)
    
    email_service = get_email_service()
    email_service.update_config(config)
    email_service.update_templates(templates)
    
    # Test connection first
    connection_result = await email_service.test_connection()
    if not connection_result.success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"SMTP connection failed: {connection_result.error}"
        )
    
    # Send test email
    from infrastructure.email_service import EmailMessage
    
    test_message = EmailMessage(
        to=[data.to_email],
        subject=f"Test Email - {config.app_name}",
        body_html=f"""
        <html>
        <body>
            <h1>Test Email</h1>
            <p>This is a test email from {config.app_name}.</p>
            <p>If you received this, your SMTP configuration is working correctly.</p>
            <p>Sent at: {__import__('datetime').datetime.utcnow().isoformat()}</p>
        </body>
        </html>
        """
    )
    
    result = await email_service.send(test_message)
    
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to send test email: {result.error}"
        )
    
    return {
        "message": f"Test email sent to {data.to_email}",
        "used_fallback": result.used_fallback
    }


# ============================================================================
# Security Configuration
# ============================================================================

@router.get(
    "/security",
    summary="Get security configuration",
    description="Get current security settings."
)
async def get_security_config(
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """Get security configuration."""
    config_repo = SystemConfigRepository(session)
    config = await config_repo.get_security_config(user.tenant_id)
    return config.model_dump()


@router.put(
    "/security",
    summary="Update security configuration",
    description="Update security settings."
)
async def update_security_config(
    data: SecurityConfigUpdate,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """Update security configuration."""
    config_repo = SystemConfigRepository(session)
    
    # Get current config
    current = await config_repo.get_security_config(user.tenant_id)
    
    # Update fields
    current_data = current.model_dump()
    update_data = data.model_dump(exclude_unset=True)
    current_data.update(update_data)
    
    new_config = SecurityConfig(**current_data)
    await config_repo.save_security_config(new_config, user.tenant_id, user.user_id)
    
    await session.commit()
    
    logger.info(f"Security config updated by user: {user.user_id}")
    
    return {"message": "Security configuration updated"}


# ============================================================================
# Contact Form Configuration
# ============================================================================

@router.get(
    "/contact-form",
    summary="Get contact form configuration",
    description="Get current contact form settings."
)
async def get_contact_form_config(
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """Get contact form configuration."""
    config_repo = SystemConfigRepository(session)
    config = await config_repo.get_contact_form_config(user.tenant_id)
    return config.model_dump()


@router.put(
    "/contact-form",
    summary="Update contact form configuration",
    description="Update contact form settings and custom fields."
)
async def update_contact_form_config(
    data: ContactFormConfigUpdate,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """
    Update contact form configuration.
    
    Supports custom field definitions.
    """
    config_repo = SystemConfigRepository(session)
    
    # Get current config
    current = await config_repo.get_contact_form_config(user.tenant_id)
    
    # Update fields
    current_data = current.model_dump()
    update_data = data.model_dump(exclude_unset=True)
    
    # Convert field dicts to FormField objects
    if "fields" in update_data and update_data["fields"]:
        update_data["fields"] = [
            FormField(**f) if isinstance(f, dict) else f
            for f in update_data["fields"]
        ]
    
    current_data.update(update_data)
    
    new_config = ContactFormConfig(**current_data)
    await config_repo.save_contact_form_config(new_config, user.tenant_id, user.user_id)
    
    await session.commit()
    
    logger.info(f"Contact form config updated by user: {user.user_id}")
    
    return {"message": "Contact form configuration updated"}


# ============================================================================
# Email Templates
# ============================================================================

@router.get(
    "/email-templates",
    summary="Get email templates",
    description="Get current email templates."
)
async def get_email_templates(
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """Get email templates."""
    config_repo = SystemConfigRepository(session)
    templates = await config_repo.get_email_templates(user.tenant_id)
    return templates.model_dump()


@router.put(
    "/email-templates",
    summary="Update email templates",
    description="Update email templates (Jinja2 format)."
)
async def update_email_templates(
    data: EmailTemplatesUpdate,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """
    Update email templates.
    
    Templates use Jinja2 syntax.
    """
    config_repo = SystemConfigRepository(session)
    
    # Get current templates
    current = await config_repo.get_email_templates(user.tenant_id)
    
    # Update fields
    current_data = current.model_dump()
    update_data = data.model_dump(exclude_unset=True)
    current_data.update(update_data)
    
    new_templates = EmailTemplates(**current_data)
    await config_repo.save_email_templates(new_templates, user.tenant_id, user.user_id)
    
    await session.commit()
    
    logger.info(f"Email templates updated by user: {user.user_id}")
    
    return {"message": "Email templates updated"}


@router.post(
    "/email-templates/preview",
    summary="Preview email template",
    description="Render email template with sample data."
)
async def preview_email_template(
    template_name: str,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """
    Preview email template.
    
    Renders template with sample data for testing.
    """
    config_repo = SystemConfigRepository(session)
    templates = await config_repo.get_email_templates(user.tenant_id)
    email_config = await config_repo.get_email_config(user.tenant_id)
    
    # Get template
    template_map = {
        "verification": templates.verification_email,
        "password_reset": templates.password_reset_email,
        "welcome": templates.welcome_email,
        "contact_notification": templates.contact_notification_email
    }
    
    if template_name not in template_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid template name. Valid: {list(template_map.keys())}"
        )
    
    template_str = template_map[template_name]
    
    # Sample data
    sample_data = {
        "username": "João Silva",
        "verification_link": "https://example.com/verify?token=abc123",
        "reset_link": "https://example.com/reset?token=xyz789",
        "app_name": email_config.app_name,
        "support_email": email_config.support_email,
        "expiration_hours": 8,
        "login_url": email_config.app_url,
        "contact_data": {
            "reference_id": "ABC12345",
            "email": "cliente@empresa.com",
            "name": "Maria Santos",
            "company": "Empresa LTDA",
            "phone": "(11) 99999-9999",
            "message": "Gostaria de solicitar acesso ao sistema para minha equipe.",
            "submitted_at": "2024-01-15T10:30:00"
        },
        "timestamp": "2024-01-15T10:30:00"
    }
    
    # Render template
    from jinja2 import Template
    try:
        template = Template(template_str)
        rendered = template.render(**sample_data)
        return {
            "template_name": template_name,
            "rendered_html": rendered
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template rendering error: {str(e)}"
        )


# ============================================================================
# Utility Endpoints
# ============================================================================

@router.get(
    "/all",
    summary="Get all configurations",
    description="Get all system configurations at once."
)
async def get_all_configs(
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """Get all configurations."""
    config_repo = SystemConfigRepository(session)
    configs = await config_repo.get_all_configs(user.tenant_id)
    
    # Mask passwords
    if configs.get("email", {}).get("smtp_password"):
        configs["email"]["smtp_password"] = "********"
    if configs.get("email", {}).get("smtp_fallback_password"):
        configs["email"]["smtp_fallback_password"] = "********"
    
    return configs


@router.post(
    "/reset/{config_key}",
    summary="Reset configuration to defaults",
    description="Reset a specific configuration to default values."
)
async def reset_config(
    config_key: str,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """
    Reset configuration to defaults.
    
    Valid keys: email, security, contact_form, email_templates
    """
    valid_keys = ["email", "security", "contact_form", "email_templates"]
    
    if config_key not in valid_keys:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid config key. Valid: {valid_keys}"
        )
    
    config_repo = SystemConfigRepository(session)
    await config_repo.reset_to_defaults(config_key, user.tenant_id, user.user_id)
    
    await session.commit()
    
    logger.info(f"Config {config_key} reset to defaults by user: {user.user_id}")
    
    return {"message": f"{config_key} configuration reset to defaults"}
