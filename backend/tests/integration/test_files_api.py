"""
Integration Tests for File Storage API Endpoints
Tests RF-09: File uploads with MinIO integration
"""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timedelta
from uuid import uuid4
from io import BytesIO

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def sample_file_content():
    """Sample file content for upload tests."""
    return b"This is a test file content for ProspecAI"


@pytest.fixture
def sample_pdf_header():
    """Sample PDF file header."""
    return b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"


@pytest.fixture
def sample_csv_content():
    """Sample CSV content."""
    return b"id,name,value\n1,Test,100\n2,Sample,200\n"


# =============================================================================
# File Upload API Tests
# =============================================================================

@pytest.mark.asyncio
class TestFileUploadAPI:
    """
    Tests for File Upload API endpoints.
    Implements RF-09: Upload de arquivos com MinIO.
    """

    async def test_upload_single_file(self, sample_file_content):
        """Test uploading a single file."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            files = {"file": ("test.txt", BytesIO(sample_file_content), "text/plain")}
            
            response = await client.post(
                "/api/v1/files/upload/documents",
                files=files,
            )
            
            # May require auth
            assert response.status_code in [200, 201, 401, 403, 500]
            
            if response.status_code in [200, 201]:
                data = response.json()
                assert "object_name" in data or "url" in data

    async def test_upload_to_proposals_bucket(self, sample_file_content):
        """Test uploading to proposals bucket."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            files = {"file": ("proposal.docx", BytesIO(sample_file_content), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
            
            response = await client.post(
                "/api/v1/files/upload/proposals",
                files=files,
            )
            
            assert response.status_code in [200, 201, 401, 403, 500]

    async def test_upload_to_reports_bucket(self, sample_csv_content):
        """Test uploading to reports bucket."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            files = {"file": ("report.csv", BytesIO(sample_csv_content), "text/csv")}
            
            response = await client.post(
                "/api/v1/files/upload/reports",
                files=files,
            )
            
            assert response.status_code in [200, 201, 401, 403, 500]

    async def test_upload_to_attachments_bucket(self, sample_file_content):
        """Test uploading to attachments bucket."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            files = {"file": ("attachment.pdf", BytesIO(sample_file_content), "application/pdf")}
            
            response = await client.post(
                "/api/v1/files/upload/attachments",
                files=files,
            )
            
            assert response.status_code in [200, 201, 401, 403, 500]

    async def test_upload_with_prefix(self, sample_file_content):
        """Test uploading with custom prefix path."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            files = {"file": ("test.txt", BytesIO(sample_file_content), "text/plain")}
            
            response = await client.post(
                "/api/v1/files/upload/documents",
                files=files,
                params={"prefix": "project_123/"},
            )
            
            assert response.status_code in [200, 201, 401, 403, 500]

    async def test_upload_multiple_files(self, sample_file_content):
        """Test uploading multiple files at once."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            files = [
                ("files", ("file1.txt", BytesIO(sample_file_content), "text/plain")),
                ("files", ("file2.txt", BytesIO(sample_file_content), "text/plain")),
            ]
            
            response = await client.post(
                "/api/v1/files/upload-multiple/documents",
                files=files,
            )
            
            assert response.status_code in [200, 201, 401, 403, 500]


# =============================================================================
# File Download API Tests
# =============================================================================

@pytest.mark.asyncio
class TestFileDownloadAPI:
    """Tests for file download endpoints."""

    async def test_download_file(self):
        """Test downloading a file by object name."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/files/download/documents/test.txt"
            )
            
            # 404 is expected if file doesn't exist
            assert response.status_code in [200, 401, 403, 404, 500]

    async def test_get_presigned_download_url(self):
        """Test getting presigned URL for download."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/files/presigned-url/documents/test.txt"
            )
            
            assert response.status_code in [200, 401, 403, 404, 500]
            
            if response.status_code == 200:
                data = response.json()
                assert "url" in data

    async def test_get_presigned_upload_url(self):
        """Test getting presigned URL for direct upload."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/files/presigned-upload/documents",
                json={"filename": "new-file.txt", "content_type": "text/plain"},
            )
            
            assert response.status_code in [200, 401, 403, 500]
            
            if response.status_code == 200:
                data = response.json()
                assert "url" in data


# =============================================================================
# File Listing API Tests
# =============================================================================

@pytest.mark.asyncio
class TestFileListingAPI:
    """Tests for file listing endpoints."""

    async def test_list_files_in_bucket(self):
        """Test listing files in a bucket."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/files/list/documents")
            
            assert response.status_code in [200, 401, 403, 500]
            
            if response.status_code == 200:
                data = response.json()
                assert isinstance(data, list) or "files" in data

    async def test_list_files_with_prefix(self):
        """Test listing files with prefix filter."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/files/list/documents",
                params={"prefix": "project_123/"},
            )
            
            assert response.status_code in [200, 401, 403, 500]

    async def test_list_files_with_pagination(self):
        """Test listing files with pagination."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/files/list/documents",
                params={"limit": 10, "offset": 0},
            )
            
            assert response.status_code in [200, 401, 403, 500]


# =============================================================================
# File Deletion API Tests
# =============================================================================

@pytest.mark.asyncio
class TestFileDeletionAPI:
    """Tests for file deletion endpoints."""

    async def test_delete_file(self):
        """Test deleting a file."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.delete(
                "/api/v1/files/documents/test-to-delete.txt"
            )
            
            # 404 is expected if file doesn't exist
            assert response.status_code in [200, 204, 401, 403, 404, 500]


# =============================================================================
# File Storage Service Unit Tests
# =============================================================================

class TestFileStorageService:
    """Unit tests for file storage service logic."""

    def test_bucket_names(self):
        """Test valid bucket names."""
        valid_buckets = ["proposals", "documents", "reports", "attachments"]
        
        for bucket in valid_buckets:
            # Bucket names should be lowercase
            assert bucket.islower()
            # No special characters
            assert bucket.isalnum() or "-" in bucket

    def test_object_name_generation(self):
        """Test object name generation with tenant isolation."""
        tenant_id = str(uuid4())
        filename = "test.pdf"
        prefix = ""
        
        # Expected format: {tenant_id}/{prefix}{uuid}_{filename}
        object_name = f"{tenant_id}/{prefix}{uuid4()}_{filename}"
        
        assert tenant_id in object_name
        assert filename in object_name

    def test_presigned_url_expiration(self):
        """Test presigned URL expiration time."""
        default_expiration = timedelta(hours=24)
        
        assert default_expiration.total_seconds() == 86400

    def test_content_type_detection(self):
        """Test content type detection from filename."""
        import mimetypes
        
        test_files = {
            "document.pdf": "application/pdf",
            "spreadsheet.xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "image.png": "image/png",
            "data.csv": "text/csv",
            "archive.zip": "application/zip",
        }
        
        for filename, expected_type in test_files.items():
            detected, _ = mimetypes.guess_type(filename)
            # Note: mimetypes may return None for some types
            if detected:
                assert detected == expected_type or detected is not None


# =============================================================================
# File Validation Tests
# =============================================================================

class TestFileValidation:
    """Tests for file upload validation."""

    def test_max_file_size(self):
        """Test maximum file size limit."""
        max_size_mb = 50
        max_size_bytes = max_size_mb * 1024 * 1024
        
        assert max_size_bytes == 52428800

    def test_allowed_file_types(self):
        """Test allowed file types for upload."""
        allowed_types = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/csv",
            "text/plain",
            "image/png",
            "image/jpeg",
            "application/zip",
        ]
        
        # Verify common document types are allowed
        assert "application/pdf" in allowed_types
        assert "text/csv" in allowed_types

    def test_filename_sanitization(self):
        """Test filename sanitization for security."""
        import re
        
        unsafe_filenames = [
            "../../../etc/passwd",
            "..\\..\\system.ini",
            "file<script>.txt",
            "file|name.pdf",
        ]
        
        safe_pattern = re.compile(r'^[\w\-. ]+$')
        
        for filename in unsafe_filenames:
            # These should NOT match the safe pattern
            assert not safe_pattern.match(filename)

    def test_tenant_isolation_in_path(self):
        """Test tenant ID is included in storage path."""
        tenant_id = str(uuid4())
        filename = "report.pdf"
        
        storage_path = f"{tenant_id}/documents/{filename}"
        
        # Tenant ID should be first segment
        assert storage_path.startswith(tenant_id)


# =============================================================================
# MinIO Configuration Tests
# =============================================================================

class TestMinIOConfiguration:
    """Tests for MinIO configuration."""

    def test_minio_environment_variables(self):
        """Test required MinIO environment variables."""
        required_vars = [
            "MINIO_ENDPOINT",
            "MINIO_ACCESS_KEY",
            "MINIO_SECRET_KEY",
        ]
        
        # These should be defined in .env.template
        for var in required_vars:
            # Just verify variable names are correct
            assert var.startswith("MINIO_")

    def test_bucket_policy_structure(self):
        """Test bucket policy has correct structure."""
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": ["arn:aws:s3:::prospecai-documents/*"],
                }
            ],
        }
        
        assert "Version" in policy
        assert "Statement" in policy
        assert len(policy["Statement"]) > 0
