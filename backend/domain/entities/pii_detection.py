# PII Detection Entity
# Implements RF-01.02: LGPD Agent for PII detection and masking
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4


class PIIType(str, Enum):
    """Types of PII that can be detected."""
    PERSON = "person"
    CPF = "cpf"
    CNPJ = "cnpj"
    EMAIL = "email"
    PHONE = "phone"
    ADDRESS = "address"
    RG = "rg"
    DATE_OF_BIRTH = "date_of_birth"
    BANK_ACCOUNT = "bank_account"
    CREDIT_CARD = "credit_card"
    ORGANIZATION = "organization"
    LOCATION = "location"
    IP_ADDRESS = "ip_address"
    PASSPORT = "passport"
    DRIVER_LICENSE = "driver_license"


class PIIRiskLevel(str, Enum):
    """Risk level of detected PII."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AnonymizationStatus(str, Enum):
    """Status of PII anonymization workflow."""
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    ANONYMIZED = "anonymized"
    ANONYMIZATION_FAILED = "anonymization_failed"


class AnonymizationStrategy(str, Enum):
    """Strategy for anonymizing PII."""
    MASK = "mask"  # Replace with asterisks
    PSEUDONYMIZE = "pseudonymize"  # Replace with consistent fake value
    REMOVE = "remove"  # Remove entirely
    HASH = "hash"  # Replace with hash


@dataclass
class PIIEntity:
    """A single detected PII entity within a document."""
    id: UUID = field(default_factory=uuid4)
    pii_type: PIIType = PIIType.PERSON
    
    # Value information
    original_value: str = ""
    masked_value: Optional[str] = None
    
    # Position in document
    start_position: int = 0
    end_position: int = 0
    context: Optional[str] = None  # Surrounding text for context
    
    # Detection metadata
    confidence: float = 0.0
    detection_method: str = "pattern"  # pattern, ner, hybrid
    
    # Risk assessment
    risk_level: PIIRiskLevel = PIIRiskLevel.MEDIUM
    risk_factors: List[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": str(self.id),
            "pii_type": self.pii_type.value,
            "original_value": self.original_value,
            "masked_value": self.masked_value,
            "start_position": self.start_position,
            "end_position": self.end_position,
            "context": self.context,
            "confidence": self.confidence,
            "detection_method": self.detection_method,
            "risk_level": self.risk_level.value,
            "risk_factors": self.risk_factors,
        }


@dataclass
class PIIDetection:
    """
    Domain entity for PII detection results with manual review workflow.
    
    Implements RF-01.02: LGPD Agent for PII detection and masking
    Implements RNF-04: Human-in-the-loop for AI decisions
    """
    id: UUID = field(default_factory=uuid4)
    tenant_id: UUID = field(default_factory=uuid4)
    
    # Source document reference
    document_id: Optional[UUID] = None
    ingestion_source_id: Optional[UUID] = None
    file_name: str = ""
    file_type: Optional[str] = None
    
    # Detection results
    entities: List[PIIEntity] = field(default_factory=list)
    total_entities: int = 0
    
    # Risk assessment
    overall_risk_level: PIIRiskLevel = PIIRiskLevel.LOW
    risk_summary: Dict[str, int] = field(default_factory=dict)  # {pii_type: count}
    
    # Analysis metadata
    analyzed_at: datetime = field(default_factory=datetime.utcnow)
    analysis_duration_ms: int = 0
    text_length: int = 0
    detection_methods: List[str] = field(default_factory=list)
    
    # Original and anonymized content
    original_text: Optional[str] = None  # Stored encrypted
    anonymized_text: Optional[str] = None
    
    # Manual review workflow (Human-in-the-loop)
    anonymization_status: AnonymizationStatus = AnonymizationStatus.PENDING_REVIEW
    anonymization_strategy: Optional[AnonymizationStrategy] = None
    
    # Review tracking
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    reviewer_comment: Optional[str] = None
    
    # Anonymization execution
    anonymized_by: Optional[UUID] = None
    anonymized_at: Optional[datetime] = None
    anonymization_error: Optional[str] = None
    
    # Audit fields
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    created_by: Optional[UUID] = None
    deleted_at: Optional[datetime] = None
    
    def to_dict(self) -> dict:
        """Convert to dictionary (excludes sensitive original_text)."""
        return {
            "id": str(self.id),
            "tenant_id": str(self.tenant_id),
            "document_id": str(self.document_id) if self.document_id else None,
            "ingestion_source_id": str(self.ingestion_source_id) if self.ingestion_source_id else None,
            "file_name": self.file_name,
            "file_type": self.file_type,
            "entities": [e.to_dict() for e in self.entities],
            "total_entities": self.total_entities,
            "overall_risk_level": self.overall_risk_level.value,
            "risk_summary": self.risk_summary,
            "analyzed_at": self.analyzed_at.isoformat() if self.analyzed_at else None,
            "analysis_duration_ms": self.analysis_duration_ms,
            "text_length": self.text_length,
            "detection_methods": self.detection_methods,
            "anonymization_status": self.anonymization_status.value,
            "anonymization_strategy": self.anonymization_strategy.value if self.anonymization_strategy else None,
            "reviewed_by": str(self.reviewed_by) if self.reviewed_by else None,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "reviewer_comment": self.reviewer_comment,
            "anonymized_at": self.anonymized_at.isoformat() if self.anonymized_at else None,
            "anonymization_error": self.anonymization_error,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def add_entity(self, entity: PIIEntity) -> None:
        """Add a detected PII entity."""
        self.entities.append(entity)
        self.total_entities = len(self.entities)
        self._update_risk_summary()
        self.updated_at = datetime.utcnow()
    
    def _update_risk_summary(self) -> None:
        """Update risk summary based on entities."""
        self.risk_summary = {}
        max_risk = PIIRiskLevel.LOW
        
        risk_order = {
            PIIRiskLevel.LOW: 0,
            PIIRiskLevel.MEDIUM: 1,
            PIIRiskLevel.HIGH: 2,
            PIIRiskLevel.CRITICAL: 3,
        }
        
        for entity in self.entities:
            pii_type = entity.pii_type.value
            self.risk_summary[pii_type] = self.risk_summary.get(pii_type, 0) + 1
            
            if risk_order[entity.risk_level] > risk_order[max_risk]:
                max_risk = entity.risk_level
        
        self.overall_risk_level = max_risk
    
    def approve(self, reviewer_id: UUID, strategy: AnonymizationStrategy, comment: Optional[str] = None) -> None:
        """Approve PII detection for anonymization."""
        self.anonymization_status = AnonymizationStatus.APPROVED
        self.anonymization_strategy = strategy
        self.reviewed_by = reviewer_id
        self.reviewed_at = datetime.utcnow()
        self.reviewer_comment = comment
        self.updated_at = datetime.utcnow()
    
    def reject(self, reviewer_id: UUID, comment: Optional[str] = None) -> None:
        """Reject PII detection (no anonymization needed)."""
        self.anonymization_status = AnonymizationStatus.REJECTED
        self.reviewed_by = reviewer_id
        self.reviewed_at = datetime.utcnow()
        self.reviewer_comment = comment
        self.updated_at = datetime.utcnow()
    
    def mark_anonymized(self, anonymizer_id: UUID, anonymized_text: str) -> None:
        """Mark as anonymized after processing."""
        self.anonymization_status = AnonymizationStatus.ANONYMIZED
        self.anonymized_by = anonymizer_id
        self.anonymized_at = datetime.utcnow()
        self.anonymized_text = anonymized_text
        self.updated_at = datetime.utcnow()
    
    def mark_anonymization_failed(self, error: str) -> None:
        """Mark anonymization as failed."""
        self.anonymization_status = AnonymizationStatus.ANONYMIZATION_FAILED
        self.anonymization_error = error
        self.updated_at = datetime.utcnow()
