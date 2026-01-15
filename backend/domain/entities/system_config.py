# System Configuration Entities
# Domain Layer - Email, Security, and Contact Form Configuration
# Implements RNF-02: Configurable system settings with admin access

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, EmailStr
from enum import Enum


class EmailConfig(BaseModel):
    """
    SMTP Email configuration for sending system emails.
    
    Credentials are stored encrypted in the database.
    """
    
    smtp_host: str = "localhost"
    smtp_port: int = 1025  # Default to MailHog port for dev
    smtp_username: Optional[str] = None
    encrypted_smtp_password: Optional[str] = None  # Encrypted with EncryptionService
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = True
    smtp_fallback_host: Optional[str] = None
    smtp_fallback_port: Optional[int] = None
    smtp_fallback_username: Optional[str] = None
    smtp_fallback_password: Optional[str] = None
    from_email: str = "noreply@prospecai.local"
    from_name: str = "ProspecAI"
    use_tls: bool = True
    use_ssl: bool = False
    
    # Fallback SMTP configuration
    fallback_enabled: bool = False
    fallback_smtp_host: Optional[str] = None
    fallback_smtp_port: Optional[int] = None
    fallback_smtp_username: Optional[str] = None
    fallback_encrypted_smtp_password: Optional[str] = None

    # App metadata for templates
    app_name: str = "ProspecAI"
    support_email: str = "support@prospecai.local"
    app_url: str = "http://localhost:3000"


class SecurityConfig(BaseModel):
    """
    Security configuration for authentication and rate limiting.
    
    All values are configurable via admin settings.
    """
    
    # Rate limiting for login attempts
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 15
    
    # Password reset token expiration
    password_reset_expiration_hours: int = 8
    
    # Email verification token expiration
    email_verification_expiration_hours: int = 24
    
    # Password strength requirements
    password_min_length: int = 8
    password_require_uppercase: bool = True
    password_require_lowercase: bool = True
    password_require_number: bool = True
    password_require_special_char: bool = True
    
    # Session settings
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7


class FormFieldType(str, Enum):
    """Types of form fields for contact form."""
    TEXT = "text"
    EMAIL = "email"
    TEXTAREA = "textarea"
    SELECT = "select"
    CHECKBOX = "checkbox"


class FormField(BaseModel):
    """Definition of a single form field."""
    
    name: str
    field_type: FormFieldType
    required: bool = True
    placeholder_key: Optional[str] = None  # i18n key for placeholder
    label_key: Optional[str] = None  # i18n key for label
    options: Optional[List[str]] = None  # For select fields
    min_length: Optional[int] = None
    max_length: Optional[int] = None


class ContactFormConfig(BaseModel):
    """
    Configuration for the contact/request access form.
    
    Fields are dynamically configurable by admin.
    """
    
    enabled: bool = True
    
    # Form fields (configurable by admin)
    fields: List[FormField] = Field(default_factory=lambda: [
        FormField(
            name="name",
            field_type=FormFieldType.TEXT,
            required=True,
            label_key="contact.fields.name",
            placeholder_key="contact.placeholders.name"
        ),
        FormField(
            name="email",
            field_type=FormFieldType.EMAIL,
            required=True,
            label_key="contact.fields.email",
            placeholder_key="contact.placeholders.email"
        ),
        FormField(
            name="reason",
            field_type=FormFieldType.TEXTAREA,
            required=True,
            label_key="contact.fields.reason",
            placeholder_key="contact.placeholders.reason",
            min_length=10,
            max_length=1000
        )
    ])
    
    # Recipients for contact form notifications
    recipients: List[EmailStr] = Field(default_factory=list)
    
    # Email template key for reply
    reply_template_key: str = "contact_request"
    
    # Rate limiting per email (not per IP as per user request)
    rate_limit_per_email_minutes: int = 5
    max_requests_per_period: int = 1


class EmailTemplateType(str, Enum):
    """Types of email templates."""
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"
    CONTACT_REQUEST = "contact_request"
    WELCOME = "welcome"


class EmailTemplate(BaseModel):
    """
    Email template with Jinja2 variables support.
    
    Variables available:
    - {user_name}: User's full name or username
    - {email}: User's email address
    - {verification_link}: Email verification link
    - {reset_link}: Password reset link
    - {form_data}: Contact form data (dict)
    - {organization_name}: Organization/tenant name
    - {expiration_hours}: Token expiration time
    """
    
    subject: str
    body_html: str
    body_text: Optional[str] = None  # Plain text fallback


class EmailTemplates(BaseModel):
    """Collection of email templates."""
    
    templates: Dict[str, EmailTemplate] = Field(default_factory=lambda: {
        EmailTemplateType.EMAIL_VERIFICATION.value: EmailTemplate(
            subject="Verifique seu email - ProspecAI",
            body_html="""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">ProspecAI</h1>
    </div>
    <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #111827;">Olá, {{ user_name }}!</h2>
        <p style="color: #4b5563; line-height: 1.6;">
            Obrigado por se cadastrar no ProspecAI. Para completar seu cadastro, 
            clique no botão abaixo para verificar seu email:
        </p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ verification_link }}" 
               style="background: #e11d48; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold;">
                Verificar Email
            </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
            Este link expira em {{ expiration_hours }} horas.
        </p>
        <p style="color: #6b7280; font-size: 14px;">
            Se você não criou uma conta, ignore este email.
        </p>
    </div>
    <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        © ProspecAI - Sistema Inteligente de Prospecção de P&D
    </div>
</body>
</html>
""",
            body_text="""
Olá, {{ user_name }}!

Obrigado por se cadastrar no ProspecAI. Para completar seu cadastro, 
clique no link abaixo para verificar seu email:

{{ verification_link }}

Este link expira em {{ expiration_hours }} horas.

Se você não criou uma conta, ignore este email.

© ProspecAI - Sistema Inteligente de Prospecção de P&D
"""
        ),
        EmailTemplateType.PASSWORD_RESET.value: EmailTemplate(
            subject="Redefinição de senha - ProspecAI",
            body_html="""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">ProspecAI</h1>
    </div>
    <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #111827;">Redefinição de Senha</h2>
        <p style="color: #4b5563; line-height: 1.6;">
            Recebemos uma solicitação para redefinir a senha da sua conta.
            Clique no botão abaixo para criar uma nova senha:
        </p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ reset_link }}" 
               style="background: #e11d48; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold;">
                Redefinir Senha
            </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
            Este link expira em {{ expiration_hours }} horas.
        </p>
        <p style="color: #6b7280; font-size: 14px;">
            Se você não solicitou a redefinição, ignore este email.
        </p>
    </div>
    <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        © ProspecAI - Sistema Inteligente de Prospecção de P&D
    </div>
</body>
</html>
""",
            body_text="""
Redefinição de Senha

Recebemos uma solicitação para redefinir a senha da sua conta.
Clique no link abaixo para criar uma nova senha:

{{ reset_link }}

Este link expira em {{ expiration_hours }} horas.

Se você não solicitou a redefinição, ignore este email.

© ProspecAI - Sistema Inteligente de Prospecção de P&D
"""
        ),
        EmailTemplateType.CONTACT_REQUEST.value: EmailTemplate(
            subject="Nova solicitação de acesso - ProspecAI",
            body_html="""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">ProspecAI</h1>
    </div>
    <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #111827;">Nova Solicitação de Acesso</h2>
        <p style="color: #4b5563; line-height: 1.6;">
            Uma nova solicitação de acesso foi recebida:
        </p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            {% for key, value in form_data.items() %}
            <p style="margin: 10px 0;"><strong>{{ key }}:</strong> {{ value }}</p>
            {% endfor %}
        </div>
        <p style="color: #6b7280; font-size: 14px;">
            Recebido em: {{ timestamp }}
        </p>
    </div>
    <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        © ProspecAI - Sistema Inteligente de Prospecção de P&D
    </div>
</body>
</html>
""",
            body_text="""
Nova Solicitação de Acesso

Uma nova solicitação de acesso foi recebida:

{% for key, value in form_data.items() %}
{{ key }}: {{ value }}
{% endfor %}

Recebido em: {{ timestamp }}

© ProspecAI - Sistema Inteligente de Prospecção de P&D
"""
        )
    })
    # Backwards-compatible named template attributes expected by EmailService
    verification_email: EmailTemplate = Field(default_factory=lambda: EmailTemplates.templates.fget(None)[EmailTemplateType.EMAIL_VERIFICATION.value] if False else EmailTemplate(
        subject="Verifique seu email - ProspecAI",
        body_html="""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">ProspecAI</h1>
    </div>
    <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #111827;">Olá, {{ user_name }}!</h2>
        <p style="color: #4b5563; line-height: 1.6;">
            Obrigado por se cadastrar no ProspecAI. Para completar seu cadastro, 
            clique no botão abaixo para verificar seu email:
        </p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ verification_link }}" 
               style="background: #e11d48; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold;">
                Verificar Email
            </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
            Este link expira em {{ expiration_hours }} horas.
        </p>
        <p style="color: #6b7280; font-size: 14px;">
            Se você não criou uma conta, ignore este email.
        </p>
    </div>
    <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        © ProspecAI - Sistema Inteligente de Prospecção de P&D
    </div>
</body>
</html>
""",
        body_text="""
Olá, {{ user_name }}!

Obrigado por se cadastrar no ProspecAI. Para completar seu cadastro, 
clique no link abaixo para verificar seu email:

{{ verification_link }}

Este link expira em {{ expiration_hours }} horas.

Se você não criou uma conta, ignore este email.

© ProspecAI - Sistema Inteligente de Prospecção de P&D
"""
    ) )


class SystemConfig(BaseModel):
    """
    Complete system configuration stored per tenant.
    
    Stored in system_config table as JSONB fields.
    """
    
    id: UUID = Field(default_factory=uuid4)
    tenant_id: UUID
    
    email_config: EmailConfig = Field(default_factory=EmailConfig)
    security_config: SecurityConfig = Field(default_factory=SecurityConfig)
    contact_form_config: ContactFormConfig = Field(default_factory=ContactFormConfig)
    email_templates: EmailTemplates = Field(default_factory=EmailTemplates)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        from_attributes = True
