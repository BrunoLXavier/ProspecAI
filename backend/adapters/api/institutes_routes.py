"""Institutes API Routes
Provides list and CRUD for institutes with repository pattern.
Implements RF-03: Portfólio Institucional
"""
from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from domain.entities.institute import (
    Institute,
    InstituteCreate as DomainInstituteCreate,
    InstituteUpdate as DomainInstituteUpdate,
    InstituteStatus,
    OperationalStatus
)
from adapters.repositories.institute_repository import InstituteRepository
from adapters.repositories.membership_repository import MembershipRepository
from infrastructure.dependencies import get_di_container, get_current_tenant_id, get_current_user_id, get_db_session
from infrastructure.serializers import to_primitive
import sqlalchemy as sa

router = APIRouter(prefix="/api/v1/institutes", tags=["institutes"])


# ===========================================
# RESPONSE SCHEMAS (backward compatible)
# ===========================================

class InstituteOut(BaseModel):
    id: UUID
    name: str  # Legacy: maps to nome
    code: Optional[str] = None  # Legacy: maps to isi_sigla
    description: Optional[str] = None  # Legacy: maps to descricao
    metadata: Optional[Dict[str, Any]] = None
    # New fields
    nome: Optional[str] = None
    isi_sigla: Optional[str] = None
    descricao: Optional[str] = None
    endereco_cidade: Optional[str] = None
    endereco_uf: Optional[str] = None
    status: Optional[str] = None
    status_operacional: Optional[str] = None
    logo_url: Optional[str] = None


class InstituteDetailOut(InstituteOut):
    endereco_rua: Optional[str] = None
    endereco_bairro: Optional[str] = None
    endereco_cep: Optional[str] = None
    endereco_numero: Optional[str] = None
    endereco_complemento: Optional[str] = None
    area_predial_m2: Optional[int] = None
    maturidade_gestao: Optional[str] = None
    maturidade_base_tecnologica: Optional[float] = None
    maturidade_produtos_servicos: Optional[float] = None
    maturidade_cooperacao: Optional[float] = None
    credenciamento_cati: Optional[bool] = None
    credenciamento_ed: Optional[bool] = None


class InstituteCreate(BaseModel):
    name: str  # Required, maps to nome
    code: Optional[str] = None  # Maps to isi_sigla
    description: Optional[str] = None  # Maps to descricao
    metadata: Optional[Dict[str, Any]] = None
    # New fields
    nome: Optional[str] = None
    isi_sigla: Optional[str] = None
    descricao: Optional[str] = None
    nome_fantasia: Optional[str] = None
    endereco_rua: Optional[str] = None
    endereco_bairro: Optional[str] = None
    endereco_cep: Optional[str] = None
    endereco_cidade: Optional[str] = None
    endereco_uf: Optional[str] = None
    endereco_numero: Optional[str] = None
    endereco_complemento: Optional[str] = None
    status: Optional[str] = "Ativo"
    status_operacional: Optional[str] = "Operacional"
    logo_url: Optional[str] = None


class InstituteUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    nome: Optional[str] = None
    isi_sigla: Optional[str] = None
    descricao: Optional[str] = None
    nome_fantasia: Optional[str] = None
    endereco_rua: Optional[str] = None
    endereco_bairro: Optional[str] = None
    endereco_cep: Optional[str] = None
    endereco_cidade: Optional[str] = None
    endereco_uf: Optional[str] = None
    endereco_numero: Optional[str] = None
    endereco_complemento: Optional[str] = None
    status: Optional[str] = None
    status_operacional: Optional[str] = None
    logo_url: Optional[str] = None


class MembershipOut(BaseModel):
    id: UUID
    user_id: UUID
    institute_id: UUID
    role: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None


class InstituteStatsOut(BaseModel):
    total: int
    by_status: Dict[str, int]
    by_operational_status: Dict[str, int]
    total_area_m2: float


# ===========================================
# HELPER FUNCTIONS
# ===========================================

async def get_institute_repository(session=Depends(get_db_session)) -> InstituteRepository:
    return InstituteRepository(session)


async def get_membership_repository(session=Depends(get_db_session)) -> MembershipRepository:
    return MembershipRepository(session)


def _institute_to_response(inst: Institute) -> Dict[str, Any]:
    """Convert Institute entity to response dict with legacy field compatibility."""
    return {
        'id': inst.id,
        'name': inst.nome,  # Legacy mapping
        'code': inst.isi_sigla,  # Legacy mapping
        'description': inst.descricao,  # Legacy mapping
        'metadata': {},
        'nome': inst.nome,
        'isi_sigla': inst.isi_sigla,
        'descricao': inst.descricao,
        'endereco_cidade': inst.endereco_cidade,
        'endereco_uf': inst.endereco_uf,
        'status': inst.status.value if inst.status else None,
        'status_operacional': inst.status_operacional.value if inst.status_operacional else None,
        'logo_url': inst.logo_url,
        'endereco_rua': inst.endereco_rua,
        'endereco_bairro': inst.endereco_bairro,
        'endereco_cep': inst.endereco_cep,
        'endereco_numero': inst.endereco_numero,
        'endereco_complemento': inst.endereco_complemento,
        'area_predial_m2': inst.area_predial_m2,
        'maturidade_gestao': inst.maturidade_gestao,
        'maturidade_base_tecnologica': inst.maturidade_base_tecnologica,
        'maturidade_produtos_servicos': inst.maturidade_produtos_servicos,
        'maturidade_cooperacao': inst.maturidade_cooperacao,
        'credenciamento_cati': inst.credenciamento_cati,
        'credenciamento_ed': inst.credenciamento_ed,
    }


@router.get("", response_model=List[InstituteOut])
async def list_institutes(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: Ativo, Inativo"),
    cidade: Optional[str] = Query(None, description="Filter by city"),
    uf: Optional[str] = Query(None, description="Filter by state (2 letters)"),
    search: Optional[str] = Query(None, description="Search in name, sigla, description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    tenant_id: str = Depends(get_current_tenant_id),
    repo: InstituteRepository = Depends(get_institute_repository),
):
    """List all institutes with optional filters."""
    status_enum = None
    if status_filter:
        try:
            status_enum = InstituteStatus(status_filter)
        except ValueError:
            pass
    
    institutes = await repo.list_all(
        tenant_id=UUID(tenant_id),
        skip=skip,
        limit=limit,
        status=status_enum,
        cidade=cidade,
        uf=uf,
        search=search,
    )
    
    return [_institute_to_response(inst) for inst in institutes]


@router.get("/my-institutes", response_model=List[InstituteOut])
async def list_my_institutes(
    tenant_id: str = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: InstituteRepository = Depends(get_institute_repository),
):
    """List institutes where the current user has membership."""
    institutes = await repo.list_by_user_membership(UUID(tenant_id), user_id)
    return [_institute_to_response(inst) for inst in institutes]


@router.get("/statistics", response_model=InstituteStatsOut)
async def get_institute_statistics(
    tenant_id: str = Depends(get_current_tenant_id),
    repo: InstituteRepository = Depends(get_institute_repository),
):
    """Get aggregated statistics for institutes."""
    stats = await repo.get_statistics(UUID(tenant_id))
    return stats


@router.get("/{inst_id}", response_model=InstituteDetailOut)
async def get_institute(
    inst_id: UUID,
    tenant_id: str = Depends(get_current_tenant_id),
    repo: InstituteRepository = Depends(get_institute_repository),
):
    """Get detailed information about an institute."""
    institute = await repo.get_by_id(UUID(tenant_id), inst_id)
    
    if not institute:
        raise HTTPException(status_code=404, detail="Institute not found")
    
    return _institute_to_response(institute)


@router.post("", response_model=InstituteOut, status_code=201)
async def create_institute(
    req: InstituteCreate,
    tenant_id: str = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: InstituteRepository = Depends(get_institute_repository),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
    container=Depends(get_di_container),
):
    """Create a new institute. Creator is automatically added as admin member."""
    # Only admins may create institutes
    try:
        r = await container.session.execute(
            sa.text("SELECT 1 FROM user_roles WHERE user_id = :user_id AND role_id = 'admin' LIMIT 1"),
            {'user_id': str(user_id)}
        )
        if r.scalar() is None:
            raise HTTPException(status_code=403, detail="User must be an admin to create institutes")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=403, detail="User must be an admin to create institutes")
    
    # Use new fields if provided, fallback to legacy fields
    nome = req.nome or req.name
    isi_sigla = req.isi_sigla or req.code or nome[:100]
    descricao = req.descricao or req.description or ""
    
    # Parse status enums
    status_enum = InstituteStatus.Ativo
    if req.status:
        try:
            status_enum = InstituteStatus(req.status)
        except ValueError:
            pass
    
    op_status_enum = OperationalStatus.Operacional
    if req.status_operacional:
        try:
            op_status_enum = OperationalStatus(req.status_operacional)
        except ValueError:
            pass
    
    create_data = DomainInstituteCreate(
        nome=nome,
        isi_sigla=isi_sigla,
        endereco_rua=req.endereco_rua or "",
        endereco_bairro=req.endereco_bairro or "",
        endereco_cep=req.endereco_cep or "",
        endereco_cidade=req.endereco_cidade or "",
        endereco_uf=req.endereco_uf or "SP",
        descricao=descricao,
        nome_fantasia=req.nome_fantasia,
        endereco_numero=req.endereco_numero,
        endereco_complemento=req.endereco_complemento,
        status=status_enum,
        status_operacional=op_status_enum,
        logo_url=req.logo_url,
    )
    
    institute = await repo.create(UUID(tenant_id), create_data, user_id)
    
    # Add creator as admin member
    await membership_repo.create(
        tenant_id=UUID(tenant_id),
        user_id=user_id,
        institute_id=institute.id,
        role='admin',
        created_by=user_id,
    )
    
    await container.session.commit()
    
    return _institute_to_response(institute)


@router.patch("/{inst_id}", response_model=InstituteOut)
async def update_institute(
    inst_id: UUID,
    req: InstituteUpdate,
    tenant_id: str = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: InstituteRepository = Depends(get_institute_repository),
    container=Depends(get_di_container),
):
    """Update an institute. Requires admin role or membership."""
    # Check admin or membership
    is_admin = False
    try:
        r = await container.session.execute(
            sa.text("SELECT 1 FROM user_roles WHERE user_id = :user_id AND role_id = 'admin' LIMIT 1"),
            {'user_id': str(user_id)}
        )
        is_admin = r.scalar() is not None
    except Exception:
        pass
    
    if not is_admin:
        has_membership = await repo.check_user_membership(UUID(tenant_id), user_id, inst_id)
        if not has_membership:
            raise HTTPException(status_code=403, detail="User must be an admin or member to update institutes")
    
    # Build update data
    update_dict = {}
    
    # Handle legacy field mappings
    if req.nome is not None:
        update_dict['nome'] = req.nome
    elif req.name is not None:
        update_dict['nome'] = req.name
    
    if req.isi_sigla is not None:
        update_dict['isi_sigla'] = req.isi_sigla
    elif req.code is not None:
        update_dict['isi_sigla'] = req.code
    
    if req.descricao is not None:
        update_dict['descricao'] = req.descricao
    elif req.description is not None:
        update_dict['descricao'] = req.description
    
    # Direct new fields
    for field in ['nome_fantasia', 'endereco_rua', 'endereco_bairro', 'endereco_cep',
                  'endereco_cidade', 'endereco_uf', 'endereco_numero', 'endereco_complemento',
                  'logo_url']:
        val = getattr(req, field, None)
        if val is not None:
            update_dict[field] = val
    
    # Parse status enums
    if req.status is not None:
        try:
            update_dict['status'] = InstituteStatus(req.status)
        except ValueError:
            pass
    
    if req.status_operacional is not None:
        try:
            update_dict['status_operacional'] = OperationalStatus(req.status_operacional)
        except ValueError:
            pass
    
    if not update_dict:
        # No changes, return existing
        existing = await repo.get_by_id(UUID(tenant_id), inst_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Institute not found")
        return _institute_to_response(existing)
    
    update_data = DomainInstituteUpdate(**update_dict)
    institute = await repo.update(UUID(tenant_id), inst_id, update_data, user_id)
    
    if not institute:
        raise HTTPException(status_code=404, detail="Institute not found")
    
    await container.session.commit()
    
    return _institute_to_response(institute)


@router.delete("/{inst_id}", status_code=204)
async def delete_institute(
    inst_id: UUID,
    tenant_id: str = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: InstituteRepository = Depends(get_institute_repository),
    container=Depends(get_di_container),
):
    """Soft delete an institute. Requires admin role."""
    # Only admins may delete institutes
    try:
        r = await container.session.execute(
            sa.text("SELECT 1 FROM user_roles WHERE user_id = :user_id AND role_id = 'admin' LIMIT 1"),
            {'user_id': str(user_id)}
        )
        if r.scalar() is None:
            raise HTTPException(status_code=403, detail="User must be an admin to delete institutes")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=403, detail="User must be an admin to delete institutes")
    
    success = await repo.soft_delete(UUID(tenant_id), inst_id, user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Institute not found")
    
    await container.session.commit()
    
    return None


# ===========================================
# MEMBERSHIP ENDPOINTS
# ===========================================

@router.get("/{inst_id}/members", response_model=List[MembershipOut])
async def list_institute_members(
    inst_id: UUID,
    role: Optional[str] = Query(None, description="Filter by role"),
    search: Optional[str] = Query(None, description="Search by user name or email"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    tenant_id: str = Depends(get_current_tenant_id),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
):
    """List all members of an institute."""
    members = await membership_repo.list_by_institute(
        tenant_id=UUID(tenant_id),
        institute_id=inst_id,
        skip=skip,
        limit=limit,
        role=role,
        search=search,
    )
    
    return [
        MembershipOut(
            id=m.id,
            user_id=m.user_id,
            institute_id=m.institute_id,
            role=m.role or 'member',
            user_name=m.user_name,
            user_email=m.user_email,
        )
        for m in members
    ]


@router.post("/{inst_id}/members", response_model=MembershipOut, status_code=201)
async def add_institute_member(
    inst_id: UUID,
    user_id_to_add: UUID = Query(..., alias="user_id", description="User ID to add"),
    role: str = Query("member", description="Role: admin, member, viewer"),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user_id: UUID = Depends(get_current_user_id),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
    repo: InstituteRepository = Depends(get_institute_repository),
    container=Depends(get_di_container),
):
    """Add a user as member of an institute."""
    # Check if current user has admin rights or is member
    has_membership = await repo.check_user_membership(UUID(tenant_id), current_user_id, inst_id)
    if not has_membership:
        # Check if admin
        try:
            r = await container.session.execute(
                sa.text("SELECT 1 FROM user_roles WHERE user_id = :user_id AND role_id = 'admin' LIMIT 1"),
                {'user_id': str(current_user_id)}
            )
            if r.scalar() is None:
                raise HTTPException(status_code=403, detail="User must be an admin or member to add members")
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=403, detail="User must be an admin or member to add members")
    
    membership = await membership_repo.create(
        tenant_id=UUID(tenant_id),
        user_id=user_id_to_add,
        institute_id=inst_id,
        role=role,
        created_by=current_user_id,
    )
    
    await container.session.commit()
    
    return MembershipOut(
        id=membership.id,
        user_id=membership.user_id,
        institute_id=membership.institute_id,
        role=membership.role or 'member',
        user_name=membership.user_name,
        user_email=membership.user_email,
    )


@router.delete("/{inst_id}/members/{member_user_id}", status_code=204)
async def remove_institute_member(
    inst_id: UUID,
    member_user_id: UUID,
    tenant_id: str = Depends(get_current_tenant_id),
    current_user_id: UUID = Depends(get_current_user_id),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
    repo: InstituteRepository = Depends(get_institute_repository),
    container=Depends(get_di_container),
):
    """Remove a user from an institute."""
    # Check if current user has admin rights or is member
    has_membership = await repo.check_user_membership(UUID(tenant_id), current_user_id, inst_id)
    if not has_membership:
        # Check if admin
        try:
            r = await container.session.execute(
                sa.text("SELECT 1 FROM user_roles WHERE user_id = :user_id AND role_id = 'admin' LIMIT 1"),
                {'user_id': str(current_user_id)}
            )
            if r.scalar() is None:
                raise HTTPException(status_code=403, detail="User must be an admin or member to remove members")
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=403, detail="User must be an admin or member to remove members")
    
    success = await membership_repo.remove(
        tenant_id=UUID(tenant_id),
        user_id=member_user_id,
        institute_id=inst_id,
        removed_by=current_user_id,
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Membership not found")
    
    await container.session.commit()
    
    return None
