# Implements: Clean Architecture - Base Entity
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from pydantic import BaseModel, Field


class BaseEntity(BaseModel):
    """Base entity with common fields for all domain entities."""
    
    id: UUID = Field(default_factory=uuid4)
    tenant_id: UUID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None
    created_by: UUID
    updated_by: UUID
    
    class Config:
        from_attributes = True
        validate_assignment = True
    
    def is_deleted(self) -> bool:
        """Check if entity is soft-deleted."""
        return self.deleted_at is not None
    
    def soft_delete(self, user_id: UUID) -> None:
        """Soft delete the entity."""
        self.deleted_at = datetime.utcnow()
        self.updated_by = user_id
        self.updated_at = datetime.utcnow()
