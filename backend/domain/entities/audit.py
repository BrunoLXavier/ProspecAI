# Implements RNF-06: Auditoria
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
from uuid import UUID
from pydantic import Field
from .base import BaseEntity


class AuditAction(str, Enum):
    """Types of auditable actions."""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    EXPORT = "export"
    AI_SUGGESTION = "ai_suggestion"
    HUMAN_VALIDATION = "human_validation"


class AuditLog(BaseEntity):
    """
    Audit log for tracking all system changes.
    Implements RNF-06: Logs mantidos por 5 anos com timestamp, user_id, action, diff.
    """
    
    # Action details
    action: AuditAction
    entity_type: str  # Type of entity affected
    entity_id: UUID  # ID of affected entity
    
    # User context
    user_id: UUID
    user_role: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Change tracking
    before_state: Optional[Dict[str, Any]] = None
    after_state: Optional[Dict[str, Any]] = None
    diff: Optional[Dict[str, Any]] = None
    
    # Metadata
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    
    # Additional context
    notes: Optional[str] = None
    success: bool = True
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True
    
    @staticmethod
    def create_audit_log(
        action: AuditAction,
        entity_type: str,
        entity_id: UUID,
        user_id: UUID,
        tenant_id: UUID,
        before: Optional[Dict[str, Any]] = None,
        after: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> "AuditLog":
        """Factory method to create audit logs."""
        diff = None
        if before and after:
            # Calculate diff between states
            diff = {
                key: {"old": before.get(key), "new": after.get(key)}
                for key in set(before.keys()) | set(after.keys())
                if before.get(key) != after.get(key)
            }
        
        return AuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            tenant_id=tenant_id,
            before_state=before,
            after_state=after,
            diff=diff,
            created_by=user_id,
            updated_by=user_id,
            **kwargs
        )
