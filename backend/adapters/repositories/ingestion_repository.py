# Data Ingestion Repository
# Implements RF-01: Data Ingestion and Multi-source Orchestration
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, desc, func, text
from sqlalchemy.exc import ProgrammingError

from adapters.database.models import IngestionJobModel, IngestionSourceModel
from domain.entities.ingestion import (
    IngestionJob, IngestionSource, IngestionJobStatus,
    IngestionSourceType, FileType
)

logger = logging.getLogger(__name__)


class IngestionRepository:
    """
    Repository for data ingestion jobs and sources.
    
    Implements RF-01: Data Ingestion and Multi-source Orchestration
    Implements RF-01.01: Batch and real-time processing via Kafka
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    # ========== Job Model Conversions ==========
    
    def _job_model_to_entity(self, model: IngestionJobModel) -> IngestionJob:
        """Convert database model to domain entity."""
        # Map DB columns to entity fields (DB uses different naming)
        return IngestionJob(
            id=model.id,
            tenant_id=model.tenant_id,
            name=model.name,
            description=model.description,
            status=IngestionJobStatus(model.status) if model.status else IngestionJobStatus.PENDING,
            started_at=model.started_at,
            completed_at=model.completed_at,
            total_files=model.total_files or 0,
            processed_files=model.processed_files or 0,
            failed_files=0,  # Not in current DB schema
            total_size=0,  # Not in current DB schema
            total_records=model.total_records or 0,
            valid_records=getattr(model, 'processed_records', 0) or 0,  # Map processed_records -> valid_records
            invalid_records=getattr(model, 'failed_records', 0) or 0,  # Map failed_records -> invalid_records
            total_pii_entities=getattr(model, 'pii_detected_count', 0) or 0,  # Map pii_detected_count -> total_pii_entities
            pending_pii_review=0,  # Not in current DB schema
            highest_risk_level=None,  # Not in current DB schema
            current_file=getattr(model, 'current_step', None),  # Map current_step -> current_file
            progress_percent=float(getattr(model, 'progress_percentage', 0) or 0),  # Map progress_percentage -> progress_percent
            estimated_time_remaining=None,  # Not in current DB schema
            error_message=model.error_message,
            error_details=getattr(model, 'error_details', {}) or {},
            created_at=model.created_at,
            updated_at=model.updated_at,
            created_by=model.created_by,
            updated_by=model.updated_by,
            deleted_at=model.deleted_at,
        )
    
    def _job_entity_to_model(self, entity: IngestionJob, model: Optional[IngestionJobModel] = None) -> IngestionJobModel:
        """Convert domain entity to database model."""
        if model is None:
            model = IngestionJobModel(
                id=entity.id,
                tenant_id=entity.tenant_id,
                created_by=entity.created_by or entity.tenant_id,
                updated_by=entity.updated_by or entity.tenant_id,
            )
        
        model.name = entity.name
        model.description = entity.description
        model.status = entity.status.value
        model.started_at = entity.started_at
        model.completed_at = entity.completed_at
        model.total_files = entity.total_files
        model.processed_files = entity.processed_files
        model.total_records = entity.total_records
        # Map entity fields to DB columns
        model.processed_records = entity.valid_records
        model.failed_records = entity.invalid_records
        model.pii_detected_count = entity.total_pii_entities
        model.pii_anonymized_count = entity.pending_pii_review
        model.current_step = entity.current_file
        model.progress_percentage = entity.progress_percent
        model.error_message = entity.error_message
        model.updated_by = entity.updated_by or entity.tenant_id
        
        return model
    
    # ========== Source Model Conversions ==========
    
    def _source_model_to_entity(self, model: IngestionSourceModel) -> IngestionSource:
        """Convert source database model to domain entity."""
        return IngestionSource(
            id=model.id,
            job_id=model.job_id,
            tenant_id=model.tenant_id,
            source_type=IngestionSourceType(model.source_type) if model.source_type else IngestionSourceType.FILE_UPLOAD,
            file_name=model.file_name,
            file_type=FileType(model.file_type) if model.file_type else None,
            file_size=model.file_size or 0,
            storage_bucket=model.storage_bucket or "",
            storage_key=model.storage_key or "",
            status=IngestionJobStatus(model.status) if model.status else IngestionJobStatus.PENDING,
            processed_at=model.processed_at,
            error_message=model.error_message,
            record_count=model.record_count or 0,
            valid_records=model.valid_records or 0,
            invalid_records=model.invalid_records or 0,
            pii_detection_id=model.pii_detection_id,
            pii_entities_count=model.pii_entities_count or 0,
            pii_risk_level=model.pii_risk_level,
            original_metadata=model.original_metadata or {},
            created_at=model.created_at,
            updated_at=model.updated_at,
            created_by=model.created_by,
        )
    
    def _source_entity_to_model(self, entity: IngestionSource, model: Optional[IngestionSourceModel] = None) -> IngestionSourceModel:
        """Convert source entity to database model."""
        if model is None:
            model = IngestionSourceModel(
                id=entity.id,
                tenant_id=entity.tenant_id,
                created_by=entity.created_by or entity.tenant_id,
                updated_by=entity.created_by or entity.tenant_id,
            )
        
        model.job_id = entity.job_id
        model.source_type = entity.source_type.value
        model.file_name = entity.file_name
        model.file_type = entity.file_type.value if entity.file_type else None
        model.file_size = entity.file_size
        model.storage_bucket = entity.storage_bucket
        model.storage_key = entity.storage_key
        model.status = entity.status.value
        model.processed_at = entity.processed_at
        model.error_message = entity.error_message
        model.record_count = entity.record_count
        model.valid_records = entity.valid_records
        model.invalid_records = entity.invalid_records
        model.pii_detection_id = entity.pii_detection_id
        model.pii_entities_count = entity.pii_entities_count
        model.pii_risk_level = entity.pii_risk_level
        model.original_metadata = entity.original_metadata
        
        return model
    
    # ========== Job CRUD Operations ==========
    
    async def create_job(self, entity: IngestionJob) -> IngestionJob:
        """Create a new ingestion job."""
        model = self._job_entity_to_model(entity)
        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        return self._job_model_to_entity(model)
    
    async def get_job_by_id(self, tenant_id: UUID, job_id: UUID) -> Optional[IngestionJob]:
        """Get an ingestion job by ID."""
        try:
            result = await self.session.execute(
                select(IngestionJobModel)
                .where(and_(
                    IngestionJobModel.id == job_id,
                    IngestionJobModel.tenant_id == tenant_id,
                    IngestionJobModel.deleted_at == None,
                ))
            )
            model = result.scalar_one_or_none()
            return self._job_model_to_entity(model) if model else None
        except ProgrammingError:
            # Fallback for databases missing recent columns (migration drift).
            try:
                q = text("""
                    SELECT id, tenant_id, name, description, status, started_at,
                           completed_at, total_files, processed_files, total_size,
                           total_records, valid_records, invalid_records,
                           total_pii_entities, pending_pii_review, highest_risk_level,
                           current_file, progress_percent, estimated_time_remaining,
                           error_message, error_details, created_at, updated_at,
                           created_by, updated_by, deleted_at
                    FROM ingestion_jobs
                    WHERE id = :jid AND tenant_id = :tid AND deleted_at IS NULL
                """)
                res = await self.session.execute(q, {"jid": job_id, "tid": tenant_id})
                row = res.fetchone()
                if not row:
                    return None
                # Build a minimal model-like object using attribute access
                class _R:
                    pass

                m = _R()
                for k in row.keys():
                    setattr(m, k, getattr(row, k))
                # ensure failed_files exists
                if not hasattr(m, "failed_files"):
                    m.failed_files = 0

                return self._job_model_to_entity(m)
            except Exception:
                return None
    
    async def get_jobs(
        self,
        tenant_id: UUID,
        status: Optional[IngestionJobStatus] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[IngestionJob]:
        """Get ingestion jobs with optional filtering."""
        logger.info(f"get_jobs called with tenant_id={tenant_id}, status={status}, limit={limit}")
        query = select(IngestionJobModel).where(and_(
            IngestionJobModel.tenant_id == tenant_id,
            IngestionJobModel.deleted_at == None,
        ))
        
        if status:
            query = query.where(IngestionJobModel.status == status.value)
        
        query = query.order_by(desc(IngestionJobModel.created_at)).limit(limit).offset(offset)
        
        try:
            result = await self.session.execute(query)
            models = result.scalars().all()
            logger.info(f"get_jobs ORM query returned {len(models)} models")
            return [self._job_model_to_entity(m) for m in models]
        except ProgrammingError as pe:
            logger.warning(f"get_jobs ORM query failed, using fallback: {pe}")
            # Reduced-column fallback with actual DB column names
            try:
                q = text("""
                    SELECT id, tenant_id, name, description, status, source_type,
                           started_at, completed_at, total_files, processed_files,
                           total_records, processed_records, failed_records,
                           pii_detected_count, pii_anonymized_count,
                           current_step, progress_percentage,
                           error_message, error_details, created_at, updated_at,
                           created_by, updated_by, deleted_at
                    FROM ingestion_jobs
                    WHERE tenant_id = :tid AND deleted_at IS NULL
                    ORDER BY created_at DESC
                    LIMIT :lim OFFSET :off
                """)
                res = await self.session.execute(q, {"tid": tenant_id, "lim": limit, "off": offset})
                rows = res.fetchall()
                logger.info(f"get_jobs fallback SQL returned {len(rows)} rows")
                out = []
                class _R:
                    pass

                for row in rows:
                    m = _R()
                    for k in row.keys():
                        setattr(m, k, getattr(row, k))
                    out.append(self._job_model_to_entity(m))
                return out
            except Exception as ex:
                logger.error(f"get_jobs fallback failed: {ex}")
                return []
    
    async def update_job(self, entity: IngestionJob) -> IngestionJob:
        """Update an ingestion job."""
        result = await self.session.execute(
            select(IngestionJobModel)
            .where(and_(
                IngestionJobModel.id == entity.id,
                IngestionJobModel.tenant_id == entity.tenant_id,
                IngestionJobModel.deleted_at == None,
            ))
        )
        model = result.scalar_one_or_none()
        
        if not model:
            raise ValueError(f"Ingestion job not found: {entity.id}")
        
        model = self._job_entity_to_model(entity, model)
        await self.session.commit()
        await self.session.refresh(model)
        
        return self._job_model_to_entity(model)
    
    async def delete_job(self, tenant_id: UUID, job_id: UUID) -> bool:
        """Soft delete an ingestion job."""
        result = await self.session.execute(
            select(IngestionJobModel)
            .where(and_(
                IngestionJobModel.id == job_id,
                IngestionJobModel.tenant_id == tenant_id,
                IngestionJobModel.deleted_at == None,
            ))
        )
        model = result.scalar_one_or_none()
        
        if not model:
            return False
        
        model.deleted_at = datetime.utcnow()
        await self.session.commit()
        
        return True
    
    # ========== Source CRUD Operations ==========
    
    async def create_source(self, entity: IngestionSource) -> IngestionSource:
        """Create a new ingestion source."""
        model = self._source_entity_to_model(entity)
        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        return self._source_model_to_entity(model)
    
    async def create_sources_batch(self, entities: List[IngestionSource]) -> List[IngestionSource]:
        """Create multiple ingestion sources in a batch."""
        models = [self._source_entity_to_model(e) for e in entities]
        self.session.add_all(models)
        await self.session.commit()
        
        for model in models:
            await self.session.refresh(model)
        
        return [self._source_model_to_entity(m) for m in models]
    
    async def get_sources_by_job(self, tenant_id: UUID, job_id: UUID) -> List[IngestionSource]:
        """Get all sources for an ingestion job."""
        result = await self.session.execute(
            select(IngestionSourceModel)
            .where(and_(
                IngestionSourceModel.job_id == job_id,
                IngestionSourceModel.tenant_id == tenant_id,
            ))
            .order_by(IngestionSourceModel.created_at)
        )
        models = result.scalars().all()
        return [self._source_model_to_entity(m) for m in models]
    
    async def update_source(self, entity: IngestionSource) -> IngestionSource:
        """Update an ingestion source."""
        result = await self.session.execute(
            select(IngestionSourceModel)
            .where(and_(
                IngestionSourceModel.id == entity.id,
                IngestionSourceModel.tenant_id == entity.tenant_id,
            ))
        )
        model = result.scalar_one_or_none()
        
        if not model:
            raise ValueError(f"Ingestion source not found: {entity.id}")
        
        model = self._source_entity_to_model(entity, model)
        await self.session.commit()
        await self.session.refresh(model)
        
        return self._source_model_to_entity(model)
    
    # ========== Statistics ==========
    
    async def get_job_statistics(self, tenant_id: UUID) -> Dict[str, Any]:
        """Get aggregated statistics for ingestion jobs."""
        try:
            result = await self.session.execute(
                select(
                    func.count(IngestionJobModel.id).label("total_jobs"),
                    func.sum(IngestionJobModel.total_files).label("total_files"),
                    func.sum(IngestionJobModel.total_records).label("total_records"),
                    func.sum(IngestionJobModel.total_pii_entities).label("total_pii_entities"),
                )
                .where(and_(
                    IngestionJobModel.tenant_id == tenant_id,
                    IngestionJobModel.deleted_at == None,
                ))
            )
            row = result.one()

            # Get status counts
            status_result = await self.session.execute(
                select(
                    IngestionJobModel.status,
                    func.count(IngestionJobModel.id).label("count"),
                )
                .where(and_(
                    IngestionJobModel.tenant_id == tenant_id,
                    IngestionJobModel.deleted_at == None,
                ))
                .group_by(IngestionJobModel.status)
            )
            status_counts = {r.status: r.count for r in status_result}

            return {
                "total_jobs": row.total_jobs or 0,
                "total_files": row.total_files or 0,
                "total_records": row.total_records or 0,
                "total_pii_entities": row.total_pii_entities or 0,
                "status_counts": status_counts,
            }
        except ProgrammingError:
            # Fallback: try simple aggregate via raw SQL without newer columns
            try:
                q = text("""
                    SELECT
                        COUNT(id) AS total_jobs,
                        COALESCE(SUM(total_files),0) AS total_files,
                        COALESCE(SUM(total_records),0) AS total_records,
                        COALESCE(SUM(total_pii_entities),0) AS total_pii_entities
                    FROM ingestion_jobs
                    WHERE tenant_id = :tid AND deleted_at IS NULL
                """)
                res = await self.session.execute(q, {"tid": tenant_id})
                row = res.fetchone()

                status_q = text("""
                    SELECT status, COUNT(id) AS count
                    FROM ingestion_jobs
                    WHERE tenant_id = :tid AND deleted_at IS NULL
                    GROUP BY status
                """)
                sres = await self.session.execute(status_q, {"tid": tenant_id})
                srows = sres.fetchall()
                status_counts = {r.status: r.count for r in srows}

                return {
                    "total_jobs": int(row.total_jobs or 0),
                    "total_files": int(row.total_files or 0),
                    "total_records": int(row.total_records or 0),
                    "total_pii_entities": int(row.total_pii_entities or 0),
                    "status_counts": status_counts,
                }
            except Exception:
                return {
                    "total_jobs": 0,
                    "total_files": 0,
                    "total_records": 0,
                    "total_pii_entities": 0,
                    "status_counts": {},
                }
