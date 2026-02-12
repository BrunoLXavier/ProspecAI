"""
Portfolio Projects API Router
Implements RF-03: Portfólio Institucional - Portfolio Project Management
Clean Architecture - Infrastructure Layer
"""
from typing import List, Optional
from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status

from domain.schemas.portfolio_project_schemas import (
    PortfolioProjectResponse, PortfolioProjectStatsResponse,
    TRLEvolutionResponse, PortfolioProjectCreateRequest,
    PortfolioProjectUpdateRequest,
)
from domain.entities.portfolio_project import (
    PortfolioProject,
    PortfolioProjectCreate,
    PortfolioProjectUpdate,
    PortfolioProjectStatus,
    SolutionCategory,
    CompanyType,
    TRLLevel
)
from adapters.repositories.portfolio_project_repository import PortfolioProjectRepository
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

async def get_portfolio_repository(session=Depends(get_db_session)) -> PortfolioProjectRepository:
    return PortfolioProjectRepository(session)


async def get_institute_repository(session=Depends(get_db_session)) -> InstituteRepository:
    return InstituteRepository(session)


def parse_trl(value: Optional[str]) -> Optional[TRLLevel]:
    """Parse TRL string to enum."""
    if not value:
        return None
    try:
        return TRLLevel(value)
    except ValueError:
        # Try parsing as number
        if value.isdigit():
            return TRLLevel(f"TRL{value}")
        return None


def parse_status(value: Optional[str]) -> Optional[PortfolioProjectStatus]:
    """Parse status string to enum."""
    if not value:
        return None
    try:
        return PortfolioProjectStatus(value)
    except ValueError:
        return None


def parse_category(value: Optional[str]) -> Optional[SolutionCategory]:
    """Parse category string to enum."""
    if not value:
        return None
    try:
        return SolutionCategory(value)
    except ValueError:
        return None


def parse_company_type(value: Optional[str]) -> Optional[CompanyType]:
    """Parse company type string to enum."""
    if not value:
        return None
    try:
        return CompanyType(value)
    except ValueError:
        return None


# ===========================================
# PORTFOLIO PROJECT ENDPOINTS
# ===========================================

@router.get("", response_model=List[PortfolioProjectResponse])
async def list_portfolio_projects(
    instituto_id: Optional[str] = Query(None, description="Filter by institute ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    trl_entrada: Optional[str] = Query(None, description="Filter by TRL entrada"),
    trl_saida: Optional[str] = Query(None, description="Filter by TRL saída"),
    categoria: Optional[str] = Query(None, description="Filter by solution category"),
    search: Optional[str] = Query(None, description="Search in name, description, company"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    tenant_id: UUID = Depends(get_tenant_id),
    institute_ids: List[UUID] = Depends(get_current_institute_ids),
    repo: PortfolioProjectRepository = Depends(get_portfolio_repository),
):
    """
    List portfolio projects filtered by selected institutes.
    
    If instituto_id is provided, filters to that institute only.
    Otherwise, returns projects from all selected institutes in header.
    
    Implements RF-03: Portfólio Institucional
    """
    status_enum = parse_status(status)
    trl_entrada_enum = parse_trl(trl_entrada)
    trl_saida_enum = parse_trl(trl_saida)
    categoria_enum = parse_category(categoria)
    
    if instituto_id:
        # Single institute filter
        inst_uuid = UUID(instituto_id)
        if inst_uuid not in institute_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to this institute"
            )
        
        projects = await repo.list_by_institute(
            tenant_id=tenant_id,
            institute_id=inst_uuid,
            skip=skip,
            limit=limit,
            status=status_enum,
            trl_entrada=trl_entrada_enum,
            trl_saida=trl_saida_enum,
            categoria=categoria_enum,
            search=search,
        )
    else:
        # Multiple institutes from header selection
        projects = await repo.list_by_institutes(
            tenant_id=tenant_id,
            institute_ids=institute_ids,
            skip=skip,
            limit=limit,
            status=status_enum,
            search=search,
        )
    
    return [to_primitive(p) for p in projects]


@router.get("/statistics", response_model=PortfolioProjectStatsResponse)
async def get_portfolio_statistics(
    tenant_id: UUID = Depends(get_tenant_id),
    institute_ids: List[UUID] = Depends(get_current_institute_ids),
    repo: PortfolioProjectRepository = Depends(get_portfolio_repository),
):
    """Get aggregated statistics for portfolio projects in selected institutes."""
    stats = await repo.get_statistics(tenant_id, institute_ids)
    return stats


@router.get("/trl-evolution", response_model=List[TRLEvolutionResponse])
async def get_trl_evolution(
    tenant_id: UUID = Depends(get_tenant_id),
    institute_ids: List[UUID] = Depends(get_current_institute_ids),
    repo: PortfolioProjectRepository = Depends(get_portfolio_repository),
):
    """Get TRL evolution data for projects in selected institutes."""
    evolution = await repo.get_trl_evolution(tenant_id, institute_ids)
    return [TRLEvolutionResponse(**e) for e in evolution]


@router.get("/{project_id}", response_model=PortfolioProjectResponse)
async def get_portfolio_project(
    project_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    repo: PortfolioProjectRepository = Depends(get_portfolio_repository),
):
    """Get detailed information about a portfolio project."""
    project = await repo.get_by_id(tenant_id, project_id)
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Portfolio project {project_id} not found"
        )
    
    return to_primitive(project)


@router.post("", response_model=PortfolioProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_portfolio_project(
    data: PortfolioProjectCreateRequest,
    tenant_id: UUID = Depends(get_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: PortfolioProjectRepository = Depends(get_portfolio_repository),
    institute_repo: InstituteRepository = Depends(get_institute_repository),
):
    """
    Create a new portfolio project.
    
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
    
    project_create = PortfolioProjectCreate(
        instituto_id=institute_id,
        nome=data.nome,
        descricao=data.descricao,
        status=parse_status(data.status),
        trl_entrada=parse_trl(data.trl_entrada),
        trl_saida=parse_trl(data.trl_saida),
        categoria_solucao_resultante=parse_category(data.categoria_solucao_resultante),
        modalidade_fomento=data.modalidade_fomento,
        edital_fomento=data.edital_fomento,
        empresa_atendida_nome=data.empresa_atendida_nome,
        empresa_atendida_cnpj=data.empresa_atendida_cnpj,
        empresa_atendida_tipo=parse_company_type(data.empresa_atendida_tipo),
        empresa_atendida_cidade=data.empresa_atendida_cidade,
        empresa_atendida_uf=data.empresa_atendida_uf,
        empresa_atendida_pais=data.empresa_atendida_pais,
        data_inicio=data.data_inicio,
        data_fim=data.data_fim,
        valor_total=data.valor_total,
        parceiros=data.parceiros,
        equipe_ids=[UUID(eid) for eid in data.equipe_ids] if data.equipe_ids else None,
        infraestrutura_ids=[UUID(iid) for iid in data.infraestrutura_ids] if data.infraestrutura_ids else None,
        tematicas=data.tematicas,
        plataformas_tecnologicas=data.plataformas_tecnologicas,
        areas_conhecimento=data.areas_conhecimento,
        midias=data.midias,
        indicadores=data.indicadores,
        licoes_aprendidas=data.licoes_aprendidas,
    )
    
    project = await repo.create(tenant_id, project_create, user_id)
    return to_primitive(project)


@router.put("/{project_id}", response_model=PortfolioProjectResponse)
async def update_portfolio_project(
    project_id: UUID,
    data: PortfolioProjectUpdateRequest,
    tenant_id: UUID = Depends(get_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: PortfolioProjectRepository = Depends(get_portfolio_repository),
    institute_repo: InstituteRepository = Depends(get_institute_repository),
):
    """
    Update a portfolio project.
    
    Requires membership in the institute.
    """
    # First get the project to find the institute
    existing = await repo.get_by_id(tenant_id, project_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Portfolio project {project_id} not found"
        )
    
    # Validate access
    has_membership = await institute_repo.check_user_membership(tenant_id, user_id, existing.instituto_id)
    if not has_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this institute"
        )
    
    # Build update object
    update_data = data.model_dump(exclude_unset=True)
    
    # Convert string values to enums
    if 'status' in update_data:
        update_data['status'] = parse_status(update_data['status'])
    if 'trl_entrada' in update_data:
        update_data['trl_entrada'] = parse_trl(update_data['trl_entrada'])
    if 'trl_saida' in update_data:
        update_data['trl_saida'] = parse_trl(update_data['trl_saida'])
    if 'categoria_solucao_resultante' in update_data:
        update_data['categoria_solucao_resultante'] = parse_category(update_data['categoria_solucao_resultante'])
    if 'empresa_atendida_tipo' in update_data:
        update_data['empresa_atendida_tipo'] = parse_company_type(update_data['empresa_atendida_tipo'])
    if 'equipe_ids' in update_data and update_data['equipe_ids']:
        update_data['equipe_ids'] = [UUID(eid) for eid in update_data['equipe_ids']]
    if 'infraestrutura_ids' in update_data and update_data['infraestrutura_ids']:
        update_data['infraestrutura_ids'] = [UUID(iid) for iid in update_data['infraestrutura_ids']]
    
    project_update = PortfolioProjectUpdate(**update_data)
    project = await repo.update(tenant_id, project_id, project_update, user_id)
    
    return to_primitive(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_portfolio_project(
    project_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    repo: PortfolioProjectRepository = Depends(get_portfolio_repository),
    institute_repo: InstituteRepository = Depends(get_institute_repository),
):
    """
    Soft delete a portfolio project.
    
    Sets status to Cancelado and deleted_at timestamp.
    Requires membership in the institute.
    """
    # First get the project to find the institute
    existing = await repo.get_by_id(tenant_id, project_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Portfolio project {project_id} not found"
        )
    
    # Validate access
    has_membership = await institute_repo.check_user_membership(tenant_id, user_id, existing.instituto_id)
    if not has_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this institute"
        )
    
    success = await repo.soft_delete(tenant_id, project_id, user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Portfolio project {project_id} not found"
        )
    
    return None
