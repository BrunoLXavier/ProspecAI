# LLM Configuration API Routes
# Implements RF-07: Analytics and Chatbot Assistant
from typing import Optional, List
from uuid import UUID
from datetime import datetime
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from infrastructure.auth import get_auth_dependency, CurrentUser
from adapters.database.connection import get_db
from adapters.repositories.llm_config_repository import LLMConfigRepository
from use_cases.manage_llm_config import ManageLLMConfigUseCase, LLMConfigInput

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin/llm-config", tags=["LLM Configuration"])


# ========== Request/Response Models ==========

class LLMConfigCreateRequest(BaseModel):
    """Request model for creating LLM configuration."""
    provider: str = Field(..., description="LLM provider: openai, ollama, azure, google")
    api_key: str = Field(..., description="API key for the provider")
    model_name: str = Field(default="gpt-4-turbo-preview", description="Model name to use")
    base_url: Optional[str] = Field(default=None, description="Base URL for Ollama or Azure")
    temperature: float = Field(default=0.3, ge=0.0, le=2.0, description="Temperature for generation")
    max_tokens: int = Field(default=4096, ge=1, le=128000, description="Maximum tokens to generate")


class LLMConfigUpdateRequest(BaseModel):
    """Request model for updating LLM configuration."""
    provider: Optional[str] = Field(default=None, description="LLM provider")
    api_key: Optional[str] = Field(default=None, description="New API key (leave empty to keep existing)")
    model_name: Optional[str] = Field(default=None, description="Model name")
    base_url: Optional[str] = Field(default=None, description="Base URL")
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0, description="Temperature")
    max_tokens: Optional[int] = Field(default=None, ge=1, le=128000, description="Max tokens")


class LLMConfigResponse(BaseModel):
    """Response model for LLM configuration."""
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


class TestConnectionResponse(BaseModel):
    """Response model for connection test."""
    success: bool
    message: str = ""
    response_time_ms: Optional[int] = None
    error: Optional[str] = None


class TestConnectionRequest(BaseModel):
    """Request model for testing connection with inline config."""
    provider: str = Field(..., description="LLM provider: openai, ollama, azure, google")
    model_name: str = Field(default="gpt-4-turbo-preview", description="Model name to use")
    api_key: str = Field(..., description="API key for the provider")
    api_base_url: Optional[str] = Field(default=None, description="Base URL for Ollama or Azure")


class ProviderInfo(BaseModel):
    """Information about a supported provider."""
    name: str
    default_model: str
    requires_api_key: bool
    requires_base_url: bool


# ========== Auth Dependency ==========

auth_dependency = get_auth_dependency()


async def require_admin(user: CurrentUser = Depends(auth_dependency)):
    """Require admin role."""
    if "admin" not in user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


# ========== API Endpoints ==========

@router.get("/providers", response_model=List[ProviderInfo])
async def get_supported_providers():
    """Get list of supported LLM providers."""
    providers = ManageLLMConfigUseCase.SUPPORTED_PROVIDERS
    return [
        ProviderInfo(
            name=name,
            default_model=info["default_model"],
            requires_api_key=info["requires_api_key"],
            requires_base_url=info["requires_base_url"],
        )
        for name, info in providers.items()
    ]


@router.get("/active", response_model=Optional[LLMConfigResponse])
async def get_active_config(
    user: CurrentUser = Depends(require_admin),
    session = Depends(get_db),
):
    """Get the active LLM configuration for the current tenant."""
    repository = LLMConfigRepository(session)
    use_case = ManageLLMConfigUseCase(repository)
    
    config = await use_case.get_active_config(UUID(user.tenant_id))
    if not config:
        return None
    
    return LLMConfigResponse(**config.__dict__)


@router.post("/test", response_model=TestConnectionResponse)
async def test_connection_inline(
    request: TestConnectionRequest,
    user: CurrentUser = Depends(require_admin),
    session = Depends(get_db),
):
    """
    Test the connection to an LLM provider with inline configuration.
    This endpoint allows testing before saving the configuration.
    """
    import time
    from services.ai.chatbot_service import get_llm_from_config
    
    try:
        start_time = time.time()
        
        # Validate provider
        valid_providers = ["openai", "ollama", "azure", "google"]
        if request.provider.lower() not in valid_providers:
            raise ValueError(f"Invalid provider. Must be one of: {', '.join(valid_providers)}")
        
        # Create temporary config for testing
        config = {
            "provider": request.provider.lower(),
            "model_name": request.model_name,
            "api_key": request.api_key,
            "api_base_url": request.api_base_url,
            "max_retries": 1,  # Minimal retries for faster test feedback
        }
        
        # Try to instantiate the LLM
        llm = get_llm_from_config(**config)
        
        # Test with a simple prompt
        test_prompt = "Say 'Hello' in one word only."
        response = await llm.ainvoke(test_prompt)
        
        elapsed_ms = int((time.time() - start_time) * 1000)
        
        return TestConnectionResponse(
            success=True,
            message=f"Connection successful. Response time: {elapsed_ms}ms",
            response_time_ms=elapsed_ms
        )
        
    except ValueError as e:
        return TestConnectionResponse(
            success=False,
            error=str(e)
        )
    except ImportError as e:
        return TestConnectionResponse(
            success=False,
            error=f"Required package not installed: {str(e)}"
        )
    except Exception as e:
        error_msg = str(e)
        # Extract user-friendly message from rate limit errors
        if "RESOURCE_EXHAUSTED" in error_msg or "429" in error_msg:
            error_msg = "Rate limit exceeded. Please wait a moment and try again."
        elif "NOT_FOUND" in error_msg:
            error_msg = f"Model not found. Please check the model name is correct."
        elif "INVALID_ARGUMENT" in error_msg or "API key not valid" in error_msg:
            error_msg = "Invalid API key. Please check your credentials."
        else:
            error_msg = f"Connection failed: {error_msg[:200]}"
        
        logger.error(f"Connection test failed: {str(e)}")
        return TestConnectionResponse(
            success=False,
            error=error_msg
        )


@router.get("", response_model=List[LLMConfigResponse])
async def get_all_configs(
    user: CurrentUser = Depends(require_admin),
    session = Depends(get_db),
):
    """Get all LLM configurations for the current tenant."""
    repository = LLMConfigRepository(session)
    use_case = ManageLLMConfigUseCase(repository)
    
    configs = await use_case.get_all_configs(UUID(user.tenant_id))
    return [LLMConfigResponse(**c.__dict__) for c in configs]


@router.post("", response_model=LLMConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_config(
    request: LLMConfigCreateRequest,
    user: CurrentUser = Depends(require_admin),
    session = Depends(get_db),
):
    """
    Create a new LLM configuration.
    This will deactivate any existing active configuration.
    """
    repository = LLMConfigRepository(session)
    use_case = ManageLLMConfigUseCase(repository)
    
    try:
        input_data = LLMConfigInput(
            provider=request.provider,
            api_key=request.api_key,
            model_name=request.model_name,
            base_url=request.base_url,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )
        
        config = await use_case.create_config(
            tenant_id=UUID(user.tenant_id),
            user_id=UUID(user.id),
            input_data=input_data,
        )
        
        return LLMConfigResponse(**config.__dict__)
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{config_id}", response_model=LLMConfigResponse)
async def update_config(
    config_id: UUID,
    request: LLMConfigUpdateRequest,
    user: CurrentUser = Depends(require_admin),
    session = Depends(get_db),
):
    """Update an existing LLM configuration."""
    repository = LLMConfigRepository(session)
    use_case = ManageLLMConfigUseCase(repository)
    
    # Get existing config to merge with updates
    existing = await use_case.get_active_config(UUID(user.tenant_id))
    if not existing or existing.id != str(config_id):
        configs = await use_case.get_all_configs(UUID(user.tenant_id))
        existing = next((c for c in configs if c.id == str(config_id)), None)
    
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Configuration not found")
    
    try:
        input_data = LLMConfigInput(
            provider=request.provider or existing.provider,
            api_key=request.api_key or "",
            model_name=request.model_name or existing.model_name,
            base_url=request.base_url if request.base_url is not None else existing.base_url,
            temperature=request.temperature if request.temperature is not None else existing.temperature,
            max_tokens=request.max_tokens if request.max_tokens is not None else existing.max_tokens,
        )
        
        config = await use_case.update_config(
            tenant_id=UUID(user.tenant_id),
            config_id=config_id,
            user_id=UUID(user.id),
            input_data=input_data,
        )
        
        if not config:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Configuration not found")
        
        return LLMConfigResponse(**config.__dict__)
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_config(
    config_id: UUID,
    user: CurrentUser = Depends(require_admin),
    session = Depends(get_db),
):
    """Delete an LLM configuration."""
    repository = LLMConfigRepository(session)
    use_case = ManageLLMConfigUseCase(repository)
    
    deleted = await use_case.delete_config(UUID(user.tenant_id), config_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Configuration not found")
