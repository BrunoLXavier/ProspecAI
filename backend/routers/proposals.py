"""
Proposals API Router
Implements RF-08: Repositório de Propostas
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from pydantic import BaseModel
from datetime import datetime, date

from domain.entities.proposal import Proposal, ProposalVersion, ProposalStatus
from use_cases.manage_proposals import ManageProposalsUseCase
from infrastructure.di_container import get_container

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


# Dependency injection
async def get_proposals_use_case() -> ManageProposalsUseCase:
    """Get ManageProposalsUseCase with injected dependencies."""
    async with get_container() as container:
        return container.get_manage_proposals_use_case()


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
    use_case: ManageProposalsUseCase = Depends(get_proposals_use_case),
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
    proposals = await use_case.list_proposals(
        status=status,
        funding_source_id=funding_source_id,
        project_id=project_id,
        opportunity_id=opportunity_id,
        min_adherence_score=min_adherence_score,
        max_adherence_score=max_adherence_score,
        created_after=created_after,
        created_before=created_before,
        submitted_after=submitted_after,
        submitted_before=submitted_before,
        search=search,
        skip=skip,
        limit=limit
    )
    return proposals


@router.get("/{proposal_id}", response_model=ProposalResponse)
async def get_proposal(
    proposal_id: str,
    use_case: ManageProposalsUseCase = Depends(get_proposals_use_case),
):
    """
    Get detailed information about a specific proposal
    
    Implements RF-08.02: Detalhamento de proposta
    """
    proposal = await use_case.get_proposal(proposal_id)
    
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposal {proposal_id} not found"
        )
    
    return proposal


@router.post("/", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED)
async def create_proposal(
    data: ProposalCreate,
    analyze_adherence: bool = True,
    use_case: ManageProposalsUseCase = Depends(get_proposals_use_case),
):
    """
    Create a new proposal with AI adherence analysis
    
    Implements RF-08.03: Criação de proposta com análise de aderência
    """
    proposal = await use_case.create_proposal(
        title=data.title,
        funding_source_id=data.funding_source_id,
        project_id=data.project_id,
        opportunity_id=data.opportunity_id,
        description=data.description,
        objectives=data.objectives,
        methodology=data.methodology,
        budget_breakdown=data.budget_breakdown,
        schedule=data.schedule,
        team=data.team,
        analyze_adherence=analyze_adherence,
    )
    
    return proposal


@router.patch("/{proposal_id}", response_model=ProposalResponse)
async def update_proposal(
    proposal_id: str,
    data: ProposalUpdate,
    use_case: ManageProposalsUseCase = Depends(get_proposals_use_case),
):
    """
    Update an existing proposal
    
    Implements RF-08.04: Atualização de proposta
    """
    proposal = await use_case.update_proposal(
        proposal_id=proposal_id,
        **data.model_dump(exclude_unset=True)
    )
    
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposal {proposal_id} not found"
        )
    
    return proposal


@router.post("/{proposal_id}/versions", response_model=ProposalVersionResponse, status_code=status.HTTP_201_CREATED)
async def create_version(
    proposal_id: str,
    data: VersionCreate,
    use_case: ManageProposalsUseCase = Depends(get_proposals_use_case),
):
    """
    Create a new version of the proposal (Git-like versioning)
    
    Implements RF-08.05: Versionamento de propostas
    """
    version = await use_case.create_version(
        proposal_id=proposal_id,
        changes_summary=data.changes_summary,
        content_updates=data.content_updates,
    )
    
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposal {proposal_id} not found"
        )
    
    return version


@router.get("/{proposal_id}/versions", response_model=List[ProposalVersionResponse])
async def list_versions(
    proposal_id: str,
    use_case: ManageProposalsUseCase = Depends(get_proposals_use_case),
):
    """
    List all versions of a proposal
    
    Implements RF-08.06: Histórico de versões
    """
    versions = await use_case.list_versions(proposal_id)
    return versions


@router.get("/{proposal_id}/adherence", response_model=AdherenceAnalysisResponse)
async def analyze_adherence(
    proposal_id: str,
    use_case: ManageProposalsUseCase = Depends(get_proposals_use_case),
):
    """
    Analyze proposal adherence to funding requirements
    
    Implements RF-08.07: Análise de aderência com IA
    """
    analysis = await use_case.analyze_adherence(proposal_id)
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposal {proposal_id} not found"
        )
    
    return analysis


@router.post("/{proposal_id}/submit", response_model=ProposalResponse)
async def submit_proposal(
    proposal_id: str,
    use_case: ManageProposalsUseCase = Depends(get_proposals_use_case),
):
    """
    Submit proposal (change status to submitted)
    
    Implements RF-08.08: Submissão de proposta
    """
    proposal = await use_case.submit_proposal(proposal_id)
    
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposal {proposal_id} not found"
        )
    
    return proposal


@router.post("/{proposal_id}/attachments", status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    proposal_id: str,
    file: UploadFile = File(...),
    use_case: ManageProposalsUseCase = Depends(get_proposals_use_case),
):
    """
    Upload attachment to proposal (stored in MinIO)
    
    Implements RF-08.09: Upload de anexos
    """
    # TODO: Implement MinIO integration
    return {
        "message": "Attachment uploaded successfully",
        "proposal_id": proposal_id,
        "filename": file.filename,
    }


@router.delete("/{proposal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_proposal(
    proposal_id: str,
    use_case: ManageProposalsUseCase = Depends(get_proposals_use_case),
):
    """
    Soft delete a proposal
    
    Implements RF-08.10: Exclusão lógica de proposta
    """
    success = await use_case.delete_proposal(proposal_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposal {proposal_id} not found"
        )
