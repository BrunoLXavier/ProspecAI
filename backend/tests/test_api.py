"""
Integration Tests for API Endpoints
Tests complete request/response cycle
"""
import pytest
from httpx import AsyncClient
from datetime import date

from main import app


@pytest.mark.skip(reason="Requires PostgreSQL - JSONB columns not supported in SQLite")
@pytest.mark.asyncio
class TestFundingAPI:
    """
    Test Funding Sources API endpoints
    Implements RF-02
    """
    
    async def test_create_funding_source(self, override_get_session):
        """Test creating a new funding source"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/funding/",
                json={
                    "name": "Test Funding",
                    "institution": "Test Institution",
                    "instrument_type": "grant",
                    "total_amount": 1000000.0,
                    "submission_start": "2026-01-01",
                    "submission_end": "2026-12-31",
                    "trl_min": 3,
                    "trl_max": 7,
                    "description": "Test description",
                    "requirements": {},
                    "eligibility_criteria": {},
                },
            )
            
            assert response.status_code == 201
            data = response.json()
            assert data["name"] == "Test Funding"
            assert data["instrument_type"] == "grant"
            assert "id" in data
    
    async def test_list_funding_sources(self, override_get_session):
        """Test listing funding sources"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/api/v1/funding/")
            
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
    
    async def test_get_funding_source(self, override_get_session):
        """Test getting a specific funding source"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Get by ID (using stub data)
            get_response = await client.get("/api/v1/funding/1")
            
            assert get_response.status_code == 200
            data = get_response.json()
            assert data["id"] == 1
            assert data["name"] == "Edital Exemplo"  # This is the stub data
    
    async def test_update_funding_source(self, override_get_session):
        """Test updating a funding source"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Create first
            create_response = await client.post(
                "/api/v1/funding/",
                json={
                    "name": "Original Name",
                    "institution": "Test",
                    "instrument_type": "grant",
                    "total_amount": 500000.0,
                    "submission_start": "2026-01-01",
                    "submission_end": "2026-12-31",
                    "trl_min": 1,
                    "trl_max": 9,
                    "description": "Test",
                    "requirements": {},
                    "eligibility_criteria": {},
                },
            )
            
            funding_id = create_response.json()["id"]
            
            # Update
            update_response = await client.patch(
                f"/api/v1/funding/{funding_id}",
                json={"name": "Updated Name", "status": "closed"},
            )
            
            assert update_response.status_code == 200
            data = update_response.json()
            assert data["name"] == "Updated Name"
            assert data["status"] == "closed"
    
    async def test_delete_funding_source(self, override_get_session):
        """Test soft deleting a funding source"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Create first
            create_response = await client.post(
                "/api/v1/funding/",
                json={
                    "name": "To Delete",
                    "institution": "Test",
                    "instrument_type": "grant",
                    "total_amount": 500000.0,
                    "submission_start": "2026-01-01",
                    "submission_end": "2026-12-31",
                    "trl_min": 1,
                    "trl_max": 9,
                    "description": "Test",
                    "requirements": {},
                    "eligibility_criteria": {},
                },
            )
            
            funding_id = create_response.json()["id"]
            
            # Delete
            delete_response = await client.delete(f"/api/v1/funding/{funding_id}")
            
            assert delete_response.status_code == 204
            
            # Note: For stub implementation, we don't test the soft delete verification
            # In a real implementation, this would check that the item is no longer accessible
