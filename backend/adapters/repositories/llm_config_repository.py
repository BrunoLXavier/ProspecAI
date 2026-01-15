# LLM Configuration Repository
# Implements RF-07: Analytics and Chatbot Assistant
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, desc

from adapters.database.models import LLMConfigModel
from domain.entities.llm_config import LLMConfig, LLMProvider, LLMConfigStatus
from infrastructure.security.encryption import encryption_service


class LLMConfigRepository:
    """
    Repository for LLM provider configuration.
    Handles encryption/decryption of API keys.
    
    Implements RF-07: Analytics and Chatbot Assistant
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    def _model_to_entity(self, model: LLMConfigModel) -> LLMConfig:
        """Convert database model to domain entity."""
        return LLMConfig(
            id=model.id,
            tenant_id=model.tenant_id,
            provider=LLMProvider(model.provider),
            model_name=model.model_name,
            encrypted_api_key=model.encrypted_api_key,  # Keep encrypted
            base_url=model.base_url,
            temperature=float(model.temperature) if model.temperature else 0.3,
            max_tokens=model.max_tokens or 4096,
            status=LLMConfigStatus(model.status) if model.status else LLMConfigStatus.UNCONFIGURED,
            last_test_at=model.last_test_at,
            last_test_success=model.last_test_success or False,
            last_error_message=model.last_error_message,
            is_active=model.is_active,
            created_at=model.created_at,
            updated_at=model.updated_at,
            created_by=model.created_by,
            updated_by=model.updated_by,
        )
    
    def _entity_to_model(self, entity: LLMConfig, model: Optional[LLMConfigModel] = None) -> LLMConfigModel:
        """Convert domain entity to database model."""
        if model is None:
            model = LLMConfigModel(
                id=entity.id,
                tenant_id=entity.tenant_id,
                created_by=entity.created_by or entity.tenant_id,
                updated_by=entity.updated_by or entity.tenant_id,
            )
        
        model.provider = entity.provider.value
        model.model_name = entity.model_name
        model.encrypted_api_key = entity.encrypted_api_key
        model.base_url = entity.base_url
        model.temperature = entity.temperature
        model.max_tokens = entity.max_tokens
        model.status = entity.status.value
        model.last_test_at = entity.last_test_at
        model.last_test_success = entity.last_test_success
        model.last_error_message = entity.last_error_message
        model.is_active = entity.is_active
        model.updated_by = entity.updated_by or entity.tenant_id
        
        return model
    
    async def get_active_config(self, tenant_id: UUID) -> Optional[LLMConfig]:
        """
        Get the active LLM configuration for a tenant.
        Returns the most recently updated active configuration.
        """
        result = await self.session.execute(
            select(LLMConfigModel)
            .where(and_(
                LLMConfigModel.tenant_id == tenant_id,
                LLMConfigModel.is_active == True,
                LLMConfigModel.deleted_at == None,
            ))
            .order_by(desc(LLMConfigModel.updated_at))
            .limit(1)
        )
        model = result.scalar_one_or_none()
        return self._model_to_entity(model) if model else None
    
    async def get_by_id(self, tenant_id: UUID, config_id: UUID) -> Optional[LLMConfig]:
        """Get LLM configuration by ID."""
        result = await self.session.execute(
            select(LLMConfigModel)
            .where(and_(
                LLMConfigModel.id == config_id,
                LLMConfigModel.tenant_id == tenant_id,
                LLMConfigModel.deleted_at == None,
            ))
        )
        model = result.scalar_one_or_none()
        return self._model_to_entity(model) if model else None
    
    async def get_all(self, tenant_id: UUID) -> List[LLMConfig]:
        """Get all LLM configurations for a tenant."""
        result = await self.session.execute(
            select(LLMConfigModel)
            .where(and_(
                LLMConfigModel.tenant_id == tenant_id,
                LLMConfigModel.deleted_at == None,
            ))
            .order_by(desc(LLMConfigModel.updated_at))
        )
        models = result.scalars().all()
        return [self._model_to_entity(m) for m in models]
    
    async def create(self, entity: LLMConfig, api_key: str) -> LLMConfig:
        """
        Create a new LLM configuration with encrypted API key.
        
        Args:
            entity: LLM configuration entity
            api_key: Plain text API key (will be encrypted)
        """
        # Encrypt the API key before storage
        entity.encrypted_api_key = encryption_service.encrypt(api_key)
        
        model = self._entity_to_model(entity)
        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        
        return self._model_to_entity(model)
    
    async def update(self, entity: LLMConfig, new_api_key: Optional[str] = None) -> LLMConfig:
        """
        Update an LLM configuration.
        
        Args:
            entity: Updated LLM configuration entity
            new_api_key: Optional new API key (will be encrypted if provided)
        """
        result = await self.session.execute(
            select(LLMConfigModel)
            .where(and_(
                LLMConfigModel.id == entity.id,
                LLMConfigModel.tenant_id == entity.tenant_id,
                LLMConfigModel.deleted_at == None,
            ))
        )
        model = result.scalar_one_or_none()
        
        if not model:
            raise ValueError(f"LLM config not found: {entity.id}")
        
        # Encrypt new API key if provided
        if new_api_key:
            entity.encrypted_api_key = encryption_service.encrypt(new_api_key)
        
        model = self._entity_to_model(entity, model)
        await self.session.commit()
        await self.session.refresh(model)
        
        return self._model_to_entity(model)
    
    async def delete(self, tenant_id: UUID, config_id: UUID) -> bool:
        """Soft delete an LLM configuration."""
        result = await self.session.execute(
            select(LLMConfigModel)
            .where(and_(
                LLMConfigModel.id == config_id,
                LLMConfigModel.tenant_id == tenant_id,
                LLMConfigModel.deleted_at == None,
            ))
        )
        model = result.scalar_one_or_none()
        
        if not model:
            return False
        
        model.deleted_at = datetime.utcnow()
        model.is_active = False
        await self.session.commit()
        
        return True
    
    async def deactivate_all(self, tenant_id: UUID) -> int:
        """Deactivate all LLM configurations for a tenant."""
        result = await self.session.execute(
            select(LLMConfigModel)
            .where(and_(
                LLMConfigModel.tenant_id == tenant_id,
                LLMConfigModel.is_active == True,
                LLMConfigModel.deleted_at == None,
            ))
        )
        models = result.scalars().all()
        
        count = 0
        for model in models:
            model.is_active = False
            count += 1
        
        await self.session.commit()
        return count
    
    def get_decrypted_api_key(self, config: LLMConfig) -> Optional[str]:
        """
        Get the decrypted API key for a configuration.
        This should only be called when actually needed for LLM API calls.
        
        Returns:
            Decrypted API key or None if decryption fails
            
        Raises:
            ValueError: If decryption fails due to invalid token or corrupted data
        """
        if not config.encrypted_api_key:
            return None
        
        try:
            return encryption_service.decrypt(config.encrypted_api_key)
        except ValueError as e:
            # Re-raise with more context about which config failed
            raise ValueError(
                f"Failed to decrypt API key for LLM config '{config.provider}/{config.model_name}'. "
                f"The ENCRYPTION_KEY may have changed. Please reconfigure the LLM provider. "
                f"Original error: {e}"
            )
    
    def get_masked_api_key(self, config: LLMConfig) -> str:
        """Get a masked version of the API key for display."""
        if not config.encrypted_api_key:
            return ""
        
        try:
            decrypted = encryption_service.decrypt(config.encrypted_api_key)
            return encryption_service.mask_credential(decrypted)
        except Exception:
            return "****"
