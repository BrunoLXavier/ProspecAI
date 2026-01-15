# PII Review Use Case
# Implements RF-01.02: LGPD Agent with Human-in-the-loop
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from domain.entities.pii_detection import (
    PIIDetection, PIIEntity, PIIType, PIIRiskLevel,
    AnonymizationStatus, AnonymizationStrategy
)
from adapters.repositories.pii_detection_repository import PIIDetectionRepository
from services.ai.lgpd_ner_service import LGPDService


@dataclass
class PIIDetectionOutput:
    """Output data for PII detection results."""
    id: str
    document_id: Optional[str]
    ingestion_source_id: Optional[str]
    file_name: str
    file_type: Optional[str]
    total_entities: int
    overall_risk_level: str
    risk_summary: Dict[str, int]
    anonymization_status: str
    anonymization_strategy: Optional[str]
    reviewed_by: Optional[str]
    reviewed_at: Optional[str]
    reviewer_comment: Optional[str]
    anonymized_at: Optional[str]
    analyzed_at: str
    created_at: str
    entities: List[Dict[str, Any]]


@dataclass
class ApprovalInput:
    """Input for approval action."""
    strategy: str  # mask, pseudonymize, remove, hash
    comment: Optional[str] = None


@dataclass
class RejectionInput:
    """Input for rejection action."""
    comment: Optional[str] = None


class ManagePIIReviewUseCase:
    """
    Use case for managing PII detection review workflow.
    Implements human-in-the-loop for LGPD compliance.
    
    Implements RF-01.02: LGPD Agent for PII detection and masking
    Implements RNF-04: Human-in-the-loop for AI decisions
    """
    
    def __init__(
        self,
        repository: PIIDetectionRepository,
        lgpd_service: Optional[LGPDService] = None,
    ):
        self.repository = repository
        self.lgpd_service = lgpd_service or LGPDService()
    
    async def get_detection(
        self,
        tenant_id: UUID,
        detection_id: UUID,
    ) -> Optional[PIIDetectionOutput]:
        """Get a single PII detection by ID."""
        detection = await self.repository.get_by_id(tenant_id, detection_id)
        if not detection:
            return None
        return self._to_output(detection)
    
    async def get_detections(
        self,
        tenant_id: UUID,
        status: Optional[str] = None,
        risk_level: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[PIIDetectionOutput]:
        """Get PII detections with filtering."""
        status_enum = AnonymizationStatus(status) if status else None
        risk_enum = PIIRiskLevel(risk_level) if risk_level else None
        
        detections = await self.repository.get_detections(
            tenant_id=tenant_id,
            status=status_enum,
            risk_level=risk_enum,
            limit=limit,
            offset=offset,
        )
        
        return [self._to_output(d) for d in detections]
    
    async def get_pending_review(
        self,
        tenant_id: UUID,
        limit: int = 50,
    ) -> List[PIIDetectionOutput]:
        """Get PII detections pending review."""
        detections = await self.repository.get_pending_review(tenant_id, limit)
        return [self._to_output(d) for d in detections]
    
    async def approve(
        self,
        tenant_id: UUID,
        detection_id: UUID,
        reviewer_id: UUID,
        input_data: ApprovalInput,
    ) -> Optional[PIIDetectionOutput]:
        """
        Approve a PII detection for anonymization.
        Sets status to 'approved' and schedules anonymization.
        """
        try:
            strategy = AnonymizationStrategy(input_data.strategy)
        except ValueError:
            raise ValueError(f"Invalid anonymization strategy: {input_data.strategy}")
        
        detection = await self.repository.approve(
            tenant_id=tenant_id,
            detection_id=detection_id,
            reviewer_id=reviewer_id,
            strategy=strategy,
            comment=input_data.comment,
        )
        
        if not detection:
            return None
        
        return self._to_output(detection)
    
    async def reject(
        self,
        tenant_id: UUID,
        detection_id: UUID,
        reviewer_id: UUID,
        input_data: RejectionInput,
    ) -> Optional[PIIDetectionOutput]:
        """
        Reject a PII detection.
        Indicates no anonymization is needed for this document.
        """
        detection = await self.repository.reject(
            tenant_id=tenant_id,
            detection_id=detection_id,
            reviewer_id=reviewer_id,
            comment=input_data.comment,
        )
        
        if not detection:
            return None
        
        return self._to_output(detection)
    
    async def batch_approve(
        self,
        tenant_id: UUID,
        detection_ids: List[UUID],
        reviewer_id: UUID,
        strategy: str,
        comment: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Batch approve multiple PII detections.
        Returns count of successfully approved items.
        """
        try:
            strategy_enum = AnonymizationStrategy(strategy)
        except ValueError:
            raise ValueError(f"Invalid anonymization strategy: {strategy}")
        
        count = await self.repository.batch_approve(
            tenant_id=tenant_id,
            detection_ids=detection_ids,
            reviewer_id=reviewer_id,
            strategy=strategy_enum,
            comment=comment,
        )
        
        return {
            "total_requested": len(detection_ids),
            "approved_count": count,
            "failed_count": len(detection_ids) - count,
        }
    
    async def execute_anonymization(
        self,
        tenant_id: UUID,
        detection_id: UUID,
        executor_id: UUID,
    ) -> Optional[PIIDetectionOutput]:
        """
        Execute anonymization on an approved detection.
        Only works on detections with status 'approved'.
        """
        detection = await self.repository.get_by_id(tenant_id, detection_id)
        
        if not detection:
            return None
        
        if detection.anonymization_status != AnonymizationStatus.APPROVED:
            raise ValueError(
                f"Detection must be approved before anonymization. "
                f"Current status: {detection.anonymization_status.value}"
            )
        
        if not detection.anonymization_strategy:
            raise ValueError("No anonymization strategy specified")
        
        try:
            # Get original text
            original_text = detection.original_text
            if not original_text:
                raise ValueError("No original text available for anonymization")
            
            # Apply anonymization strategy
            anonymized_text = self._apply_anonymization(
                text=original_text,
                entities=detection.entities,
                strategy=detection.anonymization_strategy,
            )
            
            # Update detection
            updated = await self.repository.mark_anonymized(
                tenant_id=tenant_id,
                detection_id=detection_id,
                anonymizer_id=executor_id,
                anonymized_text=anonymized_text,
            )
            
            return self._to_output(updated) if updated else None
            
        except Exception as e:
            # Mark as failed
            await self.repository.mark_anonymization_failed(
                tenant_id=tenant_id,
                detection_id=detection_id,
                error=str(e),
            )
            raise
    
    def _apply_anonymization(
        self,
        text: str,
        entities: List[PIIEntity],
        strategy: AnonymizationStrategy,
    ) -> str:
        """Apply anonymization strategy to text."""
        # Sort entities by position in reverse order to maintain positions
        sorted_entities = sorted(entities, key=lambda e: e.start_position, reverse=True)
        
        result = text
        
        for entity in sorted_entities:
            replacement = self._get_replacement(entity, strategy)
            result = (
                result[:entity.start_position] +
                replacement +
                result[entity.end_position:]
            )
        
        return result
    
    def _get_replacement(self, entity: PIIEntity, strategy: AnonymizationStrategy) -> str:
        """Get replacement value based on strategy."""
        if strategy == AnonymizationStrategy.MASK:
            # Replace with asterisks of same length
            return "*" * len(entity.original_value)
        
        elif strategy == AnonymizationStrategy.PSEUDONYMIZE:
            # Replace with type-specific placeholder
            placeholders = {
                PIIType.PERSON: "[PESSOA]",
                PIIType.CPF: "[CPF]",
                PIIType.CNPJ: "[CNPJ]",
                PIIType.EMAIL: "[EMAIL]",
                PIIType.PHONE: "[TELEFONE]",
                PIIType.ADDRESS: "[ENDEREÇO]",
                PIIType.RG: "[RG]",
                PIIType.DATE_OF_BIRTH: "[DATA_NASCIMENTO]",
                PIIType.BANK_ACCOUNT: "[CONTA_BANCARIA]",
                PIIType.CREDIT_CARD: "[CARTAO_CREDITO]",
                PIIType.ORGANIZATION: "[ORGANIZACAO]",
                PIIType.LOCATION: "[LOCALIZACAO]",
                PIIType.IP_ADDRESS: "[IP]",
                PIIType.PASSPORT: "[PASSAPORTE]",
                PIIType.DRIVER_LICENSE: "[CNH]",
            }
            return placeholders.get(entity.pii_type, "[REDACTED]")
        
        elif strategy == AnonymizationStrategy.REMOVE:
            return ""
        
        elif strategy == AnonymizationStrategy.HASH:
            import hashlib
            hash_value = hashlib.sha256(entity.original_value.encode()).hexdigest()[:12]
            return f"[HASH:{hash_value}]"
        
        return "[REDACTED]"
    
    async def get_statistics(self, tenant_id: UUID) -> Dict[str, Any]:
        """Get PII detection statistics for a tenant."""
        return await self.repository.get_statistics(tenant_id)
    
    def _to_output(self, entity: PIIDetection) -> PIIDetectionOutput:
        """Convert entity to output DTO."""
        return PIIDetectionOutput(
            id=str(entity.id),
            document_id=str(entity.document_id) if entity.document_id else None,
            ingestion_source_id=str(entity.ingestion_source_id) if entity.ingestion_source_id else None,
            file_name=entity.file_name,
            file_type=entity.file_type,
            total_entities=entity.total_entities,
            overall_risk_level=entity.overall_risk_level.value,
            risk_summary=entity.risk_summary,
            anonymization_status=entity.anonymization_status.value,
            anonymization_strategy=entity.anonymization_strategy.value if entity.anonymization_strategy else None,
            reviewed_by=str(entity.reviewed_by) if entity.reviewed_by else None,
            reviewed_at=entity.reviewed_at.isoformat() if entity.reviewed_at else None,
            reviewer_comment=entity.reviewer_comment,
            anonymized_at=entity.anonymized_at.isoformat() if entity.anonymized_at else None,
            analyzed_at=entity.analyzed_at.isoformat() if entity.analyzed_at else None,
            created_at=entity.created_at.isoformat() if entity.created_at else None,
            entities=[e.to_dict() for e in entity.entities],
        )
