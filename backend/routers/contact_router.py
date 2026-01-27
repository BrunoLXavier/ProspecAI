# Contact Form Router
# Adapters Layer - FastAPI endpoints for contact form
# Implements RF-01: Request access functionality

from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from uuid import UUID, uuid4
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func

from adapters.database.connection import get_session
from adapters.database.models import LoginAttemptModel  # Reuse for rate limiting
from adapters.repositories.system_config_repository import SystemConfigRepository
from adapters.api.auth_middleware import get_client_ip
from services.core.email_service import EmailService, get_email_service
from domain.entities.system_config import ContactFormConfig, FormField

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/contact", tags=["Contact"])


class ContactFormData(BaseModel):
    """Contact form submission data."""
    email: EmailStr
    name: str = Field(min_length=2, max_length=100)
    company: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)
    message: str = Field(min_length=10, max_length=2000)
    fields: Optional[Dict[str, Any]] = Field(default=None)  # Dynamic fields


class ContactFormResponse(BaseModel):
    """Contact form response."""
    success: bool
    message: str
    reference_id: Optional[str] = None


class ContactRateLimiter:
    """
    Rate limiter for contact form submissions.
    
    Limits by email address, not IP (as specified).
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def check_rate_limit(
        self,
        email: str,
        max_requests: int = 3,
        window_minutes: int = 60
    ) -> tuple[bool, int]:
        """
        Check if email is rate limited.
        
        Args:
            email: Email to check
            max_requests: Maximum requests in window
            window_minutes: Time window in minutes
            
        Returns:
            Tuple of (is_allowed, requests_made)
        """
        since = datetime.utcnow() - timedelta(minutes=window_minutes)
        
        # Count requests from this email
        # Using LoginAttemptModel with a different pattern (success=True for contact)
        query = select(func.count(LoginAttemptModel.id)).where(
            and_(
                LoginAttemptModel.email == email.lower().strip(),
                LoginAttemptModel.success == True,  # True = contact form (not login attempt)
                        LoginAttemptModel.timestamp >= since
            )
        )
        
        result = await self.session.execute(query)
        count = result.scalar_one()
        
        return count < max_requests, count
    
    async def record_request(self, email: str, ip_address: str) -> None:
        """Record a contact form submission."""
        model = LoginAttemptModel(
            id=uuid4(),
            email=email.lower().strip(),
            ip_address=ip_address,
            success=True  # Using True to differentiate from login attempts
        )
        self.session.add(model)
        await self.session.flush()


def validate_dynamic_fields(
    submitted_fields: Dict[str, Any],
    config_fields: list[FormField]
) -> tuple[bool, Optional[str]]:
    """
    Validate submitted fields against configuration.
    
    Args:
        submitted_fields: Fields submitted in form
        config_fields: Field configuration from admin
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    for field in config_fields:
        if field.required and field.name not in submitted_fields:
            return False, f"Required field missing: {field.label}"
        
        if field.name in submitted_fields:
            value = submitted_fields[field.name]
            
            # Type validation
            if field.type == "email" and value:
                import re
                if not re.match(r"[^@]+@[^@]+\.[^@]+", value):
                    return False, f"Invalid email in field: {field.label}"
            
            elif field.type == "number" and value:
                try:
                    float(value)
                except (TypeError, ValueError):
                    return False, f"Invalid number in field: {field.label}"
    
    return True, None


@router.get(
    "/config",
    summary="Get contact form configuration",
    description="Get dynamic form field configuration for contact form."
)
async def get_contact_config(
    session: AsyncSession = Depends(get_session)
):
    """
    Get contact form configuration.
    
    Returns field definitions for dynamic form rendering.
    """
    config_repo = SystemConfigRepository(session)
    config = await config_repo.get_contact_form_config()
    
    return {
        "enabled": config.enabled,
        "fields": [field.model_dump() for field in config.fields],
            "rate_limit_requests": config.max_requests_per_period,
            "rate_limit_window_minutes": config.rate_limit_per_email_minutes
    }


@router.post(
    "/submit",
    response_model=ContactFormResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit contact form",
    description="Submit a contact/request access form."
)
async def submit_contact(
    request: Request,
    data: ContactFormData,
    session: AsyncSession = Depends(get_session)
):
    """
    Submit contact form.
                LoginAttemptModel.timestamp >= since
    - Rate limited by email address
    - Validates dynamic fields from config
    - Sends notification to admin
    """
    config_repo = SystemConfigRepository(session)
    config = await config_repo.get_contact_form_config()
    
    # Check if contact form is enabled
    if not config.enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Contact form is currently disabled"
        )
    
    # Check rate limit
    rate_limiter = ContactRateLimiter(session)
    is_allowed, requests_made = await rate_limiter.check_rate_limit(
        data.email,
        max_requests=config.rate_limit_requests,
        window_minutes=config.rate_limit_window_minutes
    )
    
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {config.rate_limit_requests} requests per {config.rate_limit_window_minutes} minutes.",
            headers={"Retry-After": str(config.rate_limit_window_minutes * 60)}
        )
    
    # Validate dynamic fields
    if data.fields and config.fields:
        is_valid, error = validate_dynamic_fields(data.fields, config.fields)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
    
    # Generate reference ID
    reference_id = str(uuid4())[:8].upper()
    
    # Prepare notification data
    contact_data = {
        "reference_id": reference_id,
        "email": data.email,
        "name": data.name,
        "company": data.company,
        "phone": data.phone,
        "message": data.message,
        "additional_fields": data.fields or {},
        "submitted_at": datetime.utcnow().isoformat(),
        "ip_address": get_client_ip(request)
    }
    
    # Get email config
    email_config = await config_repo.get_email_config()
    admin_email = config.admin_notification_email or email_config.support_email
    
    if admin_email:
        # Send notification to admin
        email_service = get_email_service()
        
        # Update email service with current config
        templates = await config_repo.get_email_templates()
        email_service.update_config(email_config)
        email_service.update_templates(templates)
        
        result = await email_service.send_contact_notification(
            admin_email=admin_email,
            contact_data=contact_data
        )
        
        if not result.success:
            logger.error(f"Failed to send contact notification: {result.error}")
            # Don't fail the request, just log
    
    # Record for rate limiting
    await rate_limiter.record_request(data.email, get_client_ip(request))
    
    await session.commit()
    
    logger.info(f"Contact form submitted: {reference_id} from {data.email}")
    
    return ContactFormResponse(
        success=True,
        message="Your message has been received. We will contact you soon.",
        reference_id=reference_id
    )


@router.get(
    "/rate-limit-status",
    summary="Check rate limit status",
    description="Check remaining contact form submissions."
)
async def check_rate_limit(
    email: EmailStr,
    session: AsyncSession = Depends(get_session)
):
    """
    Check rate limit status for an email.
    
    Returns remaining submissions.
    """
    config_repo = SystemConfigRepository(session)
    config = await config_repo.get_contact_form_config()
    
    rate_limiter = ContactRateLimiter(session)
    is_allowed, requests_made = await rate_limiter.check_rate_limit(
        email,
        max_requests=config.rate_limit_requests,
        window_minutes=config.rate_limit_window_minutes
    )
    
    remaining = max(0, config.rate_limit_requests - requests_made)
    
    return {
        "email": email,
        "remaining_requests": remaining,
        "max_requests": config.rate_limit_requests,
        "window_minutes": config.rate_limit_window_minutes,
        "is_allowed": is_allowed
    }
