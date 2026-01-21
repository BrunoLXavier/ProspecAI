"""
Analytics API Routes
Implements RF-07: Analytics and Dashboard
"""
from fastapi import APIRouter, Depends, Query, Request
import logging
from pydantic import BaseModel
from typing import Dict, Any, List
from dataclasses import asdict

from adapters.api.auth_middleware import get_current_user, AuthenticatedUser


logger = logging.getLogger(__name__)
from infrastructure.di_container import get_db_session
from services.analytics_service import AnalyticsService, TimeRange, KPIMetric
from infrastructure.serializers import to_primitive

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


# =============================================================================
# Response Models
# =============================================================================

class KPIResponse(BaseModel):
    value: float
    previous_value: float
    trend_percentage: float
    trend_direction: str
    label: str
    unit: str


class OverviewResponse(BaseModel):
    kpis: Dict[str, KPIResponse]
    period: str


class PipelineStageData(BaseModel):
    stage: str
    count: int
    value: float


class FundingCategoryData(BaseModel):
    category: str
    count: int
    total_budget: float


class TRLDistributionData(BaseModel):
    trl: int
    count: int


class TrendData(BaseModel):
    date: str
    matches: int
    avg_score: float


class ClientActivityData(BaseModel):
    id: str
    name: str
    opportunities: int
    total_value: float


# =============================================================================
# Routes
# =============================================================================

@router.get("/overview", response_model=OverviewResponse)
async def get_overview(
    period: TimeRange = Query(TimeRange.MONTH, description="Time period for KPIs"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    session = Depends(get_db_session),
    request: Request = None,
):
    """
    Get main dashboard KPIs with trends.
    
    Returns:
    - active_funding: Number of open funding opportunities
    - total_projects: Projects in portfolio
    - pipeline_value: Total value of active opportunities
    - conversion_rate: Won vs total opportunities
    - proposals_submitted: Submitted proposals count
    - avg_match_score: Average matching score
    """
    logger.info(f"[analytics] Authorization header: {request.headers.get('authorization') if request else 'no-request'}")
    tenant_id = None
    if current_user is not None and getattr(current_user, "tenant_id", None) is not None:
        tenant_id = str(current_user.tenant_id)
    else:
        tenant_id = request.headers.get("X-Tenant-ID") if request is not None else None
    service = AnalyticsService(session, tenant_id)
    kpis = await service.get_overview_kpis(period)
    
    return to_primitive(OverviewResponse(
        kpis={k: KPIResponse(**asdict(v)) for k, v in kpis.items()},
        period=period.value,
    ))


@router.get("/pipeline", response_model=List[PipelineStageData])
async def get_pipeline_distribution(
    current_user: AuthenticatedUser = Depends(get_current_user),
    session = Depends(get_db_session),
    request: Request = None,
):
    """
    Get opportunity distribution by pipeline stage.
    Useful for funnel visualization.
    """
    logger.info(f"[analytics] Authorization header: {request.headers.get('authorization') if request else 'no-request'}")
    tenant_id = None
    if current_user is not None and getattr(current_user, "tenant_id", None) is not None:
        tenant_id = str(current_user.tenant_id)
    else:
        tenant_id = request.headers.get("X-Tenant-ID") if request is not None else None
    service = AnalyticsService(session, tenant_id)
    data = await service.get_pipeline_by_stage()
    return to_primitive([PipelineStageData(**item) for item in data])


@router.get("/funding-categories", response_model=List[FundingCategoryData])
async def get_funding_by_category(
    current_user: AuthenticatedUser = Depends(get_current_user),
    session = Depends(get_db_session),
):
    """
    Get funding sources distribution by instrument type.
    Useful for pie/donut charts.
    """
    tenant_id = None
    if current_user is not None and getattr(current_user, "tenant_id", None) is not None:
        tenant_id = str(current_user.tenant_id)
    else:
        tenant_id = None
    service = AnalyticsService(session, tenant_id)
    data = await service.get_funding_by_category()
    return to_primitive([FundingCategoryData(**item) for item in data])


@router.get("/trl-distribution", response_model=List[TRLDistributionData])
async def get_trl_distribution(
    current_user: AuthenticatedUser = Depends(get_current_user),
    session = Depends(get_db_session),
):
    """
    Get project distribution by TRL level.
    Shows technology maturity across portfolio.
    """
    tenant_id = None
    if current_user is not None and getattr(current_user, "tenant_id", None) is not None:
        tenant_id = str(current_user.tenant_id)
    else:
        tenant_id = None
    service = AnalyticsService(session, tenant_id)
    data = await service.get_projects_by_trl()
    return to_primitive([TRLDistributionData(**item) for item in data])


@router.get("/matching-trends", response_model=List[TrendData])
async def get_matching_trends(
    days: int = Query(30, ge=7, le=365, description="Number of days"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    session = Depends(get_db_session),
):
    """
    Get daily matching activity trends.
    Shows matching volume and average scores over time.
    """
    tenant_id = None
    if current_user is not None and getattr(current_user, "tenant_id", None) is not None:
        tenant_id = str(current_user.tenant_id)
    else:
        tenant_id = None
    service = AnalyticsService(session, tenant_id)
    data = await service.get_matching_trends(days)
    return to_primitive([TrendData(**item) for item in data])


@router.get("/top-clients", response_model=List[ClientActivityData])
async def get_top_clients(
    limit: int = Query(10, ge=5, le=50, description="Number of clients"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    session = Depends(get_db_session),
):
    """
    Get most active clients by opportunity count.
    Useful for identifying key accounts.
    """
    tenant_id = None
    if current_user is not None and getattr(current_user, "tenant_id", None) is not None:
        tenant_id = str(current_user.tenant_id)
    else:
        tenant_id = None
    service = AnalyticsService(session, tenant_id)
    data = await service.get_client_activity(limit)
    return to_primitive([ClientActivityData(**item) for item in data])


@router.get("/export")
async def export_analytics(
    format: str = Query("json", regex="^(json|csv)$"),
    period: TimeRange = Query(TimeRange.MONTH),
    current_user: AuthenticatedUser = Depends(get_current_user),
    session = Depends(get_db_session),
):
    """
    Export analytics data in JSON or CSV format.
    """
    tenant_id = None
    if current_user is not None and getattr(current_user, "tenant_id", None) is not None:
        tenant_id = str(current_user.tenant_id)
    else:
        tenant_id = None
    service = AnalyticsService(session, tenant_id)
    
    # Gather all data
    kpis = await service.get_overview_kpis(period)
    pipeline = await service.get_pipeline_by_stage()
    funding = await service.get_funding_by_category()
    trl = await service.get_projects_by_trl()
    
    data = {
        "period": period.value,
        "generated_at": "now",
        "kpis": {k: asdict(v) for k, v in kpis.items()},
        "pipeline": pipeline,
        "funding_categories": funding,
        "trl_distribution": trl,
    }
    
    if format == "csv":
        # Simple CSV conversion for KPIs - return as text/csv response
        import io
        import csv
        from fastapi import Response

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Metric", "Value", "Previous", "Trend %", "Direction"])

        for key, kpi in kpis.items():
            writer.writerow([
                kpi.label, kpi.value, kpi.previous_value,
                kpi.trend_percentage, kpi.trend_direction
            ])

        csv_content = output.getvalue()
        headers = {"Content-Disposition": "attachment; filename=analytics.csv"}
        return Response(content=csv_content, media_type="text/csv", headers=headers)
    
    return to_primitive(data)
