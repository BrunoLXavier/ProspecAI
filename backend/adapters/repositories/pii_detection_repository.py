# PII Detection Repository
# Implements RF-01.02: LGPD Agent for PII detection and masking
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, desc, func, or_

from adapters.database.models import PIIDetectionModel
from domain.entities.pii_detection import (
    PIIDetection, PIIEntity, PIIType, PIIRiskLevel,
    AnonymizationStatus, AnonymizationStrategy
)
from infrastructure.security.encryption import encryption_service


class PIIDetectionRepository:
    """
    Repository for PII detection results and manual review workflow.
    
    Implements RF-01.02: LGPD Agent for PII detection and masking
    Implements RNF-04: Human-in-the-loop for AI decisions
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    def _model_to_entity(self, model: PIIDetectionModel) -> PIIDetection:
        """Convert database model to domain entity."""
        # Parse entities from JSON
        entities = []
        if model.entities:
            for e in model.entities:
                entities.append(PIIEntity(
                    id=UUID(e.get("id")) if e.get("id") else None,
                    pii_type=PIIType(e.get("pii_type", "person")),
                    original_value=e.get("original_value", ""),
                    masked_value=e.get("masked_value"),
                    start_position=e.get("start_position", 0),
                    end_position=e.get("end_position", 0),
                    context=e.get("context"),
                    confidence=e.get("confidence", 0.0),
                    detection_method=e.get("detection_method", "pattern"),
                    risk_level=PIIRiskLevel(e.get("risk_level", "medium")),
                    risk_factors=e.get("risk_factors", []),
                ))
        
        return PIIDetection(
            id=model.id,
            tenant_id=model.tenant_id,
            document_id=model.document_id,
            ingestion_source_id=model.ingestion_source_id,
            file_name=model.file_name,
            file_type=model.file_type,
            entities=entities,
            total_entities=model.total_entities or 0,
            overall_risk_level=PIIRiskLevel(model.overall_risk_level) if model.overall_risk_level else PIIRiskLevel.LOW,
            risk_summary=model.risk_summary or {},
            analyzed_at=model.analyzed_at,
            analysis_duration_ms=model.analysis_duration_ms or 0,
            text_length=model.text_length or 0,
            detection_methods=model.detection_methods or [],
            original_text=self._decrypt_text(model.original_text_encrypted),
            anonymized_text=model.anonymized_text,
            anonymization_status=AnonymizationStatus(model.anonymization_status) if model.anonymization_status else AnonymizationStatus.PENDING_REVIEW,
            anonymization_strategy=AnonymizationStrategy(model.anonymization_strategy) if model.anonymization_strategy else None,
            reviewed_by=model.reviewed_by,
            reviewed_at=model.reviewed_at,
            reviewer_comment=model.reviewer_comment,
            anonymized_by=model.anonymized_by,
            anonymized_at=model.anonymized_at,
            anonymization_error=model.anonymization_error,
            created_at=model.created_at,
            updated_at=model.updated_at,
            created_by=model.created_by,
            deleted_at=model.deleted_at,
        )
    
    def _entity_to_model(self, entity: PIIDetection, model: Optional[PIIDetectionModel] = None) -> PIIDetectionModel:
        """Convert domain entity to database model."""
        if model is None:
            model = PIIDetectionModel(
                id=entity.id,
                tenant_id=entity.tenant_id,
                created_by=entity.created_by or entity.tenant_id,
                updated_by=entity.created_by or entity.tenant_id,
            )
        
        # Serialize entities to JSON
        entities_json = [e.to_dict() for e in entity.entities]
        for e in entities_json:
            e["id"] = str(e["id"])  # Convert UUID to string for JSON
        
        model.document_id = entity.document_id
        model.ingestion_source_id = entity.ingestion_source_id
        model.file_name = entity.file_name
        model.file_type = entity.file_type
        model.entities = entities_json
        model.total_entities = entity.total_entities
        model.overall_risk_level = entity.overall_risk_level.value
        model.risk_summary = entity.risk_summary
        model.analyzed_at = entity.analyzed_at
        model.analysis_duration_ms = entity.analysis_duration_ms
        model.text_length = entity.text_length
        model.detection_methods = entity.detection_methods
        model.original_text_encrypted = self._encrypt_text(entity.original_text)
        model.anonymized_text = entity.anonymized_text
        model.anonymization_status = entity.anonymization_status.value
        model.anonymization_strategy = entity.anonymization_strategy.value if entity.anonymization_strategy else None
        model.reviewed_by = entity.reviewed_by
        model.reviewed_at = entity.reviewed_at
        model.reviewer_comment = entity.reviewer_comment
        model.anonymized_by = entity.anonymized_by
        model.anonymized_at = entity.anonymized_at
        model.anonymization_error = entity.anonymization_error
        
        return model
    
    def _encrypt_text(self, text: Optional[str]) -> Optional[str]:
        """Encrypt text for storage."""
        if not text:
            return None
        return encryption_service.encrypt(text)
    
    def _decrypt_text(self, encrypted_text: Optional[str]) -> Optional[str]:
        """Decrypt stored text."""
        if not encrypted_text:
            return None
        try:
            return encryption_service.decrypt(encrypted_text)
        except Exception:
            return None
    
    # ========== CRUD Operations ==========
    
    async def create(self, entity: PIIDetection) -> PIIDetection:
        """Create a new PII detection record."""
        model = self._entity_to_model(entity)
        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        return self._model_to_entity(model)
    
    async def get_by_id(self, tenant_id: UUID, detection_id: UUID) -> Optional[PIIDetection]:
        """Get a PII detection by ID."""
        result = await self.session.execute(
            select(PIIDetectionModel)
            .where(and_(
                PIIDetectionModel.id == detection_id,
                PIIDetectionModel.tenant_id == tenant_id,
                PIIDetectionModel.deleted_at == None,
            ))
        )
        model = result.scalar_one_or_none()
        return self._model_to_entity(model) if model else None
    
    async def get_detections(
        self,
        tenant_id: UUID,
        status: Optional[AnonymizationStatus] = None,
        risk_level: Optional[PIIRiskLevel] = None,
        pii_type: Optional[PIIType] = None,
        ingestion_source_id: Optional[UUID] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[PIIDetection]:
        """Get PII detections with filtering."""
        query = select(PIIDetectionModel).where(and_(
            PIIDetectionModel.tenant_id == tenant_id,
            PIIDetectionModel.deleted_at == None,
        ))
        
        if status:
            query = query.where(PIIDetectionModel.anonymization_status == status.value)
        
        if risk_level:
            query = query.where(PIIDetectionModel.overall_risk_level == risk_level.value)
        
        if ingestion_source_id:
            query = query.where(PIIDetectionModel.ingestion_source_id == ingestion_source_id)
        
        query = query.order_by(desc(PIIDetectionModel.analyzed_at)).limit(limit).offset(offset)
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        return [self._model_to_entity(m) for m in models]
    
    async def get_pending_review(self, tenant_id: UUID, limit: int = 50) -> List[PIIDetection]:
        """Get PII detections pending review."""
        return await self.get_detections(
            tenant_id=tenant_id,
            status=AnonymizationStatus.PENDING_REVIEW,
            limit=limit,
        )
    
    async def update(self, entity: PIIDetection) -> PIIDetection:
        """Update a PII detection record."""
        result = await self.session.execute(
            select(PIIDetectionModel)
            .where(and_(
                PIIDetectionModel.id == entity.id,
                PIIDetectionModel.tenant_id == entity.tenant_id,
                PIIDetectionModel.deleted_at == None,
            ))
        )
        model = result.scalar_one_or_none()
        
        if not model:
            raise ValueError(f"PII detection not found: {entity.id}")
        
        model = self._entity_to_model(entity, model)
        await self.session.commit()
        await self.session.refresh(model)
        
        return self._model_to_entity(model)
    
    async def approve(
        self,
        tenant_id: UUID,
        detection_id: UUID,
        reviewer_id: UUID,
        strategy: AnonymizationStrategy,
        comment: Optional[str] = None,
    ) -> Optional[PIIDetection]:
        """Approve a PII detection for anonymization."""
        detection = await self.get_by_id(tenant_id, detection_id)
        if not detection:
            return None
        
        detection.approve(reviewer_id, strategy, comment)
        return await self.update(detection)
    
    async def reject(
        self,
        tenant_id: UUID,
        detection_id: UUID,
        reviewer_id: UUID,
        comment: Optional[str] = None,
    ) -> Optional[PIIDetection]:
        """Reject a PII detection (no anonymization needed)."""
        detection = await self.get_by_id(tenant_id, detection_id)
        if not detection:
            return None
        
        detection.reject(reviewer_id, comment)
        return await self.update(detection)
    
    async def batch_approve(
        self,
        tenant_id: UUID,
        detection_ids: List[UUID],
        reviewer_id: UUID,
        strategy: AnonymizationStrategy,
        comment: Optional[str] = None,
    ) -> int:
        """Batch approve multiple PII detections."""
        count = 0
        for detection_id in detection_ids:
            result = await self.approve(tenant_id, detection_id, reviewer_id, strategy, comment)
            if result:
                count += 1
        return count
    
    async def mark_anonymized(
        self,
        tenant_id: UUID,
        detection_id: UUID,
        anonymizer_id: UUID,
        anonymized_text: str,
    ) -> Optional[PIIDetection]:
        """Mark a detection as anonymized after processing."""
        detection = await self.get_by_id(tenant_id, detection_id)
        if not detection:
            return None
        
        detection.mark_anonymized(anonymizer_id, anonymized_text)
        return await self.update(detection)
    
    async def mark_anonymization_failed(
        self,
        tenant_id: UUID,
        detection_id: UUID,
        error: str,
    ) -> Optional[PIIDetection]:
        """Mark anonymization as failed."""
        detection = await self.get_by_id(tenant_id, detection_id)
        if not detection:
            return None
        
        detection.mark_anonymization_failed(error)
        return await self.update(detection)
    
    async def delete(self, tenant_id: UUID, detection_id: UUID) -> bool:
        """Soft delete a PII detection."""
        result = await self.session.execute(
            select(PIIDetectionModel)
            .where(and_(
                PIIDetectionModel.id == detection_id,
                PIIDetectionModel.tenant_id == tenant_id,
                PIIDetectionModel.deleted_at == None,
            ))
        )
        model = result.scalar_one_or_none()
        
        if not model:
            return False
        
        model.deleted_at = datetime.utcnow()
        await self.session.commit()
        
        return True
    
    # ========== Statistics ==========
    
    async def get_statistics(self, tenant_id: UUID) -> Dict[str, Any]:
        """Get aggregated statistics for PII detections."""
        result = await self.session.execute(
            select(
                func.count(PIIDetectionModel.id).label("total_detections"),
                func.sum(PIIDetectionModel.total_entities).label("total_entities"),
            )
            .where(and_(
                PIIDetectionModel.tenant_id == tenant_id,
                PIIDetectionModel.deleted_at == None,
            ))
        )
        row = result.one()
        
        # Get status counts
        status_result = await self.session.execute(
            select(
                PIIDetectionModel.anonymization_status,
                func.count(PIIDetectionModel.id).label("count"),
            )
            .where(and_(
                PIIDetectionModel.tenant_id == tenant_id,
                PIIDetectionModel.deleted_at == None,
            ))
            .group_by(PIIDetectionModel.anonymization_status)
        )
        status_counts = {r.anonymization_status: r.count for r in status_result}
        
        # Get risk level counts
        risk_result = await self.session.execute(
            select(
                PIIDetectionModel.overall_risk_level,
                func.count(PIIDetectionModel.id).label("count"),
            )
            .where(and_(
                PIIDetectionModel.tenant_id == tenant_id,
                PIIDetectionModel.deleted_at == None,
            ))
            .group_by(PIIDetectionModel.overall_risk_level)
        )
        risk_counts = {r.overall_risk_level: r.count for r in risk_result}
        
        return {
            "total_detections": row.total_detections or 0,
            "total_entities": row.total_entities or 0,
            "status_counts": status_counts,
            "risk_counts": risk_counts,
            "pending_review": status_counts.get("pending_review", 0),
        }
