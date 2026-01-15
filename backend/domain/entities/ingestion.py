# Data Ingestion Entities
# Implements RF-01: Data Ingestion and Multi-source Orchestration
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4


class IngestionJobStatus(str, Enum):
    """Status of an ingestion job."""
    PENDING = "pending"
    PROCESSING = "processing"
    PII_ANALYSIS = "pii_analysis"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class IngestionSourceType(str, Enum):
    """Type of data source for ingestion."""
    FILE_UPLOAD = "file_upload"
    API_INTEGRATION = "api_integration"
    BATCH_IMPORT = "batch_import"
    MANUAL_ENTRY = "manual_entry"


class FileType(str, Enum):
    """Supported file types for ingestion."""
    CSV = "csv"
    JSON = "json"
    XLSX = "xlsx"
    PDF = "pdf"
    TXT = "txt"
    DOCX = "docx"


@dataclass
class IngestionSource:
    """
    Domain entity for a data source in an ingestion job.
    Represents a single file or data stream being processed.
    
    Implements RF-01.03: Data lineage tracking
    """
    id: UUID = field(default_factory=uuid4)
    job_id: UUID = field(default_factory=uuid4)
    tenant_id: UUID = field(default_factory=uuid4)
    
    # Source identification
    source_type: IngestionSourceType = IngestionSourceType.FILE_UPLOAD
    file_name: str = ""
    file_type: Optional[FileType] = None
    file_size: int = 0  # bytes
    
    # Storage location
    storage_bucket: str = ""
    storage_key: str = ""
    
    # Processing status
    status: IngestionJobStatus = IngestionJobStatus.PENDING
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    
    # Data statistics
    record_count: int = 0
    valid_records: int = 0
    invalid_records: int = 0
    
    # PII detection summary
    pii_detection_id: Optional[UUID] = None
    pii_entities_count: int = 0
    pii_risk_level: Optional[str] = None  # low, medium, high
    
    # Metadata
    original_metadata: Dict[str, Any] = field(default_factory=dict)
    
    # Audit fields
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    created_by: Optional[UUID] = None
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": str(self.id),
            "job_id": str(self.job_id),
            "tenant_id": str(self.tenant_id),
            "source_type": self.source_type.value,
            "file_name": self.file_name,
            "file_type": self.file_type.value if self.file_type else None,
            "file_size": self.file_size,
            "storage_bucket": self.storage_bucket,
            "storage_key": self.storage_key,
            "status": self.status.value,
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
            "error_message": self.error_message,
            "record_count": self.record_count,
            "valid_records": self.valid_records,
            "invalid_records": self.invalid_records,
            "pii_detection_id": str(self.pii_detection_id) if self.pii_detection_id else None,
            "pii_entities_count": self.pii_entities_count,
            "pii_risk_level": self.pii_risk_level,
            "original_metadata": self.original_metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


@dataclass
class IngestionJob:
    """
    Domain entity for a data ingestion batch job.
    Tracks overall progress of multi-file ingestion.
    
    Implements RF-01: Data Ingestion and Multi-source Orchestration
    Implements RF-01.01: Batch and real-time processing via Kafka
    """
    id: UUID = field(default_factory=uuid4)
    tenant_id: UUID = field(default_factory=uuid4)
    
    # Job identification
    name: str = ""
    description: Optional[str] = None
    
    # Status tracking
    status: IngestionJobStatus = IngestionJobStatus.PENDING
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # File statistics
    total_files: int = 0
    processed_files: int = 0
    failed_files: int = 0
    total_size: int = 0  # bytes
    
    # Record statistics
    total_records: int = 0
    valid_records: int = 0
    invalid_records: int = 0
    
    # PII summary
    total_pii_entities: int = 0
    pending_pii_review: int = 0
    highest_risk_level: Optional[str] = None
    
    # Progress tracking (for WebSocket updates)
    current_file: Optional[str] = None
    progress_percent: float = 0.0
    estimated_time_remaining: Optional[int] = None  # seconds
    
    # Error tracking
    error_message: Optional[str] = None
    error_details: Dict[str, Any] = field(default_factory=dict)
    
    # Source files
    sources: List[IngestionSource] = field(default_factory=list)
    
    # Audit fields
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    deleted_at: Optional[datetime] = None
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": str(self.id),
            "tenant_id": str(self.tenant_id),
            "name": self.name,
            "description": self.description,
            "status": self.status.value,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "total_files": self.total_files,
            "processed_files": self.processed_files,
            "failed_files": self.failed_files,
            "total_size": self.total_size,
            "total_records": self.total_records,
            "valid_records": self.valid_records,
            "invalid_records": self.invalid_records,
            "total_pii_entities": self.total_pii_entities,
            "pending_pii_review": self.pending_pii_review,
            "highest_risk_level": self.highest_risk_level,
            "current_file": self.current_file,
            "progress_percent": self.progress_percent,
            "estimated_time_remaining": self.estimated_time_remaining,
            "error_message": self.error_message,
            "sources": [s.to_dict() for s in self.sources],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def start_processing(self) -> None:
        """Mark job as started."""
        self.status = IngestionJobStatus.PROCESSING
        self.started_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def update_progress(self, processed: int, current_file: str) -> None:
        """Update processing progress."""
        self.processed_files = processed
        self.current_file = current_file
        self.progress_percent = (processed / self.total_files * 100) if self.total_files > 0 else 0
        self.updated_at = datetime.utcnow()
    
    def complete(self) -> None:
        """Mark job as completed."""
        self.status = IngestionJobStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.progress_percent = 100.0
        self.current_file = None
        self.updated_at = datetime.utcnow()
    
    def fail(self, error_message: str) -> None:
        """Mark job as failed."""
        self.status = IngestionJobStatus.FAILED
        self.completed_at = datetime.utcnow()
        self.error_message = error_message
        self.current_file = None
        self.updated_at = datetime.utcnow()
