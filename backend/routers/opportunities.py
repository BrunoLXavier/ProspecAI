"""
Opportunities API Router
Implements RF-05: Pipeline de Oportunidades
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from datetime import datetime, date
from uuid import UUID

from domain.entities.opportunity import Opportunity, OpportunityStage, OpportunityPriority
from infrastructure.dependencies import get_di_container, get_current_user_id, get_current_tenant_id
from infrastructure.serializers import to_primitive
from infrastructure.di_container import DependencyContainer

router = APIRouter()


# Request/Response Schemas
class OpportunityCreate(BaseModel):
    title: str
    description: str
    client_id: str
    funding_source_id: str | None = None
    estimated_value: float
    probability: float
    priority_score: float | None = None


class OpportunityUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    estimated_value: float | None = None
    probability: float | None = None
    priority_score: float | None = None


class StageTransition(BaseModel):
    new_stage: OpportunityStage
    notes: str | None = None


class OpportunityResponse(BaseModel):
    id: str
    title: str
    description: str
    client_id: str
    funding_source_id: str | None
    current_stage: str
    estimated_value: float
    probability: float
    priority_score: float
    priority_factors: dict | None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class PipelineStatsResponse(BaseModel):
    total_opportunities: int
    total_estimated_value: float
    opportunities_by_stage: dict
    conversion_rates: dict
    average_time_by_stage: dict


# Note: endpoints use repository methods via the DI container and require
# `X-User-ID` and `X-Tenant-ID` headers (defaults provided in dependencies).


@router.get("/", response_model=List[OpportunityResponse])
async def list_opportunities(
    stage: Optional[str] = Query(
        None,
        description="Filter by pipeline stage: intelligence, validation, approach, registration, conversion, post_sale, lost"
    ),
    client_id: Optional[str] = Query(
        None,
        description="Filter by client ID"
    ),
    funding_source_id: Optional[str] = Query(
        None,
        description="Filter by funding source ID"
    ),
    priority: Optional[str] = Query(
        None,
        description="Filter by priority level: high, medium, low"
    ),
    min_value: Optional[float] = Query(
        None,
        ge=0,
        description="Filter opportunities with estimated_value >= this value"
    ),
    max_value: Optional[float] = Query(
        None,
        ge=0,
        description="Filter opportunities with estimated_value <= this value"
    ),
    min_probability: Optional[float] = Query(
        None,
        ge=0,
        le=1,
        description="Filter opportunities with probability >= this value (0-1)"
    ),
    created_after: Optional[date] = Query(
        None,
        description="Filter opportunities created after this date"
    ),
    created_before: Optional[date] = Query(
        None,
        description="Filter opportunities created before this date"
    ),
    search: Optional[str] = Query(
        None,
        description="Search in title and description"
    ),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=200, description="Maximum items to return"),
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    List all opportunities with advanced filters
    
    Implements RF-05.01: Visualização do pipeline
    
    Filters:
    - stage: Filter by pipeline stage
    - client_id: Filter by client
    - funding_source_id: Filter by funding source
    - priority: Filter by priority level
    - min_value/max_value: Filter by estimated value range
    - min_probability: Filter by minimum probability
    - created_after/created_before: Filter by creation date range
    - search: Full-text search in title and description
    """
    # Build repository criteria
    criteria = {
        "tenant_id": tenant_id,
        "stage": stage,
        "client_id": client_id,
        "funding_source_id": funding_source_id,
        "estimated_value_gte": min_value,
        "estimated_value_lte": max_value,
        "probability_score_gte": min_probability,
        "created_at_gte": created_after,
        "created_at_lte": created_before,
        "search_text": search,
    }

    opportunities = await container.opportunity_repository.find_by_criteria(
        criteria, skip=skip, limit=limit
    )

    def _serialize(o: Opportunity) -> dict:
        return {
            "id": str(o.id) if getattr(o, "id", None) else None,
            "title": o.title,
            "description": o.description,
            "client_id": str(o.client_id) if getattr(o, "client_id", None) else None,
            "funding_source_id": str(o.funding_source_id) if getattr(o, "funding_source_id", None) else None,
            "current_stage": getattr(o, "stage", None).value if getattr(o, "stage", None) else None,
            "estimated_value": float(getattr(o, "estimated_value", 0) or 0),
            "probability": float(getattr(o, "probability", getattr(o, "probability_score", 0)) or 0),
            "priority_score": float(getattr(o, "priority_score", getattr(o, "priority", 0)) or 0),
            "priority_factors": getattr(o, "ai_priority_factors", {}) or {},
            "created_at": getattr(o, "created_at", None).isoformat() if getattr(o, "created_at", None) else None,
            "updated_at": getattr(o, "updated_at", None).isoformat() if getattr(o, "updated_at", None) else None,
        }

    return [_serialize(o) for o in opportunities]


@router.get("/{opportunity_id}", response_model=OpportunityResponse)
async def get_opportunity(
    opportunity_id: str,
    container: DependencyContainer = Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Get detailed information about a specific opportunity
    
    Implements RF-05.02: Detalhamento de oportunidade
    """
    opportunity = await container.opportunity_repository.get_by_id(tenant_id, opportunity_id)
    
    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opportunity {opportunity_id} not found"
        )
    

    def _serialize(o: Opportunity) -> dict:
        return {
            "id": str(o.id) if getattr(o, "id", None) else None,
            "title": o.title,
            "description": o.description,
            "client_id": str(o.client_id) if getattr(o, "client_id", None) else None,
            "funding_source_id": str(o.funding_source_id) if getattr(o, "funding_source_id", None) else None,
            "current_stage": getattr(o, "stage", None).value if getattr(o, "stage", None) else None,
            "estimated_value": float(getattr(o, "estimated_value", 0) or 0),
            "probability": float(getattr(o, "probability", getattr(o, "probability_score", 0)) or 0),
            "priority_score": float(getattr(o, "priority_score", getattr(o, "priority", 0)) or 0),
            "priority_factors": getattr(o, "ai_priority_factors", {}) or {},
            "created_at": getattr(o, "created_at", None).isoformat() if getattr(o, "created_at", None) else None,
            "updated_at": getattr(o, "updated_at", None).isoformat() if getattr(o, "updated_at", None) else None,
        }

    return _serialize(opportunity)


@router.post("/", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
async def create_opportunity(
    data: OpportunityCreate,
    calculate_priority: bool = True,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Create a new opportunity with AI priority calculation
    
    Implements RF-05.03: Criação de oportunidade com priorização transparente
    """
    # Build domain entity and persist via repository
    opp_entity = Opportunity(
        id=None,
        tenant_id=tenant_id,
        title=data.title,
        description=data.description,
        client_id=data.client_id,
        funding_source_id=data.funding_source_id,
        estimated_value=data.estimated_value,
        probability_score=data.probability,
        priority_score=data.priority_score or 0.0,
        created_by=current_user,
        updated_by=current_user,
    )

    created = await container.opportunity_repository.create(opp_entity, tenant_id, current_user)
    return to_primitive(created)


@router.patch("/{opportunity_id}", response_model=OpportunityResponse)
async def update_opportunity(
    opportunity_id: str,
    data: OpportunityUpdate,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Update an existing opportunity
    
    Implements RF-05.04: Atualização de oportunidade
    """
    existing = await container.opportunity_repository.get_by_id(tenant_id, opportunity_id)
    if not existing:
        opportunity = None
    else:
        # apply updates
        upd = data.model_dump(exclude_unset=True)
        for k, v in upd.items():
            if hasattr(existing, k):
                setattr(existing, k, v)
        existing.updated_by = current_user
        opportunity = await container.opportunity_repository.update(existing, tenant_id, current_user)
    
    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opportunity {opportunity_id} not found"
        )
    
    return to_primitive(opportunity)


@router.post("/{opportunity_id}/transition", response_model=OpportunityResponse)
async def transition_stage(
    opportunity_id: str,
    data: StageTransition,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Move opportunity to a new pipeline stage
    
    Implements RF-05.05: Transição entre estágios do pipeline
    """
    opportunity = await container.opportunity_repository.transition_stage(
        opportunity_id, tenant_id, data.new_stage, current_user, data.notes
    )
    
    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opportunity {opportunity_id} not found"
        )
    
    return to_primitive(opportunity)


@router.get("/stats/pipeline", response_model=PipelineStatsResponse)
async def get_pipeline_statistics(
    container: DependencyContainer = Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Get pipeline statistics and metrics
    
    Implements RF-05.06: Estatísticas do pipeline
    """
    pipeline = await container.opportunity_repository.get_pipeline_by_stage(tenant_id)

    total = sum(len(v) for v in pipeline.values())
    total_estimated = 0.0
    by_stage = {}
    for stage, opps in pipeline.items():
        by_stage[stage] = len(opps)
        for o in opps:
            total_estimated += float(getattr(o, 'estimated_value', 0) or 0)

    stats = {
        "total_opportunities": total,
        "total_estimated_value": total_estimated,
        "opportunities_by_stage": by_stage,
        "conversion_rates": {},
        "average_time_by_stage": {},
    }
    from infrastructure.serializers import to_primitive
    return to_primitive(stats)


@router.delete("/{opportunity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_opportunity(
    opportunity_id: str,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Soft delete an opportunity
    
    Implements RF-05.07: Exclusão lógica de oportunidade
    """
    success = await container.opportunity_repository.delete(tenant_id, opportunity_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opportunity {opportunity_id} not found"
        )
