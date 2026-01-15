"""
Funding Sources API Router
Implements RF-02: Gestão de Fontes de Fomento
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from datetime import date

from domain.entities.funding_source import FundingSource, InstrumentType
from use_cases.manage_funding import ManageFundingUseCase
from infrastructure.dependencies import get_funding_use_case

router = APIRouter()


# Request/Response Schemas
class FundingSourceCreate(BaseModel):
    name: str
    institution: str
    instrument_type: InstrumentType
    total_amount: float
    submission_start: date
    submission_end: date
    trl_min: int = Field(ge=1, le=9)
    trl_max: int = Field(ge=1, le=9)
    description: str
    requirements: dict = Field(default_factory=dict)
    eligibility_criteria: dict = Field(default_factory=dict)


class FundingSourceUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    total_amount: Optional[float] = None
    submission_end: Optional[date] = None
    description: Optional[str] = None


class FundingSourceResponse(BaseModel):
    id: str
    name: str
    institution: str
    instrument_type: str
    status: str
    total_amount: float
    submission_start: date
    submission_end: date
    trl_min: int
    trl_max: int
    ai_confidence_score: Optional[float] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class FundingListResponse(BaseModel):
    """Paginated list response with metadata."""
    items: List[FundingSourceResponse]
    total: int
    page: int
    page_size: int
    has_next: bool


@router.get("/", response_model=FundingListResponse)
async def list_funding_sources(
    status: Optional[str] = Query(
        None,
        description="Filter by status: open, closed, draft, cancelled"
    ),
    instrument_type: Optional[str] = Query(
        None,
        description="Filter by instrument type: grant, loan, equity, tax_incentive"
    ),
    deadline_after: Optional[date] = Query(
        None,
        description="Filter funding sources with submission_end after this date"
    ),
    deadline_before: Optional[date] = Query(
        None,
        description="Filter funding sources with submission_end before this date"
    ),
    min_amount: Optional[float] = Query(
        None,
        ge=0,
        description="Filter funding sources with total_amount >= this value"
    ),
    max_amount: Optional[float] = Query(
        None,
        ge=0,
        description="Filter funding sources with total_amount <= this value"
    ),
    trl_min: Optional[int] = Query(
        None,
        ge=1,
        le=9,
        description="Filter by minimum TRL level"
    ),
    trl_max: Optional[int] = Query(
        None,
        ge=1,
        le=9,
        description="Filter by maximum TRL level"
    ),
    institution: Optional[str] = Query(
        None,
        description="Filter by institution name (partial match)"
    ),
    search: Optional[str] = Query(
        None,
        description="Search in name and description"
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    use_case: ManageFundingUseCase = Depends(get_funding_use_case),
):
    """
    List all funding sources with advanced filters.
    
    Implements RF-02.01: Visualização de editais disponíveis
    
    Filters:
    - status: open, closed, draft, cancelled
    - instrument_type: grant, loan, equity, tax_incentive
    - deadline_after/deadline_before: Date range for submission deadline
    - min_amount/max_amount: Budget range filter
    - trl_min/trl_max: TRL level range
    - institution: Partial match on institution name
    - search: Full-text search in name and description
    """
    # Build filters dict
    filters = {}
    
    if status:
        filters["status"] = status
    if instrument_type:
        filters["instrument_type"] = instrument_type
    if deadline_after:
        filters["deadline_after"] = deadline_after
    if deadline_before:
        filters["deadline_before"] = deadline_before
    if min_amount is not None:
        filters["min_amount"] = min_amount
    if max_amount is not None:
        filters["max_amount"] = max_amount
    if trl_min is not None:
        filters["trl_min"] = trl_min
    if trl_max is not None:
        filters["trl_max"] = trl_max
    if institution:
        filters["institution"] = institution
    if search:
        filters["search"] = search
    
    # Calculate skip
    skip = (page - 1) * page_size
    
    # Get funding sources with filters
    funding_sources, total = await use_case.list_funding_sources_filtered(
        filters=filters,
        skip=skip,
        limit=page_size
    )
    
    has_next = (page * page_size) < total
    
    return FundingListResponse(
        items=funding_sources,
        total=total,
        page=page,
        page_size=page_size,
        has_next=has_next
    )


@router.get("/{funding_id}", response_model=FundingSourceResponse)
async def get_funding_source(
    funding_id: str,
    use_case: ManageFundingUseCase = Depends(get_funding_use_case),
):
    """
    Get detailed information about a specific funding source
    
    Implements RF-02.02: Detalhamento de editais
    """
    funding = await use_case.get_funding_source(funding_id)
    
    if not funding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Funding source {funding_id} not found"
        )
    
    return funding


@router.post("/", response_model=FundingSourceResponse, status_code=status.HTTP_201_CREATED)
async def create_funding_source(
    data: FundingSourceCreate,
    use_case: ManageFundingUseCase = Depends(get_funding_use_case),
):
    """
    Create a new funding source with AI field extraction
    
    Implements RF-02.03: Criação de editais com assistência IA
    """
    funding = await use_case.create_funding_source(
        name=data.name,
        institution=data.institution,
        instrument_type=data.instrument_type,
        total_amount=data.total_amount,
        submission_start=data.submission_start,
        submission_end=data.submission_end,
        trl_min=data.trl_min,
        trl_max=data.trl_max,
        description=data.description,
        requirements=data.requirements,
        eligibility_criteria=data.eligibility_criteria,
    )
    
    return funding


@router.patch("/{funding_id}", response_model=FundingSourceResponse)
async def update_funding_source(
    funding_id: str,
    data: FundingSourceUpdate,
    use_case: ManageFundingUseCase = Depends(get_funding_use_case),
):
    """
    Update an existing funding source
    
    Implements RF-02.04: Atualização de editais
    """
    funding = await use_case.update_funding_source(
        funding_id=funding_id,
        **data.model_dump(exclude_unset=True)
    )
    
    if not funding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Funding source {funding_id} not found"
        )
    
    return funding


@router.delete("/{funding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_funding_source(
    funding_id: str,
    use_case: ManageFundingUseCase = Depends(get_funding_use_case),
):
    """
    Soft delete a funding source
    
    Implements RF-02.05: Exclusão lógica de editais
    """
    success = await use_case.delete_funding_source(funding_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Funding source {funding_id} not found"
        )
