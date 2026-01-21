"""
Proposals API Router
Implements RF-08: Repositório de Propostas
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from pydantic import BaseModel
from datetime import datetime, date
from uuid import UUID

from domain.entities.proposal import Proposal, ProposalVersion, ProposalStatus
from infrastructure.dependencies import get_di_container, get_current_user_id, get_current_tenant_id, get_current_institute_ids, ensure_user_member_or_admin
from infrastructure.di_container import DependencyContainer
from infrastructure.serializers import to_primitive

router = APIRouter()


# Request/Response Schemas
class ProposalCreate(BaseModel):
    title: str
    funding_source_id: str
    project_id: str | None = None
    opportunity_id: str | None = None
    description: str
    objectives: List[str]
    methodology: str
    budget_breakdown: dict
    schedule: dict
    team: List[dict]


class ProposalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: ProposalStatus | None = None
    objectives: List[str] | None = None
    methodology: str | None = None
    budget_breakdown: dict | None = None


class VersionCreate(BaseModel):
    proposal_id: str
    changes_summary: str
    content_updates: dict


class AdherenceAnalysisResponse(BaseModel):
    overall_score: float
    criteria_scores: dict
    gaps: List[dict]
    recommendations: List[str]
    ai_confidence_score: float


class ProposalResponse(BaseModel):
    id: str
    title: str
    funding_source_id: str
    project_id: str | None
    opportunity_id: str | None
    status: str
    current_version: int
    adherence_score: float | None
    created_at: str
    updated_at: str
    submitted_at: str | None

    class Config:
        from_attributes = True


class ProposalVersionResponse(BaseModel):
    id: str
    proposal_id: str
    version_number: int
    changes_summary: str
    created_by: str
    created_at: str

    class Config:
        from_attributes = True


# Note: endpoints use repository methods via the DI container and require
# `X-User-ID` and `X-Tenant-ID` headers (defaults provided in dependencies).


@router.get("/", response_model=List[ProposalResponse])
async def list_proposals(
    status: Optional[str] = Query(
        None,
        description="Filter by proposal status: draft, submitted, under_review, approved, rejected, archived"
    ),
    funding_source_id: Optional[str] = Query(
        None,
        description="Filter by funding source ID"
    ),
    project_id: Optional[str] = Query(
        None,
        description="Filter by project ID"
    ),
    opportunity_id: Optional[str] = Query(
        None,
        description="Filter by opportunity ID"
    ),
    min_adherence_score: Optional[float] = Query(
        None,
        ge=0,
        le=1,
        description="Filter proposals with adherence_score >= this value (0-1)"
    ),
    max_adherence_score: Optional[float] = Query(
        None,
        ge=0,
        le=1,
        description="Filter proposals with adherence_score <= this value (0-1)"
    ),
    created_after: Optional[date] = Query(
        None,
        description="Filter proposals created after this date"
    ),
    created_before: Optional[date] = Query(
        None,
        description="Filter proposals created before this date"
    ),
    submitted_after: Optional[date] = Query(
        None,
        description="Filter proposals submitted after this date"
    ),
    submitted_before: Optional[date] = Query(
        None,
        description="Filter proposals submitted before this date"
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
    List all proposals with advanced filters
    
    Implements RF-08.01: Listagem de propostas
    
    Filters:
    - status: Filter by proposal status
    - funding_source_id: Filter by funding source
    - project_id: Filter by project
    - opportunity_id: Filter by opportunity
    - min_adherence_score/max_adherence_score: Filter by adherence score range
    - created_after/created_before: Filter by creation date range
    - submitted_after/submitted_before: Filter by submission date range
    - search: Full-text search in title and description
    """
    criteria = {
        "tenant_id": tenant_id,
        "current_status": status,
        "funding_source_id": funding_source_id,
        "project_id": project_id,
        "opportunity_id": opportunity_id,
        "latest_adherence_score_gte": min_adherence_score,
        "latest_adherence_score_lte": max_adherence_score,
        "created_at_gte": created_after,
        "created_at_lte": created_before,
        "submitted_at_gte": submitted_after,
        "submitted_at_lte": submitted_before,
        "search_text": search,
    }

    proposals = await container.proposal_repository.find_by_criteria(criteria, skip=skip, limit=limit)
    return to_primitive(proposals)


@router.get("/{proposal_id}", response_model=ProposalResponse)
async def get_proposal(
    proposal_id: str,
    container: DependencyContainer = Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Get detailed information about a specific proposal
    
    Implements RF-08.02: Detalhamento de proposta
    """
    proposal = await container.proposal_repository.get_by_id(tenant_id, proposal_id)
    
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposal {proposal_id} not found"
        )
    
    return to_primitive(proposal)


@router.post("/", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED)
async def create_proposal(
    data: ProposalCreate,
    analyze_adherence: bool = True,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Create a new proposal with AI adherence analysis
    
    Implements RF-08.03: Criação de proposta com análise de aderência
    """
    # Build Proposal entity and persist via repository
    p = Proposal(
        title=data.title,
        description=data.description,
        status=ProposalStatus.DRAFT,
        opportunity_id=data.opportunity_id,
        funding_source_id=data.funding_source_id,
        tenant_id=tenant_id,
        created_by=current_user,
        updated_by=current_user,
        collaborators=[current_user]
    )

    selected_institutes: List[UUID] = await get_current_institute_ids()
    # Enforce membership or admin for write operations
    await ensure_user_member_or_admin(current_user, selected_institutes, container)

    created = await container.proposal_repository.create(p, tenant_id, current_user)
    # Optionally trigger adherence analysis via use case if analyzer available
    if analyze_adherence and hasattr(container, 'get_manage_proposals_use_case'):
        try:
            uc = container.get_manage_proposals_use_case()
            # If use case has analyzer, call it asynchronously (best-effort)
            # Note: uc may not have all dependencies wired in DI container.
            if hasattr(uc, 'analyze_adherence_to_funding'):
                await uc.analyze_adherence_to_funding(created.id, created.funding_source_id, current_user, tenant_id)
        except Exception:
            pass

    return to_primitive(created)


@router.patch("/{proposal_id}", response_model=ProposalResponse)
async def update_proposal(
    proposal_id: str,
    data: ProposalUpdate,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Update an existing proposal
    
    Implements RF-08.04: Atualização de proposta
    """
    existing = await container.proposal_repository.get_by_id(tenant_id, proposal_id)
    if not existing:
        proposal = None
    else:
        upd = data.model_dump(exclude_unset=True)
        for k, v in upd.items():
            if hasattr(existing, k):
                setattr(existing, k, v)
        selected_institutes: List[UUID] = await get_current_institute_ids()
        await ensure_user_member_or_admin(current_user, selected_institutes, container)

        existing.updated_by = current_user
        proposal = await container.proposal_repository.update(existing, tenant_id, current_user)
    
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposal {proposal_id} not found"
        )
    
    return to_primitive(proposal)


@router.post("/{proposal_id}/versions", response_model=ProposalVersionResponse, status_code=status.HTTP_201_CREATED)
async def create_version(
    proposal_id: str,
    data: VersionCreate,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Create a new version of the proposal (Git-like versioning)
    
    Implements RF-08.05: Versionamento de propostas
    """
    version = await container.proposal_repository.create_version(proposal_id, tenant_id, current_user, data.changes_summary, data.content_updates)
    
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposal {proposal_id} not found"
        )
    
    return to_primitive(version)


@router.get("/{proposal_id}/versions", response_model=List[ProposalVersionResponse])
async def list_versions(
    proposal_id: str,
    container: DependencyContainer = Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    List all versions of a proposal
    
    Implements RF-08.06: Histórico de versões
    """
    versions = await container.proposal_repository.get_version_history(proposal_id, tenant_id)
    return to_primitive(versions)


@router.get("/{proposal_id}/adherence", response_model=AdherenceAnalysisResponse)
async def analyze_adherence(
    proposal_id: str,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Analyze proposal adherence to funding requirements
    
    Implements RF-08.07: Análise de aderência com IA
    """
    # Use use-case if available (it handles version repository + AI analyzer)
    uc = container.get_manage_proposals_use_case()
    if hasattr(uc, 'analyze_adherence_to_funding'):
        analysis = await uc.analyze_adherence_to_funding(proposal_id, None, current_user, tenant_id)
    else:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Adherence analyzer not configured")
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposal {proposal_id} not found"
        )
    
    return to_primitive(analysis)


@router.post("/{proposal_id}/submit", response_model=ProposalResponse)
async def submit_proposal(
    proposal_id: str,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Submit proposal (change status to submitted)
    
    Implements RF-08.08: Submissão de proposta
    """
    # Submit via repository: set status to submitted if approved
    existing = await container.proposal_repository.get_by_id(tenant_id, proposal_id)
    selected_institutes: List[UUID] = await get_current_institute_ids()
    await ensure_user_member_or_admin(current_user, selected_institutes, container)
    if not existing:
        proposal = None
    else:
        try:
            existing.submit(current_user)
            proposal = await container.proposal_repository.update(existing, tenant_id, current_user)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposal {proposal_id} not found"
        )
    
    return to_primitive(proposal)


@router.post("/{proposal_id}/attachments", status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    proposal_id: str,
    file: UploadFile = File(...),
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Upload attachment to proposal (stored in MinIO)
    
    Implements RF-08.09: Upload de anexos
    """
    # TODO: Implement MinIO integration; attach metadata to proposal record
    # For now, return a stub acknowledging upload
    selected_institutes: List[UUID] = await get_current_institute_ids()
    await ensure_user_member_or_admin(current_user, selected_institutes, container)

    return to_primitive({
        "message": "Attachment uploaded (placeholder)",
        "proposal_id": proposal_id,
        "filename": file.filename,
    })


@router.delete("/{proposal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_proposal(
    proposal_id: str,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Soft delete a proposal
    
    Implements RF-08.10: Exclusão lógica de proposta
    """
    selected_institutes: List[UUID] = await get_current_institute_ids()
    await ensure_user_member_or_admin(current_user, selected_institutes, container)

    success = await container.proposal_repository.delete(tenant_id, proposal_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposal {proposal_id} not found"
        )
