# Contact Schemas
# Domain Layer - Request/Response schemas for Contact Form API
# Implements RF-01: Request access functionality
# Extracted from routers/contact_router.py — Phase 9A

from domain.schemas._base import *
from pydantic import EmailStr


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
