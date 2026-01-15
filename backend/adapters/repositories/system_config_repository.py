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
        """Get existing config or create new one."""
        conditions = [SystemConfigModel.config_key == config_key]
        
        if tenant_id:
            conditions.append(SystemConfigModel.tenant_id == tenant_id)
        else:
            conditions.append(SystemConfigModel.tenant_id.is_(None))
        
        query = select(SystemConfigModel).where(and_(*conditions))
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        
        if not model:
            model = SystemConfigModel(
                id=uuid4(),
                tenant_id=tenant_id,
                config_key=config_key,
                config_value={}
            )
            self.session.add(model)
            await self.session.flush()
        
        return model
    
    async def _get_config(
        self,
        config_key: str,
        tenant_id: Optional[UUID] = None
    ) -> Optional[Dict[str, Any]]:
        """Get configuration value by key."""
        conditions = [SystemConfigModel.config_key == config_key]
        
        if tenant_id:
            conditions.append(SystemConfigModel.tenant_id == tenant_id)
        else:
            conditions.append(SystemConfigModel.tenant_id.is_(None))
        
        query = select(SystemConfigModel).where(and_(*conditions))
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        
        if model:
            return model.config_value
        return None
    
    async def _save_config(
        self,
        config_key: str,
        config_value: Dict[str, Any],
        tenant_id: Optional[UUID] = None,
        updated_by: Optional[UUID] = None
    ) -> None:
        """Save configuration value."""
        model = await self._get_or_create_config(config_key, tenant_id)
        model.config_value = config_value
        model.updated_by = updated_by
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
