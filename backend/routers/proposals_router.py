"""
Proposals API Router
Implements RF-08: Repositório de Propostas
"""
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, BackgroundTasks, Response
from fastapi.responses import StreamingResponse
from datetime import datetime, date
from uuid import UUID
import io

from domain.entities.proposal import (
    Proposal, ProposalVersion, ProposalStatus, FieldType, 
    ProposalTemplateType, AttachmentStatus, STANDARD_PROPOSAL_FIELDS
)
from infrastructure.dependencies import get_di_container, get_current_user_id, get_current_tenant_id, get_current_institute_ids, _check_user_member_or_admin
from infrastructure.di_container import DependencyContainer
from infrastructure.serializers import to_primitive
from services.acl_service import acl_service
from domain.schemas.proposal_schemas import (
    ProposalCreate, ProposalUpdate, VersionCreate, AdherenceAnalysisResponse,
    ProposalResponse, ProposalVersionResponse, FieldTemplateCreate,
    ProposalTemplateCreate, ProposalTemplateUpdate, ProposalTemplateResponse,
    FieldTemplateResponse, FieldValueCreate, FieldValueResponse,
    AttachmentResponse, AutoFillSuggestionResponse, ProposalWithFieldsCreate,
    VersionCreateWithFields, ReportGenerateRequest,
)

router = APIRouter()


async def check_acl_permission(user_id: str, resource: str, permission: str, container: DependencyContainer) -> None:
    """Check if user has permission for resource, raise 403 if not."""
    if not acl_service.check_permission(user_id, resource, permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User does not have {permission} permission for {resource}"
        )


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
    institute_ids: list = Depends(get_current_institute_ids),
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

    # RF-08: institute-level proposal filtering via direct column
    if institute_ids:
        criteria["institute_ids"] = institute_ids

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
    await _check_user_member_or_admin(current_user, selected_institutes, container)

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
        await _check_user_member_or_admin(current_user, selected_institutes, container)

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
    versions = await container.proposal_repository.get_version_history(UUID(proposal_id), tenant_id)
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
    await _check_user_member_or_admin(current_user, selected_institutes, container)
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
    await _check_user_member_or_admin(current_user, selected_institutes, container)

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
    await _check_user_member_or_admin(current_user, selected_institutes, container)

    success = await container.proposal_repository.delete(tenant_id, proposal_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposal {proposal_id} not found"
        )


# =====================================================
# PROPOSAL TEMPLATES ENDPOINTS (Admin Only for Create/Update/Delete)
# =====================================================

@router.get("/templates/", response_model=List[ProposalTemplateResponse], tags=["Proposal Templates"])
async def list_proposal_templates(
    template_type: Optional[ProposalTemplateType] = Query(None, description="Filter by template type"),
    funding_source_id: Optional[str] = Query(None, description="Filter by funding source"),
    is_active: bool = Query(True, description="Filter by active status"),
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    List all proposal templates (filtered)
    
    Implements RF-08: Template-based proposals
    """
    # All roles can read templates
    await check_acl_permission(current_user, "proposal_templates", "read", container)
    
    uc = container.get_manage_proposals_use_case()
    templates = await uc.list_proposal_templates(
        template_type=template_type,
        funding_source_id=funding_source_id,
        is_active=is_active,
        tenant_id=UUID(tenant_id)
    )
    
    return to_primitive(templates)


@router.get("/templates/{template_id}", response_model=Dict[str, Any], tags=["Proposal Templates"])
async def get_proposal_template(
    template_id: str,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Get template with all field definitions
    
    Returns standard fields + template-specific fields merged
    """
    await check_acl_permission(current_user, "proposal_templates", "read", container)
    
    uc = container.get_manage_proposals_use_case()
    template_with_fields = await uc.get_template_with_fields(
        template_id=UUID(template_id),
        tenant_id=UUID(tenant_id)
    )
    
    if not template_with_fields:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found"
        )
    
    return to_primitive(template_with_fields)


@router.get("/templates/for-funding/{funding_source_id}", response_model=Dict[str, Any], tags=["Proposal Templates"])
async def get_template_for_funding_source(
    funding_source_id: str,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Get template and merged fields for a funding source
    
    Returns:
    - standard_fields: Base fields for all proposals
    - template_fields: Funding-source-specific fields
    - merged_fields: Combined ordered list for form rendering
    """
    await check_acl_permission(current_user, "proposal_templates", "read", container)
    
    uc = container.get_manage_proposals_use_case()
    result = await uc.get_template_for_funding_source(
        funding_source_id=UUID(funding_source_id),
        tenant_id=UUID(tenant_id)
    )
    
    return to_primitive(result)


@router.post("/templates/", response_model=ProposalTemplateResponse, status_code=status.HTTP_201_CREATED, tags=["Proposal Templates"])
async def create_proposal_template(
    data: ProposalTemplateCreate,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Create a new proposal template (Admin only)
    
    Implements RF-08: Admin-controlled templates
    """
    # Only admins can create templates
    await check_acl_permission(current_user, "proposal_templates", "create", container)
    
    uc = container.get_manage_proposals_use_case()
    template = await uc.create_proposal_template(
        name=data.name,
        description=data.description,
        template_type=data.template_type,
        funding_source_id=UUID(data.funding_source_id) if data.funding_source_id else None,
        is_default=data.is_default,
        fields=[f.model_dump() for f in data.fields],
        created_by=current_user,
        tenant_id=UUID(tenant_id)
    )
    
    return to_primitive(template)


@router.patch("/templates/{template_id}", response_model=ProposalTemplateResponse, tags=["Proposal Templates"])
async def update_proposal_template(
    template_id: str,
    data: ProposalTemplateUpdate,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Update a proposal template (Admin only)
    """
    await check_acl_permission(current_user, "proposal_templates", "update", container)
    
    uc = container.get_manage_proposals_use_case()
    template = await uc.update_proposal_template(
        template_id=UUID(template_id),
        updates=data.model_dump(exclude_unset=True),
        updated_by=current_user,
        tenant_id=UUID(tenant_id)
    )
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found"
        )
    
    return to_primitive(template)


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Proposal Templates"])
async def delete_proposal_template(
    template_id: str,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Soft delete a proposal template (Admin only)
    """
    await check_acl_permission(current_user, "proposal_templates", "delete", container)
    
    uc = container.get_manage_proposals_use_case()
    success = await uc.delete_proposal_template(
        template_id=UUID(template_id),
        deleted_by=current_user,
        tenant_id=UUID(tenant_id)
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found"
        )


# =====================================================
# PROPOSAL FIELD VALUES ENDPOINTS
# =====================================================

@router.get("/{proposal_id}/fields", response_model=List[FieldValueResponse], tags=["Proposal Fields"])
async def get_proposal_field_values(
    proposal_id: str,
    include_pending_suggestions: bool = Query(False, description="Include pending AI suggestions"),
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Get all field values for a proposal
    
    Implements RF-08: Dynamic field retrieval
    """
    uc = container.get_manage_proposals_use_case()
    field_values = await uc.get_proposal_field_values(
        proposal_id=UUID(proposal_id),
        include_pending=include_pending_suggestions,
        tenant_id=UUID(tenant_id)
    )
    
    return to_primitive(field_values)


@router.put("/{proposal_id}/fields", response_model=Dict[str, Any], tags=["Proposal Fields"])
async def update_proposal_field_values(
    proposal_id: str,
    field_values: List[FieldValueCreate],
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Update multiple field values for a proposal
    
    Does NOT create a new version - use create_version_with_fields for that
    """
    selected_institutes: List[UUID] = await get_current_institute_ids()
    await _check_user_member_or_admin(current_user, selected_institutes, container)
    
    uc = container.get_manage_proposals_use_case()
    result = await uc.update_proposal_field_values(
        proposal_id=UUID(proposal_id),
        field_values=[fv.model_dump() for fv in field_values],
        updated_by=current_user,
        tenant_id=UUID(tenant_id)
    )
    
    return to_primitive(result)


# =====================================================
# ATTACHMENTS AND AUTO-FILL ENDPOINTS
# =====================================================

@router.post("/{proposal_id}/attachments", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED, tags=["Proposal Attachments"])
async def upload_proposal_attachment(
    proposal_id: str,
    file: UploadFile = File(...),
    enable_auto_fill: bool = Query(True, description="Enable AI extraction for auto-fill suggestions"),
    background_tasks: BackgroundTasks = None,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Upload attachment to proposal and optionally trigger auto-fill extraction
    
    Implements RF-08: AI-assisted auto-fill from documents
    
    Returns attachment metadata with extraction status.
    If auto-fill enabled, extraction runs asynchronously via Kafka.
    Connect to WebSocket /ws/proposals/{proposal_id} for real-time updates.
    """
    selected_institutes: List[UUID] = await get_current_institute_ids()
    await _check_user_member_or_admin(current_user, selected_institutes, container)
    
    # Read file content
    file_content = await file.read()
    
    uc = container.get_manage_proposals_use_case()
    attachment = await uc.upload_attachment(
        proposal_id=UUID(proposal_id),
        file_name=file.filename,
        file_content=file_content,
        file_type=file.content_type or "application/octet-stream",
        enable_auto_fill=enable_auto_fill,
        uploaded_by=current_user,
        tenant_id=UUID(tenant_id)
    )
    
    return to_primitive(attachment)


@router.get("/{proposal_id}/attachments", response_model=List[AttachmentResponse], tags=["Proposal Attachments"])
async def list_proposal_attachments(
    proposal_id: str,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    List all attachments for a proposal
    """
    uc = container.get_manage_proposals_use_case()
    attachments = await uc.get_proposal_attachments(
        proposal_id=UUID(proposal_id),
        tenant_id=UUID(tenant_id)
    )
    
    return to_primitive(attachments)


@router.get("/{proposal_id}/attachments/{attachment_id}/download", tags=["Proposal Attachments"])
async def download_attachment(
    proposal_id: str,
    attachment_id: str,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Get presigned download URL for attachment
    """
    uc = container.get_manage_proposals_use_case()
    download_info = await uc.get_attachment_download_url(
        attachment_id=UUID(attachment_id),
        tenant_id=UUID(tenant_id)
    )
    
    if not download_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attachment {attachment_id} not found"
        )
    
    return to_primitive(download_info)


@router.get("/{proposal_id}/auto-fill/suggestions", response_model=List[AutoFillSuggestionResponse], tags=["Auto-Fill"])
async def get_auto_fill_suggestions(
    proposal_id: str,
    status_filter: Optional[str] = Query("pending", description="Filter by status: pending, accepted, rejected, all"),
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Get pending auto-fill suggestions for review (Human-in-the-Loop)
    
    Implements RF-08: AI suggestions with confidence badges
    
    Each suggestion includes:
    - confidence_score: 0.0-1.0
    - confidence_badge: green (>80%), yellow (60-80%), red (<60%)
    - source_text: Excerpt from document where value was extracted
    """
    uc = container.get_manage_proposals_use_case()
    suggestions = await uc.get_auto_fill_suggestions(
        proposal_id=UUID(proposal_id),
        status_filter=status_filter if status_filter != "all" else None,
        tenant_id=UUID(tenant_id)
    )
    
    return to_primitive(suggestions)


@router.post("/{proposal_id}/auto-fill/suggestions/{suggestion_id}/confirm", tags=["Auto-Fill"])
async def confirm_auto_fill_suggestion(
    proposal_id: str,
    suggestion_id: str,
    accept: bool = Query(..., description="True to accept, False to reject"),
    corrected_value: Optional[Any] = None,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Accept or reject an auto-fill suggestion (Human-in-the-Loop)
    
    If accepted, the suggested value (or corrected_value if provided) is applied to the proposal field.
    """
    selected_institutes: List[UUID] = await get_current_institute_ids()
    await _check_user_member_or_admin(current_user, selected_institutes, container)
    
    uc = container.get_manage_proposals_use_case()
    result = await uc.confirm_auto_fill_suggestion(
        suggestion_id=UUID(suggestion_id),
        accept=accept,
        corrected_value=corrected_value,
        confirmed_by=current_user,
        tenant_id=UUID(tenant_id)
    )
    
    return to_primitive(result)


@router.post("/{proposal_id}/auto-fill/confirm-all", tags=["Auto-Fill"])
async def confirm_all_suggestions(
    proposal_id: str,
    min_confidence: float = Query(0.8, ge=0.0, le=1.0, description="Only accept suggestions with confidence >= this"),
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Bulk accept all high-confidence suggestions (convenience endpoint)
    
    Accepts all pending suggestions with confidence >= min_confidence.
    Returns count of accepted and skipped suggestions.
    """
    selected_institutes: List[UUID] = await get_current_institute_ids()
    await _check_user_member_or_admin(current_user, selected_institutes, container)
    
    uc = container.get_manage_proposals_use_case()
    result = await uc.confirm_all_auto_fill_suggestions(
        proposal_id=UUID(proposal_id),
        min_confidence=min_confidence,
        confirmed_by=current_user,
        tenant_id=UUID(tenant_id)
    )
    
    return to_primitive(result)


# =====================================================
# VERSIONING WITH COMMIT MESSAGE
# =====================================================

@router.post("/{proposal_id}/versions/commit", response_model=ProposalVersionResponse, status_code=status.HTTP_201_CREATED, tags=["Versioning"])
async def create_version_with_commit(
    proposal_id: str,
    data: VersionCreateWithFields,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Create new version with explicit commit message (Git-like)
    
    Implements RF-08: Explicit versioning with required commit messages
    
    - commit_message: Required, describes what changed
    - field_updates: Dict of field_key -> new_value for fields that changed
    """
    selected_institutes: List[UUID] = await get_current_institute_ids()
    await _check_user_member_or_admin(current_user, selected_institutes, container)
    
    uc = container.get_manage_proposals_use_case()
    version = await uc.update_proposal_with_version(
        proposal_id=UUID(proposal_id),
        field_updates=data.field_updates,
        commit_message=data.commit_message,
        updated_by=current_user,
        tenant_id=UUID(tenant_id)
    )
    
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposal {proposal_id} not found"
        )
    
    return to_primitive(version)


@router.get("/{proposal_id}/versions/{version_number}", response_model=Dict[str, Any], tags=["Versioning"])
async def get_version_snapshot(
    proposal_id: str,
    version_number: int,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Get complete snapshot of proposal at a specific version
    """
    uc = container.get_manage_proposals_use_case()
    snapshot = await uc.get_version_snapshot(
        proposal_id=UUID(proposal_id),
        version_number=version_number,
        tenant_id=UUID(tenant_id)
    )
    
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version {version_number} not found for proposal {proposal_id}"
        )
    
    return to_primitive(snapshot)


@router.get("/{proposal_id}/versions/{version_a}/diff/{version_b}", response_model=Dict[str, Any], tags=["Versioning"])
async def diff_versions(
    proposal_id: str,
    version_a: int,
    version_b: int,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Compare two versions and return diff
    """
    uc = container.get_manage_proposals_use_case()
    diff = await uc.diff_versions(
        proposal_id=UUID(proposal_id),
        version_a=version_a,
        version_b=version_b,
        tenant_id=UUID(tenant_id)
    )
    
    return to_primitive(diff)


# =====================================================
# REPORT GENERATION
# =====================================================

@router.post("/{proposal_id}/report", tags=["Reports"])
async def generate_proposal_report(
    proposal_id: str,
    request: ReportGenerateRequest,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Generate proposal report in PDF or DOCX format
    
    Implements RF-08: Report generation using Jinja2 templates
    
    Returns:
    - For PDF: StreamingResponse with application/pdf
    - For DOCX: StreamingResponse with application/vnd.openxmlformats-officedocument.wordprocessingml.document
    """
    await check_acl_permission(current_user, "reports", "create", container)
    
    uc = container.get_manage_proposals_use_case()
    report_result = await uc.generate_proposal_report(
        proposal_id=UUID(proposal_id),
        format=request.format,
        include_versions=request.include_versions,
        include_attachments=request.include_attachments,
        template_name=request.template_name,
        generated_by=current_user,
        tenant_id=UUID(tenant_id)
    )
    
    if not report_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposal {proposal_id} not found"
        )
    
    # Prepare response based on format
    content = report_result.get("content")
    filename = report_result.get("filename", f"proposal_{proposal_id}")
    
    if request.format == "pdf":
        media_type = "application/pdf"
        filename = f"{filename}.pdf"
    else:
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        filename = f"{filename}.docx"
    
    return StreamingResponse(
        io.BytesIO(content),
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/templates/standard-fields", response_model=List[Dict[str, Any]], tags=["Proposal Templates"])
async def get_standard_fields(
    current_user: UUID = Depends(get_current_user_id),
):
    """
    Get list of standard fields present in all proposals
    
    These fields are automatically included regardless of template.
    """
    # Convert enums to strings for JSON response
    fields = []
    for f in STANDARD_PROPOSAL_FIELDS:
        field_dict = dict(f)
        if hasattr(field_dict.get("field_type"), "value"):
            field_dict["field_type"] = field_dict["field_type"].value
        fields.append(field_dict)
    
    return fields
