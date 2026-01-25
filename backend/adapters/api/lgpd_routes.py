"""
LGPD API Routes
Implements RF-01: Data ingestion with LGPD compliance
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import Optional, List

from adapters.api.auth_middleware import require_auth, AuthenticatedUser
from services.ai.lgpd_ner_service import get_lgpd_service, PIIDetectionResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/lgpd", tags=["lgpd"])


# =============================================================================
# Request/Response Models
# =============================================================================

class AnalyzeTextRequest(BaseModel):
    """Request to analyze text for PII"""
    text: str
    anonymize: bool = True
    strategy: str = "mask"  # mask, pseudonymize, remove


class BatchAnalyzeRequest(BaseModel):
    """Batch analysis request"""
    texts: List[str]
    anonymize: bool = True
    strategy: str = "mask"


class BatchAnalyzeResponse(BaseModel):
    """Batch analysis response"""
    results: List[PIIDetectionResult]
    total_entities: int
    high_risk_count: int


# =============================================================================
# Routes
# =============================================================================

@router.post("/analyze", response_model=PIIDetectionResult)
async def analyze_text(
    request: AnalyzeTextRequest,
    current_user: AuthenticatedUser = Depends(require_auth),
):
    """
    Analyze text for personally identifiable information (PII).
    
    Uses BERTimbau NER model to detect:
    - Person names
    - CPF/CNPJ
    - Email addresses
    - Phone numbers
    - Addresses
    - Organizations
    
    Returns detection results with optional anonymization.
    """
    service = get_lgpd_service()
    
    result = service.analyze_text(
        text=request.text,
        anonymize=request.anonymize,
        strategy=request.strategy,
    )
    
    return result


@router.post("/analyze-batch", response_model=BatchAnalyzeResponse)
async def analyze_batch(
    request: BatchAnalyzeRequest,
    current_user: AuthenticatedUser = Depends(require_auth),
):
    """
    Analyze multiple texts for PII in batch.
    Useful for processing document collections.
    """
    service = get_lgpd_service()
    
    results = []
    total_entities = 0
    high_risk_count = 0
    
    for text in request.texts:
        result = service.analyze_text(
            text=text,
            anonymize=request.anonymize,
            strategy=request.strategy,
        )
        results.append(result)
        total_entities += len(result.entities)
        if result.risk_level == "high":
            high_risk_count += 1
    
    return BatchAnalyzeResponse(
        results=results,
        total_entities=total_entities,
        high_risk_count=high_risk_count,
    )


@router.post("/anonymize")
async def anonymize_only(
    request: AnalyzeTextRequest,
    current_user: AuthenticatedUser = Depends(require_auth),
):
    """
    Quick anonymization endpoint.
    Returns only the anonymized text without full analysis details.
    """
    service = get_lgpd_service()
    
    result = service.analyze_text(
        text=request.text,
        anonymize=True,
        strategy=request.strategy,
    )
    
    return {
        "anonymized_text": result.anonymized_text,
        "pii_count": len(result.entities),
        "risk_level": result.risk_level,
    }


@router.get("/health")
async def health():
    """Health check for LGPD service"""
    service = get_lgpd_service()
    
    # Quick test
    test_result = service.analyze_text(
        text="Teste de serviço LGPD",
        anonymize=False,
    )
    
    return {
        "status": "healthy",
        "service": "lgpd-ner",
        "model_loaded": service.ner_service._loaded,
    }


# =============================================================================
# PII Detection Management Routes (Human-in-the-loop)
# Implements RF-01.02: LGPD Agent with manual review workflow
# =============================================================================

from uuid import UUID
from adapters.database.connection import get_db
from adapters.repositories.pii_detection_repository import PIIDetectionRepository
from use_cases.manage_pii_review import ManagePIIReviewUseCase, ApprovalInput, RejectionInput


class DetectionFilterParams(BaseModel):
    """Filter parameters for PII detections."""
    status: Optional[str] = None
    risk_level: Optional[str] = None
    limit: int = 50
    offset: int = 0


class ApprovalRequest(BaseModel):
    """Request to approve a PII detection for anonymization."""
    strategy: str  # mask, pseudonymize, remove, hash
    comment: Optional[str] = None


class RejectionRequest(BaseModel):
    """Request to reject a PII detection."""
    comment: Optional[str] = None


class BatchApprovalRequest(BaseModel):
    """Request to batch approve multiple detections."""
    detection_ids: List[str]
    strategy: str
    comment: Optional[str] = None


class DetectionResponse(BaseModel):
    """Response model for PII detection."""
    id: str
    document_id: Optional[str]
    ingestion_source_id: Optional[str]
    file_name: str
    file_type: Optional[str]
    total_entities: int
    overall_risk_level: str
    risk_summary: dict
    anonymization_status: str
    anonymization_strategy: Optional[str]
    reviewed_by: Optional[str]
    reviewed_at: Optional[str]
    reviewer_comment: Optional[str]
    anonymized_at: Optional[str]
    analyzed_at: Optional[str] = None
    created_at: Optional[str] = None
    entities: List[dict]


class StatisticsResponse(BaseModel):
    """Response model for PII statistics."""
    total_detections: int
    total_entities: int
    status_counts: dict
    risk_counts: dict
    pending_review: int


@router.get("/detections", response_model=List[DetectionResponse])
async def get_detections(
    detection_status: Optional[str] = Query(None, alias="status", description="Filter by anonymization status"),
    risk_level: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: AuthenticatedUser = Depends(require_auth),
    session = Depends(get_db),
):
    """
    Get PII detection records with optional filtering.
    Use for reviewing and managing detected PII entities.
    """
    try:
        repository = PIIDetectionRepository(session)
        use_case = ManagePIIReviewUseCase(repository)
        
        detections = await use_case.get_detections(
            tenant_id=current_user.tenant_id,
            status=detection_status,
            risk_level=risk_level,
            limit=limit,
            offset=offset,
        )
        
        logger.info(f"Fetched {len(detections)} detections for tenant {current_user.tenant_id}")
        return [DetectionResponse(**d.__dict__) for d in detections]
    except Exception as e:
        logger.error(f"Error fetching PII detections: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch PII detections: {str(e)}"
        )


@router.get("/detections/pending", response_model=List[DetectionResponse])
async def get_pending_review(
    limit: int = 50,
    current_user: AuthenticatedUser = Depends(require_auth),
    session = Depends(get_db),
):
    """Get PII detections pending manual review."""
    try:
        repository = PIIDetectionRepository(session)
        use_case = ManagePIIReviewUseCase(repository)
        
        detections = await use_case.get_pending_review(
            tenant_id=current_user.tenant_id,
            limit=limit,
        )
        
        logger.info(f"Fetched {len(detections)} pending detections for review")
        return [DetectionResponse(**d.__dict__) for d in detections]
    except Exception as e:
        logger.error(f"Error fetching pending PII detections: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pending detections: {str(e)}"
        )


@router.get("/detections/statistics", response_model=StatisticsResponse)
async def get_pii_statistics(
    current_user: AuthenticatedUser = Depends(require_auth),
    session = Depends(get_db),
):
    """Get aggregated PII detection statistics."""
    repository = PIIDetectionRepository(session)
    use_case = ManagePIIReviewUseCase(repository)
    
    stats = await use_case.get_statistics(current_user.tenant_id)
    
    return StatisticsResponse(**stats)


# Alias for backward compatibility
@router.get("/statistics", response_model=StatisticsResponse)
async def get_pii_statistics_legacy(
    current_user: AuthenticatedUser = Depends(require_auth),
    session = Depends(get_db),
):
    """Get aggregated PII detection statistics (legacy endpoint)."""
    repository = PIIDetectionRepository(session)
    use_case = ManagePIIReviewUseCase(repository)
    
    stats = await use_case.get_statistics(current_user.tenant_id)
    
    return StatisticsResponse(**stats)


@router.get("/detections/{detection_id}", response_model=DetectionResponse)
async def get_detection(
    detection_id: UUID,
    current_user: AuthenticatedUser = Depends(require_auth),
    session = Depends(get_db),
):
    """Get a single PII detection by ID."""
    try:
        repository = PIIDetectionRepository(session)
        use_case = ManagePIIReviewUseCase(repository)
        
        detection = await use_case.get_detection(
            tenant_id=current_user.tenant_id,
            detection_id=detection_id,
        )
        
        if not detection:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Detection not found")
        
        return DetectionResponse(**detection.__dict__)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching detection {detection_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch detection: {str(e)}"
        )


@router.post("/detections/{detection_id}/approve", response_model=DetectionResponse)
async def approve_detection(
    detection_id: UUID,
    request: ApprovalRequest,
    current_user: AuthenticatedUser = Depends(require_auth),
    session = Depends(get_db),
):
    """
    Approve a PII detection for anonymization.
    Sets the anonymization strategy and marks as approved.
    Anonymization must be executed separately.
    """
    repository = PIIDetectionRepository(session)
    use_case = ManagePIIReviewUseCase(repository)
    
    try:
        detection = await use_case.approve(
            tenant_id=current_user.tenant_id,
            detection_id=detection_id,
            reviewer_id=current_user.user_id,
            input_data=ApprovalInput(
                strategy=request.strategy,
                comment=request.comment,
            ),
        )
        
        if not detection:
            raise HTTPException(status_code=404, detail="Detection not found")
        
        return DetectionResponse(**detection.__dict__)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/detections/{detection_id}/reject", response_model=DetectionResponse)
async def reject_detection(
    detection_id: UUID,
    request: RejectionRequest,
    current_user: AuthenticatedUser = Depends(require_auth),
    session = Depends(get_db),
):
    """
    Reject a PII detection.
    Indicates that no anonymization is needed for this document.
    """
    repository = PIIDetectionRepository(session)
    use_case = ManagePIIReviewUseCase(repository)
    
    detection = await use_case.reject(
        tenant_id=current_user.tenant_id,
        detection_id=detection_id,
        reviewer_id=current_user.user_id,
        input_data=RejectionInput(comment=request.comment),
    )
    
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    
    return DetectionResponse(**detection.__dict__)


@router.post("/detections/{detection_id}/anonymize", response_model=DetectionResponse)
async def execute_anonymization(
    detection_id: UUID,
    current_user: AuthenticatedUser = Depends(require_auth),
    session = Depends(get_db),
):
    """
    Execute anonymization on an approved detection.
    The detection must be in 'approved' status with a strategy selected.
    """
    repository = PIIDetectionRepository(session)
    use_case = ManagePIIReviewUseCase(repository)
    
    try:
        detection = await use_case.execute_anonymization(
            tenant_id=current_user.tenant_id,
            detection_id=detection_id,
            executor_id=current_user.user_id,
        )
        
        if not detection:
            raise HTTPException(status_code=404, detail="Detection not found")
        
        return DetectionResponse(**detection.__dict__)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/detections/batch-approve")
async def batch_approve(
    request: BatchApprovalRequest,
    current_user: AuthenticatedUser = Depends(require_auth),
    session = Depends(get_db),
):
    """
    Batch approve multiple PII detections.
    All detections will use the same anonymization strategy.
    """
    repository = PIIDetectionRepository(session)
    use_case = ManagePIIReviewUseCase(repository)
    
    try:
        detection_ids = [UUID(id) for id in request.detection_ids]
        
        result = await use_case.batch_approve(
            tenant_id=current_user.tenant_id,
            detection_ids=detection_ids,
            reviewer_id=current_user.user_id,
            strategy=request.strategy,
            comment=request.comment,
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
