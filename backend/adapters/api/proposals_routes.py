"""
Proposals API Routes - Full Production Implementation
Implements RF-08: Repositório de propostas e colaboração real-time (WebSockets)

Features:
- CRUD operations for proposals
- Git-like versioning
- Collaboration management
- File attachments via MinIO
- Adherence analysis
"""
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query, BackgroundTasks
from pydantic import BaseModel, Field

from infrastructure.dependencies import get_di_container, get_current_user_id, get_current_tenant_id
from infrastructure.file_storage import (
    get_file_storage,
    FileStorageService,
    StorageBucket,
    UploadResult,
)
from use_cases.manage_proposals_use_case import ManageProposalsUseCase
from domain.entities.proposal import ProposalStatus
from infrastructure.serializers import to_primitive


router = APIRouter(prefix="/api/v1/proposals", tags=["proposals"])


# =============================================================================
# Request/Response Models
# =============================================================================

class ProposalCreateRequest(BaseModel):
    """Request model for creating a proposal"""
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    opportunity_id: Optional[UUID] = None
    funding_source_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    initial_content: str = Field(default="")
    tags: List[str] = Field(default_factory=list)


class ProposalUpdateRequest(BaseModel):
    """Request model for updating a proposal"""
    title: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    status: Optional[ProposalStatus] = None
    tags: Optional[List[str]] = None


class VersionCreateRequest(BaseModel):
    """Request model for creating a new version"""
    content: str = Field(..., min_length=1)
    commit_message: str = Field(..., min_length=1, max_length=500)


class CollaboratorRequest(BaseModel):
    """Request model for managing collaborators"""
    user_id: UUID


class AdherenceAnalysisRequest(BaseModel):
    """Request model for adherence analysis"""
    funding_source_id: UUID


class ProposalResponse(BaseModel):
    """Response model for proposal"""
    id: UUID
    title: str
    description: Optional[str] = None
    status: str
    opportunity_id: Optional[UUID]
    funding_source_id: Optional[UUID]
    client_id: Optional[UUID]
    current_version_id: Optional[UUID]
    version_count: int
    collaborators: List[UUID]
    adherence_to_funding: Optional[float]
    tags: List[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VersionResponse(BaseModel):
    """Response model for proposal version"""
    id: UUID
    proposal_id: UUID
    version_number: int
    title: str
    content: str
    author_id: UUID
    commit_message: str
    adherence_score: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class AttachmentResponse(BaseModel):
    """Response model for file attachment"""
    object_name: str
    filename: str
    size: int
    content_type: str
    download_url: str
    uploaded_at: datetime


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/", summary="List all proposals", response_model=List[ProposalResponse])
@router.get("", summary="List all proposals (no trailing slash)", response_model=List[ProposalResponse])
async def list_proposals(
    status: Optional[str] = Query(None, description="Filter by status"),
    funding_source_id: Optional[UUID] = Query(None, description="Filter by funding source"),
    client_id: Optional[UUID] = Query(None, description="Filter by client"),
    search: Optional[str] = Query(None, description="Search in title/description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    List proposals with optional filters.
    Implements RF-08.01: Listagem de propostas
    """
    proposal_repo = container.proposal_repository
    
    filters = {"tenant_id": tenant_id}
    if status:
        filters["status"] = status
    if funding_source_id:
        filters["funding_source_id"] = str(funding_source_id)
    if client_id:
        filters["client_id"] = str(client_id)
    if search:
        filters["search_text"] = search

    proposals = await proposal_repo.find_by_criteria(
        filters,
        skip=skip,
        limit=limit,
    )
    
    return [to_primitive(ProposalResponse(
            id=p.id,
            title=p.title,
            description=p.description if hasattr(p, 'description') else "",
            status=p.status.value if hasattr(p.status, 'value') else str(p.status),
            opportunity_id=p.opportunity_id,
            funding_source_id=p.funding_source_id,
            client_id=getattr(p, 'client_id', None),
            current_version_id=getattr(p, 'current_version_id', None),
            version_count=getattr(p, 'version_count', p.current_version or 1),
            collaborators=p.collaborators or [],
            adherence_to_funding=p.adherence_score,
            tags=getattr(p, 'tags', []) or [],
            created_at=p.created_at,
            updated_at=p.updated_at,
        )) for p in proposals]


@router.post("/", summary="Create a new proposal", response_model=ProposalResponse, status_code=201)
async def create_proposal(
    request: ProposalCreateRequest,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Create a new proposal with initial version.
    Implements RF-08.01: Criação de propostas
    """
    use_case: ManageProposalsUseCase = container.get_manage_proposals_use_case()
    
    proposal_data = {
        "title": request.title,
        "description": request.description,
        "opportunity_id": request.opportunity_id,
        "funding_source_id": request.funding_source_id,
        "client_id": request.client_id,
        "tags": request.tags,
    }
    
    try:
        proposal = await use_case.create_proposal(
            proposal_data=proposal_data,
            initial_content=request.initial_content or request.description,
            tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
            user_id=user_id,
        )
        
        return to_primitive(ProposalResponse(
            id=proposal.id,
            title=proposal.title,
            description=getattr(proposal, 'description', ''),
            status=proposal.status.value if hasattr(proposal.status, 'value') else str(proposal.status),
            opportunity_id=proposal.opportunity_id,
            funding_source_id=proposal.funding_source_id,
            client_id=getattr(proposal, 'client_id', None),
            current_version_id=getattr(proposal, 'current_version_id', None),
            version_count=getattr(proposal, 'version_count', 1),
            collaborators=proposal.collaborators or [],
            adherence_to_funding=proposal.adherence_score,
            tags=getattr(proposal, 'tags', []) or [],
            created_at=proposal.created_at,
            updated_at=proposal.updated_at,
        ))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{proposal_id}", summary="Get proposal by ID", response_model=ProposalResponse)
async def get_proposal(
    proposal_id: UUID,
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Get proposal details by ID.
    Implements RF-08.01: Visualização de proposta
    """
    proposal_repo = container.proposal_repository
    
    proposal = await proposal_repo.get_by_id(proposal_id, tenant_id)
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
        return to_primitive(ProposalResponse(
            id=proposal.id,
            title=proposal.title,
            description=getattr(proposal, 'description', ''),
            status=proposal.status.value if hasattr(proposal.status, 'value') else str(proposal.status),
            opportunity_id=proposal.opportunity_id,
            funding_source_id=proposal.funding_source_id,
            client_id=getattr(proposal, 'client_id', None),
            current_version_id=getattr(proposal, 'current_version_id', None),
            version_count=getattr(proposal, 'version_count', proposal.current_version or 1),
            collaborators=proposal.collaborators or [],
            adherence_to_funding=proposal.adherence_score,
            tags=getattr(proposal, 'tags', []) or [],
            created_at=proposal.created_at,
            updated_at=proposal.updated_at,
        ))


@router.put("/{proposal_id}", summary="Update proposal", response_model=ProposalResponse)
async def update_proposal(
    proposal_id: UUID,
    request: ProposalUpdateRequest,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Update proposal metadata.
    Implements RF-08.01: Atualização de proposta
    """
    proposal_repo = container.proposal_repository
    
    proposal = await proposal_repo.get_by_id(proposal_id, tenant_id)
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    # Update fields
    if request.title is not None:
        proposal.title = request.title
    if request.description is not None:
        proposal.description = request.description
    if request.status is not None:
        proposal.status = request.status
    if request.tags is not None:
        proposal.tags = request.tags
    
    proposal.updated_by = user_id
    proposal.updated_at = datetime.utcnow()
    
    updated = await proposal_repo.update(proposal)
    
    return to_primitive(ProposalResponse(
        id=updated.id,
        title=updated.title,
        description=getattr(updated, 'description', ''),
        status=updated.status.value if hasattr(updated.status, 'value') else str(updated.status),
        opportunity_id=updated.opportunity_id,
        funding_source_id=updated.funding_source_id,
        client_id=getattr(updated, 'client_id', None),
        current_version_id=getattr(updated, 'current_version_id', None),
        version_count=getattr(updated, 'version_count', updated.current_version or 1),
        collaborators=updated.collaborators or [],
        adherence_to_funding=updated.adherence_score,
        tags=getattr(updated, 'tags', []) or [],
        created_at=updated.created_at,
        updated_at=updated.updated_at,
    ))


@router.delete("/{proposal_id}", summary="Delete proposal", status_code=204)
async def delete_proposal(
    proposal_id: UUID,
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Soft delete a proposal.
    Implements RF-08.01: Exclusão de proposta
    """
    proposal_repo = container.proposal_repository
    
    success = await proposal_repo.delete(proposal_id, tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    return None


# =============================================================================
# Version Management
# =============================================================================

@router.get("/{proposal_id}/versions", summary="Get version history", response_model=List[VersionResponse])
async def get_versions(
    proposal_id: UUID,
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Get full version history of a proposal.
    Implements RF-08.02: Histórico de versões
    """
    use_case: ManageProposalsUseCase = container.get_manage_proposals_use_case()
    
    try:
        versions = await use_case.get_proposal_history(
            proposal_id=proposal_id,
            tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
        )
        
        return [
            VersionResponse(
                id=v.id,
                proposal_id=v.proposal_id,
                version_number=v.version_number,
                title=v.title,
                content=v.content,
                author_id=v.author_id,
                commit_message=v.commit_message,
                adherence_score=v.adherence_score,
                created_at=v.created_at,
            )
            for v in versions
        ]
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{proposal_id}/versions", summary="Create new version", response_model=VersionResponse, status_code=201)
async def create_version(
    proposal_id: UUID,
    request: VersionCreateRequest,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Create a new version (commit) of the proposal.
    Implements RF-08.02: Versionamento Git-like
    """
    use_case: ManageProposalsUseCase = container.get_manage_proposals_use_case()
    
    try:
        version = await use_case.create_new_version(
            proposal_id=proposal_id,
            new_content=request.content,
            commit_message=request.commit_message,
            user_id=user_id,
            tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
        )
        
        return VersionResponse(
            id=version.id,
            proposal_id=version.proposal_id,
            version_number=version.version_number,
            title=version.title,
            content=version.content,
            author_id=version.author_id,
            commit_message=version.commit_message,
            adherence_score=version.adherence_score,
            created_at=version.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{proposal_id}/versions/{version_number}", summary="Get specific version")
async def get_version(
    proposal_id: UUID,
    version_number: int,
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Get specific version of a proposal.
    Implements RF-08.02: Visualização de versão específica
    """
    proposal_repo = container.proposal_repository
    
    version = await proposal_repo.get_version(proposal_id, version_number, tenant_id)
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    return VersionResponse(
        id=version.id,
        proposal_id=version.proposal_id,
        version_number=version.version_number,
        title=version.title,
        content=version.content,
        author_id=version.author_id,
        commit_message=version.commit_message,
        adherence_score=version.adherence_score,
        created_at=version.created_at,
    )


@router.get("/{proposal_id}/diff", summary="Get diff between versions")
async def get_diff(
    proposal_id: UUID,
    from_version: int = Query(..., description="Source version number"),
    to_version: int = Query(..., description="Target version number"),
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Get unified diff between two versions.
    Implements RF-08.02: Comparação de versões
    """
    proposal_repo = container.proposal_repository
    
    diff_result = await proposal_repo.get_version_diff(
        proposal_id, from_version, to_version, tenant_id
    )
    
    if not diff_result:
        raise HTTPException(status_code=404, detail="Versions not found")
    
    from infrastructure.serializers import to_primitive
    return to_primitive(diff_result)


# =============================================================================
# Collaboration Management
# =============================================================================

@router.get("/{proposal_id}/collaborators", summary="List collaborators")
async def list_collaborators(
    proposal_id: UUID,
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    List all collaborators of a proposal.
    Implements RF-08.03: Colaboração em propostas
    """
    proposal_repo = container.proposal_repository
    
    proposal = await proposal_repo.get_by_id(proposal_id, tenant_id)
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    return {"collaborators": proposal.collaborators or []}


@router.post("/{proposal_id}/collaborators", summary="Add collaborator", status_code=201)
async def add_collaborator(
    proposal_id: UUID,
    request: CollaboratorRequest,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Add a collaborator to the proposal.
    Implements RF-08.03: Adição de colaborador
    """
    use_case: ManageProposalsUseCase = container.get_manage_proposals_use_case()
    
    try:
        proposal = await use_case.add_collaborator(
            proposal_id=proposal_id,
            collaborator_id=request.user_id,
            user_id=user_id,
            tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
        )
        
        return {"message": "Collaborator added", "collaborators": proposal.collaborators}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{proposal_id}/collaborators/{collaborator_id}", summary="Remove collaborator")
async def remove_collaborator(
    proposal_id: UUID,
    collaborator_id: UUID,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Remove a collaborator from the proposal.
    Implements RF-08.03: Remoção de colaborador
    """
    proposal_repo = container.proposal_repository
    
    proposal = await proposal_repo.get_by_id(proposal_id, tenant_id)
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal.remove_collaborator(collaborator_id)
    proposal.updated_by = user_id
    proposal.updated_at = datetime.utcnow()
    
    await proposal_repo.update(proposal)
    
    return {"message": "Collaborator removed", "collaborators": proposal.collaborators}


# =============================================================================
# Adherence Analysis
# =============================================================================

@router.post("/{proposal_id}/analyze-adherence", summary="Analyze adherence to funding")
async def analyze_adherence(
    proposal_id: UUID,
    request: AdherenceAnalysisRequest,
    background_tasks: BackgroundTasks,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Analyze proposal adherence to funding source requirements.
    Implements RF-08.04: Análise de aderência com IA
    """
    use_case: ManageProposalsUseCase = container.get_manage_proposals_use_case()
    
    try:
        result = await use_case.analyze_adherence_to_funding(
            proposal_id=proposal_id,
            funding_source_id=request.funding_source_id,
            user_id=user_id,
            tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
        )
        
        return {
            "proposal_id": str(proposal_id),
            "funding_source_id": str(request.funding_source_id),
            "adherence_score": result.get("adherence_score"),
            "analysis_method": result.get("method", "keyword_analysis"),
            "details": result.get("details", {}),
            "recommendations": result.get("recommendations", []),
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =============================================================================
# File Attachments
# =============================================================================

@router.get("/{proposal_id}/attachments", summary="List attachments")
async def list_attachments(
    proposal_id: UUID,
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
    storage: FileStorageService = Depends(get_file_storage),
):
    """
    List all attachments for a proposal.
    Implements RF-08.05: Gestão de anexos
    """
    proposal_repo = container.proposal_repository
    
    proposal = await proposal_repo.get_by_id(proposal_id, tenant_id)
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    # Get files from MinIO
    files = await storage.list_files(
        tenant_id=tenant_id,
        bucket=StorageBucket.PROPOSALS,
        prefix=f"proposals/{proposal_id}",
    )
    
    attachments = []
    for file in files:
        download_url = await storage.get_presigned_url(
            bucket=StorageBucket.PROPOSALS,
            object_name=f"{tenant_id}/proposals/{proposal_id}/{file.name}",
        )
        attachments.append(
            AttachmentResponse(
                object_name=file.name,
                filename=file.name,
                size=file.size,
                content_type=file.content_type,
                download_url=download_url,
                uploaded_at=datetime.fromisoformat(file.last_modified) if file.last_modified else datetime.utcnow(),
            )
        )
    
    from infrastructure.serializers import to_primitive
    return to_primitive(attachments)


@router.post("/{proposal_id}/attachments", summary="Upload attachment", status_code=201)
async def upload_attachment(
    proposal_id: UUID,
    file: UploadFile = File(...),
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    storage: FileStorageService = Depends(get_file_storage),
):
    """
    Upload a file attachment to a proposal.
    Implements RF-08.05: Upload de anexos via MinIO
    """
    proposal_repo = container.proposal_repository
    
    # Verify proposal exists
    proposal = await proposal_repo.get_by_id(proposal_id, tenant_id)
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    # Read file content
    content = await file.read()
    
    # Upload to MinIO
    result: UploadResult = await storage.upload_bytes(
        tenant_id=tenant_id,
        bucket=StorageBucket.PROPOSALS,
        filename=file.filename,
        content=content,
        content_type=file.content_type,
        prefix=f"proposals/{proposal_id}",
    )
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error or "Upload failed")
    
    # Update proposal attachments list
    attachments = getattr(proposal, 'attachments', []) or []
    attachments.append({
        "object_name": result.object_name,
        "filename": file.filename,
        "size": result.size,
        "content_type": result.content_type,
        "uploaded_by": str(user_id),
        "uploaded_at": datetime.utcnow().isoformat(),
    })
    proposal.attachments = attachments
    proposal.updated_by = user_id
    proposal.updated_at = datetime.utcnow()
    
    await proposal_repo.update(proposal)
    
    # Generate download URL
    download_url = await storage.get_presigned_url(
        bucket=StorageBucket.PROPOSALS,
        object_name=result.object_name,
    )
    
    return to_primitive({
        "message": "Attachment uploaded successfully",
        "proposal_id": str(proposal_id),
        "filename": file.filename,
        "size": result.size,
        "content_type": result.content_type,
        "download_url": download_url,
    })


@router.delete("/{proposal_id}/attachments/{filename}", summary="Delete attachment")
async def delete_attachment(
    proposal_id: UUID,
    filename: str,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    storage: FileStorageService = Depends(get_file_storage),
):
    """
    Delete an attachment from a proposal.
    Implements RF-08.05: Remoção de anexos
    """
    proposal_repo = container.proposal_repository
    
    proposal = await proposal_repo.get_by_id(proposal_id, tenant_id)
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    # Delete from MinIO
    object_name = f"{tenant_id}/proposals/{proposal_id}/{filename}"
    success = await storage.delete_file(
        bucket=StorageBucket.PROPOSALS,
        object_name=object_name,
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Update proposal attachments list
    attachments = getattr(proposal, 'attachments', []) or []
    attachments = [a for a in attachments if a.get("filename") != filename]
    proposal.attachments = attachments
    proposal.updated_by = user_id
    proposal.updated_at = datetime.utcnow()
    
    await proposal_repo.update(proposal)
    
    return {"message": "Attachment deleted successfully"}


@router.get("/{proposal_id}/attachments/{filename}/download", summary="Download attachment")
async def download_attachment(
    proposal_id: UUID,
    filename: str,
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
    storage: FileStorageService = Depends(get_file_storage),
):
    """
    Get presigned download URL for an attachment.
    Implements RF-08.05: Download de anexos via presigned URL
    """
    proposal_repo = container.proposal_repository
    
    proposal = await proposal_repo.get_by_id(proposal_id, tenant_id)
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    object_name = f"{tenant_id}/proposals/{proposal_id}/{filename}"
    
    try:
        download_url = await storage.get_presigned_url(
            bucket=StorageBucket.PROPOSALS,
            object_name=object_name,
        )
        
        return {"download_url": download_url, "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=404, detail="Attachment not found")


# =============================================================================
# Lock/Unlock for Collaboration
# =============================================================================

@router.post("/{proposal_id}/lock", summary="Lock proposal for editing")
async def lock_proposal(
    proposal_id: UUID,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Acquire edit lock on a proposal.
    Implements RF-08.03: Colaboração em tempo real
    """
    proposal_repo = container.proposal_repository
    
    try:
        locked = await proposal_repo.acquire_lock(proposal_id, user_id, tenant_id)
        
        if not locked:
            return {"locked": False, "message": "Proposal is already locked by another user"}
        
        return {"locked": True, "locked_by": str(user_id), "message": "Lock acquired"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{proposal_id}/unlock", summary="Unlock proposal")
async def unlock_proposal(
    proposal_id: UUID,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Release edit lock on a proposal.
    Implements RF-08.03: Colaboração em tempo real
    """
    proposal_repo = container.proposal_repository
    
    try:
        await proposal_repo.release_lock(proposal_id, user_id, tenant_id)
        return {"locked": False, "message": "Lock released"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
