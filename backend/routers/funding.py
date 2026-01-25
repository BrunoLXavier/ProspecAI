"""
Funding Sources API Router
Implements RF-02: Gestão de Fontes de Fomento
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from datetime import date, datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from adapters.database.connection import get_db as get_db_session
from infrastructure.dependencies import (
    get_current_user_id,
    get_current_tenant_id,
    get_current_institute_ids,
    get_di_container,
    _check_user_member_or_admin,
    get_funding_use_case,
)
from infrastructure.di_container import DependencyContainer
import json
from infrastructure.serializers import to_primitive

from domain.entities.funding_source import FundingSource, InstrumentType
from use_cases.manage_funding import ManageFundingUseCase
from datetime import datetime as _datetime

router = APIRouter()


# Request/Response Schemas
class FundingSourceCreate(BaseModel):
    name: str
    institution: str
    instrument_type: InstrumentType
    total_amount: float
    submission_start: datetime
    submission_end: datetime
    trl_min: int = Field(ge=1, le=9)
    trl_max: int = Field(ge=1, le=9)
    description: str
    requirements: dict = Field(default_factory=dict)
    eligibility_criteria: dict = Field(default_factory=dict)


class FundingSourceUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    total_amount: Optional[float] = None
    submission_end: Optional[datetime] = None
    description: Optional[str] = None


class FundingSourceResponse(BaseModel):
    """Response model for funding sources with camelCase aliases for frontend compatibility."""
    id: str = Field(alias="id")
    name: str = Field(alias="name")
    institution: str = Field(alias="institution")
    instrument_type: str = Field(alias="instrumentType")
    status: str = Field(alias="status")
    total_amount: float = Field(alias="totalAmount")
    submission_start: datetime = Field(alias="submissionStart")
    submission_end: datetime = Field(alias="submissionEnd")
    trl_min: Optional[int] = Field(alias="trlMin")
    trl_max: Optional[int] = Field(alias="trlMax")
    ai_confidence_score: Optional[float] = Field(default=None, alias="aiConfidenceScore")
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")

    model_config = {
        "from_attributes": True,
        "populate_by_name": True  # Allow both snake_case and camelCase
    }


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
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    selected_institutes: List[UUID] = Depends(get_current_institute_ids),
    funding_use_case: ManageFundingUseCase = Depends(get_funding_use_case),
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

    # Build filters dict
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

    # Use use-case to get filtered results
    # NOTE: Funding sources are global/shared resources, not scoped to institutes
    # Only apply institute filter if explicitly requested via filters
    results, total = await funding_use_case.list_funding_sources_filtered(
        filters=filters,
        skip=skip,
        limit=page_size,
        tenant_id=UUID(tenant_id),
        institute_ids=None,  # Don't filter by institutes - funding is global
    )

    items = []
    for fs in results:
        # Use domain entity attributes; fallback safely
        def _to_iso_datetime(v):
            if v is None:
                return None
            # datetime-like objects
            if hasattr(v, 'isoformat') and callable(v.isoformat):
                try:
                    return v.isoformat()
                except Exception:
                    pass
            # parse string representations
            try:
                return _datetime.fromisoformat(str(v)).isoformat()
            except Exception:
                return None

        items.append({
            "id": str(fs.id),
            "name": getattr(fs, "name", None),
            "institution": getattr(fs, "source_organization", None),
            "instrumentType": getattr(fs, "instrument_type", None),
            "status": getattr(fs, "status", None),
            "totalAmount": float(getattr(fs, "total_amount", 0)) if getattr(fs, "total_amount", None) is not None else 0.0,
            "submissionStart": _to_iso_datetime(getattr(fs, "submission_start", None)),
            "submissionEnd": _to_iso_datetime(getattr(fs, "submission_end", None)),
            "trlMin": getattr(fs, "trl_min", None),
            "trlMax": getattr(fs, "trl_max", None),
            "aiConfidenceScore": getattr(fs, "ai_confidence_score", None),
            "createdAt": getattr(fs, "created_at", None).isoformat() if getattr(fs, "created_at", None) else None,
            "updatedAt": getattr(fs, "updated_at", None).isoformat() if getattr(fs, "updated_at", None) else None,
        })

    has_next = (page * page_size) < total

    return to_primitive(FundingListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_next=has_next
    ))


@router.get("/{funding_id}", response_model=FundingSourceResponse)
async def get_funding_source(
    funding_id: str,
    session: AsyncSession = Depends(get_db_session),
):
    """
    Get detailed information about a specific funding source
    
    Implements RF-02.02: Detalhamento de editais
    """
    q = text(
        "SELECT id, name, source_organization AS institution, instrument_type, status, total_amount, submission_start, submission_end, trl_min, trl_max, ai_confidence_score, created_at, updated_at FROM funding_sources WHERE id = :id AND deleted_at IS NULL"
    )
    res = await session.execute(q, {"id": funding_id})
    row = res.fetchone()
    if not row:
        funding = None
    else:
        funding = {
            "id": str(row.id),
            "name": row.name,
            "institution": row.institution,
            "instrument_type": row.instrument_type,
            "status": row.status,
            "total_amount": float(row.total_amount) if row.total_amount is not None else 0.0,
            "submission_start": row.submission_start.isoformat() if row.submission_start else None,
            "submission_end": row.submission_end.isoformat() if row.submission_end else None,
            "trl_min": int(row.trl_min) if row.trl_min is not None else None,
            "trl_max": int(row.trl_max) if row.trl_max is not None else None,
            "ai_confidence_score": float(row.ai_confidence_score) if row.ai_confidence_score is not None else None,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        }
    
    if not funding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Funding source {funding_id} not found"
        )
    
    return to_primitive(funding)


@router.post("/", response_model=FundingSourceResponse, status_code=status.HTTP_201_CREATED)
async def create_funding_source(
    data: FundingSourceCreate,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    selected_institutes: List[UUID] = Depends(get_current_institute_ids),
    container: DependencyContainer = Depends(get_di_container),
):
    """
    Create a new funding source with AI field extraction
    
    Implements RF-02.03: Criação de editais com assistência IA
    """
    # Enforce membership or admin for write operations
    await _check_user_member_or_admin(current_user, selected_institutes, container)

    insert_q = text(
        "INSERT INTO funding_sources (id, tenant_id, name, source_organization, instrument_type, status, total_amount, currency, submission_start, submission_end, trl_min, trl_max, description, requirements, eligibility_criteria, created_by, updated_by, created_at, updated_at) VALUES (gen_random_uuid(), :tenant_id, :name, :institution, :instrument_type, 'draft', :total_amount, 'BRL', :submission_start, :submission_end, :trl_min, :trl_max, :description, :requirements::jsonb, :eligibility_criteria::jsonb, :created_by, :updated_by, now(), now()) RETURNING id, name, source_organization AS institution, instrument_type, status, total_amount, submission_start, submission_end, trl_min, trl_max, ai_confidence_score, created_at, updated_at"
    )
    # Use placeholder tenant and user in this dev environment
    params = {
        "tenant_id": tenant_id,
        "name": data.name,
        "institution": data.institution,
        "instrument_type": data.instrument_type.value if hasattr(data.instrument_type, 'value') else str(data.instrument_type),
        "total_amount": data.total_amount,
        "submission_start": data.submission_start,
        "submission_end": data.submission_end,
        "trl_min": data.trl_min,
        "trl_max": data.trl_max,
        "description": data.description,
        "requirements": json.dumps(data.requirements),
        "eligibility_criteria": json.dumps(data.eligibility_criteria),
        "created_by": str(current_user),
        "updated_by": str(current_user),
    }
    import json
    res = await session.execute(insert_q, params)
    await session.commit()
    row = res.fetchone()
    return to_primitive({
        "id": str(row.id),
        "name": row.name,
        "institution": row.institution,
        "instrument_type": row.instrument_type,
        "status": row.status,
        "total_amount": float(row.total_amount) if row.total_amount is not None else 0.0,
            "submission_start": row.submission_start.isoformat() if row.submission_start else None,
            "submission_end": row.submission_end.isoformat() if row.submission_end else None,
        "trl_min": int(row.trl_min) if row.trl_min is not None else None,
        "trl_max": int(row.trl_max) if row.trl_max is not None else None,
        "ai_confidence_score": float(row.ai_confidence_score) if row.ai_confidence_score is not None else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    })


@router.patch("/{funding_id}", response_model=FundingSourceResponse)
async def update_funding_source(
    funding_id: str,
    data: FundingSourceUpdate,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user_id),
    selected_institutes: List[UUID] = Depends(get_current_institute_ids),
    container: DependencyContainer = Depends(get_di_container),
):
    """
    Update an existing funding source
    
    Implements RF-02.04: Atualização de editais
    """
    # Build dynamic SET clause
    updates = []
    params = {"id": funding_id}
    for k, v in data.model_dump(exclude_unset=True).items():
        updates.append(f"{k} = :{k}")
        params[k] = v
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    q = text(f"UPDATE funding_sources SET {', '.join(updates)}, updated_at = now(), updated_by = :updated_by WHERE id = :id AND deleted_at IS NULL RETURNING id, name, source_organization AS institution, instrument_type, status, total_amount, submission_start, submission_end, trl_min, trl_max, ai_confidence_score, created_at, updated_at")
    # Enforce membership or admin for write operations
    await _check_user_member_or_admin(current_user, selected_institutes, container)

    params['updated_by'] = str(current_user)
    res = await session.execute(q, params)
    await session.commit()
    row = res.fetchone()
    if not row:
        funding = None
    else:
        funding = {
            "id": str(row.id),
            "name": row.name,
            "institution": row.institution,
            "instrument_type": row.instrument_type,
            "status": row.status,
            "total_amount": float(row.total_amount) if row.total_amount is not None else 0.0,
            "submission_start": row.submission_start.isoformat() if row.submission_start else None,
            "submission_end": row.submission_end.isoformat() if row.submission_end else None,
            "trl_min": int(row.trl_min) if row.trl_min is not None else None,
            "trl_max": int(row.trl_max) if row.trl_max is not None else None,
            "ai_confidence_score": float(row.ai_confidence_score) if row.ai_confidence_score is not None else None,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        }
    
    if not funding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Funding source {funding_id} not found"
        )
    
    return to_primitive(funding)


@router.delete("/{funding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_funding_source(
    funding_id: str,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user_id),
    selected_institutes: List[UUID] = Depends(get_current_institute_ids),
    container: DependencyContainer = Depends(get_di_container),
):
    """
    Soft delete a funding source
    
    Implements RF-02.05: Exclusão lógica de editais
    """
    q = text("UPDATE funding_sources SET deleted_at = now() WHERE id = :id AND deleted_at IS NULL RETURNING id")
    # Enforce membership or admin for write operations
    await _check_user_member_or_admin(current_user, selected_institutes, container)

    res = await session.execute(q, {"id": funding_id})
    await session.commit()
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Funding source {funding_id} not found")
