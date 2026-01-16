# Data Ingestion API Routes
from __future__ import annotations
# Implements RF-01: Data Ingestion and Multi-source Orchestration
from typing import Optional, List
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks, Request
from pydantic import BaseModel, Field

from adapters.api.auth_middleware import get_current_user, AuthenticatedUser
from infrastructure.auth import CurrentUser
from adapters.database.connection import get_db
from adapters.repositories.ingestion_repository import IngestionRepository
from adapters.repositories.pii_detection_repository import PIIDetectionRepository
from use_cases.manage_ingestion import ManageIngestionUseCase
from infrastructure.jwt_service import get_jwt_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ingestion", tags=["Data Ingestion"])


# ========== Request/Response Models ==========

class FileInfo(BaseModel):
    """File information for job creation."""
    file_name: str
    file_size: int
    storage_bucket: str = "ingestion"
    storage_key: str


class CreateJobRequest(BaseModel):
    """Request model for creating an ingestion job."""
    name: str = Field(..., min_length=1, max_length=500, description="Job name")
    description: Optional[str] = Field(default=None, max_length=2000, description="Job description")
    files: List[FileInfo] = Field(default=[], description="List of files to ingest")


class JobResponse(BaseModel):
    """Response model for ingestion job."""
    id: str
    tenant_id: str
    name: str
    description: Optional[str]
    status: str
    started_at: Optional[str]
    completed_at: Optional[str]
    total_files: int
    processed_files: int
    failed_files: int
    total_size: int
    total_records: int
    valid_records: int
    invalid_records: int
    total_pii_entities: int
    pending_pii_review: int
    highest_risk_level: Optional[str]
    current_file: Optional[str]
    progress_percent: float
    error_message: Optional[str]
    created_at: str
    updated_at: str


class JobListResponse(BaseModel):
    """Response model for job list."""
    jobs: List[JobResponse]
    total: int


class SourceResponse(BaseModel):
    """Response model for ingestion source."""
    id: str
    job_id: str
    source_type: str
    file_name: str
    file_type: Optional[str]
    file_size: int
    status: str
    processed_at: Optional[str]
    error_message: Optional[str]
    record_count: int
    pii_entities_count: int
    pii_risk_level: Optional[str]


class JobDetailResponse(BaseModel):
    """Response model for job details with sources."""
    job: JobResponse
    sources: List[SourceResponse]


class StatisticsResponse(BaseModel):
    """Response model for ingestion statistics."""
    total_jobs: int
    total_files: int
    total_records: int
    total_pii_entities: int
    status_counts: dict


class StartProcessingResponse(BaseModel):
    """Response model for starting processing."""
    success: bool
    job_id: str
    message: str
    error: Optional[str] = None


# ========== API Endpoints ===========

@router.post("/jobs", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_job(
    request: CreateJobRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    session = Depends(get_db),
):
    """
    Create a new ingestion job.
    The job starts in 'pending' status and must be started with the /start endpoint.
    """
    try:
        ingestion_repo = IngestionRepository(session)
        pii_repo = PIIDetectionRepository(session)
        use_case = ManageIngestionUseCase(ingestion_repo, pii_repo)
        
        files = [f.dict() for f in request.files] if request.files else []
        
        result = await use_case.create_job(
            tenant_id=user.tenant_id,
            user_id=user.user_id,
            name=request.name,
            description=request.description,
            files=files,
        )
        
        logger.info(f"Created ingestion job {result.get('job_id')} for tenant {user.tenant_id}")
        return result
    except Exception as e:
        logger.error(f"Error creating ingestion job: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create ingestion job: {str(e)}"
        )


@router.get("/jobs", response_model=List[dict])
async def get_jobs(
    job_status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user: AuthenticatedUser = Depends(get_current_user),
    request: Request = None,
    session = Depends(get_db),
):
    """Get list of ingestion jobs with optional filtering."""
    try:
        # Debug: log incoming Authorization header for troubleshooting 401s
        try:
            auth_raw = request.headers.get('authorization') if request is not None else None
            logger.info(f"Incoming Authorization header for /api/v1/ingestion/jobs: {auth_raw}")

            # If an auth header exists, attempt to validate it with local JWTService
            if auth_raw:
                try:
                    token = auth_raw.split(' ', 1)[1] if ' ' in auth_raw else auth_raw
                    jwt_service = get_jwt_service()
                    payload = jwt_service.validate_access_token(token)
                    logger.info(f"Explicit token validation result for /api/v1/ingestion/jobs: {payload}")
                except Exception as ex:
                    logger.exception(f"Explicit token validation failed for /api/v1/ingestion/jobs: {ex}")
        except Exception:
            logger.debug("Could not read Authorization header from request")
        ingestion_repo = IngestionRepository(session)
        pii_repo = PIIDetectionRepository(session)
        use_case = ManageIngestionUseCase(ingestion_repo, pii_repo)
        
        jobs = await use_case.get_jobs(
            tenant_id=user.tenant_id,
            status=job_status,
            limit=limit,
            offset=offset,
        )
        
        return jobs
    except Exception as e:
        logger.error(f"Error fetching ingestion jobs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch ingestion jobs: {str(e)}"
        )


@router.get("/jobs/{job_id}", response_model=dict)
async def get_job(
    job_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    session = Depends(get_db),
):
    """Get details of a specific ingestion job including sources."""
    try:
        ingestion_repo = IngestionRepository(session)
        pii_repo = PIIDetectionRepository(session)
        use_case = ManageIngestionUseCase(ingestion_repo, pii_repo)
        
        job = await use_case.get_job(user.tenant_id, job_id)
        
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
        
        return job
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching job {job_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch job details: {str(e)}"
        )


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    session = Depends(get_db),
):
    """Delete an ingestion job."""
    try:
        ingestion_repo = IngestionRepository(session)
        pii_repo = PIIDetectionRepository(session)
        use_case = ManageIngestionUseCase(ingestion_repo, pii_repo)
        
        deleted = await use_case.delete_job(user.tenant_id, job_id)
        
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
        
        logger.info(f"Deleted ingestion job {job_id} for tenant {user.tenant_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting job {job_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete job: {str(e)}"
        )


@router.post("/jobs/{job_id}/start", response_model=dict)
async def start_processing(
    job_id: UUID,
    background_tasks: BackgroundTasks,
    user: AuthenticatedUser = Depends(get_current_user),
    session = Depends(get_db),
):
    """
    Start processing an ingestion job.
    This triggers file processing and PII detection in the background.
    Progress can be monitored via WebSocket at /ws/ingestion/{job_id}.
    """
    try:
        ingestion_repo = IngestionRepository(session)
        pii_repo = PIIDetectionRepository(session)
        use_case = ManageIngestionUseCase(ingestion_repo, pii_repo)
        
        # Start processing in background
        result = await use_case.start_processing(
            tenant_id=user.tenant_id,
            job_id=job_id,
            user_id=user.user_id,
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to start processing"),
            )
        
        logger.info(f"Started processing for job {job_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting processing for job {job_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start processing: {str(e)}"
        )


@router.get("/statistics", response_model=dict)
async def get_statistics(
    user: AuthenticatedUser = Depends(get_current_user),
    session = Depends(get_db),
):
    """Get aggregated ingestion statistics for the current tenant."""
    try:
        ingestion_repo = IngestionRepository(session)
        pii_repo = PIIDetectionRepository(session)
        use_case = ManageIngestionUseCase(ingestion_repo, pii_repo)
        
        stats = await use_case.get_statistics(user.tenant_id)
        
        return stats
    except Exception as e:
        logger.error(f"Error fetching statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch statistics: {str(e)}"
        )


@router.post("/upload", response_model=dict)
async def upload_files(
    files: List[UploadFile] = File(...),
    job_name: str = Form(...),
    job_description: Optional[str] = Form(None),
    user: AuthenticatedUser = Depends(get_current_user),
    session = Depends(get_db),
):
    """
    Upload files and create an ingestion job.
    This endpoint handles multipart file uploads and creates a job with the uploaded files.
    """
    try:
        from infrastructure.file_storage import get_file_storage
        
        storage = await get_file_storage()
        uploaded_files = []
        
        for file in files:
            # Read file content
            content = await file.read()
            
            # Generate storage key
            storage_key = f"ingestion/{user.tenant_id}/{file.filename}"
            
            # Upload to MinIO
            await storage.upload_file(
                bucket="ingestion",
                key=storage_key,
                data=content,
                content_type=file.content_type,
            )
            
            uploaded_files.append({
                "file_name": file.filename,
                "file_size": len(content),
                "storage_bucket": "ingestion",
                "storage_key": storage_key,
            })
        
        # Create job
        ingestion_repo = IngestionRepository(session)
        pii_repo = PIIDetectionRepository(session)
        use_case = ManageIngestionUseCase(ingestion_repo, pii_repo)
        
        result = await use_case.create_job(
            tenant_id=user.tenant_id,
            user_id=user.user_id,
            name=job_name,
            description=job_description,
            files=uploaded_files,
        )
        
        logger.info(f"Uploaded {len(uploaded_files)} files for tenant {user.tenant_id}")
        return {
            "success": True,
            "job_id": result["job_id"],
            "files_uploaded": len(uploaded_files),
            "total_size": sum(f["file_size"] for f in uploaded_files),
        }
        
    except Exception as e:
        logger.error(f"Error uploading files: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload files: {str(e)}",
        )
