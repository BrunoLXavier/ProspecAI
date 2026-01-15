# LLM Configuration Entity
# Implements RF-07: Analytics and Chatbot Assistant
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4


class LLMProvider(str, Enum):
    """Supported LLM providers."""
    OPENAI = "openai"
    OLLAMA = "ollama"
    AZURE = "azure"
    GOOGLE = "google"


class LLMConfigStatus(str, Enum):
    """LLM configuration status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    UNCONFIGURED = "unconfigured"


@dataclass
class LLMConfig:
    """
    Domain entity for LLM provider configuration.
    Stores encrypted API credentials for AI chatbot integration.
    
    Implements RF-07: Analytics and Chatbot Assistant
    """
    id: UUID = field(default_factory=uuid4)
    tenant_id: UUID = field(default_factory=uuid4)
    
    provider: LLMProvider = LLMProvider.OPENAI
    model_name: str = "gpt-4-turbo-preview"
    
    # Encrypted API key (stored encrypted in database)
    encrypted_api_key: Optional[str] = None
    
    # Provider-specific settings
    base_url: Optional[str] = None  # For Ollama or Azure endpoints
    temperature: float = 0.3
    max_tokens: int = 4096
    
    # Status tracking
    status: LLMConfigStatus = LLMConfigStatus.UNCONFIGURED
    last_test_at: Optional[datetime] = None
    last_test_success: bool = False
    last_error_message: Optional[str] = None
    
    # Audit fields
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    
    def to_dict(self) -> dict:
        """Convert to dictionary (excludes sensitive data)."""
        return {
            "id": str(self.id),
            "tenant_id": str(self.tenant_id),
            "provider": self.provider.value,
            "model_name": self.model_name,
            "base_url": self.base_url,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "status": self.status.value,
            "last_test_at": self.last_test_at.isoformat() if self.last_test_at else None,
            "last_test_success": self.last_test_success,
            "last_error_message": self.last_error_message,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def has_credentials(self) -> bool:
        """Check if API credentials are configured."""
        return self.encrypted_api_key is not None and len(self.encrypted_api_key) > 0
    
    def mark_test_success(self) -> None:
        """Mark configuration as successfully tested."""
        self.status = LLMConfigStatus.ACTIVE
        self.last_test_at = datetime.utcnow()
        self.last_test_success = True
        self.last_error_message = None
        self.updated_at = datetime.utcnow()
    
    def mark_test_failure(self, error_message: str) -> None:
        """Mark configuration as failed test."""
        self.status = LLMConfigStatus.ERROR
        self.last_test_at = datetime.utcnow()
        self.last_test_success = False
        self.last_error_message = error_message
        self.updated_at = datetime.utcnow()
