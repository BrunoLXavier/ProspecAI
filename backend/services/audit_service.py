"""
Audit Service
Implements audit logging with Kafka for event streaming
Provides create/update/delete event logging for all entities
"""
import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID
import os

logger = logging.getLogger(__name__)

# Kafka configuration
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
KAFKA_AUDIT_TOPIC = os.getenv("KAFKA_AUDIT_TOPIC", "prospecai.audit.events")


class AuditEvent:
    """Represents an audit event."""
    
    def __init__(
        self,
        event_type: str,
        entity_type: str,
        entity_id: str,
        tenant_id: str,
        user_id: str,
        timestamp: datetime,
        data: Optional[Dict[str, Any]] = None,
        old_data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.event_type = event_type
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.tenant_id = tenant_id
        self.user_id = user_id
        self.timestamp = timestamp
        self.data = data or {}
        self.old_data = old_data or {}
        self.metadata = metadata or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "event_type": self.event_type,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "tenant_id": self.tenant_id,
            "user_id": self.user_id,
            "timestamp": self.timestamp.isoformat(),
            "data": self.data,
            "old_data": self.old_data,
            "metadata": self.metadata,
        }
    
    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict(), default=str)


class KafkaProducer:
    """Kafka producer wrapper for audit events."""
    
    def __init__(self):
        self._producer = None
        self._initialized = False
    
    async def _ensure_initialized(self):
        """Lazy initialization of Kafka producer."""
        if self._initialized:
            return
        
        try:
            from aiokafka import AIOKafkaProducer
            
            self._producer = AIOKafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: v.encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None,
            )
            await self._producer.start()
            self._initialized = True
            logger.info(f"Kafka producer initialized: {KAFKA_BOOTSTRAP_SERVERS}")
        except Exception as e:
            logger.warning(f"Failed to initialize Kafka producer: {e}")
            self._producer = None
    
    async def send(self, topic: str, key: str, value: str):
        """Send message to Kafka topic."""
        await self._ensure_initialized()
        
        if not self._producer:
            logger.debug(f"Kafka not available, skipping audit event: {key}")
            return
        
        try:
            await self._producer.send_and_wait(topic, value=value, key=key)
            logger.debug(f"Sent audit event to {topic}: {key}")
        except Exception as e:
            logger.error(f"Failed to send audit event: {e}")
    
    async def close(self):
        """Close the producer."""
        if self._producer:
            await self._producer.stop()
            self._producer = None
            self._initialized = False


# Global producer instance
_kafka_producer: Optional[KafkaProducer] = None


def get_kafka_producer() -> KafkaProducer:
    """Get or create the global Kafka producer."""
    global _kafka_producer
    if _kafka_producer is None:
        _kafka_producer = KafkaProducer()
    return _kafka_producer


class AuditService:
    """
    Service for logging audit events.
    
    Publishes events to Kafka for:
    - Entity creation (CREATE)
    - Entity updates (UPDATE)
    - Entity deletion (DELETE)
    - User actions (LOGIN, LOGOUT, etc.)
    """
    
    def __init__(self, kafka_producer: Optional[KafkaProducer] = None):
        self.producer = kafka_producer or get_kafka_producer()
        self.topic = KAFKA_AUDIT_TOPIC
    
    async def _publish_event(self, event: AuditEvent):
        """Publish an audit event to Kafka."""
        key = f"{event.entity_type}:{event.entity_id}"
        value = event.to_json()
        await self.producer.send(self.topic, key, value)
    
    async def log_creation(
        self,
        entity_type: str,
        entity_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        data: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """Log entity creation event."""
        event = AuditEvent(
            event_type="CREATE",
            entity_type=entity_type,
            entity_id=str(entity_id),
            tenant_id=str(tenant_id),
            user_id=str(user_id),
            timestamp=datetime.utcnow(),
            data=self._sanitize_data(data),
            metadata=metadata,
        )
        await self._publish_event(event)
        logger.info(f"Audit: CREATE {entity_type} {entity_id} by {user_id}")
    
    async def log_update(
        self,
        entity_type: str,
        entity_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        old_data: Dict[str, Any],
        new_data: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """Log entity update event."""
        # Calculate diff
        changes = self._calculate_changes(old_data, new_data)
        
        event = AuditEvent(
            event_type="UPDATE",
            entity_type=entity_type,
            entity_id=str(entity_id),
            tenant_id=str(tenant_id),
            user_id=str(user_id),
            timestamp=datetime.utcnow(),
            data=changes,
            old_data=self._sanitize_data(old_data),
            metadata=metadata,
        )
        await self._publish_event(event)
        logger.info(f"Audit: UPDATE {entity_type} {entity_id} by {user_id}")
    
    async def log_delete(
        self,
        entity_type: str,
        entity_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """Log entity deletion event."""
        event = AuditEvent(
            event_type="DELETE",
            entity_type=entity_type,
            entity_id=str(entity_id),
            tenant_id=str(tenant_id),
            user_id=str(user_id),
            timestamp=datetime.utcnow(),
            data=self._sanitize_data(data) if data else {},
            metadata=metadata,
        )
        await self._publish_event(event)
        logger.info(f"Audit: DELETE {entity_type} {entity_id} by {user_id}")
    
    async def log_action(
        self,
        action: str,
        tenant_id: UUID,
        user_id: UUID,
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """Log a custom action event."""
        event = AuditEvent(
            event_type=action.upper(),
            entity_type=entity_type or "SYSTEM",
            entity_id=str(entity_id) if entity_id else "",
            tenant_id=str(tenant_id),
            user_id=str(user_id),
            timestamp=datetime.utcnow(),
            data=self._sanitize_data(data) if data else {},
            metadata=metadata,
        )
        await self._publish_event(event)
        logger.info(f"Audit: {action} by {user_id}")
    
    def _sanitize_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive fields from data before logging."""
        if not data:
            return {}
        
        sensitive_fields = {
            'password', 'password_hash', 'secret', 'token', 'api_key',
            'access_token', 'refresh_token', 'private_key', 'credit_card',
            'cpf', 'cnpj', 'rg', 'ssn',
        }
        
        sanitized = {}
        for key, value in data.items():
            if key.lower() in sensitive_fields:
                sanitized[key] = "[REDACTED]"
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_data(value)
            elif isinstance(value, (UUID, datetime)):
                sanitized[key] = str(value)
            else:
                sanitized[key] = value
        
        return sanitized
    
    def _calculate_changes(
        self,
        old_data: Dict[str, Any],
        new_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate the changes between old and new data."""
        changes = {}
        
        all_keys = set(old_data.keys()) | set(new_data.keys())
        
        for key in all_keys:
            old_val = old_data.get(key)
            new_val = new_data.get(key)
            
            if old_val != new_val:
                changes[key] = {
                    "old": old_val,
                    "new": new_val,
                }
        
        return changes


# Factory function for dependency injection
def get_audit_service() -> AuditService:
    """Get an AuditService instance."""
    return AuditService()
