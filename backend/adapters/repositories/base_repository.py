"""
Enhanced Base Repository with Caching Integration
Implements RF-01 to RF-09: Repository pattern with intelligent caching

Features:
- Clean Architecture repository pattern
- Multi-layer cache integration
- Optimistic locking support
- Audit trail integration  
- Row-Level Security (RLS) enforcement
"""
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, Generic, List, Optional, TypeVar, Union
from uuid import UUID, uuid4

import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, func, text

from adapters.database.models_new import (
    BaseModel, TenantModel, AuditLogModel
)
from infrastructure.cache.cache_manager import CacheManager, get_cache_manager
from domain.entities.base import BaseEntity

# Generic types for repository pattern
T = TypeVar('T', bound=BaseEntity)  # Domain entity type
M = TypeVar('M', bound=BaseModel)   # Database model type

logger = logging.getLogger(__name__)


class BaseRepository(Generic[T, M], ABC):
    """
    Enhanced base repository with caching and RLS support
    """
    
    def __init__(self, session: AsyncSession, model_class: type[M]):
        self.session = session
        self.model_class = model_class
        self.cache: Optional[CacheManager] = None
        self._entity_name = model_class.__tablename__.rstrip('s')  # Remove plural
    
    async def _get_cache(self) -> CacheManager:
        """Get cache manager instance"""
        if not self.cache:
            self.cache = await get_cache_manager()
        return self.cache
    
    def _cache_key(self, operation: str, tenant_id: str, *args, **kwargs) -> str:
        """Generate standardized cache key"""
        # Use synchronous cache key generation
        parts = [f"{self._entity_name}:{operation}", tenant_id]
        parts.extend(str(a) for a in args)
        parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
        return ":".join(parts)
    
    @abstractmethod
    def _model_to_entity(self, model: M) -> T:
        """Convert database model to domain entity"""
        pass
    
    @abstractmethod
    def _entity_to_model(self, entity: T, model: Optional[M] = None) -> M:
        """Convert domain entity to database model"""
        pass
    
    async def get_by_id(
        self, 
        tenant_id: str, 
        entity_id: UUID, 
        use_cache: bool = True
    ) -> Optional[T]:
        """
        Get entity by ID with caching support
        """
        try:
            # Check cache first
            if use_cache:
                cache = await self._get_cache()
                cache_key = self._cache_key("get", tenant_id, str(entity_id))
                
                cached_data = await cache.get(cache_key)
                if cached_data:
                    logger.debug(f"Cache HIT: {cache_key}")
                    return self._deserialize_entity(cached_data)
            
            # Query database with RLS enforcement
            query = select(self.model_class).where(
                and_(
                    self.model_class.id == entity_id,
                    self.model_class.tenant_id == tenant_id,
                    self.model_class.deleted_at.is_(None)
                )
            )
            
            result = await self.session.execute(query)
            model = result.scalar_one_or_none()
            
            if not model:
                return None
            
            entity = self._model_to_entity(model)
            
            # Cache the result
            if use_cache:
                cache = await self._get_cache()
                cache_key = self._cache_key("get", tenant_id, str(entity_id))
                await cache.set(cache_key, self._serialize_entity(entity))
                logger.debug(f"Cache SET: {cache_key}")
            
            return entity
            
        except Exception as e:
            logger.error(f"Error getting {self._entity_name} {entity_id}: {e}")
            raise
    
    async def list_by_tenant(
        self,
        tenant_id: str,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        use_cache: bool = True
    ) -> List[T]:
        """
        List entities by tenant with caching and filtering
        """
        try:
            # Generate cache key including filters
            cache_key = self._cache_key(
                "list", tenant_id, f"skip:{skip}", f"limit:{limit}",
                **filters or {}
            )
            
            # Check cache
            if use_cache:
                cache = await self._get_cache()
                cached_data = await cache.get(cache_key)
                if cached_data:
                    logger.debug(f"Cache HIT: {cache_key}")
                    return [self._deserialize_entity(item) for item in cached_data]
            
            # Build query with RLS
            query = select(self.model_class).where(
                and_(
                    self.model_class.tenant_id == tenant_id,
                    self.model_class.deleted_at.is_(None)
                )
            )
            
            # Apply filters
            if filters:
                for field, value in filters.items():
                    if hasattr(self.model_class, field):
                        query = query.where(getattr(self.model_class, field) == value)
            
            # Apply pagination
            query = query.offset(skip).limit(limit)
            
            result = await self.session.execute(query)
            models = result.scalars().all()
            
            entities = [self._model_to_entity(model) for model in models]
            
            # Cache results
            if use_cache:
                cache = await self._get_cache()
                serialized = [self._serialize_entity(entity) for entity in entities]
                await cache.set(cache_key, serialized)
                logger.debug(f"Cache SET: {cache_key}")
            
            return entities
            
        except Exception as e:
            logger.error(f"Error listing {self._entity_name}: {e}")
            raise
    
    async def create(
        self, 
        entity: T, 
        tenant_id: str, 
        created_by: UUID
    ) -> T:
        """
        Create entity with audit trail and cache invalidation
        """
        try:
            # Create model instance
            model = self._entity_to_model(entity)
            model.id = entity.id or uuid4()
            model.tenant_id = tenant_id
            model.created_by = created_by
            model.updated_by = created_by
            model.created_at = datetime.utcnow()
            model.updated_at = datetime.utcnow()
            model.version = 1
            
            # Add to session
            self.session.add(model)
            
            # Create audit log
            await self._create_audit_log(
                tenant_id=tenant_id,
                entity_id=model.id,
                action="CREATE",
                user_id=created_by,
                after_state=model
            )
            
            await self.session.commit()
            
            # Convert back to entity
            created_entity = self._model_to_entity(model)
            
            # Invalidate related caches
            await self._invalidate_caches(tenant_id, str(model.id))
            
            logger.info(f"Created {self._entity_name} {model.id}")
            return created_entity
            
        except IntegrityError as e:
            await self.session.rollback()
            logger.error(f"Integrity error creating {self._entity_name}: {e}")
            raise
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error creating {self._entity_name}: {e}")
            raise
    
    async def update(
        self,
        entity: T,
        tenant_id: str,
        updated_by: UUID
    ) -> T:
        """
        Update entity with optimistic locking and audit trail
        """
        try:
            # Find existing model
            query = select(self.model_class).where(
                and_(
                    self.model_class.id == entity.id,
                    self.model_class.tenant_id == tenant_id,
                    self.model_class.deleted_at.is_(None)
                )
            )
            
            result = await self.session.execute(query)
            existing_model = result.scalar_one_or_none()
            
            if not existing_model:
                raise ValueError(f"{self._entity_name} not found: {entity.id}")
            
            # Optimistic locking check
            if hasattr(entity, 'version') and entity.version != existing_model.version:
                raise ValueError(f"{self._entity_name} was modified by another user")
            
            # Store before state for audit
            before_state = existing_model.__dict__.copy()
            
            # Update model
            updated_model = self._entity_to_model(entity, existing_model)
            updated_model.updated_by = updated_by
            updated_model.updated_at = datetime.utcnow()
            updated_model.version = existing_model.version + 1
            
            # Create audit log
            await self._create_audit_log(
                tenant_id=tenant_id,
                entity_id=updated_model.id,
                action="UPDATE", 
                user_id=updated_by,
                before_state=before_state,
                after_state=updated_model.__dict__
            )
            
            await self.session.commit()
            
            # Convert back to entity
            updated_entity = self._model_to_entity(updated_model)
            
            # Invalidate caches
            await self._invalidate_caches(tenant_id, str(entity.id))
            
            logger.info(f"Updated {self._entity_name} {entity.id}")
            return updated_entity
            
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error updating {self._entity_name} {entity.id}: {e}")
            raise
    
    async def delete(
        self,
        entity_id: UUID,
        tenant_id: str,
        deleted_by: UUID,
        soft_delete: bool = True
    ) -> bool:
        """
        Delete entity (soft delete by default)
        """
        try:
            # Find existing model
            query = select(self.model_class).where(
                and_(
                    self.model_class.id == entity_id,
                    self.model_class.tenant_id == tenant_id,
                    self.model_class.deleted_at.is_(None) if soft_delete else True
                )
            )
            
            result = await self.session.execute(query)
            model = result.scalar_one_or_none()
            
            if not model:
                return False
            
            if soft_delete:
                # Soft delete
                model.deleted_at = datetime.utcnow()
                model.updated_by = deleted_by
                model.updated_at = datetime.utcnow()
                
                action = "SOFT_DELETE"
            else:
                # Hard delete
                await self.session.delete(model)
                action = "DELETE"
            
            # Create audit log
            await self._create_audit_log(
                tenant_id=tenant_id,
                entity_id=entity_id,
                action=action,
                user_id=deleted_by,
                before_state=model.__dict__ if soft_delete else None
            )
            
            await self.session.commit()
            
            # Invalidate caches
            await self._invalidate_caches(tenant_id, str(entity_id))
            
            logger.info(f"Deleted {self._entity_name} {entity_id}")
            return True
            
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error deleting {self._entity_name} {entity_id}: {e}")
            raise
    
    async def _create_audit_log(
        self,
        tenant_id: str,
        entity_id: UUID,
        action: str,
        user_id: UUID,
        before_state: Optional[Dict[str, Any]] = None,
        after_state: Optional[Dict[str, Any]] = None,
        session_id: Optional[UUID] = None,
        ip_address: Optional[str] = None
    ) -> None:
        """Create audit log entry"""
        audit_log = AuditLogModel(
            id=uuid4(),
            tenant_id=tenant_id,
            entity_type=self._entity_name,
            entity_id=entity_id,
            action=action,
            timestamp=datetime.utcnow(),
            user_id=user_id,
            before_state=before_state,
            after_state=after_state,
            session_id=session_id,
            ip_address=ip_address,
            created_by=user_id,
            updated_by=user_id
        )
        
        self.session.add(audit_log)
    
    async def find_by_criteria(
        self,
        criteria: Dict[str, Any],
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        use_cache: bool = True
    ) -> List[T]:
        """
        Find entities by flexible criteria with advanced filtering.
        
        Supports special filter suffixes:
        - field_gte: Greater than or equal
        - field_lte: Less than or equal
        - field_gt: Greater than
        - field_lt: Less than
        - field_like: ILIKE pattern match
        - search_text: Full-text search in searchable fields
        """
        try:
            # Build base query with soft delete filter
            query = select(self.model_class).where(
                self.model_class.deleted_at.is_(None)
            )
            
            # Apply criteria filters
            conditions = []
            
            for key, value in criteria.items():
                if value is None:
                    continue
                
                # Handle special suffixes
                if key.endswith("_gte"):
                    field_name = key[:-4]
                    if hasattr(self.model_class, field_name):
                        conditions.append(
                            getattr(self.model_class, field_name) >= value
                        )
                elif key.endswith("_lte"):
                    field_name = key[:-4]
                    if hasattr(self.model_class, field_name):
                        conditions.append(
                            getattr(self.model_class, field_name) <= value
                        )
                elif key.endswith("_gt"):
                    field_name = key[:-3]
                    if hasattr(self.model_class, field_name):
                        conditions.append(
                            getattr(self.model_class, field_name) > value
                        )
                elif key.endswith("_lt"):
                    field_name = key[:-3]
                    if hasattr(self.model_class, field_name):
                        conditions.append(
                            getattr(self.model_class, field_name) < value
                        )
                elif key.endswith("_like"):
                    field_name = key[:-5]
                    if hasattr(self.model_class, field_name):
                        conditions.append(
                            getattr(self.model_class, field_name).ilike(f"%{value}%")
                        )
                elif key == "search_text":
                    # Full-text search on name and description if available
                    search_conditions = []
                    for field in ["name", "title", "description"]:
                        if hasattr(self.model_class, field):
                            search_conditions.append(
                                getattr(self.model_class, field).ilike(f"%{value}%")
                            )
                    if search_conditions:
                        conditions.append(or_(*search_conditions))
                else:
                    # Direct equality match
                    if hasattr(self.model_class, key):
                        conditions.append(
                            getattr(self.model_class, key) == value
                        )
            
            if conditions:
                query = query.where(and_(*conditions))
            
            # Apply ordering
            if order_by and hasattr(self.model_class, order_by):
                query = query.order_by(getattr(self.model_class, order_by))
            else:
                query = query.order_by(self.model_class.created_at.desc())
            
            # Apply pagination
            query = query.offset(skip).limit(limit)
            
            result = await self.session.execute(query)
            models = result.scalars().all()
            
            return [self._model_to_entity(model) for model in models]
            
        except Exception as e:
            logger.error(f"Error finding {self._entity_name} by criteria: {e}")
            raise
    
    async def count_by_criteria(
        self,
        criteria: Dict[str, Any]
    ) -> int:
        """
        Count entities matching criteria for pagination.
        """
        try:
            query = select(func.count(self.model_class.id)).where(
                self.model_class.deleted_at.is_(None)
            )
            
            conditions = []
            
            for key, value in criteria.items():
                if value is None:
                    continue
                
                # Handle special suffixes (same as find_by_criteria)
                if key.endswith("_gte"):
                    field_name = key[:-4]
                    if hasattr(self.model_class, field_name):
                        conditions.append(
                            getattr(self.model_class, field_name) >= value
                        )
                elif key.endswith("_lte"):
                    field_name = key[:-4]
                    if hasattr(self.model_class, field_name):
                        conditions.append(
                            getattr(self.model_class, field_name) <= value
                        )
                elif key.endswith("_gt"):
                    field_name = key[:-3]
                    if hasattr(self.model_class, field_name):
                        conditions.append(
                            getattr(self.model_class, field_name) > value
                        )
                elif key.endswith("_lt"):
                    field_name = key[:-3]
                    if hasattr(self.model_class, field_name):
                        conditions.append(
                            getattr(self.model_class, field_name) < value
                        )
                elif key.endswith("_like"):
                    field_name = key[:-5]
                    if hasattr(self.model_class, field_name):
                        conditions.append(
                            getattr(self.model_class, field_name).ilike(f"%{value}%")
                        )
                elif key == "search_text":
                    search_conditions = []
                    for field in ["name", "title", "description"]:
                        if hasattr(self.model_class, field):
                            search_conditions.append(
                                getattr(self.model_class, field).ilike(f"%{value}%")
                            )
                    if search_conditions:
                        conditions.append(or_(*search_conditions))
                else:
                    if hasattr(self.model_class, key):
                        conditions.append(
                            getattr(self.model_class, key) == value
                        )
            
            if conditions:
                query = query.where(and_(*conditions))
            
            result = await self.session.execute(query)
            count = result.scalar_one()
            
            return count
            
        except Exception as e:
            logger.error(f"Error counting {self._entity_name}: {e}")
            raise
    
    async def _invalidate_caches(self, tenant_id: str, entity_id: str) -> None:
        """Invalidate related caches"""
        cache = await self._get_cache()
        
        # Basic entity cache patterns
        patterns = [
            f"{self._entity_name}:get:{tenant_id}:{entity_id}",
            f"{self._entity_name}:list:{tenant_id}*"
        ]
        
        for pattern in patterns:
            await cache.delete_pattern(pattern)
        
        logger.debug(f"Invalidated caches for {self._entity_name} {entity_id}")
    
    def _serialize_entity(self, entity: T) -> Dict[str, Any]:
        """Serialize entity for caching"""
        if hasattr(entity, 'model_dump'):
            return entity.model_dump()
        elif hasattr(entity, 'dict'):
            return entity.dict()
        else:
            return entity.__dict__
    
    def _deserialize_entity(self, data: Dict[str, Any]) -> T:
        """Deserialize entity from cache"""
        # This needs to be implemented by concrete repositories
        # based on their specific entity type
        raise NotImplementedError("Subclasses must implement _deserialize_entity")
    
    async def health_check(self) -> Dict[str, Any]:
        """Repository health check"""
        try:
            # Test database connection
            await self.session.execute(text("SELECT 1"))
            
            # Test cache connection
            cache = await self._get_cache()
            cache_health = await cache.health_check()
            
            return {
                "repository": self._entity_name,
                "database_connected": True,
                "cache_status": cache_health,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "repository": self._entity_name,
                "database_connected": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }