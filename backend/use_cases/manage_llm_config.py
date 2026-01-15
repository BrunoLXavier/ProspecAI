# LLM Configuration Use Case
# Implements RF-07: Analytics and Chatbot Assistant
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from domain.entities.llm_config import LLMConfig, LLMProvider, LLMConfigStatus
from adapters.repositories.llm_config_repository import LLMConfigRepository


@dataclass
class LLMConfigInput:
    """Input data for creating/updating LLM configuration."""
    provider: str
    api_key: str
    model_name: str = "gpt-4-turbo-preview"
    base_url: Optional[str] = None
    temperature: float = 0.3
    max_tokens: int = 4096


@dataclass
class LLMConfigOutput:
    """Output data for LLM configuration responses."""
    id: str
    provider: str
    model_name: str
    base_url: Optional[str]
    temperature: float
    max_tokens: int
    status: str
    last_test_at: Optional[str]
    last_test_success: bool
    last_error_message: Optional[str]
    is_active: bool
    masked_api_key: str
    created_at: str
    updated_at: str


class ManageLLMConfigUseCase:
    """
    Use case for managing LLM provider configurations.
    Handles encryption, validation, and connection testing.
    
    Implements RF-07: Analytics and Chatbot Assistant
    """
    
    SUPPORTED_PROVIDERS = {
        "openai": {
            "default_model": "gpt-4-turbo-preview",
            "requires_api_key": True,
            "requires_base_url": False,
        },
        "ollama": {
            "default_model": "llama3",
            "requires_api_key": False,
            "requires_base_url": True,
        },
        "azure": {
            "default_model": "gpt-4",
            "requires_api_key": True,
            "requires_base_url": True,
        },
        "google": {
            "default_model": "gemini-2.0-flash",
            "requires_api_key": True,
            "requires_base_url": False,
        },
    }
    
    def __init__(self, repository: LLMConfigRepository):
        self.repository = repository
    
    async def get_active_config(self, tenant_id: UUID) -> Optional[LLMConfigOutput]:
        """Get the active LLM configuration for a tenant."""
        config = await self.repository.get_active_config(tenant_id)
        if not config:
            return None
        return self._to_output(config)
    
    async def get_all_configs(self, tenant_id: UUID) -> List[LLMConfigOutput]:
        """Get all LLM configurations for a tenant."""
        configs = await self.repository.get_all(tenant_id)
        return [self._to_output(c) for c in configs]
    
    async def create_config(
        self,
        tenant_id: UUID,
        user_id: UUID,
        input_data: LLMConfigInput,
    ) -> LLMConfigOutput:
        """
        Create a new LLM configuration.
        Deactivates any existing active configurations.
        """
        # Validate provider
        if input_data.provider not in self.SUPPORTED_PROVIDERS:
            raise ValueError(f"Unsupported provider: {input_data.provider}")
        
        provider_config = self.SUPPORTED_PROVIDERS[input_data.provider]
        
        # Validate API key requirement
        if provider_config["requires_api_key"] and not input_data.api_key:
            raise ValueError(f"API key is required for provider: {input_data.provider}")
        
        # Validate base URL requirement
        if provider_config["requires_base_url"] and not input_data.base_url:
            raise ValueError(f"Base URL is required for provider: {input_data.provider}")
        
        # Deactivate existing configs
        await self.repository.deactivate_all(tenant_id)
        
        # Create new config entity
        entity = LLMConfig(
            tenant_id=tenant_id,
            provider=LLMProvider(input_data.provider),
            model_name=input_data.model_name or provider_config["default_model"],
            base_url=input_data.base_url,
            temperature=input_data.temperature,
            max_tokens=input_data.max_tokens,
            status=LLMConfigStatus.UNCONFIGURED,
            is_active=True,
            created_by=user_id,
            updated_by=user_id,
        )
        
        # Create with encrypted API key
        created = await self.repository.create(entity, input_data.api_key)
        
        return self._to_output(created)
    
    async def update_config(
        self,
        tenant_id: UUID,
        config_id: UUID,
        user_id: UUID,
        input_data: LLMConfigInput,
    ) -> Optional[LLMConfigOutput]:
        """Update an existing LLM configuration."""
        existing = await self.repository.get_by_id(tenant_id, config_id)
        if not existing:
            return None
        
        # Validate provider
        if input_data.provider not in self.SUPPORTED_PROVIDERS:
            raise ValueError(f"Unsupported provider: {input_data.provider}")
        
        # Update entity
        existing.provider = LLMProvider(input_data.provider)
        existing.model_name = input_data.model_name
        existing.base_url = input_data.base_url
        existing.temperature = input_data.temperature
        existing.max_tokens = input_data.max_tokens
        existing.updated_by = user_id
        existing.updated_at = datetime.utcnow()
        existing.status = LLMConfigStatus.UNCONFIGURED  # Reset status on update
        
        # Update with new API key if provided
        new_api_key = input_data.api_key if input_data.api_key else None
        updated = await self.repository.update(existing, new_api_key)
        
        return self._to_output(updated)
    
    async def delete_config(self, tenant_id: UUID, config_id: UUID) -> bool:
        """Delete an LLM configuration."""
        return await self.repository.delete(tenant_id, config_id)
    
    async def test_connection(self, tenant_id: UUID, config_id: UUID) -> dict:
        """
        Test the connection to the LLM provider.
        Returns success status and any error messages.
        """
        config = await self.repository.get_by_id(tenant_id, config_id)
        if not config:
            return {"success": False, "error": "Configuration not found"}
        
        try:
            # Get decrypted API key
            api_key = self.repository.get_decrypted_api_key(config)
            
            # Test connection based on provider
            if config.provider == LLMProvider.OPENAI:
                success, error = await self._test_openai(api_key, config.model_name)
            elif config.provider == LLMProvider.OLLAMA:
                success, error = await self._test_ollama(config.base_url, config.model_name)
            elif config.provider == LLMProvider.GOOGLE:
                success, error = await self._test_google(api_key, config.model_name)
            elif config.provider == LLMProvider.AZURE:
                success, error = await self._test_azure(api_key, config.base_url, config.model_name)
            else:
                success, error = False, f"Unsupported provider: {config.provider}"
            
            # Update config status
            if success:
                config.mark_test_success()
            else:
                config.mark_test_failure(error)
            
            await self.repository.update(config)
            
            return {"success": success, "error": error}
            
        except Exception as e:
            error_msg = str(e)
            config.mark_test_failure(error_msg)
            await self.repository.update(config)
            return {"success": False, "error": error_msg}
    
    async def _test_openai(self, api_key: str, model_name: str) -> tuple[bool, Optional[str]]:
        """Test OpenAI API connection."""
        try:
            from openai import AsyncOpenAI
            
            client = AsyncOpenAI(api_key=api_key)
            response = await client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=5,
            )
            
            if response.choices:
                return True, None
            return False, "No response from OpenAI"
            
        except Exception as e:
            return False, str(e)
    
    async def _test_ollama(self, base_url: str, model_name: str) -> tuple[bool, Optional[str]]:
        """Test Ollama connection."""
        try:
            import httpx
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Check if model is available
                response = await client.get(f"{base_url}/api/tags")
                if response.status_code != 200:
                    return False, f"Failed to connect to Ollama: {response.status_code}"
                
                # Simple generation test
                response = await client.post(
                    f"{base_url}/api/generate",
                    json={"model": model_name, "prompt": "Hello", "stream": False},
                )
                
                if response.status_code == 200:
                    return True, None
                return False, f"Ollama generation failed: {response.status_code}"
                
        except Exception as e:
            return False, str(e)
    
    async def _test_google(self, api_key: str, model_name: str) -> tuple[bool, Optional[str]]:
        """Test Google AI Studio connection."""
        try:
            import httpx
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}",
                    json={
                        "contents": [{"parts": [{"text": "Hello"}]}],
                        "generationConfig": {"maxOutputTokens": 5},
                    },
                )
                
                if response.status_code == 200:
                    return True, None
                
                error_data = response.json()
                error_msg = error_data.get("error", {}).get("message", "Unknown error")
                return False, error_msg
                
        except Exception as e:
            return False, str(e)
    
    async def _test_azure(self, api_key: str, base_url: str, model_name: str) -> tuple[bool, Optional[str]]:
        """Test Azure OpenAI connection."""
        try:
            from openai import AsyncAzureOpenAI
            
            client = AsyncAzureOpenAI(
                api_key=api_key,
                api_version="2024-02-01",
                azure_endpoint=base_url,
            )
            
            response = await client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=5,
            )
            
            if response.choices:
                return True, None
            return False, "No response from Azure OpenAI"
            
        except Exception as e:
            return False, str(e)
    
    def _to_output(self, entity: LLMConfig) -> LLMConfigOutput:
        """Convert entity to output DTO."""
        masked_key = self.repository.get_masked_api_key(entity)
        
        return LLMConfigOutput(
            id=str(entity.id),
            provider=entity.provider.value,
            model_name=entity.model_name,
            base_url=entity.base_url,
            temperature=entity.temperature,
            max_tokens=entity.max_tokens,
            status=entity.status.value,
            last_test_at=entity.last_test_at.isoformat() if entity.last_test_at else None,
            last_test_success=entity.last_test_success,
            last_error_message=entity.last_error_message,
            is_active=entity.is_active,
            masked_api_key=masked_key,
            created_at=entity.created_at.isoformat() if entity.created_at else None,
            updated_at=entity.updated_at.isoformat() if entity.updated_at else None,
        )
