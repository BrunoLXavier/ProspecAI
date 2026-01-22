"""Teams API Routes
Provides CRUD for teams (Equipe) with repository pattern.
Implements RF-03: Portfólio Institucional
"""
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from domain.entities.team import Team, TeamCreate as DomainTeamCreate, TeamUpdate as DomainTeamUpdate
from adapters.repositories.team_repository import TeamRepository
from adapters.repositories.institute_repository import InstituteRepository
from infrastructure.dependencies import get_di_container, get_current_tenant_id, get_current_user_id, ensure_user_member_or_admin, get_db_session, get_current_institute_ids
from services.institute_service import get_institute_service, InstituteService
from infrastructure.serializers import to_primitive
import sqlalchemy as sa

router = APIRouter(prefix="/api/v1/teams", tags=["teams"])


# ===========================================
# RESPONSE SCHEMAS (backward compatible)
# ===========================================

class TeamOut(BaseModel):
    id: UUID
    name: str  # Legacy: maps to cargo
    description: Optional[str] = None  # Legacy: maps to funcao_principal
    institute_id: UUID  # Legacy: maps to instituto_id
    member_ids: List[UUID] = []
    metadata: Optional[Dict[str, Any]] = None
    # New fields
    usuario_id: Optional[UUID] = None
    instituto_id: Optional[UUID] = None
    cargo: Optional[str] = None
    funcao_principal: Optional[str] = None
    vinculo_principal: Optional[bool] = None
    email_profissional: Optional[str] = None
    telefone_celular: Optional[str] = None
    linkedin_url: Optional[str] = None
    lattes_url: Optional[str] = None
    orcid_id: Optional[str] = None
    data_vinculo_inicio: Optional[str] = None
    data_vinculo_fim: Optional[str] = None


class TeamCreate(BaseModel):
    name: str  # Legacy: maps to cargo
    description: Optional[str] = None  # Legacy: maps to funcao_principal
    institute_id: UUID  # Legacy: maps to instituto_id
    member_ids: Optional[List[UUID]] = None
    metadata: Optional[Dict[str, Any]] = None
    # New fields
    usuario_id: Optional[UUID] = None
    cargo: Optional[str] = None
    funcao_principal: Optional[str] = None
    vinculo_principal: Optional[bool] = False
    email_profissional: Optional[str] = None
    telefone_celular: Optional[str] = None
    linkedin_url: Optional[str] = None
    lattes_url: Optional[str] = None
    orcid_id: Optional[str] = None
    researchgate_url: Optional[str] = None
    scopus_author_id: Optional[str] = None
    web_of_science_researcher_id: Optional[str] = None
    foto_perfil_url: Optional[str] = None
    data_vinculo_inicio: Optional[date] = None
    data_vinculo_fim: Optional[date] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    member_ids: Optional[List[UUID]] = None
    metadata: Optional[Dict[str, Any]] = None
    cargo: Optional[str] = None
    funcao_principal: Optional[str] = None
    vinculo_principal: Optional[bool] = None
    email_profissional: Optional[str] = None
    telefone_celular: Optional[str] = None
    linkedin_url: Optional[str] = None
    lattes_url: Optional[str] = None
    orcid_id: Optional[str] = None
    researchgate_url: Optional[str] = None
    scopus_author_id: Optional[str] = None
    web_of_science_researcher_id: Optional[str] = None
    foto_perfil_url: Optional[str] = None
    data_vinculo_inicio: Optional[date] = None
    data_vinculo_fim: Optional[date] = None


class TeamStatsOut(BaseModel):
    total: int
    primary_links: int
    distinct_users: int


# ===========================================
# HELPER FUNCTIONS
# ===========================================

async def get_team_repository(session=Depends(get_db_session)) -> TeamRepository:
    return TeamRepository(session)


async def get_institute_repository(session=Depends(get_db_session)) -> InstituteRepository:
    return InstituteRepository(session)


def _team_to_response(team: Team) -> Dict[str, Any]:
    """Convert Team entity to response dict with legacy field compatibility."""
    return {
        'id': team.id,
        'name': team.cargo,  # Legacy mapping
        'description': team.funcao_principal,  # Legacy mapping
        'institute_id': team.instituto_id,  # Legacy mapping
        'member_ids': [],
        'metadata': {},
        'usuario_id': team.usuario_id,
        'instituto_id': team.instituto_id,
        'cargo': team.cargo,
        'funcao_principal': team.funcao_principal,
        'vinculo_principal': team.vinculo_principal,
        'email_profissional': team.email_profissional,
        'telefone_celular': team.telefone_celular,
        'linkedin_url': team.linkedin_url,
        'lattes_url': team.lattes_url,
        'orcid_id': team.orcid_id,
        'data_vinculo_inicio': team.data_vinculo_inicio.isoformat() if team.data_vinculo_inicio else None,
        'data_vinculo_fim': team.data_vinculo_fim.isoformat() if team.data_vinculo_fim else None,
    }


@router.get("", response_model=List[TeamOut])
async def list_teams(
    institute_id: Optional[str] = Query(None, description="Filter by institute ID"),
    cargo: Optional[str] = Query(None, description="Filter by cargo"),
    vinculo_principal: Optional[bool] = Query(None, description="Filter by primary link"),
    search: Optional[str] = Query(None, description="Search in cargo, funcao, email"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    tenant_id: str = Depends(get_current_tenant_id),
    institute_ids: List[UUID] = Depends(get_current_institute_ids),
    repo: TeamRepository = Depends(get_team_repository),
):
    """List team members filtered by selected institutes."""
    if institute_id:
        # Single institute filter
        inst_uuid = UUID(institute_id)
        if institute_ids and inst_uuid not in institute_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this institute"
            )
        
        teams = await repo.list_by_institute(
            tenant_id=UUID(tenant_id),
            institute_id=inst_uuid,
            skip=skip,
            limit=limit,
            cargo=cargo,
            vinculo_principal=vinculo_principal,
            search=search,
        )
    elif institute_ids:
        # Multiple institutes from header selection
        teams = await repo.list_by_institutes(
            tenant_id=UUID(tenant_id),
            institute_ids=institute_ids,
            skip=skip,
            limit=limit,
        )
    else:
        # No filter - return all (legacy behavior)
        teams = await repo.list_by_institutes(
            tenant_id=UUID(tenant_id),
            institute_ids=[],
            skip=skip,
            limit=limit,
        )
    
    return [_team_to_response(t) for t in teams]


@router.get("/by-user/{user_id}", response_model=List[TeamOut])
async def list_teams_by_user(
    user_id: UUID,
    tenant_id: str = Depends(get_current_tenant_id),
    repo: TeamRepository = Depends(get_team_repository),
):
    """List all team links for a specific user."""
    teams = await repo.list_by_user(UUID(tenant_id), user_id)
    return [_team_to_response(t) for t in teams]


@router.get("/statistics", response_model=TeamStatsOut)
async def get_team_statistics(
    tenant_id: str = Depends(get_current_tenant_id),
    institute_ids: List[UUID] = Depends(get_current_institute_ids),
    repo: TeamRepository = Depends(get_team_repository),
):
    """Get aggregated statistics for team members."""
    stats = await repo.get_statistics(UUID(tenant_id), institute_ids if institute_ids else None)
    return stats


@router.get("/{team_id}", response_model=TeamOut)
async def get_team(
    team_id: UUID,
    tenant_id: str = Depends(get_current_tenant_id),
    repo: TeamRepository = Depends(get_team_repository),
):
    """Get detailed information about a team member link."""
    team = await repo.get_by_id(UUID(tenant_id), team_id)
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    return _team_to_response(team)


@router.post("", response_model=TeamOut)
async def create_team(
    req: TeamCreate,
    tenant_id: str = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: TeamRepository = Depends(get_team_repository),
    institute_repo: InstituteRepository = Depends(get_institute_repository),
    container=Depends(get_di_container),
):
    """Create a new team member link."""
    # Membership check
    has_membership = await institute_repo.check_user_membership(UUID(tenant_id), user_id, req.institute_id)
    if not has_membership:
        raise HTTPException(status_code=403, detail="User is not a member of the target institute")
    
    # Use new fields if provided, fallback to legacy
    cargo = req.cargo or req.name
    funcao_principal = req.funcao_principal or req.description or cargo
    usuario_id = req.usuario_id or user_id
    
    create_data = DomainTeamCreate(
        usuario_id=usuario_id,
        instituto_id=req.institute_id,
        cargo=cargo,
        funcao_principal=funcao_principal,
        vinculo_principal=req.vinculo_principal or False,
        email_profissional=req.email_profissional,
        telefone_celular=req.telefone_celular,
        linkedin_url=req.linkedin_url,
        lattes_url=req.lattes_url,
        orcid_id=req.orcid_id,
        researchgate_url=req.researchgate_url,
        scopus_author_id=req.scopus_author_id,
        web_of_science_researcher_id=req.web_of_science_researcher_id,
        foto_perfil_url=req.foto_perfil_url,
        data_vinculo_inicio=req.data_vinculo_inicio,
        data_vinculo_fim=req.data_vinculo_fim,
    )
    
    team = await repo.create(UUID(tenant_id), create_data, user_id)
    await container.session.commit()
    
    return _team_to_response(team)


@router.patch("/{team_id}", response_model=TeamOut)
async def update_team(
    team_id: UUID,
    req: TeamUpdate,
    tenant_id: str = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: TeamRepository = Depends(get_team_repository),
    institute_repo: InstituteRepository = Depends(get_institute_repository),
    container=Depends(get_di_container),
):
    """Update a team member link."""
    # Get existing to find institute
    existing = await repo.get_by_id(UUID(tenant_id), team_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Enforce membership
    has_membership = await institute_repo.check_user_membership(UUID(tenant_id), user_id, existing.instituto_id)
    if not has_membership:
        raise HTTPException(status_code=403, detail="User is not a member of the institute")
    
    # Build update data
    update_dict = {}
    
    # Handle legacy field mappings
    if req.cargo is not None:
        update_dict['cargo'] = req.cargo
    elif req.name is not None:
        update_dict['cargo'] = req.name
    
    if req.funcao_principal is not None:
        update_dict['funcao_principal'] = req.funcao_principal
    elif req.description is not None:
        update_dict['funcao_principal'] = req.description
    
    # Direct new fields
    for field in ['vinculo_principal', 'email_profissional', 'telefone_celular',
                  'linkedin_url', 'lattes_url', 'orcid_id', 'researchgate_url',
                  'scopus_author_id', 'web_of_science_researcher_id', 'foto_perfil_url',
                  'data_vinculo_inicio', 'data_vinculo_fim']:
        val = getattr(req, field, None)
        if val is not None:
            update_dict[field] = val
    
    if not update_dict:
        return _team_to_response(existing)
    
    update_data = DomainTeamUpdate(**update_dict)
    team = await repo.update(UUID(tenant_id), team_id, update_data, user_id)
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    await container.session.commit()
    
    return _team_to_response(team)


@router.delete("/{team_id}", status_code=204)
async def delete_team(
    team_id: UUID,
    tenant_id: str = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: TeamRepository = Depends(get_team_repository),
    institute_repo: InstituteRepository = Depends(get_institute_repository),
    container=Depends(get_di_container),
):
    """Soft delete a team member link."""
    # Get existing to find institute
    existing = await repo.get_by_id(UUID(tenant_id), team_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Enforce membership
    has_membership = await institute_repo.check_user_membership(UUID(tenant_id), user_id, existing.instituto_id)
    if not has_membership:
        raise HTTPException(status_code=403, detail="User is not a member of the institute")
    
    success = await repo.soft_delete(UUID(tenant_id), team_id, user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Team not found")
    
    await container.session.commit()
    
    return None
