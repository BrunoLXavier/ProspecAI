"""Infrastructures API Routes
Provides CRUD for infrastructure items with repository pattern.
Implements RF-03: Portfólio Institucional
"""
from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from domain.entities.infrastructure import (
    Infrastructure,
    InfrastructureCreate as DomainInfrastructureCreate,
    InfrastructureUpdate as DomainInfrastructureUpdate,
    InfrastructureStatus
)
from adapters.repositories.infrastructure_repository import InfrastructureRepository
from adapters.repositories.institute_repository import InstituteRepository
from infrastructure.dependencies import get_di_container, get_current_tenant_id, get_current_user_id, ensure_user_member_or_admin, get_db_session, get_current_institute_ids
from services.institute_service import get_institute_service, InstituteService
from infrastructure.serializers import to_primitive
import sqlalchemy as sa

router = APIRouter(prefix="/api/v1/infrastructures", tags=["infrastructures"])


# ===========================================
# RESPONSE SCHEMAS (backward compatible)
# ===========================================

class InfrastructureOut(BaseModel):
    id: UUID
    name: str  # Legacy: maps to nome
    description: Optional[str] = None  # Legacy: maps to descricao
    institute_id: UUID  # Legacy: maps to instituto_id
    capacity: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    # New fields
    nome: Optional[str] = None
    descricao: Optional[str] = None
    instituto_id: Optional[UUID] = None
    email_laboratorio: Optional[str] = None
    email_responsavel: Optional[str] = None
    telefone: Optional[str] = None
    site_url: Optional[str] = None
    endereco_completo: Optional[str] = None
    area_predial_m2: Optional[float] = None
    status_isi: Optional[str] = None
    maturidade_regulatoria: Optional[float] = None
    maturidade_laboratorial: Optional[float] = None
    maturidade_gestao: Optional[str] = None
    plataformas_tecnologicas: List[str] = []
    areas_conhecimento: List[str] = []
    macroareas_pesquisa: List[str] = []
    midias: List[Dict[str, Any]] = []


class InfrastructureCreate(BaseModel):
    name: str  # Legacy: maps to nome
    description: Optional[str] = None  # Legacy: maps to descricao
    institute_id: UUID  # Legacy: maps to instituto_id
    capacity: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    # New fields
    nome: Optional[str] = None
    descricao: Optional[str] = None
    email_laboratorio: Optional[str] = None
    email_responsavel: Optional[str] = None
    telefone: Optional[str] = None
    site_url: Optional[str] = None
    endereco_completo: Optional[str] = None
    area_predial_m2: Optional[float] = None
    status_isi: Optional[str] = "Operacional"
    maturidade_regulatoria: Optional[float] = None
    maturidade_laboratorial: Optional[float] = None
    maturidade_gestao: Optional[str] = None
    plataformas_tecnologicas: Optional[List[str]] = None
    areas_conhecimento: Optional[List[str]] = None
    macroareas_pesquisa: Optional[List[str]] = None
    midias: Optional[List[Dict[str, Any]]] = None


class InfrastructureUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    capacity: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    nome: Optional[str] = None
    descricao: Optional[str] = None
    email_laboratorio: Optional[str] = None
    email_responsavel: Optional[str] = None
    telefone: Optional[str] = None
    site_url: Optional[str] = None
    endereco_completo: Optional[str] = None
    area_predial_m2: Optional[float] = None
    status_isi: Optional[str] = None
    maturidade_regulatoria: Optional[float] = None
    maturidade_laboratorial: Optional[float] = None
    maturidade_gestao: Optional[str] = None
    plataformas_tecnologicas: Optional[List[str]] = None
    areas_conhecimento: Optional[List[str]] = None
    macroareas_pesquisa: Optional[List[str]] = None
    midias: Optional[List[Dict[str, Any]]] = None


class InfrastructureStatsOut(BaseModel):
    total: int
    total_area_m2: float
    by_status: Dict[str, int]


# ===========================================
# HELPER FUNCTIONS
# ===========================================

async def get_infrastructure_repository(session=Depends(get_db_session)) -> InfrastructureRepository:
    return InfrastructureRepository(session)


async def get_institute_repository(session=Depends(get_db_session)) -> InstituteRepository:
    return InstituteRepository(session)


def _infrastructure_to_response(infra: Infrastructure) -> Dict[str, Any]:
    """Convert Infrastructure entity to response dict with legacy field compatibility."""
    return {
        'id': infra.id,
        'name': infra.nome,  # Legacy mapping
        'description': infra.descricao,  # Legacy mapping
        'institute_id': infra.instituto_id,  # Legacy mapping
        'capacity': {},
        'metadata': {},
        'nome': infra.nome,
        'descricao': infra.descricao,
        'instituto_id': infra.instituto_id,
        'email_laboratorio': infra.email_laboratorio,
        'email_responsavel': infra.email_responsavel,
        'telefone': infra.telefone,
        'site_url': infra.site_url,
        'endereco_completo': infra.endereco_completo,
        'area_predial_m2': infra.area_predial_m2,
        'status_isi': infra.status_isi.value if infra.status_isi else None,
        'maturidade_regulatoria': infra.maturidade_regulatoria,
        'maturidade_laboratorial': infra.maturidade_laboratorial,
        'maturidade_gestao': infra.maturidade_gestao,
        'plataformas_tecnologicas': infra.plataformas_tecnologicas or [],
        'areas_conhecimento': infra.areas_conhecimento or [],
        'macroareas_pesquisa': infra.macroareas_pesquisa or [],
        'midias': infra.midias or [],
    }


@router.get("", response_model=List[InfrastructureOut])
async def list_infrastructures(
    institute_id: Optional[str] = Query(None, description="Filter by institute ID"),
    status_isi: Optional[str] = Query(None, description="Filter by status: Operacional, EmImplantacao, Inativo"),
    search: Optional[str] = Query(None, description="Search in name and description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    tenant_id: str = Depends(get_current_tenant_id),
    institute_ids: List[UUID] = Depends(get_current_institute_ids),
    repo: InfrastructureRepository = Depends(get_infrastructure_repository),
):
    """List infrastructure items filtered by selected institutes."""
    status_enum = None
    if status_isi:
        try:
            status_enum = InfrastructureStatus(status_isi)
        except ValueError:
            pass
    
    if institute_id:
        # Single institute filter
        inst_uuid = UUID(institute_id)
        if institute_ids and inst_uuid not in institute_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this institute"
            )
        
        infrastructures = await repo.list_by_institute(
            tenant_id=UUID(tenant_id),
            institute_id=inst_uuid,
            skip=skip,
            limit=limit,
            status_isi=status_enum,
            search=search,
        )
    elif institute_ids:
        # Multiple institutes from header selection
        infrastructures = await repo.list_by_institutes(
            tenant_id=UUID(tenant_id),
            institute_ids=institute_ids,
            skip=skip,
            limit=limit,
            status_isi=status_enum,
            search=search,
        )
    else:
        # No filter - return all (legacy behavior)
        infrastructures = await repo.list_by_institutes(
            tenant_id=UUID(tenant_id),
            institute_ids=[],
            skip=skip,
            limit=limit,
        )
    
    return [_infrastructure_to_response(i) for i in infrastructures]


@router.get("/statistics", response_model=InfrastructureStatsOut)
async def get_infrastructure_statistics(
    tenant_id: str = Depends(get_current_tenant_id),
    institute_ids: List[UUID] = Depends(get_current_institute_ids),
    repo: InfrastructureRepository = Depends(get_infrastructure_repository),
):
    """Get aggregated statistics for infrastructures."""
    stats = await repo.get_statistics(UUID(tenant_id), institute_ids if institute_ids else None)
    return stats


@router.get("/{infra_id}", response_model=InfrastructureOut)
async def get_infrastructure(
    infra_id: UUID,
    tenant_id: str = Depends(get_current_tenant_id),
    repo: InfrastructureRepository = Depends(get_infrastructure_repository),
):
    """Get detailed information about an infrastructure item."""
    infrastructure = await repo.get_by_id(UUID(tenant_id), infra_id)
    
    if not infrastructure:
        raise HTTPException(status_code=404, detail="Infrastructure not found")
    
    return _infrastructure_to_response(infrastructure)


@router.post("", response_model=InfrastructureOut)
async def create_infrastructure(
    req: InfrastructureCreate,
    tenant_id: str = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: InfrastructureRepository = Depends(get_infrastructure_repository),
    institute_repo: InstituteRepository = Depends(get_institute_repository),
    container=Depends(get_di_container),
):
    """Create a new infrastructure item."""
    # Membership check
    has_membership = await institute_repo.check_user_membership(UUID(tenant_id), user_id, req.institute_id)
    if not has_membership:
        raise HTTPException(status_code=403, detail="User is not a member of the target institute")
    
    # Use new fields if provided, fallback to legacy
    nome = req.nome or req.name
    descricao = req.descricao or req.description or ""
    
    # Parse status enum
    status_enum = InfrastructureStatus.Operacional
    if req.status_isi:
        try:
            status_enum = InfrastructureStatus(req.status_isi)
        except ValueError:
            pass
    
    create_data = DomainInfrastructureCreate(
        instituto_id=req.institute_id,
        nome=nome,
        descricao=descricao,
        email_laboratorio=req.email_laboratorio,
        email_responsavel=req.email_responsavel,
        telefone=req.telefone,
        site_url=req.site_url,
        endereco_completo=req.endereco_completo,
        area_predial_m2=req.area_predial_m2,
        status_isi=status_enum,
        maturidade_regulatoria=req.maturidade_regulatoria,
        maturidade_laboratorial=req.maturidade_laboratorial,
        maturidade_gestao=req.maturidade_gestao,
        plataformas_tecnologicas=req.plataformas_tecnologicas,
        areas_conhecimento=req.areas_conhecimento,
        macroareas_pesquisa=req.macroareas_pesquisa,
        midias=req.midias,
    )
    
    infrastructure = await repo.create(UUID(tenant_id), create_data, user_id)
    await container.session.commit()
    
    return _infrastructure_to_response(infrastructure)


@router.patch("/{infra_id}", response_model=InfrastructureOut)
async def update_infrastructure(
    infra_id: UUID,
    req: InfrastructureUpdate,
    tenant_id: str = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: InfrastructureRepository = Depends(get_infrastructure_repository),
    institute_repo: InstituteRepository = Depends(get_institute_repository),
    container=Depends(get_di_container),
):
    """Update an infrastructure item."""
    # Get existing to find institute
    existing = await repo.get_by_id(UUID(tenant_id), infra_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Infrastructure not found")
    
    # Enforce membership
    has_membership = await institute_repo.check_user_membership(UUID(tenant_id), user_id, existing.instituto_id)
    if not has_membership:
        raise HTTPException(status_code=403, detail="User is not a member of the institute")
    
    # Build update data
    update_dict = {}
    
    # Handle legacy field mappings
    if req.nome is not None:
        update_dict['nome'] = req.nome
    elif req.name is not None:
        update_dict['nome'] = req.name
    
    if req.descricao is not None:
        update_dict['descricao'] = req.descricao
    elif req.description is not None:
        update_dict['descricao'] = req.description
    
    # Parse status enum
    if req.status_isi is not None:
        try:
            update_dict['status_isi'] = InfrastructureStatus(req.status_isi)
        except ValueError:
            pass
    
    # Direct new fields
    for field in ['email_laboratorio', 'email_responsavel', 'telefone', 'site_url',
                  'endereco_completo', 'area_predial_m2', 'maturidade_regulatoria',
                  'maturidade_laboratorial', 'maturidade_gestao', 'plataformas_tecnologicas',
                  'areas_conhecimento', 'macroareas_pesquisa', 'midias']:
        val = getattr(req, field, None)
        if val is not None:
            update_dict[field] = val
    
    if not update_dict:
        return _infrastructure_to_response(existing)
    
    update_data = DomainInfrastructureUpdate(**update_dict)
    infrastructure = await repo.update(UUID(tenant_id), infra_id, update_data, user_id)
    
    if not infrastructure:
        raise HTTPException(status_code=404, detail="Infrastructure not found")
    
    await container.session.commit()
    
    return _infrastructure_to_response(infrastructure)


@router.delete("/{infra_id}", status_code=204)
async def delete_infrastructure(
    infra_id: UUID,
    tenant_id: str = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: InfrastructureRepository = Depends(get_infrastructure_repository),
    institute_repo: InstituteRepository = Depends(get_institute_repository),
    container=Depends(get_di_container),
):
    """Soft delete an infrastructure item."""
    # Get existing to find institute
    existing = await repo.get_by_id(UUID(tenant_id), infra_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Infrastructure not found")
    
    # Enforce membership
    has_membership = await institute_repo.check_user_membership(UUID(tenant_id), user_id, existing.instituto_id)
    if not has_membership:
        raise HTTPException(status_code=403, detail="User is not a member of the institute")
    
    success = await repo.soft_delete(UUID(tenant_id), infra_id, user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Infrastructure not found")
    
    await container.session.commit()
    
    return None
