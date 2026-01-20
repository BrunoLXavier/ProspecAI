"""
File Upload API Routes
Implements RF-09: File storage with presigned URLs
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import timedelta
import io

from infrastructure.auth import get_current_user, CurrentUser
from infrastructure.file_storage import (
    get_file_storage, StorageBucket, UploadResult, FileMetadata
)

router = APIRouter(prefix="/api/v1/files", tags=["files"])


# =============================================================================
# Response Models
# =============================================================================

class UploadResponse(BaseModel):
    success: bool
    object_name: str
    bucket: str
    size: int
    content_type: str
    url: Optional[str] = None
    error: Optional[str] = None


class FileMetadataResponse(BaseModel):
    name: str
    size: int
    content_type: str
    last_modified: str
    bucket: str


class PresignedUrlResponse(BaseModel):
    url: str
    expires_in_seconds: int
    object_name: str


class PresignedUploadRequest(BaseModel):
    filename: str
    content_type: Optional[str] = None
    prefix: Optional[str] = None


# =============================================================================
# Routes
# =============================================================================

@router.post("/upload/{bucket}", response_model=UploadResponse)
async def upload_file(
    bucket: StorageBucket,
    file: UploadFile = File(...),
    prefix: str = Query("", description="Optional path prefix"),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Upload a file to storage.
    
    Files are stored with tenant isolation.
    Returns object name for future reference.
    """
    storage = get_file_storage()
    
    # Read file content
    content = await file.read()
    
    result = await storage.upload_bytes(
        tenant_id=current_user.tenant_id,
        bucket=bucket,
        filename=file.filename or "unnamed",
        content=content,
        content_type=file.content_type,
        prefix=prefix,
    )
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    
    # Generate access URL
    url = await storage.get_presigned_url(bucket, result.object_name)
    
    return UploadResponse(
        success=True,
        object_name=result.object_name,
        bucket=result.bucket,
        size=result.size,
        content_type=result.content_type,
        url=url,
    )


@router.post("/upload-multiple/{bucket}", response_model=List[UploadResponse])
async def upload_multiple_files(
    bucket: StorageBucket,
    files: List[UploadFile] = File(...),
    prefix: str = Query("", description="Optional path prefix"),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Upload multiple files at once"""
    storage = get_file_storage()
    results = []
    
    for file in files:
        content = await file.read()
        
        result = await storage.upload_bytes(
            tenant_id=current_user.tenant_id,
            bucket=bucket,
            filename=file.filename or "unnamed",
            content=content,
            content_type=file.content_type,
            prefix=prefix,
        )
        
        url = None
        if result.success:
            url = await storage.get_presigned_url(bucket, result.object_name)
        
        results.append(UploadResponse(
            success=result.success,
            object_name=result.object_name,
            bucket=result.bucket,
            size=result.size,
            content_type=result.content_type,
            url=url,
            error=result.error,
        ))
    
    return results


@router.get("/download/{bucket}/{object_name:path}")
async def download_file(
    bucket: StorageBucket,
    object_name: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Download a file from storage.
    Validates tenant access before serving.
    """
    # Verify tenant access
    if not object_name.startswith(f"{current_user.tenant_id}/"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    storage = get_file_storage()
    content = await storage.download_file(bucket, object_name)
    
    if content is None:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get metadata for content type
    metadata = await storage.get_file_metadata(bucket, object_name)
    content_type = metadata.content_type if metadata else "application/octet-stream"
    filename = metadata.name if metadata else object_name.split("/")[-1]
    
    return StreamingResponse(
        io.BytesIO(content),
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/presigned-url/{bucket}/{object_name:path}", response_model=PresignedUrlResponse)
async def get_presigned_download_url(
    bucket: StorageBucket,
    object_name: str,
    expires_hours: int = Query(1, ge=1, le=24),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get a presigned URL for direct file download.
    URL expires after specified hours.
    """
    # Verify tenant access
    if not object_name.startswith(f"{current_user.tenant_id}/"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    storage = get_file_storage()
    expires = timedelta(hours=expires_hours)
    
    url = await storage.get_presigned_url(bucket, object_name, expires)
    
    return PresignedUrlResponse(
        url=url,
        expires_in_seconds=int(expires.total_seconds()),
        object_name=object_name,
    )


@router.post("/presigned-upload/{bucket}", response_model=PresignedUrlResponse)
async def get_presigned_upload_url(
    bucket: StorageBucket,
    request: PresignedUploadRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get a presigned URL for direct file upload.
    Client can PUT directly to this URL.
    """
    storage = get_file_storage()
    
    # Generate object name
    object_name = storage._generate_object_name(
        current_user.tenant_id,
        request.filename,
        request.prefix or "",
    )
    
    expires = timedelta(hours=1)
    url = await storage.get_presigned_url(bucket, object_name, expires, for_upload=True)
    
    return PresignedUrlResponse(
        url=url,
        expires_in_seconds=int(expires.total_seconds()),
        object_name=object_name,
    )


@router.get("/list/{bucket}", response_model=List[FileMetadataResponse])
async def list_files(
    bucket: StorageBucket,
    prefix: str = Query("", description="Filter by prefix"),
    limit: int = Query(50, ge=1, le=200),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List files in bucket for current tenant"""
    storage = get_file_storage()
    
    files = await storage.list_files(
        tenant_id=current_user.tenant_id,
        bucket=bucket,
        prefix=prefix,
        limit=limit,
    )
    
    return [
        FileMetadataResponse(
            name=f.name,
            size=f.size,
            content_type=f.content_type,
            last_modified=f.last_modified,
            bucket=f.bucket,
        )
        for f in files
    ]


@router.delete("/{bucket}/{object_name:path}")
async def delete_file(
    bucket: StorageBucket,
    object_name: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Delete a file from storage"""
    # Verify tenant access
    if not object_name.startswith(f"{current_user.tenant_id}/"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    storage = get_file_storage()
    success = await storage.delete_file(bucket, object_name)
    
    if not success:
        raise HTTPException(status_code=404, detail="File not found or already deleted")
    
    return {"success": True, "message": "File deleted"}


@router.get("/health")
async def health():
    """Health check for file storage service"""
    storage = get_file_storage()
    
    try:
        await storage.initialize()
        return {"status": "healthy", "service": "file-storage"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@router.get("/")
async def files_root():
    """Files root - index of file storage endpoints."""
    return {
        "message": "File storage API",
        "endpoints": {
            "upload": "/api/v1/files/upload/{bucket}",
            "upload_multiple": "/api/v1/files/upload-multiple/{bucket}",
            "list": "/api/v1/files/list/{bucket}",
            "download": "/api/v1/files/download/{bucket}/{object_name}",
            "presigned_upload": "/api/v1/files/presigned-upload/{bucket}",
        }
    }
