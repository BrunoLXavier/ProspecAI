"""
Portfolio API Router
Implements RF-03: Gestão de Portfólio Institucional
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from datetime import date

from domain.entities.portfolio import Project, Portfolio, ProjectStatus
from use_cases.manage_portfolio import ManagePortfolioUseCase
from infrastructure.dependencies import get_portfolio_use_case
from infrastructure.serializers import to_primitive

router = APIRouter()


# Request/Response Schemas
class ProjectCreate(BaseModel):
    title: str
    description: str
    research_area: str
    current_trl: int
    start_date: date
    end_date: date
    budget: float
    objectives: List[str]
    methodology: str
    expected_results: List[str]


class ProjectUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    current_trl: int | None = None
    budget: float | None = None
    lessons_learned: List[str] | None = None


class TRLAdvancement(BaseModel):
    new_trl: int
    evidence: str
    date_achieved: date


class ProjectResponse(BaseModel):
    id: str
    title: str
    description: str
    research_area: str
    current_trl: int
    status: str
    start_date: date
    end_date: date
    budget: float
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class PortfolioStatsResponse(BaseModel):
    total_projects: int
    active_projects: int
    total_budget: float
    average_trl: float
    projects_by_status: dict
    projects_by_trl: dict


@router.get("/projects", response_model=List[ProjectResponse])
async def list_projects(
    status: Optional[str] = Query(
        None,
        description="Filter by project status: active, completed, suspended, cancelled"
    ),
    research_area: Optional[str] = Query(
        None,
        description="Filter by research area"
    ),
    trl_min: Optional[int] = Query(
        None,
        ge=1,
        le=9,
        description="Filter projects with current_trl >= this value"
    ),
    trl_max: Optional[int] = Query(
        None,
        ge=1,
        le=9,
        description="Filter projects with current_trl <= this value"
    ),
    min_budget: Optional[float] = Query(
        None,
        ge=0,
        description="Filter projects with budget >= this value"
    ),
    max_budget: Optional[float] = Query(
        None,
        ge=0,
        description="Filter projects with budget <= this value"
    ),
    start_after: Optional[date] = Query(
        None,
        description="Filter projects that start after this date"
    ),
    end_before: Optional[date] = Query(
        None,
        description="Filter projects that end before this date"
    ),
    search: Optional[str] = Query(
        None,
        description="Search in title, description, and research area"
    ),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=200, description="Maximum items to return"),
    use_case: ManagePortfolioUseCase = Depends(get_portfolio_use_case),
):
    """
    List all projects in the portfolio with advanced filters
    
    Implements RF-03.01: Visualização do portfólio
    
    Filters:
    - status: Filter by project status
    - research_area: Filter by research area
    - trl_min/trl_max: Filter by TRL level range
    - min_budget/max_budget: Filter by budget range
    - start_after/end_before: Filter by date range
    - search: Full-text search in title, description, and research area
    """
    projects = await use_case.list_projects(
        status=status,
        research_area=research_area,
        trl_min=trl_min,
        trl_max=trl_max,
        min_budget=min_budget,
        max_budget=max_budget,
        start_after=start_after,
        end_before=end_before,
        search=search,
        skip=skip,
        limit=limit
    )
    return [to_primitive(p) for p in projects]


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    use_case: ManagePortfolioUseCase = Depends(get_portfolio_use_case),
):
    """
    Get detailed information about a specific project
    
    Implements RF-03.02: Detalhamento de projetos
    """
    project = await use_case.get_project(project_id)
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found"
        )
    
    return to_primitive(project)


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    use_case: ManagePortfolioUseCase = Depends(get_portfolio_use_case),
):
    """
    Create a new project in the portfolio
    
    Implements RF-03.03: Criação de projetos
    """
    project = await use_case.create_project(
        title=data.title,
        description=data.description,
        research_area=data.research_area,
        current_trl=data.current_trl,
        start_date=data.start_date,
        end_date=data.end_date,
        budget=data.budget,
        objectives=data.objectives,
        methodology=data.methodology,
        expected_results=data.expected_results,
    )
    
    return to_primitive(project)


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    use_case: ManagePortfolioUseCase = Depends(get_portfolio_use_case),
):
    """
    Update an existing project
    
    Implements RF-03.04: Atualização de projetos
    """
    project = await use_case.update_project(
        project_id=project_id,
        **data.model_dump(exclude_unset=True)
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found"
        )
    
    return to_primitive(project)


@router.post("/projects/{project_id}/trl-advancement", response_model=ProjectResponse)
async def advance_trl(
    project_id: str,
    data: TRLAdvancement,
    use_case: ManagePortfolioUseCase = Depends(get_portfolio_use_case),
):
    """
    Advance project TRL with evidence tracking
    
    Implements RF-03.05: Acompanhamento de evolução TRL
    """
    project = await use_case.advance_trl(
        project_id=project_id,
        new_trl=data.new_trl,
        evidence=data.evidence,
        date_achieved=data.date_achieved,
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found"
        )
    
    return to_primitive(project)


@router.get("/stats", response_model=PortfolioStatsResponse)
async def get_portfolio_statistics(
    use_case: ManagePortfolioUseCase = Depends(get_portfolio_use_case),
):
    """
    Get portfolio statistics and metrics
    
    Implements RF-03.06: Estatísticas do portfólio
    """
    stats = await use_case.get_portfolio_statistics()
    return to_primitive(stats)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    use_case: ManagePortfolioUseCase = Depends(get_portfolio_use_case),
):
    """
    Soft delete a project
    
    Implements RF-03.07: Exclusão lógica de projetos
    """
    success = await use_case.delete_project(project_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found"
        )
