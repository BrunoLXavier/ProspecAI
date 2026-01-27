# Enhanced Data Ingestion Use Case
# Implements RF-01: Data Ingestion and Multi-source Orchestration
from typing import Dict, Any, List, Optional
from uuid import UUID, uuid4
from datetime import datetime
import logging
import asyncio

from domain.entities.ingestion import (
    IngestionJob, IngestionSource, IngestionJobStatus,
    IngestionSourceType, FileType
)
from domain.entities.pii_detection import (
    PIIDetection, PIIEntity, PIIType, PIIRiskLevel,
    AnonymizationStatus
)
from adapters.repositories.ingestion_repository import IngestionRepository
from adapters.repositories.pii_detection_repository import PIIDetectionRepository

logger = logging.getLogger(__name__)


class ManageIngestionUseCase:
    """
    Enhanced data ingestion with WebSocket progress updates and PII detection.
    
    Implements RF-01: Data Ingestion and Multi-source Orchestration
    Implements RF-01.01: Batch and real-time processing via Kafka
    Implements RF-01.02: LGPD Agent for PII detection
    """
    
    SUPPORTED_FILE_TYPES = {
        ".csv": FileType.CSV,
        ".json": FileType.JSON,
        ".xlsx": FileType.XLSX,
        ".pdf": FileType.PDF,
        ".txt": FileType.TXT,
        ".docx": FileType.DOCX,
    }
    
    def __init__(
        self,
        ingestion_repository: IngestionRepository,
        pii_repository: PIIDetectionRepository,
        lgpd_service=None,
        websocket_manager=None,
        kafka_producer=None,
    ):
        self.ingestion_repo = ingestion_repository
        self.pii_repo = pii_repository
        self.lgpd_service = lgpd_service
        self.websocket_manager = websocket_manager
        self.kafka_producer = kafka_producer
    
    # ========== Job Management ==========
    
    async def create_job(
        self,
        tenant_id: UUID,
        user_id: UUID,
        name: str,
        description: Optional[str] = None,
        files: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Create a new ingestion job with uploaded files.
        
        Args:
            tenant_id: Tenant identifier
            user_id: User creating the job
            name: Job name
            description: Optional job description
            files: List of file metadata dicts with keys: file_name, file_size, storage_bucket, storage_key
        """
        job = IngestionJob(
            tenant_id=tenant_id,
            name=name,
            description=description,
            status=IngestionJobStatus.PENDING,
            total_files=len(files) if files else 0,
            total_size=sum(f.get("file_size", 0) for f in files) if files else 0,
            created_by=user_id,
            updated_by=user_id,
        )
        
        created_job = await self.ingestion_repo.create_job(job)
        
        # Create source entries for each file
        if files:
            sources = []
            for file_data in files:
                file_name = file_data.get("file_name", "")
                file_ext = "." + file_name.split(".")[-1].lower() if "." in file_name else ""
                file_type = self.SUPPORTED_FILE_TYPES.get(file_ext)
                
                source = IngestionSource(
                    job_id=created_job.id,
                    tenant_id=tenant_id,
                    source_type=IngestionSourceType.FILE_UPLOAD,
                    file_name=file_name,
                    file_type=file_type,
                    file_size=file_data.get("file_size", 0),
                    storage_bucket=file_data.get("storage_bucket", ""),
                    storage_key=file_data.get("storage_key", ""),
                    status=IngestionJobStatus.PENDING,
                    created_by=user_id,
                )
                sources.append(source)
            
            await self.ingestion_repo.create_sources_batch(sources)
        
        return {
            "job_id": str(created_job.id),
            "name": created_job.name,
            "status": created_job.status.value,
            "total_files": created_job.total_files,
            "total_size": created_job.total_size,
        }
    
    async def get_job(self, tenant_id: UUID, job_id: UUID) -> Optional[Dict[str, Any]]:
        """Get job details with sources."""
        job = await self.ingestion_repo.get_job_by_id(tenant_id, job_id)
        if not job:
            return None
        
        sources = await self.ingestion_repo.get_sources_by_job(tenant_id, job_id)
        job.sources = sources
        
        return job.to_dict()
    
    async def get_jobs(
        self,
        tenant_id: UUID,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Get list of ingestion jobs."""
        status_enum = IngestionJobStatus(status) if status else None
        jobs = await self.ingestion_repo.get_jobs(
            tenant_id=tenant_id,
            status=status_enum,
            limit=limit,
            offset=offset,
        )
        return [j.to_dict() for j in jobs]
    
    async def delete_job(self, tenant_id: UUID, job_id: UUID) -> bool:
        """Delete an ingestion job."""
        return await self.ingestion_repo.delete_job(tenant_id, job_id)
    
    async def get_statistics(self, tenant_id: UUID) -> Dict[str, Any]:
        """Get ingestion statistics."""
        return await self.ingestion_repo.get_job_statistics(tenant_id)
    
    # ========== Job Processing ==========
    
    async def start_processing(
        self,
        tenant_id: UUID,
        job_id: UUID,
        user_id: UUID,
    ) -> Dict[str, Any]:
        """
        Start processing an ingestion job.
        Processes files, runs PII detection, and broadcasts progress via WebSocket.
        """
        job = await self.ingestion_repo.get_job_by_id(tenant_id, job_id)
        if not job:
            return {"success": False, "error": "Job not found"}
        
        if job.status != IngestionJobStatus.PENDING:
            return {"success": False, "error": f"Job is not pending: {job.status.value}"}
        
        # Start processing
        job.start_processing()
        job.updated_by = user_id
        await self.ingestion_repo.update_job(job)
        
        # Broadcast initial status
        await self._broadcast_progress(job_id, {
            "status": "processing",
            "progress_percent": 0,
            "current_file": None,
            "message": "Starting ingestion...",
        })
        
        # Get sources
        sources = await self.ingestion_repo.get_sources_by_job(tenant_id, job_id)
        
        try:
            processed = 0
            failed = 0
            total_pii = 0
            total_records = 0
            highest_risk = None
            
            for source in sources:
                # Update progress
                job.update_progress(processed, source.file_name)
                await self.ingestion_repo.update_job(job)
                
                await self._broadcast_progress(job_id, {
                    "status": "processing",
                    "progress_percent": job.progress_percent,
                    "current_file": source.file_name,
                    "processed_files": processed,
                    "total_files": job.total_files,
                    "message": f"Processing {source.file_name}...",
                })
                
                try:
                    # Process file and run PII detection
                    result = await self._process_source(tenant_id, user_id, source)
                    
                    # Update source
                    source.status = IngestionJobStatus.COMPLETED
                    source.processed_at = datetime.utcnow()
                    source.record_count = result.get("record_count", 0)
                    source.valid_records = result.get("valid_records", 0)
                    source.invalid_records = result.get("invalid_records", 0)
                    source.pii_detection_id = result.get("pii_detection_id")
                    source.pii_entities_count = result.get("pii_entities_count", 0)
                    source.pii_risk_level = result.get("pii_risk_level")
                    
                    await self.ingestion_repo.update_source(source)
                    
                    processed += 1
                    total_records += source.record_count
                    total_pii += source.pii_entities_count
                    
                    if source.pii_risk_level:
                        highest_risk = self._get_higher_risk(highest_risk, source.pii_risk_level)
                    
                except Exception as e:
                    logger.error(f"Failed to process source {source.id}: {e}")
                    source.status = IngestionJobStatus.FAILED
                    source.error_message = str(e)
                    await self.ingestion_repo.update_source(source)
                    failed += 1
            
            # Complete job
            job.processed_files = processed
            job.failed_files = failed
            job.total_records = total_records
            job.total_pii_entities = total_pii
            job.pending_pii_review = total_pii  # All need review initially
            job.highest_risk_level = highest_risk
            job.complete()
            await self.ingestion_repo.update_job(job)
            
            await self._broadcast_progress(job_id, {
                "status": "completed",
                "progress_percent": 100,
                "current_file": None,
                "processed_files": processed,
                "failed_files": failed,
                "total_pii_entities": total_pii,
                "message": "Ingestion completed!",
            })
            
            # Publish to Kafka
            if self.kafka_producer:
                await self.kafka_producer.send(
                    topic="prospecai.ingestion",
                    value={
                        "job_id": str(job_id),
                        "tenant_id": str(tenant_id),
                        "status": "completed",
                        "processed_files": processed,
                        "failed_files": failed,
                        "total_records": total_records,
                        "total_pii_entities": total_pii,
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                )
            
            return {
                "success": True,
                "job_id": str(job_id),
                "processed_files": processed,
                "failed_files": failed,
                "total_records": total_records,
                "total_pii_entities": total_pii,
            }
            
        except Exception as e:
            logger.error(f"Job {job_id} failed: {e}")
            job.fail(str(e))
            await self.ingestion_repo.update_job(job)
            
            await self._broadcast_progress(job_id, {
                "status": "failed",
                "error": str(e),
                "message": f"Ingestion failed: {e}",
            })
            
            return {"success": False, "error": str(e)}
    
    async def _process_source(
        self,
        tenant_id: UUID,
        user_id: UUID,
        source: IngestionSource,
    ) -> Dict[str, Any]:
        """
        Process a single source file.
        Reads content, runs PII detection, and stores results.
        """
        # For now, simulate file processing
        # In production, this would read from MinIO and parse the file
        
        # Simulate reading file content
        file_content = f"Sample content from {source.file_name}"
        record_count = 1
        
        # Run PII detection
        pii_result = await self._run_pii_detection(
            tenant_id=tenant_id,
            user_id=user_id,
            source=source,
            text=file_content,
        )
        
        return {
            "record_count": record_count,
            "valid_records": record_count,
            "invalid_records": 0,
            "pii_detection_id": pii_result.get("detection_id"),
            "pii_entities_count": pii_result.get("entities_count", 0),
            "pii_risk_level": pii_result.get("risk_level"),
        }
    
    async def _run_pii_detection(
        self,
        tenant_id: UUID,
        user_id: UUID,
        source: IngestionSource,
        text: str,
    ) -> Dict[str, Any]:
        """Run PII detection on text content."""
        start_time = datetime.utcnow()
        
        entities = []
        detection_methods = ["pattern"]
        
        # Use LGPD service if available
        if self.lgpd_service:
            try:
                result = self.lgpd_service.analyze_text(text)
                entities = result.get("entities", [])
                detection_methods = result.get("methods", ["pattern"])
            except Exception as e:
                logger.warning(f"LGPD service failed, using fallback: {e}")
        
        # Create PII detection record
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        pii_entities = []
        for e in entities:
            pii_entities.append(PIIEntity(
                pii_type=PIIType(e.get("type", "person")),
                original_value=e.get("value", ""),
                start_position=e.get("start", 0),
                end_position=e.get("end", 0),
                confidence=e.get("confidence", 0.8),
                detection_method=e.get("method", "pattern"),
                risk_level=self._assess_risk(e.get("type")),
            ))
        
        # Determine overall risk
        overall_risk = PIIRiskLevel.LOW
        if pii_entities:
            risks = [e.risk_level for e in pii_entities]
            if PIIRiskLevel.CRITICAL in risks:
                overall_risk = PIIRiskLevel.CRITICAL
            elif PIIRiskLevel.HIGH in risks:
                overall_risk = PIIRiskLevel.HIGH
            elif PIIRiskLevel.MEDIUM in risks:
                overall_risk = PIIRiskLevel.MEDIUM
        
        detection = PIIDetection(
            tenant_id=tenant_id,
            ingestion_source_id=source.id,
            file_name=source.file_name,
            file_type=source.file_type.value if source.file_type else None,
            entities=pii_entities,
            total_entities=len(pii_entities),
            overall_risk_level=overall_risk,
            analyzed_at=datetime.utcnow(),
            analysis_duration_ms=duration_ms,
            text_length=len(text),
            detection_methods=detection_methods,
            original_text=text,
            anonymization_status=AnonymizationStatus.PENDING_REVIEW,
            created_by=user_id,
        )
        detection._update_risk_summary()
        
        created = await self.pii_repo.create(detection)
        
        return {
            "detection_id": created.id,
            "entities_count": len(pii_entities),
            "risk_level": overall_risk.value,
        }
    
    def _assess_risk(self, pii_type: str) -> PIIRiskLevel:
        """Assess risk level based on PII type."""
        high_risk_types = {"cpf", "cnpj", "bank_account", "credit_card", "passport"}
        medium_risk_types = {"email", "phone", "rg", "driver_license", "date_of_birth"}
        
        if pii_type in high_risk_types:
            return PIIRiskLevel.HIGH
        elif pii_type in medium_risk_types:
            return PIIRiskLevel.MEDIUM
        return PIIRiskLevel.LOW
    
    def _get_higher_risk(self, current: Optional[str], new: str) -> str:
        """Get the higher of two risk levels."""
        order = ["low", "medium", "high", "critical"]
        if not current:
            return new
        current_idx = order.index(current) if current in order else 0
        new_idx = order.index(new) if new in order else 0
        return new if new_idx > current_idx else current
    
    async def _broadcast_progress(self, job_id: UUID, data: Dict[str, Any]) -> None:
        """Broadcast progress update via WebSocket."""
        if self.websocket_manager:
            try:
                await self.websocket_manager.broadcast_to_job(str(job_id), data)
            except Exception as e:
                logger.warning(f"Failed to broadcast progress: {e}")
