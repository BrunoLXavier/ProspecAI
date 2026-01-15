# System Config Repository
# Adapters Layer - Database operations for system settings
# Implements RF-09: Admin-configurable settings

from typing import Optional, Dict, Any
from uuid import UUID, uuid4
import logging
import json

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from adapters.database.models import SystemConfigModel
from domain.entities.system_config import (
    EmailConfig, SecurityConfig, ContactFormConfig, EmailTemplates
)

logger = logging.getLogger(__name__)


class SystemConfigRepository:
    """
    Repository for system configuration management.
    
    Stores all admin-configurable settings in JSONB format.
    Supports tenant-specific and global configurations.
    """
    
    # Configuration keys
    CONFIG_EMAIL = "email"
    CONFIG_SECURITY = "security"
    CONFIG_CONTACT_FORM = "contact_form"
    CONFIG_EMAIL_TEMPLATES = "email_templates"
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def _get_or_create_config(
        self,
        config_key: str,
        tenant_id: Optional[UUID] = None
    ) -> SystemConfigModel:
        """Get existing config model for tenant or None.

        The database model was refactored to store separate JSON columns
        (e.g. `security_config`, `email_config`) instead of a generic
        `config_key`/`config_value` schema. This helper finds the row
        for the given tenant (or returns the first/global row) and
        does not attempt to create a global row when `tenant_id` is None.
        """
        if tenant_id:
            query = select(SystemConfigModel).where(SystemConfigModel.tenant_id == tenant_id)
        else:
            # Global/default config: return first row if present
            query = select(SystemConfigModel)

        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        return model
    
    async def _get_config(
        self,
        config_key: str,
        tenant_id: Optional[UUID] = None
    ) -> Optional[Dict[str, Any]]:
        """Get configuration value by key for the tenant.

        Returns the appropriate JSON field from the `SystemConfigModel`.
        If no model exists for the tenant, returns None (caller should
        apply defaults).
        """
        model = await self._get_or_create_config(config_key, tenant_id)
        if not model:
            return None

        mapping = {
            self.CONFIG_EMAIL: "email_config",
            self.CONFIG_SECURITY: "security_config",
            self.CONFIG_CONTACT_FORM: "contact_form_config",
            self.CONFIG_EMAIL_TEMPLATES: "email_templates"
        }

        field = mapping.get(config_key)
        if not field:
            return None

        return getattr(model, field, None)
    
    async def _save_config(
        self,
        config_key: str,
        config_value: Dict[str, Any],
        tenant_id: Optional[UUID] = None,
        updated_by: Optional[UUID] = None
    ) -> None:
        """Save configuration value."""
        model = await self._get_or_create_config(config_key, tenant_id)
        # If no model exists for this tenant and tenant_id is None, create a tenant-specific
        # row to persist settings. For tenant-specific saves, tenant_id must be provided by caller.
        if not model:
            if tenant_id is None:
                # Do not create a global row implicitly; log and return
                logger.warning(f"No system_config row found for tenant None; not creating global row")
                return
            model = SystemConfigModel(
                id=uuid4(),
                tenant_id=tenant_id,
                email_config={},
                security_config={},
                contact_form_config={},
                email_templates={}
            )
            self.session.add(model)
            await self.session.flush()

        mapping = {
            self.CONFIG_EMAIL: "email_config",
            self.CONFIG_SECURITY: "security_config",
            self.CONFIG_CONTACT_FORM: "contact_form_config",
            self.CONFIG_EMAIL_TEMPLATES: "email_templates"
        }

        field = mapping.get(config_key)
        if not field:
            logger.warning(f"Unknown config key: {config_key}")
            return

        setattr(model, field, config_value)
        model.updated_at = model.updated_at  # touch
        model.updated_at = model.updated_at
        model.updated_at = model.updated_at
        if updated_by is not None:
            # Only set updated_by if provided
            try:
                model.updated_by = updated_by
            except Exception:
                pass
        await self.session.flush()

        logger.info(f"Updated config {config_key} for tenant {tenant_id}")
    
    # Email Configuration
    async def get_email_config(
        self,
        tenant_id: Optional[UUID] = None
    ) -> EmailConfig:
        """Get email configuration."""
        data = await self._get_config(self.CONFIG_EMAIL, tenant_id)
        
        if data:
            return EmailConfig(**data)
        return EmailConfig()  # Return defaults
    
    async def save_email_config(
        self,
        config: EmailConfig,
        tenant_id: Optional[UUID] = None,
        updated_by: Optional[UUID] = None
    ) -> None:
        """Save email configuration."""
        await self._save_config(
            self.CONFIG_EMAIL,
            config.model_dump(),
            tenant_id,
            updated_by
        )
    
    # Security Configuration
    async def get_security_config(
        self,
        tenant_id: Optional[UUID] = None
    ) -> SecurityConfig:
        """Get security configuration."""
        data = await self._get_config(self.CONFIG_SECURITY, tenant_id)
        
        if data:
            return SecurityConfig(**data)
        return SecurityConfig()  # Return defaults
    
    async def save_security_config(
        self,
        config: SecurityConfig,
        tenant_id: Optional[UUID] = None,
        updated_by: Optional[UUID] = None
    ) -> None:
        """Save security configuration."""
        await self._save_config(
            self.CONFIG_SECURITY,
            config.model_dump(),
            tenant_id,
            updated_by
        )
    
    # Contact Form Configuration
    async def get_contact_form_config(
        self,
        tenant_id: Optional[UUID] = None
    ) -> ContactFormConfig:
        """Get contact form configuration."""
        data = await self._get_config(self.CONFIG_CONTACT_FORM, tenant_id)
        
        if data:
            return ContactFormConfig(**data)
        return ContactFormConfig()  # Return defaults
    
    async def save_contact_form_config(
        self,
        config: ContactFormConfig,
        tenant_id: Optional[UUID] = None,
        updated_by: Optional[UUID] = None
    ) -> None:
        """Save contact form configuration."""
        await self._save_config(
            self.CONFIG_CONTACT_FORM,
            config.model_dump(),
            tenant_id,
            updated_by
        )
    
    # Email Templates
    async def get_email_templates(
        self,
        tenant_id: Optional[UUID] = None
    ) -> EmailTemplates:
        """Get email templates."""
        data = await self._get_config(self.CONFIG_EMAIL_TEMPLATES, tenant_id)
        
        if data:
            return EmailTemplates(**data)
        return EmailTemplates()  # Return defaults
    
    async def save_email_templates(
        self,
        templates: EmailTemplates,
        tenant_id: Optional[UUID] = None,
        updated_by: Optional[UUID] = None
    ) -> None:
        """Save email templates."""
        await self._save_config(
            self.CONFIG_EMAIL_TEMPLATES,
            templates.model_dump(),
            tenant_id,
            updated_by
        )
    
    # Utility methods
    async def get_all_configs(
        self,
        tenant_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """Get all configurations for a tenant."""
        return {
            "email": (await self.get_email_config(tenant_id)).model_dump(),
            "security": (await self.get_security_config(tenant_id)).model_dump(),
            "contact_form": (await self.get_contact_form_config(tenant_id)).model_dump(),
            "email_templates": (await self.get_email_templates(tenant_id)).model_dump()
        }
    
    async def reset_to_defaults(
        self,
        config_key: str,
        tenant_id: Optional[UUID] = None,
        updated_by: Optional[UUID] = None
    ) -> None:
        """Reset a configuration to defaults."""
        defaults = {
            self.CONFIG_EMAIL: EmailConfig().model_dump(),
            self.CONFIG_SECURITY: SecurityConfig().model_dump(),
            self.CONFIG_CONTACT_FORM: ContactFormConfig().model_dump(),
            self.CONFIG_EMAIL_TEMPLATES: EmailTemplates().model_dump()
        }
        
        if config_key in defaults:
            await self._save_config(
                config_key,
                defaults[config_key],
                tenant_id,
                updated_by
            )
            logger.info(f"Reset {config_key} to defaults for tenant {tenant_id}")
