"""
Teams (Equipe) API Router
Implements RF-03: Portfólio Institucional - Team Management
Clean Architecture - Infrastructure Layer
"""
from typing import List, Optional
from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, EmailStr

from domain.entities.team import Team, TeamCreate, TeamUpdate
from adapters.repositories.team_repository import TeamRepository
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
# RESPONSE SCHEMAS
# ===========================================

class TeamResponse(BaseModel):
    id: str
    tenant_id: str
    usuario_id: str
    instituto_id: str
    cargo: str
    funcao_principal: str
    vinculo_principal: bool = False
    email_profissional: Optional[str] = None
    telefone_celular: Optional[str] = None
    linkedin_url: Optional[str] = None
    lattes_url: Optional[str] = None
    orcid_id: Optional[str] = None
    researchgate_url: Optional[str] = None
    scopus_author_id: Optional[str] = None
    web_of_science_researcher_id: Optional[str] = None
    foto_perfil_url: Optional[str] = None
    data_vinculo_inicio: Optional[str] = None
    data_vinculo_fim: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class TeamStatsResponse(BaseModel):
    total: int
    primary_links: int
    distinct_users: int


class TeamCreateRequest(BaseModel):
    usuario_id: str
    instituto_id: str
    cargo: str
    funcao_principal: str
    vinculo_principal: bool = False
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


class TeamUpdateRequest(BaseModel):
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


# ===========================================
# HELPER FUNCTIONS
# ===========================================

async def get_team_repository(session=Depends(get_db_session)) -> TeamRepository:
    return TeamRepository(session)


async def get_institute_repository(session=Depends(get_db_session)) -> InstituteRepository:
    return InstituteRepository(session)


async def validate_institute_access(
    institute_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    institute_repo: InstituteRepository = Depends(get_institute_repository),
) -> bool:
    """Validate that current user has access to the institute."""
    has_membership = await institute_repo.check_user_membership(tenant_id, user_id, institute_id)
    if not has_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this institute"
        )
    return True


# ===========================================
# TEAM ENDPOINTS
# ===========================================

@router.get("", response_model=List[TeamResponse])
async def list_teams(
    instituto_id: Optional[str] = Query(None, description="Filter by institute ID"),
    cargo: Optional[str] = Query(None, description="Filter by cargo (role)"),
    vinculo_principal: Optional[bool] = Query(None, description="Filter by primary link"),
    search: Optional[str] = Query(None, description="Search in cargo, funcao, email"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    tenant_id: UUID = Depends(get_tenant_id),
    institute_ids: List[UUID] = Depends(get_current_institute_ids),
    repo: TeamRepository = Depends(get_team_repository),
):
    """
    List team members filtered by selected institutes.
    
    If instituto_id is provided, filters to that institute only.
    Otherwise, returns team members from all selected institutes in header.
    
    Implements RF-03: Portfólio Institucional
    """
    if instituto_id:
        # Single institute filter
        inst_uuid = UUID(instituto_id)
        if inst_uuid not in institute_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this institute"
            )
        
        teams = await repo.list_by_institute(
            tenant_id=tenant_id,
            institute_id=inst_uuid,
            skip=skip,
            limit=limit,
            cargo=cargo,
            vinculo_principal=vinculo_principal,
            search=search,
        )
    else:
        # Multiple institutes from header selection
        teams = await repo.list_by_institutes(
            tenant_id=tenant_id,
            institute_ids=institute_ids,
            skip=skip,
            limit=limit,
        )
    
    return [to_primitive(t) for t in teams]


@router.get("/by-user/{user_id}", response_model=List[TeamResponse])
async def list_teams_by_user(
    user_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    repo: TeamRepository = Depends(get_team_repository),
):
    """List all team links for a specific user."""
    teams = await repo.list_by_user(tenant_id, user_id)
    return [to_primitive(t) for t in teams]


@router.get("/statistics", response_model=TeamStatsResponse)
async def get_team_statistics(
    tenant_id: UUID = Depends(get_tenant_id),
    institute_ids: List[UUID] = Depends(get_current_institute_ids),
    repo: TeamRepository = Depends(get_team_repository),
):
    """Get aggregated statistics for team members in selected institutes."""
    stats = await repo.get_statistics(tenant_id, institute_ids)
    return stats


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    repo: TeamRepository = Depends(get_team_repository),
):
    """Get detailed information about a team member link."""
    team = await repo.get_by_id(tenant_id, team_id)
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team member link {team_id} not found"
        )
    
    return to_primitive(team)


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    data: TeamCreateRequest,
    tenant_id: UUID = Depends(get_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: TeamRepository = Depends(get_team_repository),
    institute_repo: InstituteRepository = Depends(get_institute_repository),
):
    """
    Create a new team member link.
    
    Links a user to an institute with a specific role.
    Also creates user_institutes membership if not exists.
    
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
    
    team_create = TeamCreate(
        usuario_id=UUID(data.usuario_id),
        instituto_id=institute_id,
        cargo=data.cargo,
        funcao_principal=data.funcao_principal,
        vinculo_principal=data.vinculo_principal,
        email_profissional=data.email_profissional,
        telefone_celular=data.telefone_celular,
        linkedin_url=data.linkedin_url,
        lattes_url=data.lattes_url,
        orcid_id=data.orcid_id,
        researchgate_url=data.researchgate_url,
        scopus_author_id=data.scopus_author_id,
        web_of_science_researcher_id=data.web_of_science_researcher_id,
        foto_perfil_url=data.foto_perfil_url,
        data_vinculo_inicio=data.data_vinculo_inicio,
        data_vinculo_fim=data.data_vinculo_fim,
    )
    
    team = await repo.create(tenant_id, team_create, user_id)
    return to_primitive(team)


@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: UUID,
    data: TeamUpdateRequest,
    tenant_id: UUID = Depends(get_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: TeamRepository = Depends(get_team_repository),
    institute_repo: InstituteRepository = Depends(get_institute_repository),
):
    """
    Update a team member link.
    
    Requires membership in the institute.
    """
    # First get the team to find the institute
    existing = await repo.get_by_id(tenant_id, team_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team member link {team_id} not found"
        )
    
    # Validate access
    has_membership = await institute_repo.check_user_membership(tenant_id, user_id, existing.instituto_id)
    if not has_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this institute"
        )
    
    team_update = TeamUpdate(**data.model_dump(exclude_unset=True))
    team = await repo.update(tenant_id, team_id, team_update, user_id)
    
    return to_primitive(team)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: TeamRepository = Depends(get_team_repository),
    institute_repo: InstituteRepository = Depends(get_institute_repository),
):
    """
    Soft delete a team member link.
    
    Requires membership in the institute.
    """
    # First get the team to find the institute
    existing = await repo.get_by_id(tenant_id, team_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team member link {team_id} not found"
        )
    
    # Validate access
    has_membership = await institute_repo.check_user_membership(tenant_id, user_id, existing.instituto_id)
    if not has_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this institute"
        )
    
    success = await repo.soft_delete(tenant_id, team_id, user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team member link {team_id} not found"
        )
    
    return None
