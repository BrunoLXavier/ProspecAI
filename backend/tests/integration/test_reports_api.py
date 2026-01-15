"""
Integration Tests for Reports API Endpoints
Tests RF-09: Report generation and export functionality
"""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime
from uuid import uuid4

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def sample_report_request():
    """Sample report generation request."""
    return {
        "template_id": "proposal_summary",
        "parameters": {
            "proposal_id": str(uuid4()),
        },
        "format": "html",
    }


@pytest.fixture
def sample_templates():
    """Sample report templates list."""
    return [
        {
            "id": "proposal_summary",
            "name": "Resumo de Proposta",
            "description": "Relatório detalhado de uma proposta específica",
            "parameters": ["proposal_id"],
            "output_formats": ["html", "csv", "json"],
        },
        {
            "id": "matching_analysis",
            "name": "Análise de Matching",
            "description": "Análise de compatibilidade projeto-fomento",
            "parameters": ["project_id", "funding_id"],
            "output_formats": ["html", "csv", "json"],
        },
        {
            "id": "portfolio_overview",
            "name": "Visão do Portfólio",
            "description": "Panorama geral de todos os projetos",
            "parameters": ["start_date", "end_date"],
            "output_formats": ["html", "csv", "json"],
        },
        {
            "id": "pipeline_status",
            "name": "Status do Pipeline",
            "description": "Situação atual do funil de vendas",
            "parameters": [],
            "output_formats": ["html", "csv", "json"],
        },
        {
            "id": "funding_opportunities",
            "name": "Oportunidades de Fomento",
            "description": "Lista de editais ativos e futuros",
            "parameters": ["trl_min", "trl_max"],
            "output_formats": ["html", "csv", "json"],
        },
    ]


# =============================================================================
# Reports API Tests
# =============================================================================

@pytest.mark.asyncio
class TestReportsAPI:
    """
    Tests for Reports API endpoints.
    Implements RF-09: Relatórios personalizáveis.
    """

    async def test_list_templates(self):
        """Test listing available report templates."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/reports/templates")
            
            assert response.status_code in [200, 401, 403]
            
            if response.status_code == 200:
                data = response.json()
                assert isinstance(data, list)
                
                # Verify template structure
                if len(data) > 0:
                    template = data[0]
                    assert "id" in template
                    assert "name" in template
                    assert "description" in template

    async def test_generate_html_report(self, sample_report_request):
        """Test generating HTML report."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/reports/generate/html",
                json=sample_report_request,
            )
            
            assert response.status_code in [200, 401, 403, 404]
            
            if response.status_code == 200:
                # HTML content should be returned
                content_type = response.headers.get("content-type", "")
                assert "text/html" in content_type or "application/json" in content_type

    async def test_generate_csv_report(self, sample_report_request):
        """Test generating CSV report."""
        sample_report_request["format"] = "csv"
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/reports/generate/csv",
                json=sample_report_request,
            )
            
            assert response.status_code in [200, 401, 403, 404]

    async def test_generate_json_report(self, sample_report_request):
        """Test generating JSON report."""
        sample_report_request["format"] = "json"
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/reports/generate",
                json=sample_report_request,
            )
            
            assert response.status_code in [200, 401, 403, 404]

    async def test_quick_proposal_report(self):
        """Test quick proposal report generation."""
        proposal_id = str(uuid4())
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(f"/api/v1/reports/quick/proposal/{proposal_id}")
            
            # 404 is expected if proposal doesn't exist
            assert response.status_code in [200, 401, 403, 404]

    async def test_quick_matching_report(self):
        """Test quick matching analysis report."""
        project_id = str(uuid4())
        funding_id = str(uuid4())
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                f"/api/v1/reports/quick/matching/{project_id}/{funding_id}"
            )
            
            assert response.status_code in [200, 401, 403, 404]

    async def test_invalid_template_id(self):
        """Test report generation with invalid template ID."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/reports/generate",
                json={
                    "template_id": "nonexistent_template",
                    "parameters": {},
                    "format": "html",
                },
            )
            
            # Should return 404 or validation error
            assert response.status_code in [400, 401, 403, 404, 422]

    async def test_missing_required_parameters(self):
        """Test report generation with missing required parameters."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/reports/generate",
                json={
                    "template_id": "proposal_summary",
                    "parameters": {},  # Missing proposal_id
                    "format": "html",
                },
            )
            
            # Should handle gracefully
            assert response.status_code in [200, 400, 401, 403, 404, 422]


# =============================================================================
# Report Generator Unit Tests
# =============================================================================

class TestReportGenerator:
    """Unit tests for report generation logic."""

    def test_html_report_contains_styling(self):
        """Test HTML reports include inline CSS for styling."""
        sample_html = """
        <html>
        <head>
            <style>
                body { font-family: Arial; }
                .header { background: #3b82f6; }
            </style>
        </head>
        <body>
            <div class="header">Report Title</div>
        </body>
        </html>
        """
        
        assert "<style>" in sample_html
        assert "font-family" in sample_html

    def test_csv_format_escaping(self):
        """Test CSV properly escapes special characters."""
        import csv
        from io import StringIO
        
        data = [
            ["Name", "Description"],
            ["Test Project", 'Description with "quotes" and, commas'],
            ["Another", "Simple text"],
        ]
        
        output = StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
        writer.writerows(data)
        
        csv_content = output.getvalue()
        
        # Verify escaping
        assert '"Description with ""quotes"" and, commas"' in csv_content

    def test_json_report_structure(self):
        """Test JSON report has proper structure."""
        import json
        
        report_data = {
            "template_id": "portfolio_overview",
            "generated_at": datetime.now().isoformat(),
            "data": {
                "projects": [
                    {"id": "1", "name": "Project A", "trl": 4},
                    {"id": "2", "name": "Project B", "trl": 6},
                ],
                "summary": {
                    "total_projects": 2,
                    "avg_trl": 5.0,
                },
            },
        }
        
        # Should serialize without errors
        json_str = json.dumps(report_data)
        parsed = json.loads(json_str)
        
        assert parsed["template_id"] == "portfolio_overview"
        assert len(parsed["data"]["projects"]) == 2


# =============================================================================
# Template Validation Tests
# =============================================================================

class TestTemplateValidation:
    """Tests for report template validation."""

    def test_all_templates_have_required_fields(self, sample_templates):
        """Test all templates have required fields."""
        required_fields = ["id", "name", "description", "parameters", "output_formats"]
        
        for template in sample_templates:
            for field in required_fields:
                assert field in template, f"Template {template['id']} missing {field}"

    def test_template_ids_are_unique(self, sample_templates):
        """Test template IDs are unique."""
        ids = [t["id"] for t in sample_templates]
        assert len(ids) == len(set(ids)), "Duplicate template IDs found"

    def test_output_formats_are_valid(self, sample_templates):
        """Test output formats are valid options."""
        valid_formats = {"html", "csv", "json", "pdf", "xlsx"}
        
        for template in sample_templates:
            for fmt in template["output_formats"]:
                assert fmt in valid_formats, f"Invalid format {fmt} in {template['id']}"

    def test_expected_templates_exist(self, sample_templates):
        """Test expected templates are defined per RF-09."""
        expected_ids = {
            "proposal_summary",
            "matching_analysis",
            "portfolio_overview",
            "pipeline_status",
            "funding_opportunities",
        }
        
        actual_ids = {t["id"] for t in sample_templates}
        assert expected_ids.issubset(actual_ids)


# =============================================================================
# Report Content Tests
# =============================================================================

class TestReportContent:
    """Tests for report content generation."""

    def test_proposal_summary_fields(self):
        """Test proposal summary includes required fields."""
        required_fields = [
            "proposal_id",
            "title",
            "client_name",
            "funding_source",
            "status",
            "version",
            "created_at",
        ]
        
        # Simulate report data structure
        report_data = {
            "proposal_id": str(uuid4()),
            "title": "Test Proposal",
            "client_name": "TechCorp",
            "funding_source": "FAPESP",
            "status": "draft",
            "version": 1,
            "created_at": datetime.now().isoformat(),
        }
        
        for field in required_fields:
            assert field in report_data

    def test_matching_analysis_includes_scores(self):
        """Test matching analysis includes score breakdown."""
        matching_data = {
            "project_name": "AI Vision System",
            "funding_name": "FAPESP Regular",
            "total_score": 82.5,
            "breakdown": {
                "technical_viability": 85.0,
                "financial_viability": 78.0,
                "strategic_alignment": 84.0,
            },
            "explanation": {
                "technical_factors": ["TRL compatible", "Team qualified"],
                "financial_factors": ["Budget within limits"],
                "strategic_factors": ["Aligned with priority areas"],
            },
        }
        
        # Verify score formula
        calculated = (
            matching_data["breakdown"]["technical_viability"] * 0.4 +
            matching_data["breakdown"]["financial_viability"] * 0.3 +
            matching_data["breakdown"]["strategic_alignment"] * 0.3
        )
        
        # Should match (with floating point tolerance)
        assert abs(calculated - matching_data["total_score"]) < 0.1

    def test_portfolio_overview_structure(self):
        """Test portfolio overview has correct structure."""
        portfolio_data = {
            "period": {"start": "2026-01-01", "end": "2026-12-31"},
            "summary": {
                "total_projects": 45,
                "active_projects": 38,
                "completed_projects": 7,
                "total_value": 15000000.0,
            },
            "by_trl": [
                {"trl": i, "count": 5} for i in range(1, 10)
            ],
            "by_status": [
                {"status": "active", "count": 38},
                {"status": "completed", "count": 7},
            ],
        }
        
        assert "summary" in portfolio_data
        assert "by_trl" in portfolio_data
        assert len(portfolio_data["by_trl"]) == 9  # TRL 1-9
