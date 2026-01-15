"""
Opportunities API Router
Implements RF-05: Pipeline de Oportunidades
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from datetime import datetime, date

from domain.entities.opportunity import Opportunity, OpportunityStage, OpportunityPriority
from use_cases.manage_pipeline import ManagePipelineUseCase
from infrastructure.di_container import get_container

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


# Dependency injection
async def get_pipeline_use_case() -> ManagePipelineUseCase:
    """Get ManagePipelineUseCase with injected dependencies."""
    async with get_container() as container:
        return container.get_manage_pipeline_use_case()


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
    use_case: ManagePipelineUseCase = Depends(get_pipeline_use_case),
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
    opportunities = await use_case.list_opportunities(
        stage=stage,
        client_id=client_id,
        funding_source_id=funding_source_id,
        priority=priority,
        min_value=min_value,
        max_value=max_value,
        min_probability=min_probability,
        created_after=created_after,
        created_before=created_before,
        search=search,
        skip=skip,
        limit=limit
    )
    return opportunities


@router.get("/{opportunity_id}", response_model=OpportunityResponse)
async def get_opportunity(
    opportunity_id: str,
    use_case: ManagePipelineUseCase = Depends(get_pipeline_use_case),
):
    """
    Get detailed information about a specific opportunity
    
    Implements RF-05.02: Detalhamento de oportunidade
    """
    opportunity = await use_case.get_opportunity(opportunity_id)
    
    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opportunity {opportunity_id} not found"
        )
    
    return opportunity


@router.post("/", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
async def create_opportunity(
    data: OpportunityCreate,
    calculate_priority: bool = True,
    use_case: ManagePipelineUseCase = Depends(get_pipeline_use_case),
):
    """
    Create a new opportunity with AI priority calculation
    
    Implements RF-05.03: Criação de oportunidade com priorização transparente
    """
    opportunity = await use_case.create_opportunity(
        title=data.title,
        description=data.description,
        client_id=data.client_id,
        funding_source_id=data.funding_source_id,
        estimated_value=data.estimated_value,
        probability=data.probability,
        priority_score=data.priority_score,
        calculate_priority=calculate_priority,
    )
    
    return opportunity


@router.patch("/{opportunity_id}", response_model=OpportunityResponse)
async def update_opportunity(
    opportunity_id: str,
    data: OpportunityUpdate,
    use_case: ManagePipelineUseCase = Depends(get_pipeline_use_case),
):
    """
    Update an existing opportunity
    
    Implements RF-05.04: Atualização de oportunidade
    """
    opportunity = await use_case.update_opportunity(
        opportunity_id=opportunity_id,
        **data.model_dump(exclude_unset=True)
    )
    
    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opportunity {opportunity_id} not found"
        )
    
    return opportunity


@router.post("/{opportunity_id}/transition", response_model=OpportunityResponse)
async def transition_stage(
    opportunity_id: str,
    data: StageTransition,
    use_case: ManagePipelineUseCase = Depends(get_pipeline_use_case),
):
    """
    Move opportunity to a new pipeline stage
    
    Implements RF-05.05: Transição entre estágios do pipeline
    """
    opportunity = await use_case.transition_stage(
        opportunity_id=opportunity_id,
        new_stage=data.new_stage,
        notes=data.notes,
    )
    
    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opportunity {opportunity_id} not found"
        )
    
    return opportunity


@router.get("/stats/pipeline", response_model=PipelineStatsResponse)
async def get_pipeline_statistics(
    use_case: ManagePipelineUseCase = Depends(get_pipeline_use_case),
):
    """
    Get pipeline statistics and metrics
    
    Implements RF-05.06: Estatísticas do pipeline
    """
    stats = await use_case.get_pipeline_statistics()
    return stats


@router.delete("/{opportunity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_opportunity(
    opportunity_id: str,
    use_case: ManagePipelineUseCase = Depends(get_pipeline_use_case),
):
    """
    Soft delete an opportunity
    
    Implements RF-05.07: Exclusão lógica de oportunidade
    """
    success = await use_case.delete_opportunity(opportunity_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opportunity {opportunity_id} not found"
        )
