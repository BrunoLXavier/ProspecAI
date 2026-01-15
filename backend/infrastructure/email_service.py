# Email Service
# Infrastructure Layer - Async email sending with template support
# Implements RF-01: Email verification and notifications

import os
from typing import Optional, Dict, Any, List
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import aiosmtplib
from jinja2 import Template
from pydantic import BaseModel, Field

from domain.entities.system_config import EmailConfig, EmailTemplates
from infrastructure.encryption_service import EncryptionService

logger = logging.getLogger(__name__)


class EmailMessage(BaseModel):
    """Email message structure."""
    to: List[str]
    subject: str
    body_html: str
    body_text: Optional[str] = None
    reply_to: Optional[str] = None


class EmailResult(BaseModel):
    """Result of email sending operation."""
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None
    used_fallback: bool = False


class EmailService:
    """
    Async email service with SMTP support.
    
    Features:
    - Template-based email rendering
    - Primary and fallback SMTP support
    - Encrypted credential storage
    - Jinja2 template rendering
    """
    
    def __init__(
        self,
        config: Optional[EmailConfig] = None,
        templates: Optional[EmailTemplates] = None,
        encryption_service: Optional[EncryptionService] = None
    ):
        self.config = config or EmailConfig()
        self.templates = templates or EmailTemplates()
        self.encryption = encryption_service or EncryptionService()
    
    def update_config(self, config: EmailConfig) -> None:
        """Update email configuration."""
        self.config = config
    
    def update_templates(self, templates: EmailTemplates) -> None:
        """Update email templates."""
        self.templates = templates
    
    def _render_template(self, template_str: str, context: Dict[str, Any]) -> str:
        """Render a Jinja2 template string."""
        template = Template(template_str)
        return template.render(**context)
    
    async def _send_via_smtp(
        self,
        message: EmailMessage,
        host: str,
        port: int,
        username: str,
        password: str,
        use_tls: bool = True
    ) -> EmailResult:
        """Send email via SMTP server."""
        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = message.subject
            msg["From"] = self.config.from_email
            msg["To"] = ", ".join(message.to)
            
            if message.reply_to:
                msg["Reply-To"] = message.reply_to
            
            # Add text body if provided
            if message.body_text:
                text_part = MIMEText(message.body_text, "plain", "utf-8")
                msg.attach(text_part)
            
            # Add HTML body
            html_part = MIMEText(message.body_html, "html", "utf-8")
            msg.attach(html_part)
            
            # Decrypt password if encrypted
            decrypted_password = password
            if password.startswith("gAAAAA"):  # Fernet encrypted
                decrypted_password = self.encryption.decrypt(password)
            
            # Send via SMTP
            async with aiosmtplib.SMTP(
                hostname=host,
                port=port,
                use_tls=use_tls
            ) as smtp:
                if username and decrypted_password:
                    await smtp.login(username, decrypted_password)
                
                response = await smtp.send_message(msg)
                
                logger.info(f"Email sent to {message.to}: {message.subject}")
                return EmailResult(
                    success=True,
                    message_id=response[0] if response else None
                )
        
        except aiosmtplib.SMTPException as e:
            logger.error(f"SMTP error sending email: {e}")
            return EmailResult(success=False, error=str(e))
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return EmailResult(success=False, error=str(e))
    
    async def send(self, message: EmailMessage) -> EmailResult:
        """
        Send an email, with fallback support.
        
        Tries primary SMTP first, then fallback if configured.
        
        Args:
            message: Email message to send
            
        Returns:
            EmailResult with success status
        """
        if not self.config.smtp_host:
            # Use MailHog defaults for development
            host = os.environ.get("SMTP_HOST", "mailhog")
            port = int(os.environ.get("SMTP_PORT", "1025"))
            use_tls = False
            username = ""
            password = ""
        else:
            host = self.config.smtp_host
            port = self.config.smtp_port
            use_tls = self.config.smtp_use_tls
            username = self.config.smtp_username or ""
            password = self.config.smtp_password or ""
        
        # Try primary SMTP
        result = await self._send_via_smtp(
            message, host, port, username, password, use_tls
        )
        
        # Try fallback if primary failed and fallback is configured
        if not result.success and self.config.smtp_fallback_host:
            logger.info("Primary SMTP failed, trying fallback")
            
            result = await self._send_via_smtp(
                message,
                self.config.smtp_fallback_host,
                self.config.smtp_fallback_port or 587,
                self.config.smtp_fallback_username or "",
                self.config.smtp_fallback_password or "",
                True
            )
            result.used_fallback = True
        
        return result
    
    async def send_verification_email(
        self,
        to_email: str,
        username: str,
        verification_link: str
    ) -> EmailResult:
        """
        Send email verification email.
        
        Args:
            to_email: Recipient email
            username: User's display name
            verification_link: Link with verification token
            
        Returns:
            EmailResult
        """
        context = {
            "username": username,
            "verification_link": verification_link,
            "app_name": self.config.app_name,
            "support_email": self.config.support_email
        }
        
        # Templates stored in EmailTemplates.templates mapping
        body_html = self._render_template(
            self.templates.templates.get('email_verification').body_html,
            context
        )
        
        message = EmailMessage(
            to=[to_email],
            subject=f"Verifique seu email - {self.config.app_name}",
            body_html=body_html
        )
        
        return await self.send(message)
    
    async def send_password_reset_email(
        self,
        to_email: str,
        username: str,
        reset_link: str
    ) -> EmailResult:
        """
        Send password reset email.
        
        Args:
            to_email: Recipient email
            username: User's display name
            reset_link: Link with reset token
            
        Returns:
            EmailResult
        """
        context = {
            "username": username,
            "reset_link": reset_link,
            "app_name": self.config.app_name,
            "support_email": self.config.support_email,
            "expiration_hours": 8  # Default, can be made configurable
        }
        
        body_html = self._render_template(
            self.templates.templates.get('password_reset').body_html,
            context
        )
        
        message = EmailMessage(
            to=[to_email],
            subject=f"Redefinição de senha - {self.config.app_name}",
            body_html=body_html
        )
        
        return await self.send(message)
    
    async def send_contact_notification(
        self,
        admin_email: str,
        contact_data: Dict[str, Any]
    ) -> EmailResult:
        """
        Send contact form notification to admin.
        
        Args:
            admin_email: Admin email to notify
            contact_data: Form submission data
            
        Returns:
            EmailResult
        """
        context = {
            "contact_data": contact_data,
            "app_name": self.config.app_name,
            "timestamp": contact_data.get("submitted_at", "N/A")
        }
        
        body_html = self._render_template(
            self.templates.templates.get('contact_request').body_html,
            context
        )
        
        message = EmailMessage(
            to=[admin_email],
            subject=f"Nova solicitação de contato - {self.config.app_name}",
            body_html=body_html,
            reply_to=contact_data.get("email")
        )
        
        return await self.send(message)
    
    async def send_welcome_email(
        self,
        to_email: str,
        username: str
    ) -> EmailResult:
        """
        Send welcome email after verification.
        
        Args:
            to_email: Recipient email
            username: User's display name
            
        Returns:
            EmailResult
        """
        context = {
            "username": username,
            "app_name": self.config.app_name,
            "login_url": self.config.app_url,
            "support_email": self.config.support_email
        }
        
        body_html = self._render_template(
            self.templates.templates.get('welcome').body_html,
            context
        )
        
        message = EmailMessage(
            to=[to_email],
            subject=f"Bem-vindo ao {self.config.app_name}!",
            body_html=body_html
        )
        
        return await self.send(message)
    
    async def test_connection(self) -> EmailResult:
        """
        Test SMTP connection.
        
        Returns:
            EmailResult indicating if connection works
        """
        try:
            if not self.config.smtp_host:
                host = os.environ.get("SMTP_HOST", "mailhog")
                port = int(os.environ.get("SMTP_PORT", "1025"))
                use_tls = False
            else:
                host = self.config.smtp_host
                port = self.config.smtp_port
                use_tls = self.config.smtp_use_tls
            
            async with aiosmtplib.SMTP(
                hostname=host,
                port=port,
                use_tls=use_tls,
                timeout=10
            ) as smtp:
                # Just connect and disconnect
                pass
            
            return EmailResult(success=True)
        except Exception as e:
            logger.error(f"SMTP connection test failed: {e}")
            return EmailResult(success=False, error=str(e))


# Singleton instance
_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """Get singleton email service instance."""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
