"""
Report API Routes
Implements RF-09: Customizable reports and exports
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse, PlainTextResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from adapters.api.auth_middleware import get_current_user, AuthenticatedUser as CurrentUser, require_auth
from services.report_service import (
    get_report_generator, ReportFormat, ReportType, ReportTemplate
)
from infrastructure.serializers import to_primitive

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


# =============================================================================
# Request/Response Models
# =============================================================================

class TemplateResponse(BaseModel):
    id: str
    name: str
    type: str
    description: str
    sections: List[str]
    default_format: str


class GenerateReportRequest(BaseModel):
    template_id: str
    data: Dict[str, Any]
    format: Optional[str] = None
    custom_sections: Optional[List[str]] = None


class GenerateReportResponse(BaseModel):
    template_id: str
    template_name: str
    format: str
    generated_at: str
    content: str
    sections_included: List[str]


# =============================================================================
# Routes
# =============================================================================

@router.get("/templates", response_model=List[TemplateResponse])
async def list_templates(
    current_user: CurrentUser = Depends(require_auth),
):
    """
    List all available report templates.
    
    Templates include:
    - proposal_summary: Proposal document for submission
    - matching_analysis: Detailed matching report
    - portfolio_overview: Consolidated project status
    - pipeline_status: Opportunity funnel report
    - funding_opportunities: Available calls analysis
    """
    generator = get_report_generator(current_user.tenant_id)
    templates = generator.get_available_templates()
    
    return to_primitive([
        TemplateResponse(
            id=t.id,
            name=t.name,
            type=t.type.value,
            description=t.description,
            sections=t.sections,
            default_format=t.default_format.value,
        )
        for t in templates
    ])


@router.get("", response_model=List[dict])
async def list_generated_reports(
    current_user: CurrentUser = Depends(require_auth),
):
    """
    Return a list of previously generated reports.
    Minimal implementation: return empty list when none are stored.
    """
    return []


@router.get("/templates/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    current_user: CurrentUser = Depends(require_auth),
):
    """Get specific template details"""
    generator = get_report_generator(current_user.tenant_id)
    template = generator.get_template(template_id)
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return to_primitive(TemplateResponse(
        id=template.id,
        name=template.name,
        type=template.type.value,
        description=template.description,
        sections=template.sections,
        default_format=template.default_format.value,
    ))


@router.post("/generate", response_model=GenerateReportResponse)
async def generate_report(
    request: GenerateReportRequest,
    current_user: CurrentUser = Depends(require_auth),
):
    """
    Generate a report from template with provided data.
    
    The data object should contain keys matching the template sections.
    Each section can contain any structured data that will be rendered.
    
    Example for proposal_summary:
    ```json
    {
        "template_id": "proposal_summary",
        "data": {
            "header": {"title": "My Proposal", "date": "2026-01-10"},
            "executive_summary": {"text": "This proposal..."},
            "objectives": [{"name": "Obj 1", "description": "..."}],
            "budget": {"total": 500000, "items": [...]}
        }
    }
    ```
    """
    generator = get_report_generator(current_user.tenant_id)
    
    format_enum = None
    if request.format:
        try:
            format_enum = ReportFormat(request.format)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid format. Supported: {[f.value for f in ReportFormat]}"
            )
    
    try:
        result = await generator.generate(
            template_id=request.template_id,
            data=request.data,
            format=format_enum,
            custom_sections=request.custom_sections,
        )
        return to_primitive(GenerateReportResponse(**result))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/generate/html", response_class=HTMLResponse)
async def generate_report_html(
    request: GenerateReportRequest,
    current_user: CurrentUser = Depends(require_auth),
):
    """
    Generate report and return directly as HTML.
    Useful for preview or direct rendering.
    """
    generator = get_report_generator(current_user.tenant_id)
    
    try:
        result = await generator.generate(
            template_id=request.template_id,
            data=request.data,
            format=ReportFormat.HTML,
            custom_sections=request.custom_sections,
        )
        return HTMLResponse(content=result["content"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/generate/csv", response_class=PlainTextResponse)
async def generate_report_csv(
    request: GenerateReportRequest,
    current_user: CurrentUser = Depends(require_auth),
):
    """
    Generate report and return as CSV.
    Useful for spreadsheet export.
    """
    generator = get_report_generator(current_user.tenant_id)
    
    try:
        result = await generator.generate(
            template_id=request.template_id,
            data=request.data,
            format=ReportFormat.CSV,
            custom_sections=request.custom_sections,
        )
        return PlainTextResponse(
            content=result["content"],
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={request.template_id}.csv"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# Quick Report Endpoints
# =============================================================================

@router.get("/quick/proposal/{proposal_id}")
async def quick_proposal_report(
    proposal_id: str,
    format: str = Query("html", regex="^(html|json|csv)$"),
    current_user: CurrentUser = Depends(require_auth),
):
    """
    Generate quick proposal summary report.
    Fetches proposal data automatically.
    """
    # In production, fetch proposal data from database
    # For now, return template with placeholder
    generator = get_report_generator(current_user.tenant_id)
    
    data = {
        "header": {
            "proposal_id": proposal_id,
            "generated_by": current_user.name,
        },
        "executive_summary": {
            "note": "Dados da proposta seriam carregados do banco"
        },
    }
    
    result = await generator.generate(
        template_id="proposal_summary",
        data=data,
        format=ReportFormat(format),
    )
    
    if format == "html":
        return HTMLResponse(content=result["content"])
    from infrastructure.serializers import to_primitive
    return to_primitive(result)


@router.get("/quick/matching/{project_id}/{funding_id}")
async def quick_matching_report(
    project_id: str,
    funding_id: str,
    format: str = Query("html", regex="^(html|json|csv)$"),
    current_user: CurrentUser = Depends(require_auth),
):
    """
    Generate quick matching analysis report.
    Fetches project and funding data automatically.
    """
    generator = get_report_generator(current_user.tenant_id)
    
    data = {
        "header": {
            "project_id": project_id,
            "funding_id": funding_id,
        },
        "score_breakdown": {
            "note": "Dados de matching seriam carregados do banco"
        },
    }
    
    result = await generator.generate(
        template_id="matching_analysis",
        data=data,
        format=ReportFormat(format),
    )
    
    if format == "html":
        return HTMLResponse(content=result["content"])
    return to_primitive(result)
