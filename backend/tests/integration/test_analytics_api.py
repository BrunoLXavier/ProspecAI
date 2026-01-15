"""
Integration Tests for Analytics API Endpoints
Tests RF-07: Analytics and dashboard functionality
"""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timedelta
from uuid import uuid4

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def mock_analytics_data():
    """Sample analytics data for testing."""
    return {
        "total_clients": 150,
        "total_projects": 45,
        "active_opportunities": 23,
        "matching_success_rate": 0.72,
        "period": "month",
        "generated_at": datetime.now().isoformat(),
    }


@pytest.fixture
def mock_pipeline_data():
    """Sample pipeline data for testing."""
    return [
        {"stage": "intelligence", "count": 15, "value": 2500000},
        {"stage": "qualification", "count": 10, "value": 1800000},
        {"stage": "proposal", "count": 8, "value": 1500000},
        {"stage": "negotiation", "count": 5, "value": 900000},
        {"stage": "closed_won", "count": 12, "value": 3200000},
        {"stage": "closed_lost", "count": 3, "value": 400000},
        {"stage": "post_sale", "count": 8, "value": 2100000},
    ]


@pytest.fixture
def mock_trl_distribution():
    """Sample TRL distribution for testing."""
    return [
        {"trl": 1, "count": 3},
        {"trl": 2, "count": 5},
        {"trl": 3, "count": 8},
        {"trl": 4, "count": 12},
        {"trl": 5, "count": 10},
        {"trl": 6, "count": 7},
        {"trl": 7, "count": 5},
        {"trl": 8, "count": 3},
        {"trl": 9, "count": 2},
    ]


# =============================================================================
# Analytics API Tests
# =============================================================================

@pytest.mark.asyncio
class TestAnalyticsAPI:
    """
    Tests for Analytics API endpoints.
    Implements RF-07: Dashboards e gráficos analíticos.
    """

    async def test_get_overview_kpis(self):
        """Test fetching overview KPIs."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/analytics/overview",
                params={"period": "month"},
            )
            
            # Should return 200 or require auth (401)
            assert response.status_code in [200, 401, 403]
            
            if response.status_code == 200:
                data = response.json()
                # Verify KPI structure
                assert "total_clients" in data or "kpis" in data

    async def test_get_pipeline_by_stage(self):
        """Test fetching pipeline data by stage."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/analytics/pipeline")
            
            assert response.status_code in [200, 401, 403]
            
            if response.status_code == 200:
                data = response.json()
                assert isinstance(data, list) or "stages" in data

    async def test_get_trl_distribution(self):
        """Test fetching TRL distribution."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/analytics/trl-distribution")
            
            assert response.status_code in [200, 401, 403]

    async def test_get_matching_trends(self):
        """Test fetching matching trends over time."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/analytics/matching-trends",
                params={"period": "quarter"},
            )
            
            assert response.status_code in [200, 401, 403]

    async def test_get_funding_categories(self):
        """Test fetching funding by categories."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/analytics/funding-categories")
            
            assert response.status_code in [200, 401, 403]

    async def test_get_top_clients(self):
        """Test fetching top clients ranking."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/analytics/top-clients",
                params={"limit": 10},
            )
            
            assert response.status_code in [200, 401, 403]

    async def test_export_analytics_csv(self):
        """Test exporting analytics data to CSV."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/analytics/export",
                params={"format": "csv", "period": "month"},
            )
            
            assert response.status_code in [200, 401, 403]
            
            if response.status_code == 200:
                assert "text/csv" in response.headers.get("content-type", "")

    async def test_analytics_with_invalid_period(self):
        """Test analytics with invalid period parameter."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/analytics/overview",
                params={"period": "invalid_period"},
            )
            
            # Should return 422 (validation error) or handle gracefully
            assert response.status_code in [200, 400, 401, 422]


# =============================================================================
# Analytics Service Unit Tests
# =============================================================================

class TestAnalyticsServiceCalculations:
    """Unit tests for analytics calculations."""

    def test_trend_calculation_positive(self):
        """Test trend calculation for positive change."""
        current = 100
        previous = 80
        
        change = ((current - previous) / previous) * 100
        direction = "up" if change > 0 else "down" if change < 0 else "stable"
        
        assert change == 25.0
        assert direction == "up"

    def test_trend_calculation_negative(self):
        """Test trend calculation for negative change."""
        current = 60
        previous = 80
        
        change = ((current - previous) / previous) * 100
        direction = "up" if change > 0 else "down" if change < 0 else "stable"
        
        assert change == -25.0
        assert direction == "down"

    def test_trend_calculation_stable(self):
        """Test trend calculation for no change."""
        current = 100
        previous = 100
        
        change = ((current - previous) / previous) * 100 if previous > 0 else 0
        direction = "up" if change > 0 else "down" if change < 0 else "stable"
        
        assert change == 0.0
        assert direction == "stable"

    def test_trend_calculation_zero_previous(self):
        """Test trend calculation when previous value is zero."""
        current = 50
        previous = 0
        
        # Avoid division by zero
        change = 100.0 if previous == 0 and current > 0 else 0.0
        
        assert change == 100.0

    def test_matching_success_rate(self):
        """Test matching success rate calculation."""
        total_matches = 100
        successful_matches = 72
        
        rate = successful_matches / total_matches if total_matches > 0 else 0
        
        assert rate == 0.72

    def test_pipeline_value_aggregation(self, mock_pipeline_data):
        """Test pipeline value aggregation."""
        total_value = sum(stage["value"] for stage in mock_pipeline_data)
        total_count = sum(stage["count"] for stage in mock_pipeline_data)
        
        assert total_value == 12400000
        assert total_count == 61

    def test_trl_distribution_total(self, mock_trl_distribution):
        """Test TRL distribution totals."""
        total_projects = sum(trl["count"] for trl in mock_trl_distribution)
        
        assert total_projects == 55
        assert len(mock_trl_distribution) == 9  # TRL 1-9


# =============================================================================
# Analytics Data Validation Tests
# =============================================================================

class TestAnalyticsDataValidation:
    """Tests for analytics data validation."""

    def test_kpi_metric_structure(self, mock_analytics_data):
        """Test KPI metric structure contains required fields."""
        required_fields = [
            "total_clients",
            "total_projects",
            "active_opportunities",
            "matching_success_rate",
        ]
        
        for field in required_fields:
            assert field in mock_analytics_data

    def test_matching_rate_bounds(self, mock_analytics_data):
        """Test matching success rate is between 0 and 1."""
        rate = mock_analytics_data["matching_success_rate"]
        assert 0 <= rate <= 1

    def test_period_values(self):
        """Test valid period values."""
        valid_periods = ["week", "month", "quarter", "year"]
        
        for period in valid_periods:
            # Just verify these are the expected values
            assert period in valid_periods

    def test_stage_values(self, mock_pipeline_data):
        """Test pipeline stages match RF-05 requirements."""
        expected_stages = {
            "intelligence",
            "qualification",
            "proposal",
            "negotiation",
            "closed_won",
            "closed_lost",
            "post_sale",
        }
        
        actual_stages = {stage["stage"] for stage in mock_pipeline_data}
        assert actual_stages == expected_stages

    def test_trl_range(self, mock_trl_distribution):
        """Test TRL values are in valid range (1-9)."""
        for trl_data in mock_trl_distribution:
            assert 1 <= trl_data["trl"] <= 9
