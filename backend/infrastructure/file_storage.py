"""
File Storage Service with MinIO
Implements RF-09: File storage with presigned URLs
"""
import os
import io
from typing import Optional, BinaryIO, Dict, Any, List
from datetime import timedelta
from dataclasses import dataclass
from enum import Enum
import mimetypes
import hashlib
import uuid

from minio import Minio
from minio.error import S3Error


# =============================================================================
# Configuration
# =============================================================================

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"

# Bucket names by purpose
BUCKET_PROPOSALS = "proposals"
BUCKET_DOCUMENTS = "documents"
BUCKET_REPORTS = "reports"
BUCKET_ATTACHMENTS = "attachments"

# Upload limits
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_EXTENSIONS = {
    "documents": [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".html", ".htm"],
    "images": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
    "data": [".csv", ".json", ".xml"],
    "audio": [".mp3", ".wav", ".ogg", ".webm", ".m4a"],
    "video": [".mp4", ".webm", ".mov", ".avi"],
}


class StorageBucket(str, Enum):
    """Available storage buckets"""
    PROPOSALS = "proposals"
    DOCUMENTS = "documents"
    REPORTS = "reports"
    ATTACHMENTS = "attachments"


@dataclass
class UploadResult:
    """Result of file upload"""
    success: bool
    object_name: str
    bucket: str
    size: int
    content_type: str
    etag: str
    url: Optional[str] = None
    error: Optional[str] = None


@dataclass
class FileMetadata:
    """File metadata"""
    name: str
    size: int
    content_type: str
    last_modified: str
    etag: str
    bucket: str


# =============================================================================
# MinIO Client Wrapper
# =============================================================================

class FileStorageService:
    """
    File storage service using MinIO.
    Provides upload, download, and presigned URL generation.
    """
    
    _instance: Optional['FileStorageService'] = None
    
    def __init__(self):
        self.client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=MINIO_SECURE,
        )
        self._initialized = False
    
    @classmethod
    def get_instance(cls) -> 'FileStorageService':
        """Singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    async def initialize(self):
        """Create required buckets if they don't exist"""
        if self._initialized:
            return
        
        buckets = [BUCKET_PROPOSALS, BUCKET_DOCUMENTS, BUCKET_REPORTS, BUCKET_ATTACHMENTS]
        
        for bucket in buckets:
            try:
                if not self.client.bucket_exists(bucket):
                    self.client.make_bucket(bucket)
                    print(f"Created bucket: {bucket}")
            except S3Error as e:
                print(f"Error creating bucket {bucket}: {e}")
        
        self._initialized = True
    
    def _generate_object_name(
        self,
        tenant_id: str,
        filename: str,
        prefix: str = ""
    ) -> str:
        """Generate unique object name with tenant isolation"""
        ext = os.path.splitext(filename)[1].lower()
        unique_id = uuid.uuid4().hex[:8]
        safe_name = "".join(c if c.isalnum() or c in ".-_" else "_" for c in filename)
        
        if prefix:
            return f"{tenant_id}/{prefix}/{unique_id}_{safe_name}"
        return f"{tenant_id}/{unique_id}_{safe_name}"
    
    def _validate_file(self, filename: str, size: int, category: str = "documents") -> Optional[str]:
        """Validate file before upload"""
        if size > MAX_FILE_SIZE:
            return f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
        
        ext = os.path.splitext(filename)[1].lower()
        allowed = ALLOWED_EXTENSIONS.get(category, [])
        
        if allowed and ext not in allowed:
            return f"File type not allowed. Allowed: {', '.join(allowed)}"
        
        return None
    
    async def upload_file(
        self,
        tenant_id: str,
        bucket: StorageBucket,
        filename: str,
        data: BinaryIO,
        size: int,
        content_type: Optional[str] = None,
        prefix: str = "",
        metadata: Optional[Dict[str, str]] = None,
    ) -> UploadResult:
        """
        Upload file to storage.
        
        Args:
            tenant_id: Tenant for isolation
            bucket: Target bucket
            filename: Original filename
            data: File data stream
            size: File size in bytes
            content_type: MIME type (auto-detected if not provided)
            prefix: Optional path prefix within bucket
            metadata: Optional custom metadata
        
        Returns:
            UploadResult with details
        """
        await self.initialize()
        
        # Validate
        error = self._validate_file(filename, size)
        if error:
            return UploadResult(
                success=False,
                object_name="",
                bucket=bucket.value,
                size=0,
                content_type="",
                etag="",
                error=error,
            )
        
        # Detect content type
        if not content_type:
            content_type, _ = mimetypes.guess_type(filename)
            content_type = content_type or "application/octet-stream"
        
        # Generate object name
        object_name = self._generate_object_name(tenant_id, filename, prefix)
        
        try:
            result = self.client.put_object(
                bucket_name=bucket.value,
                object_name=object_name,
                data=data,
                length=size,
                content_type=content_type,
                metadata=metadata,
            )
            
            return UploadResult(
                success=True,
                object_name=object_name,
                bucket=bucket.value,
                size=size,
                content_type=content_type,
                etag=result.etag,
            )
        
        except S3Error as e:
            return UploadResult(
                success=False,
                object_name=object_name,
                bucket=bucket.value,
                size=0,
                content_type="",
                etag="",
                error=str(e),
            )
    
    async def upload_bytes(
        self,
        tenant_id: str,
        bucket: StorageBucket,
        filename: str,
        content: bytes,
        content_type: Optional[str] = None,
        prefix: str = "",
    ) -> UploadResult:
        """Upload bytes directly"""
        data = io.BytesIO(content)
        return await self.upload_file(
            tenant_id=tenant_id,
            bucket=bucket,
            filename=filename,
            data=data,
            size=len(content),
            content_type=content_type,
            prefix=prefix,
        )
    
    async def get_presigned_url(
        self,
        bucket: StorageBucket,
        object_name: str,
        expires: timedelta = timedelta(hours=1),
        for_upload: bool = False,
    ) -> str:
        """
        Generate presigned URL for direct access.
        
        Args:
            bucket: Target bucket
            object_name: Object path
            expires: URL expiration time
            for_upload: If True, generates PUT URL; otherwise GET
        
        Returns:
            Presigned URL string
        """
        await self.initialize()
        
        try:
            if for_upload:
                url = self.client.presigned_put_object(
                    bucket_name=bucket.value,
                    object_name=object_name,
                    expires=expires,
                )
            else:
                url = self.client.presigned_get_object(
                    bucket_name=bucket.value,
                    object_name=object_name,
                    expires=expires,
                )
            return url
        except S3Error as e:
            raise Exception(f"Failed to generate presigned URL: {e}")
    
    async def download_file(
        self,
        bucket: StorageBucket,
        object_name: str,
    ) -> Optional[bytes]:
        """Download file content"""
        await self.initialize()
        
        try:
            response = self.client.get_object(bucket.value, object_name)
            return response.read()
        except S3Error:
            return None
        finally:
            if 'response' in locals():
                response.close()
                response.release_conn()
    
    async def delete_file(
        self,
        bucket: StorageBucket,
        object_name: str,
    ) -> bool:
        """Delete file from storage"""
        await self.initialize()
        
        try:
            self.client.remove_object(bucket.value, object_name)
            return True
        except S3Error:
            return False
    
    async def list_files(
        self,
        tenant_id: str,
        bucket: StorageBucket,
        prefix: str = "",
        limit: int = 100,
    ) -> List[FileMetadata]:
        """List files for tenant in bucket"""
        await self.initialize()
        
        full_prefix = f"{tenant_id}/{prefix}" if prefix else f"{tenant_id}/"
        
        files = []
        try:
            objects = self.client.list_objects(
                bucket.value,
                prefix=full_prefix,
                recursive=True,
            )
            
            for obj in objects:
                if len(files) >= limit:
                    break
                
                files.append(FileMetadata(
                    name=obj.object_name.split("/")[-1],
                    size=obj.size,
                    content_type=obj.content_type or "application/octet-stream",
                    last_modified=obj.last_modified.isoformat() if obj.last_modified else "",
                    etag=obj.etag or "",
                    bucket=bucket.value,
                ))
        except S3Error:
            pass
        
        return files
    
    async def get_file_metadata(
        self,
        bucket: StorageBucket,
        object_name: str,
    ) -> Optional[FileMetadata]:
        """Get metadata for specific file"""
        await self.initialize()
        
        try:
            stat = self.client.stat_object(bucket.value, object_name)
            return FileMetadata(
                name=object_name.split("/")[-1],
                size=stat.size,
                content_type=stat.content_type,
                last_modified=stat.last_modified.isoformat() if stat.last_modified else "",
                etag=stat.etag,
                bucket=bucket.value,
            )
        except S3Error:
            return None


# =============================================================================
# Factory
# =============================================================================

def get_file_storage() -> FileStorageService:
    """Get file storage service instance"""
    return FileStorageService.get_instance()
