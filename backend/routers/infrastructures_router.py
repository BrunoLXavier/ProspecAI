"""
Infrastructure API Router
Implements RF-03: Portfólio Institucional - Infrastructure Management
Clean Architecture - Infrastructure Layer
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from domain.schemas.infrastructure_schemas import (
    InfrastructureResponse, InfrastructureStatsResponse,
    InfrastructureCreateRequest, InfrastructureUpdateRequest,
)
from domain.entities.infrastructure import (
    Infrastructure,
    InfrastructureCreate,
    InfrastructureUpdate,
    InfrastructureStatus
)
from adapters.repositories.infrastructure_repository import InfrastructureRepository
from adapters.repositories.institute_repository import InstituteRepository
from infrastructure.dependencies import (
    get_current_user_id,
    get_tenant_id,
    get_db_session,
    get_current_institute_ids,
)
from infrastructure.serializers import to_primitive

router = APIRouter()


# ===========================================
# HELPER FUNCTIONS
# ===========================================

async def get_infrastructure_repository(session=Depends(get_db_session)) -> InfrastructureRepository:
    return InfrastructureRepository(session)


async def get_institute_repository(session=Depends(get_db_session)) -> InstituteRepository:
    return InstituteRepository(session)


# ===========================================
# INFRASTRUCTURE ENDPOINTS
# ===========================================

@router.get("", response_model=List[InfrastructureResponse])
async def list_infrastructures(
    instituto_id: Optional[str] = Query(None, description="Filter by institute ID"),
    status_isi: Optional[str] = Query(None, description="Filter by status: Operacional, EmImplantacao, Inativo"),
    search: Optional[str] = Query(None, description="Search in name and description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    tenant_id: UUID = Depends(get_tenant_id),
    institute_ids: List[UUID] = Depends(get_current_institute_ids),
    repo: InfrastructureRepository = Depends(get_infrastructure_repository),
):
    """
    List infrastructure items filtered by selected institutes.
    
    If instituto_id is provided, filters to that institute only.
    Otherwise, returns infrastructures from all selected institutes in header.
    
    Implements RF-03: Portfólio Institucional
    """
    status_enum = None
    if status_isi:
        try:
            status_enum = InfrastructureStatus(status_isi)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_isi}"
            )
    
    if instituto_id:
        # Single institute filter
        inst_uuid = UUID(instituto_id)
        if inst_uuid not in institute_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this institute"
            )
        
        infrastructures = await repo.list_by_institute(
            tenant_id=tenant_id,
            institute_id=inst_uuid,
            skip=skip,
            limit=limit,
            status_isi=status_enum,
            search=search,
        )
    else:
        # Multiple institutes from header selection
        infrastructures = await repo.list_by_institutes(
            tenant_id=tenant_id,
            institute_ids=institute_ids,
            skip=skip,
            limit=limit,
            status_isi=status_enum,
            search=search,
        )
    
    return [to_primitive(inf) for inf in infrastructures]


@router.get("/statistics", response_model=InfrastructureStatsResponse)
async def get_infrastructure_statistics(
    tenant_id: UUID = Depends(get_tenant_id),
    institute_ids: List[UUID] = Depends(get_current_institute_ids),
    repo: InfrastructureRepository = Depends(get_infrastructure_repository),
):
    """Get aggregated statistics for infrastructures in selected institutes."""
    stats = await repo.get_statistics(tenant_id, institute_ids)
    return stats


@router.get("/{infrastructure_id}", response_model=InfrastructureResponse)
async def get_infrastructure(
    infrastructure_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    repo: InfrastructureRepository = Depends(get_infrastructure_repository),
):
    """Get detailed information about an infrastructure item."""
    infrastructure = await repo.get_by_id(tenant_id, infrastructure_id)
    
    if not infrastructure:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Infrastructure {infrastructure_id} not found"
        )
    
    return to_primitive(infrastructure)


@router.post("", response_model=InfrastructureResponse, status_code=status.HTTP_201_CREATED)
async def create_infrastructure(
    data: InfrastructureCreateRequest,
    tenant_id: UUID = Depends(get_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: InfrastructureRepository = Depends(get_infrastructure_repository),
    institute_repo: InstituteRepository = Depends(get_institute_repository),
):
    """
    Create a new infrastructure item.
    
    Requires membership in the target institute.
    """
    institute_id = UUID(data.instituto_id)
    
    # Validate access
    has_membership = await institute_repo.check_user_membership(tenant_id, user_id, institute_id)
    if not has_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this institute"
        )
    
    status_enum = None
    if data.status_isi:
        try:
            status_enum = InfrastructureStatus(data.status_isi)
        except ValueError:
            status_enum = InfrastructureStatus.Operacional
    
    infra_create = InfrastructureCreate(
        instituto_id=institute_id,
        nome=data.nome,
        descricao=data.descricao,
        email_laboratorio=data.email_laboratorio,
        email_responsavel=data.email_responsavel,
        telefone=data.telefone,
        site_url=data.site_url,
        endereco_completo=data.endereco_completo,
        area_predial_m2=data.area_predial_m2,
        status_isi=status_enum,
        maturidade_regulatoria=data.maturidade_regulatoria,
        maturidade_laboratorial=data.maturidade_laboratorial,
        maturidade_gestao=data.maturidade_gestao,
        plataformas_tecnologicas=data.plataformas_tecnologicas,
        areas_conhecimento=data.areas_conhecimento,
        macroareas_pesquisa=data.macroareas_pesquisa,
        midias=data.midias,
    )
    
    infrastructure = await repo.create(tenant_id, infra_create, user_id)
    return to_primitive(infrastructure)


@router.put("/{infrastructure_id}", response_model=InfrastructureResponse)
async def update_infrastructure(
    infrastructure_id: UUID,
    data: InfrastructureUpdateRequest,
    tenant_id: UUID = Depends(get_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: InfrastructureRepository = Depends(get_infrastructure_repository),
    institute_repo: InstituteRepository = Depends(get_institute_repository),
):
    """
    Update an infrastructure item.
    
    Requires membership in the institute.
    """
    # First get the infrastructure to find the institute
    existing = await repo.get_by_id(tenant_id, infrastructure_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Infrastructure {infrastructure_id} not found"
        )
    
    # Validate access
    has_membership = await institute_repo.check_user_membership(tenant_id, user_id, existing.instituto_id)
    if not has_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this institute"
        )
    
    # Convert status string to enum if provided
    update_data = data.model_dump(exclude_unset=True)
    if 'status_isi' in update_data and update_data['status_isi']:
        try:
            update_data['status_isi'] = InfrastructureStatus(update_data['status_isi'])
        except ValueError:
            pass
    
    infra_update = InfrastructureUpdate(**update_data)
    infrastructure = await repo.update(tenant_id, infrastructure_id, infra_update, user_id)
    
    return to_primitive(infrastructure)


@router.delete("/{infrastructure_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_infrastructure(
    infrastructure_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: InfrastructureRepository = Depends(get_infrastructure_repository),
    institute_repo: InstituteRepository = Depends(get_institute_repository),
):
    """
    Soft delete an infrastructure item.
    
    Requires membership in the institute.
    """
    # First get the infrastructure to find the institute
    existing = await repo.get_by_id(tenant_id, infrastructure_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Infrastructure {infrastructure_id} not found"
        )
    
    # Validate access
    has_membership = await institute_repo.check_user_membership(tenant_id, user_id, existing.instituto_id)
    if not has_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this institute"
        )
    
    success = await repo.soft_delete(tenant_id, infrastructure_id, user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Infrastructure {infrastructure_id} not found"
        )
    
    return None
