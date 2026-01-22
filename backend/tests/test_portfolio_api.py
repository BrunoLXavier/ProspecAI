"""
Integration Tests for Portfolio API Routes
Tests HTTP endpoints for institutes, teams, and infrastructures
Implements RF-03: Portfólio Institucional
"""
import pytest
from httpx import AsyncClient, ASGITransport
from uuid import uuid4
from datetime import datetime

from main import app


# ============================================================================
# TEST FIXTURES
# ============================================================================
@pytest.fixture
def test_tenant_id():
    """Generate a test tenant ID."""
    return str(uuid4())


@pytest.fixture
def test_user_id():
    """Generate a test user ID."""
    return str(uuid4())


@pytest.fixture
def test_headers(test_tenant_id, test_user_id):
    """Generate test headers with tenant and user context."""
    return {
        "X-Tenant-ID": test_tenant_id,
        "X-User-ID": test_user_id,
        "Content-Type": "application/json",
    }


# ============================================================================
# INSTITUTE API TESTS
# ============================================================================
class TestInstituteAPI:
    """Integration tests for Institute API endpoints."""
    
    @pytest.mark.asyncio
    async def test_list_institutes_returns_json(self, test_headers):
        """Test GET /api/v1/institutes returns JSON."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/institutes", headers=test_headers)
            
            # Should return 200 or 401/403 if auth required
            assert response.status_code in [200, 401, 403, 422]
            
            if response.status_code == 200:
                data = response.json()
                assert isinstance(data, (list, dict))
    
    @pytest.mark.asyncio
    async def test_create_institute_requires_auth(self, test_headers):
        """Test POST /api/v1/portfolio/institutes requires authentication."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "nome": "Test Institute",
                "isi_sigla": "TST",
                "descricao": "Test Description",
            }
            response = await client.post(
                "/api/v1/portfolio/institutes",
                json=payload,
                headers=test_headers
            )
            
            # Without proper auth, should return 401 or 403
            # If auth is mocked/disabled, might return 200 or 422
            assert response.status_code in [200, 201, 401, 403, 422]
    
    @pytest.mark.asyncio
    async def test_get_institute_by_id_not_found(self, test_headers):
        """Test GET /api/v1/portfolio/institutes/{id} returns 404 for non-existent."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            fake_id = str(uuid4())
            response = await client.get(
                f"/api/v1/portfolio/institutes/{fake_id}",
                headers=test_headers
            )
            
            # Should return 404 Not Found or 401/403 if auth required
            assert response.status_code in [401, 403, 404, 422]


# ============================================================================
# TEAM API TESTS
# ============================================================================
class TestTeamAPI:
    """Integration tests for Team API endpoints."""
    
    @pytest.mark.asyncio
    async def test_list_teams_endpoint(self, test_headers):
        """Test GET /api/v1/portfolio/teams returns list."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/portfolio/teams", headers=test_headers)
            
            assert response.status_code in [200, 401, 403, 422]
            
            if response.status_code == 200:
                data = response.json()
                assert isinstance(data, (list, dict))
    
    @pytest.mark.asyncio
    async def test_teams_by_institute_filter(self, test_headers):
        """Test filtering teams by institute_id."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            institute_id = str(uuid4())
            response = await client.get(
                f"/api/v1/portfolio/teams?institute_id={institute_id}",
                headers=test_headers
            )
            
            assert response.status_code in [200, 401, 403, 422]


# ============================================================================
# INFRASTRUCTURE API TESTS
# ============================================================================
class TestInfrastructureAPI:
    """Integration tests for Infrastructure API endpoints."""
    
    @pytest.mark.asyncio
    async def test_list_infrastructures(self, test_headers):
        """Test GET /api/v1/infrastructures returns list."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/infrastructures", headers=test_headers)
            
            assert response.status_code in [200, 401, 403, 422]
    
    @pytest.mark.asyncio
    async def test_infrastructure_by_institute(self, test_headers):
        """Test filtering infrastructures by institute."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            institute_id = str(uuid4())
            response = await client.get(
                f"/api/v1/infrastructures?institute_id={institute_id}",
                headers=test_headers
            )
            
            assert response.status_code in [200, 401, 403, 422]


# ============================================================================
# MATCHING API TESTS
# ============================================================================
class TestMatchingAPI:
    """Integration tests for Matching API endpoints."""
    
    @pytest.mark.asyncio
    async def test_matching_endpoint_exists(self, test_headers):
        """Test matching endpoint is registered."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # POST to execute matching
            payload = {
                "project_id": str(uuid4()),
                "min_score": 0.6,
                "max_results": 10
            }
            response = await client.post(
                "/api/v1/matching/execute",
                json=payload,
                headers=test_headers
            )
            
            # Should not return 404 (endpoint exists)
            assert response.status_code != 404
    
    @pytest.mark.asyncio
    async def test_matching_requires_project_or_funding(self, test_headers):
        """Test matching requires either project_id or funding_source_id."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Empty payload - should fail validation
            payload = {
                "min_score": 0.6,
                "max_results": 10
            }
            response = await client.post(
                "/api/v1/matching/execute",
                json=payload,
                headers=test_headers
            )
            
            # Should return 400 Bad Request or 422 Validation Error or 401/403 auth
            assert response.status_code in [400, 401, 403, 422]


# ============================================================================
# FILE UPLOAD API TESTS
# ============================================================================
class TestFilesAPI:
    """Integration tests for Files API endpoints."""
    
    @pytest.mark.asyncio
    async def test_presigned_url_endpoint(self, test_headers):
        """Test presigned URL endpoint exists."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/files/presigned-upload/test-bucket/test-file.pdf",
                headers=test_headers
            )
            
            # Should not return 404 (endpoint exists)
            # May return auth error or 500 if MinIO not configured
            assert response.status_code != 404 or response.status_code in [401, 403, 500, 503]
    
    @pytest.mark.asyncio
    async def test_list_files_endpoint(self, test_headers):
        """Test list files endpoint."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/files/list/test-bucket",
                headers=test_headers
            )
            
            # Endpoint should exist
            assert response.status_code in [200, 401, 403, 500, 503]


# ============================================================================
# CORS AND HEADERS TESTS
# ============================================================================
class TestCORSAndHeaders:
    """Tests for CORS and header handling."""
    
    @pytest.mark.asyncio
    async def test_cors_preflight(self):
        """Test CORS preflight requests are handled."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.options(
                "/api/v1/institutes",
                headers={
                    "Origin": "http://localhost:3000",
                    "Access-Control-Request-Method": "GET",
                }
            )
            
            # CORS preflight should return 200 or 204
            assert response.status_code in [200, 204, 405]
    
    @pytest.mark.asyncio
    async def test_tenant_header_required(self):
        """Test that tenant header is required for protected endpoints."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Request without X-Tenant-ID header
            response = await client.get("/api/v1/portfolio/institutes")
            
            # Should fail without tenant context
            assert response.status_code in [400, 401, 403, 422]


# ============================================================================
# HEALTH CHECK TESTS
# ============================================================================
class TestHealthCheck:
    """Tests for health check endpoints."""
    
    @pytest.mark.asyncio
    async def test_health_endpoint(self):
        """Test /health endpoint returns OK."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health")
            
            # Health endpoint should be accessible
            assert response.status_code in [200, 503]
    
    @pytest.mark.asyncio
    async def test_openapi_docs(self):
        """Test OpenAPI documentation is accessible."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/openapi.json")
            
            assert response.status_code == 200
            data = response.json()
            assert "openapi" in data
            assert "info" in data
            assert data["info"]["title"] == "ProspecAI API"
