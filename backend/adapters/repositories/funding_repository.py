"""
Enhanced Funding Repository Implementation
Implements RF-02: Gestão de Fontes de Fomento with caching

Features:
- Multi-layer caching integration
- Intelligent search with full-text search
- TRL range filtering
- AI extraction status tracking
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from uuid import UUID
from sqlalchemy import select, and_, or_, func, text
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from domain.entities.funding_source import FundingSource, InstrumentType
from adapters.database.models_new import FundingSourceModel
from adapters.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)


class FundingRepository(BaseRepository[FundingSource, FundingSourceModel]):
    """
    Enhanced funding source repository with caching and AI integration
    """
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, FundingSourceModel)
    
    def _model_to_entity(self, model: FundingSourceModel) -> FundingSource:
        """Convert database model to domain entity"""
        # Normalize TRL fields: support legacy trl_min/trl_max or enhanced trl_range
        trl_min_val = getattr(model, 'trl_min', None)
        trl_max_val = getattr(model, 'trl_max', None)
        if (trl_min_val is None or trl_max_val is None) and hasattr(model, 'trl_range'):
            trl_range = getattr(model, 'trl_range')
            if isinstance(trl_range, (list, tuple)) and len(trl_range) >= 2:
                trl_min_val = trl_min_val or trl_range[0]
                trl_max_val = trl_max_val or trl_range[1]
        # Fallback sensible defaults if still missing
        if trl_min_val is None:
            trl_min_val = 1
        if trl_max_val is None:
            trl_max_val = 9

        return FundingSource(
            id=model.id,
            name=model.name,
            description=model.description,
            institution=model.institution,
            instrument_type=InstrumentType(model.instrument_type),
            trl_min=trl_min_val,
            trl_max=trl_max_val,
            total_amount=model.total_amount,
            available_amount=getattr(model, 'available_amount', model.total_amount if hasattr(model, 'total_amount') else 0),
            currency=(getattr(model, 'currency', None) or 'BRL'),
            submission_start=getattr(model, 'submission_start', None),
            submission_end=getattr(model, 'submission_end', None),
            execution_start=getattr(model, 'execution_start', None),
            execution_end=getattr(model, 'execution_end', None),
            execution_period=getattr(model, 'execution_period', None),
            requirements=getattr(model, 'requirements', None),
            eligibility_criteria=getattr(model, 'eligibility_criteria', None),
            url=(getattr(model, 'url', None) or getattr(model, 'source_url', None)),
            status=getattr(model, 'status', None),
            source_organization=getattr(model, 'source_organization', ''),
            ai_extraction_status=getattr(model, 'ai_extraction_status', None),
            ai_extracted_fields=getattr(model, 'ai_extracted_fields', None),
            ai_processed_at=getattr(model, 'ai_processed_at', None),
            contains_pii=getattr(model, 'contains_pii', False),
            pii_anonymized=getattr(model, 'pii_anonymized', False),
            lgpd_categories=getattr(model, 'lgpd_categories', None),
            tenant_id=getattr(model, 'tenant_id', None),
            created_by=getattr(model, 'created_by', None),
            updated_by=getattr(model, 'updated_by', None),
            created_at=getattr(model, 'created_at', None),
            updated_at=getattr(model, 'updated_at', None),
            version=getattr(model, 'version', 1)
        )
    
    def _entity_to_model(self, entity: FundingSource, model: Optional[FundingSourceModel] = None) -> FundingSourceModel:
        """Convert domain entity to database model"""
        if model is None:
            model = FundingSourceModel()
        
        model.id = entity.id
        model.name = entity.name
        model.description = entity.description
        model.institution = entity.institution
        model.instrument_type = entity.instrument_type.value
        model.trl_min = entity.trl_min
        model.trl_max = entity.trl_max
        model.total_amount = entity.total_amount
        model.available_amount = getattr(entity, 'available_amount', None)
        model.currency = entity.currency
        model.submission_start = entity.submission_start
        model.submission_end = entity.submission_end
        model.execution_start = getattr(entity, 'execution_start', None)
        model.execution_end = getattr(entity, 'execution_end', None)
        model.execution_period = getattr(entity, 'execution_period', None)
        model.requirements = getattr(entity, 'requirements', None)
        model.eligibility_criteria = getattr(entity, 'eligibility_criteria', None)
        # Map either `url` or `source_url` from entity to model
        if hasattr(entity, 'url') and entity.url is not None:
            model.url = entity.url
        else:
            model.source_url = getattr(entity, 'source_url', None)
        model.status = entity.status
        model.ai_extraction_status = entity.ai_extraction_status
        model.ai_extracted_fields = entity.ai_extracted_fields
        model.ai_processed_at = entity.ai_processed_at
        model.contains_pii = entity.contains_pii
        model.pii_anonymized = entity.pii_anonymized
        model.lgpd_categories = entity.lgpd_categories
        
        return model
    
    def _deserialize_entity(self, data: Dict[str, Any]) -> FundingSource:
        """Deserialize entity from cache"""
        return FundingSource(**data)
    
    async def search_by_text(
        self,
        tenant_id: str,
        search_text: str,
        skip: int = 0,
        limit: int = 20
    ) -> List[FundingSource]:
        """
        Full-text search in funding sources using PostgreSQL tsvector
        """
        try:
            cache_key = self._cache_key(
                "search", tenant_id, f"text:{search_text}", 
                f"skip:{skip}", f"limit:{limit}"
            )
            
            # Check cache
            cache = await self._get_cache()
            cached_data = await cache.get(cache_key)
            if cached_data:
                return [self._deserialize_entity(item) for item in cached_data]
            
            # PostgreSQL full-text search query
            query = select(FundingSourceModel).where(
                and_(
                    FundingSourceModel.tenant_id == tenant_id,
                    FundingSourceModel.deleted_at.is_(None),
                    func.to_tsvector('portuguese', 
                        FundingSourceModel.name + ' ' + 
                        func.coalesce(FundingSourceModel.description, '')
                    ).match(search_text)
                )
            ).order_by(
                func.ts_rank(
                    func.to_tsvector('portuguese', 
                        FundingSourceModel.name + ' ' + 
                        func.coalesce(FundingSourceModel.description, '')
                    ),
                    func.plainto_tsquery('portuguese', search_text)
                ).desc()
            ).offset(skip).limit(limit)
            
            result = await self.session.execute(query)
            models = result.scalars().all()
            
            entities = [self._model_to_entity(model) for model in models]
            
            # Cache results
            serialized = [self._serialize_entity(entity) for entity in entities]
            await cache.set(cache_key, serialized, ttl=300)  # 5 minute cache
            
            return entities
            
        except Exception as e:
            logger.error(f"Error searching funding sources: {e}")
            raise
    
    async def filter_by_trl(
        self,
        tenant_id: str,
        min_trl: int,
        max_trl: int,
        skip: int = 0,
        limit: int = 20
    ) -> List[FundingSource]:
        """
        Filter funding sources by TRL range
        """
        try:
            cache_key = self._cache_key(
                "trl_filter", tenant_id, f"trl:{min_trl}-{max_trl}",
                f"skip:{skip}", f"limit:{limit}"
            )
            
            # Check cache
            cache = await self._get_cache()
            cached_data = await cache.get(cache_key)
            if cached_data:
                return [self._deserialize_entity(item) for item in cached_data]
            
            # Query with TRL range intersection
            query = select(FundingSourceModel).where(
                and_(
                    FundingSourceModel.tenant_id == tenant_id,
                    FundingSourceModel.deleted_at.is_(None),
                    FundingSourceModel.trl_range.overlaps(
                        func.int4range(min_trl, max_trl + 1)
                    )
                )
            ).order_by(FundingSourceModel.submission_end.asc()).offset(skip).limit(limit)
            
            result = await self.session.execute(query)
            models = result.scalars().all()
            
            entities = [self._model_to_entity(model) for model in models]
            
            # Cache results
            serialized = [self._serialize_entity(entity) for entity in entities]
            await cache.set(cache_key, serialized, ttl=600)  # 10 minute cache
            
            return entities
            
        except Exception as e:
            logger.error(f"Error filtering funding by TRL: {e}")
            raise
    
    async def get_active_opportunities(
        self,
        tenant_id: str,
        current_date: Optional[date] = None
    ) -> List[FundingSource]:
        """
        Get currently active funding opportunities
        """
        if current_date is None:
            current_date = date.today()
        
        try:
            cache_key = self._cache_key(
                "active", tenant_id, f"date:{current_date}"
            )
            
            # Check cache
            cache = await self._get_cache()
            cached_data = await cache.get(cache_key)
            if cached_data:
                return [self._deserialize_entity(item) for item in cached_data]
            
            query = select(FundingSourceModel).where(
                and_(
                    FundingSourceModel.tenant_id == tenant_id,
                    FundingSourceModel.deleted_at.is_(None),
                    FundingSourceModel.status == 'active',
                    FundingSourceModel.submission_start <= current_date,
                    FundingSourceModel.submission_end >= current_date
                )
            ).order_by(FundingSourceModel.submission_end.asc())
            
            result = await self.session.execute(query)
            models = result.scalars().all()
            
            entities = [self._model_to_entity(model) for model in models]
            
            # Cache results with shorter TTL for active data
            serialized = [self._serialize_entity(entity) for entity in entities]
            await cache.set(cache_key, serialized, ttl=300)  # 5 minute cache
            
            return entities
            
        except Exception as e:
            logger.error(f"Error getting active funding opportunities: {e}")
            raise
    
    async def get_by_ai_status(
        self,
        tenant_id: str,
        ai_status: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[FundingSource]:
        """
        Get funding sources by AI extraction status
        """
        try:
            query = select(FundingSourceModel).where(
                and_(
                    FundingSourceModel.tenant_id == tenant_id,
                    FundingSourceModel.deleted_at.is_(None),
                    FundingSourceModel.ai_extraction_status == ai_status
                )
            ).order_by(FundingSourceModel.created_at.desc()).offset(skip).limit(limit)
            
            result = await self.session.execute(query)
            models = result.scalars().all()
            
            return [self._model_to_entity(model) for model in models]
            
        except Exception as e:
            logger.error(f"Error getting funding by AI status: {e}")
            raise
    
    async def update_ai_extraction(
        self,
        funding_id: UUID,
        tenant_id: str,
        ai_status: str,
        extracted_fields: Dict[str, Any],
        updated_by: UUID,
        contains_pii: bool = False,
        lgpd_categories: Optional[List[str]] = None
    ) -> bool:
        """
        Update AI extraction results for funding source
        """
        try:
            query = select(FundingSourceModel).where(
                and_(
                    FundingSourceModel.id == funding_id,
                    FundingSourceModel.tenant_id == tenant_id,
                    FundingSourceModel.deleted_at.is_(None)
                )
            )
            
            result = await self.session.execute(query)
            model = result.scalar_one_or_none()
            
            if not model:
                return False
            
            # Update AI extraction fields
            model.ai_extraction_status = ai_status
            model.ai_extracted_fields = extracted_fields
            model.ai_processed_at = datetime.utcnow()
            model.contains_pii = contains_pii
            model.lgpd_categories = lgpd_categories
            model.updated_by = updated_by
            model.updated_at = datetime.utcnow()
            model.version += 1
            
            await self.session.commit()
            
            # Invalidate caches
            await CacheInvalidator.invalidate_funding_source(
                await self._get_cache(), tenant_id, str(funding_id)
            )
            
            return True
            
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error updating AI extraction for funding {funding_id}: {e}")
            raise
    
    async def get_statistics(self, tenant_id: str) -> Dict[str, Any]:
        """
        Get funding source statistics for analytics
        """
        try:
            cache_key = self._cache_key("stats", tenant_id)
            
            # Check cache
            cache = await self._get_cache()
            cached_data = await cache.get(cache_key)
            if cached_data:
                return cached_data
            
            # Count by status
            status_query = select(
                FundingSourceModel.status,
                func.count(FundingSourceModel.id).label('count')
            ).where(
                and_(
                    FundingSourceModel.tenant_id == tenant_id,
                    FundingSourceModel.deleted_at.is_(None)
                )
            ).group_by(FundingSourceModel.status)
            
            status_result = await self.session.execute(status_query)
            status_counts = dict(status_result.fetchall())
            
            # Count by AI extraction status
            ai_status_query = select(
                FundingSourceModel.ai_extraction_status,
                func.count(FundingSourceModel.id).label('count')
            ).where(
                and_(
                    FundingSourceModel.tenant_id == tenant_id,
                    FundingSourceModel.deleted_at.is_(None)
                )
            ).group_by(FundingSourceModel.ai_extraction_status)
            
            ai_status_result = await self.session.execute(ai_status_query)
            ai_status_counts = dict(ai_status_result.fetchall())
            
            # Total funding amount
            total_amount_query = select(
                func.sum(FundingSourceModel.total_amount)
            ).where(
                and_(
                    FundingSourceModel.tenant_id == tenant_id,
                    FundingSourceModel.deleted_at.is_(None),
                    FundingSourceModel.status == 'active'
                )
            )
            
            total_result = await self.session.execute(total_amount_query)
            total_amount = total_result.scalar() or 0
            
            stats = {
                "status_distribution": status_counts,
                "ai_extraction_distribution": ai_status_counts,
                "total_active_funding": float(total_amount),
                "last_updated": datetime.utcnow().isoformat()
            }
            
            # Cache for 15 minutes
            await cache.set(cache_key, stats, ttl=900)
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting funding statistics: {e}")
            raise

    async def find_by_criteria(
        self,
        criteria: Dict[str, Any],
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        use_cache: bool = True
    ) -> List[FundingSource]:
        """
        Extend base finder to support `institute_ids` filter. When provided,
        restrict funding sources to those linked to projects belonging to the
        given institutes via opportunities.
        """
        try:
            institute_ids = None
            if 'institute_ids' in criteria:
                institute_ids = criteria.pop('institute_ids')

            if institute_ids:
                if 'tenant_id' not in criteria:
                    raise ValueError('tenant_id is required in criteria when using institute filters')
                # Resolve funding_source ids via joins: funding_sources -> opportunities -> projects
                params = {f"inst_{i}": iid for i, iid in enumerate(institute_ids)}
                placeholders = ", ".join([f":inst_{i}" for i in range(len(institute_ids))])
                sql = f"SELECT DISTINCT f.id FROM funding_sources f JOIN opportunities o ON o.funding_source_id = f.id JOIN projects p ON o.project_id = p.id WHERE f.tenant_id = :tenant_id AND f.deleted_at IS NULL AND p.institute_id IN ({placeholders})"
                params['tenant_id'] = criteria['tenant_id']
                res = await self.session.execute(sa.text(sql), params)
                rows = res.fetchall()
                funding_ids = [r[0] for r in rows]
                if not funding_ids:
                    return []

                # Restrict by ids and delegate to base finder
                new_criteria = {'id': funding_ids, 'tenant_id': criteria['tenant_id']}
                return await super().find_by_criteria(new_criteria, skip=skip, limit=limit, order_by=order_by, use_cache=use_cache)

            return await super().find_by_criteria(criteria, skip=skip, limit=limit, order_by=order_by, use_cache=use_cache)

        except Exception as e:
            logger.error(f"Error finding funding by criteria: {e}")
            raise

    async def get_by_id(self, funding_id: str) -> Optional[FundingSource]:
        """
        Get funding source by ID
        """
        stmt = select(FundingSourceModel).where(
            and_(
                FundingSourceModel.id == funding_id,
                FundingSourceModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        
        return self._to_entity(model) if model else None
    
    async def list(
        self,
        status: Optional[str] = None,
        instrument_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[FundingSource]:
        """
        List funding sources with filters
        """
        conditions = [FundingSourceModel.deleted_at.is_(None)]
        
        if status:
            conditions.append(FundingSourceModel.status == status)
        
        if instrument_type:
            conditions.append(FundingSourceModel.instrument_type == instrument_type)
        
        stmt = (
            select(FundingSourceModel)
            .where(and_(*conditions))
            .offset(skip)
            .limit(limit)
            .order_by(FundingSourceModel.submission_end.desc())
        )
        
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        
        return [self._to_entity(model) for model in models]
    
    async def update(self, funding_source: FundingSource) -> FundingSource:
        """
        Update funding source
        """
        stmt = select(FundingSourceModel).where(
            FundingSourceModel.id == funding_source.id
        )
        
        result = await self.session.execute(stmt)
        model = result.scalar_one()
        
        # Update fields
        model.name = funding_source.name
        model.status = funding_source.status
        model.total_amount = funding_source.total_amount
        model.submission_end = funding_source.submission_end
        model.description = funding_source.description
        model.requirements = funding_source.requirements
        model.eligibility_criteria = funding_source.eligibility_criteria
        model.ai_confidence_score = funding_source.ai_confidence_score
        
        await self.session.commit()
        await self.session.refresh(model)
        
        return self._to_entity(model)
    
    async def delete(self, funding_id: str) -> bool:
        """
        Soft delete funding source
        """
        stmt = select(FundingSourceModel).where(
            FundingSourceModel.id == funding_id
        )
        
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        
        if not model:
            return False
        
        from datetime import datetime
        model.deleted_at = datetime.utcnow()
        
        await self.session.commit()
        return True
    
    def _to_entity(self, model: FundingSourceModel) -> FundingSource:
        """
        Convert database model to domain entity
        """
        return FundingSource(
            id=model.id,
            tenant_id=model.tenant_id,
            name=model.name,
            institution=model.institution,
            instrument_type=InstrumentType(model.instrument_type),
            status=model.status,
            total_amount=model.total_amount,
            submission_start=model.submission_start,
            submission_end=model.submission_end,
            trl_min=model.trl_min,
            trl_max=model.trl_max,
            description=model.description,
            requirements=model.requirements,
            eligibility_criteria=model.eligibility_criteria,
            ai_confidence_score=model.ai_confidence_score,
            ai_extracted_fields=model.ai_extracted_fields,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
