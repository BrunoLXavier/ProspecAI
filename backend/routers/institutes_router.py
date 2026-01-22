"""
Institutes API Router
Implements RF-03: Portfólio Institucional - Institute Management
Clean Architecture - Infrastructure Layer
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from domain.entities.institute import (
    Institute,
    InstituteCreate,
    InstituteUpdate,
    InstituteStatus,
    OperationalStatus
)
from adapters.repositories.institute_repository import InstituteRepository
from adapters.repositories.membership_repository import MembershipRepository
from infrastructure.dependencies import (
    get_current_user,
    get_current_user_id,
    get_tenant_id,
    get_db_session,
)
from infrastructure.serializers import to_primitive

router = APIRouter()


# ===========================================
# RESPONSE SCHEMAS
# ===========================================

class InstituteResponse(BaseModel):
    id: str
    tenant_id: str
    nome: str
    isi_sigla: str
    nome_fantasia: Optional[str] = None
    endereco_rua: str
    endereco_bairro: str
    endereco_cep: str
    endereco_cidade: str
    endereco_uf: str
    descricao: str
    status: str
    status_operacional: str
    logo_url: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class InstituteDetailResponse(InstituteResponse):
    endereco_numero: Optional[str] = None
    endereco_complemento: Optional[str] = None
    area_predial_m2: Optional[int] = None
    maturidade_gestao: Optional[str] = None
    maturidade_base_tecnologica: Optional[float] = None
    maturidade_produtos_servicos: Optional[float] = None
    maturidade_cooperacao: Optional[float] = None
    credenciamento_cati: bool = False
    credenciamento_ed: bool = False
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class InstituteStatsResponse(BaseModel):
    total: int
    by_status: dict
    by_operational_status: dict
    total_area_m2: float


class MembershipResponse(BaseModel):
    id: str
    user_id: str
    institute_id: str
    role: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    institute_name: Optional[str] = None
    institute_sigla: Optional[str] = None


# ===========================================
# HELPER FUNCTIONS
# ===========================================

async def get_institute_repository(session=Depends(get_db_session)) -> InstituteRepository:
    return InstituteRepository(session)


async def get_membership_repository(session=Depends(get_db_session)) -> MembershipRepository:
    return MembershipRepository(session)


async def validate_user_membership(
    institute_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: InstituteRepository = Depends(get_institute_repository),
) -> bool:
    """Validate that current user has membership in the institute."""
    has_membership = await repo.check_user_membership(tenant_id, user_id, institute_id)
    if not has_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have membership in this institute"
        )
    return True


# ===========================================
# INSTITUTES ENDPOINTS
# ===========================================

@router.get("", response_model=List[InstituteResponse])
async def list_institutes(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: Ativo, Inativo"),
    cidade: Optional[str] = Query(None, description="Filter by city"),
    uf: Optional[str] = Query(None, description="Filter by state (2 letters)"),
    search: Optional[str] = Query(None, description="Search in name, sigla, description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    tenant_id: UUID = Depends(get_tenant_id),
    repo: InstituteRepository = Depends(get_institute_repository),
):
    """
    List all institutes the current tenant has access to.
    
    Implements RF-03: Portfólio Institucional
    """
    status_enum = None
    if status_filter:
        try:
            status_enum = InstituteStatus(status_filter)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    
    institutes = await repo.list_all(
        tenant_id=tenant_id,
        skip=skip,
        limit=limit,
        status=status_enum,
        cidade=cidade,
        uf=uf,
        search=search,
    )
    
    return [to_primitive(inst) for inst in institutes]


@router.get("/my-institutes", response_model=List[InstituteResponse])
async def list_my_institutes(
    tenant_id: UUID = Depends(get_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: InstituteRepository = Depends(get_institute_repository),
):
    """
    List institutes where the current user has membership.
    
    Used for institute selector in header.
    """
    institutes = await repo.list_by_user_membership(tenant_id, user_id)
    return [to_primitive(inst) for inst in institutes]


@router.get("/statistics", response_model=InstituteStatsResponse)
async def get_institute_statistics(
    tenant_id: UUID = Depends(get_tenant_id),
    repo: InstituteRepository = Depends(get_institute_repository),
):
    """Get aggregated statistics for institutes."""
    stats = await repo.get_statistics(tenant_id)
    return stats


@router.get("/{institute_id}", response_model=InstituteDetailResponse)
async def get_institute(
    institute_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    repo: InstituteRepository = Depends(get_institute_repository),
):
    """Get detailed information about an institute."""
    institute = await repo.get_by_id(tenant_id, institute_id)
    
    if not institute:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institute {institute_id} not found"
        )
    
    return to_primitive(institute)


@router.post("", response_model=InstituteDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_institute(
    data: InstituteCreate,
    tenant_id: UUID = Depends(get_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: InstituteRepository = Depends(get_institute_repository),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
):
    """
    Create a new institute.
    
    Creator is automatically added as 'admin' member.
    """
    institute = await repo.create(tenant_id, data, user_id)
    
    # Add creator as admin member
    await membership_repo.create(
        tenant_id=tenant_id,
        user_id=user_id,
        institute_id=institute.id,
        role='admin',
        created_by=user_id,
    )
    
    return to_primitive(institute)


@router.put("/{institute_id}", response_model=InstituteDetailResponse)
async def update_institute(
    institute_id: UUID,
    data: InstituteUpdate,
    tenant_id: UUID = Depends(get_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: InstituteRepository = Depends(get_institute_repository),
    _: bool = Depends(validate_user_membership),
):
    """
    Update an institute.
    
    Requires membership in the institute.
    """
    institute = await repo.update(tenant_id, institute_id, data, user_id)
    
    if not institute:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institute {institute_id} not found"
        )
    
    return to_primitive(institute)


@router.delete("/{institute_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_institute(
    institute_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: InstituteRepository = Depends(get_institute_repository),
    _: bool = Depends(validate_user_membership),
):
    """
    Soft delete an institute.
    
    Sets status to Inativo and deleted_at timestamp.
    Requires membership in the institute.
    """
    success = await repo.soft_delete(tenant_id, institute_id, user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institute {institute_id} not found"
        )
    
    return None


# ===========================================
# MEMBERSHIP ENDPOINTS
# ===========================================

@router.get("/{institute_id}/members", response_model=List[MembershipResponse])
async def list_institute_members(
    institute_id: UUID,
    role: Optional[str] = Query(None, description="Filter by role"),
    search: Optional[str] = Query(None, description="Search by user name or email"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    tenant_id: UUID = Depends(get_tenant_id),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
    _: bool = Depends(validate_user_membership),
):
    """
    List all members of an institute.
    
    Requires membership in the institute.
    """
    members = await membership_repo.list_by_institute(
        tenant_id=tenant_id,
        institute_id=institute_id,
        skip=skip,
        limit=limit,
        role=role,
        search=search,
    )
    
    return [
        MembershipResponse(
            id=str(m.id),
            user_id=str(m.user_id),
            institute_id=str(m.institute_id),
            role=m.role or 'member',
            user_name=m.user_name,
            user_email=m.user_email,
            institute_name=m.institute_name,
            institute_sigla=m.institute_sigla,
        )
        for m in members
    ]


@router.post("/{institute_id}/members", response_model=MembershipResponse, status_code=status.HTTP_201_CREATED)
async def add_institute_member(
    institute_id: UUID,
    user_id_to_add: UUID = Query(..., alias="user_id", description="User ID to add"),
    role: str = Query("member", description="Role: admin, member, viewer"),
    tenant_id: UUID = Depends(get_tenant_id),
    current_user_id: UUID = Depends(get_current_user_id),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
    _: bool = Depends(validate_user_membership),
):
    """
    Add a user as member of an institute.
    
    Requires membership in the institute.
    """
    membership = await membership_repo.create(
        tenant_id=tenant_id,
        user_id=user_id_to_add,
        institute_id=institute_id,
        role=role,
        created_by=current_user_id,
    )
    
    return MembershipResponse(
        id=str(membership.id),
        user_id=str(membership.user_id),
        institute_id=str(membership.institute_id),
        role=membership.role or 'member',
        user_name=membership.user_name,
        user_email=membership.user_email,
        institute_name=membership.institute_name,
        institute_sigla=membership.institute_sigla,
    )


@router.put("/{institute_id}/members/{member_user_id}", response_model=MembershipResponse)
async def update_member_role(
    institute_id: UUID,
    member_user_id: UUID,
    role: str = Query(..., description="New role: admin, member, viewer"),
    tenant_id: UUID = Depends(get_tenant_id),
    current_user_id: UUID = Depends(get_current_user_id),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
    _: bool = Depends(validate_user_membership),
):
    """
    Update a member's role in an institute.
    
    Requires membership in the institute.
    """
    membership = await membership_repo.update_role(
        tenant_id=tenant_id,
        user_id=member_user_id,
        institute_id=institute_id,
        role=role,
        updated_by=current_user_id,
    )
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found"
        )
    
    return MembershipResponse(
        id=str(membership.id),
        user_id=str(membership.user_id),
        institute_id=str(membership.institute_id),
        role=membership.role or 'member',
        user_name=membership.user_name,
        user_email=membership.user_email,
        institute_name=membership.institute_name,
        institute_sigla=membership.institute_sigla,
    )


@router.delete("/{institute_id}/members/{member_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_institute_member(
    institute_id: UUID,
    member_user_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    current_user_id: UUID = Depends(get_current_user_id),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
    _: bool = Depends(validate_user_membership),
):
    """
    Remove a user from an institute.
    
    Soft delete - sets deleted_at timestamp.
    Requires membership in the institute.
    """
    success = await membership_repo.remove(
        tenant_id=tenant_id,
        user_id=member_user_id,
        institute_id=institute_id,
        removed_by=current_user_id,
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found"
        )
    
    return None


@router.get("/membership/check/{institute_id}")
async def check_membership(
    institute_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
):
    """Check if current user has membership in an institute."""
    has_membership = await membership_repo.check_membership(tenant_id, user_id, institute_id)
    return {"has_membership": has_membership}
