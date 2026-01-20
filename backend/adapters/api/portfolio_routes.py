"""
Portfolio API Routes - Full Production Implementation
Implements RF-03: Portfólio institucional e lições aprendidas

Features:
- CRUD operations for projects and portfolios
- TRL tracking and advancement
- Lessons learned management
- Portfolio aggregation and statistics
"""
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field

from infrastructure.dependencies import get_di_container, get_current_user_id, get_current_tenant_id
from use_cases.manage_portfolio import ManagePortfolioUseCase
from domain.entities.portfolio import ProjectStatus
from infrastructure.serializers import to_primitive


router = APIRouter(prefix="/api/v1/portfolio", tags=["portfolio"])


# =============================================================================
# Request/Response Models
# =============================================================================

class ProjectCreateRequest(BaseModel):
    """Request model for creating a project"""
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    trl_current: int = Field(..., ge=1, le=9, description="Current TRL level (1-9)")
    trl_target: Optional[int] = Field(None, ge=1, le=9, description="Target TRL level")
    research_area: Optional[str] = None
    budget: Optional[float] = Field(None, ge=0)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    objectives: Optional[str] = None
    methodology: Optional[str] = None
    expected_results: Optional[str] = None
    competencies: List[str] = Field(default_factory=list)
    team_members: List[UUID] = Field(default_factory=list)


class ProjectUpdateRequest(BaseModel):
    """Request model for updating a project"""
    title: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    trl_target: Optional[int] = Field(None, ge=1, le=9)
    budget: Optional[float] = Field(None, ge=0)
    objectives: Optional[str] = None
    methodology: Optional[str] = None
    expected_results: Optional[str] = None
    competencies: Optional[List[str]] = None


class TRLAdvanceRequest(BaseModel):
    """Request model for advancing TRL"""
    new_trl: int = Field(..., ge=1, le=9)
    lesson_learned: Optional[Dict[str, str]] = Field(
        None, 
        description="Optional lesson learned from TRL advancement"
    )


class LessonLearnedRequest(BaseModel):
    """Request model for adding a lesson learned"""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    category: str = Field(..., description="Category: success, failure, improvement, trl_advancement")


class PortfolioCreateRequest(BaseModel):
    """Request model for creating a portfolio"""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    strategic_areas: List[str] = Field(default_factory=list)
    key_competencies: List[str] = Field(default_factory=list)


class PortfolioUpdateRequest(BaseModel):
    """Request model for updating a portfolio"""
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    strategic_areas: Optional[List[str]] = None
    key_competencies: Optional[List[str]] = None


class ProjectResponse(BaseModel):
    """Response model for project"""
    id: UUID
    title: str
    description: str
    status: str
    trl_current: int
    trl_target: Optional[int]
    research_area: Optional[str]
    budget: Optional[float]
    competencies: List[str]
    lessons_learned: List[Dict[str, str]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PortfolioResponse(BaseModel):
    """Response model for portfolio"""
    id: UUID
    name: str
    description: Optional[str]
    project_ids: List[UUID]
    strategic_areas: List[str]
    key_competencies: List[str]
    total_budget: Optional[float]
    active_projects_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StatisticsResponse(BaseModel):
    """Response model for portfolio statistics"""
    total_projects: int
    active_projects: int
    total_budget: float
    average_trl: float
    projects_by_status: Dict[str, int]
    projects_by_trl: Dict[str, int]


# =============================================================================
# Project Endpoints
# =============================================================================

@router.get("/projects", summary="List all projects", response_model=List[ProjectResponse])
async def list_projects(
    status: Optional[str] = Query(None, description="Filter by status"),
    research_area: Optional[str] = Query(None, description="Filter by research area"),
    trl_min: Optional[int] = Query(None, ge=1, le=9, description="Minimum TRL"),
    trl_max: Optional[int] = Query(None, ge=1, le=9, description="Maximum TRL"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    List projects with optional filters.
    Implements RF-03.01: Listagem de projetos
    """
    project_repo = container.project_repository
    
    projects = await project_repo.list(
        status=status,
        research_area=research_area,
        trl_min=trl_min,
        trl_max=trl_max,
        skip=skip,
        limit=limit,
    )
    
    # Use safe attribute access to avoid AttributeError when DB models differ
    result = []
    for p in projects:
        status_val = None
        if hasattr(p, 'status'):
            status_val = p.status.value if hasattr(p.status, 'value') else str(p.status)
        else:
            status_val = str(getattr(p, 'status', 'unknown'))

        trl_current_val = getattr(p, 'trl_current', getattr(p, 'current_trl', 1))

        budget_val = getattr(p, 'budget', None)
        try:
            budget_val = float(budget_val) if budget_val is not None else None
        except Exception:
            budget_val = None

        proj = ProjectResponse(
            id=getattr(p, 'id'),
            title=getattr(p, 'title', ''),
            description=getattr(p, 'description', ''),
            status=status_val,
            trl_current=trl_current_val,
            trl_target=getattr(p, 'trl_target', None),
            research_area=getattr(p, 'research_area', None),
            budget=budget_val,
            competencies=getattr(p, 'competencies', []) or [],
            lessons_learned=getattr(p, 'lessons_learned', []) or [],
            created_at=getattr(p, 'created_at', datetime.utcnow()),
            updated_at=getattr(p, 'updated_at', datetime.utcnow()),
        )
        result.append(proj)

    return to_primitive(result)


@router.post("/projects", summary="Create a new project", response_model=ProjectResponse, status_code=201)
async def create_project(
    request: ProjectCreateRequest,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Create a new project with TRL tracking.
    Implements RF-03.01: Criação de projeto
    """
    use_case: ManagePortfolioUseCase = container.get_manage_portfolio_use_case()
    
    project_data = {
        "title": request.title,
        "description": request.description,
        "trl_current": request.trl_current,
        "trl_target": request.trl_target,
        "research_area": request.research_area,
        "budget": request.budget,
        "start_date": request.start_date,
        "end_date": request.end_date,
        "objectives": request.objectives,
        "methodology": request.methodology,
        "expected_results": request.expected_results,
        "competencies": request.competencies,
        "team_members": request.team_members,
    }
    
    try:
        project = await use_case.create_project(
            project_data=project_data,
            tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
            user_id=user_id,
        )
        
        return ProjectResponse(
            id=project.id,
            title=project.title,
            description=project.description,
            status=project.status.value if hasattr(project.status, 'value') else str(project.status),
            trl_current=project.trl_current if hasattr(project, 'trl_current') else project.current_trl,
            trl_target=getattr(project, 'trl_target', None),
            research_area=getattr(project, 'research_area', None),
            budget=float(project.budget) if project.budget else None,
            competencies=project.competencies or [],
            lessons_learned=project.lessons_learned or [],
            created_at=project.created_at,
            updated_at=project.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/projects/{project_id}", summary="Get project by ID", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Get project details by ID.
    Implements RF-03.01: Visualização de projeto
    """
    project_repo = container.project_repository
    
    project = await project_repo.get_by_id(str(project_id))
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return ProjectResponse(
        id=project.id,
        title=project.title,
        description=project.description,
        status=project.status.value if hasattr(project.status, 'value') else str(project.status),
        trl_current=project.trl_current if hasattr(project, 'trl_current') else project.current_trl,
        trl_target=getattr(project, 'trl_target', None),
        research_area=getattr(project, 'research_area', None),
        budget=float(project.budget) if project.budget else None,
        competencies=project.competencies or [],
        lessons_learned=project.lessons_learned or [],
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.put("/projects/{project_id}", summary="Update project", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    request: ProjectUpdateRequest,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Update project metadata.
    Implements RF-03.01: Atualização de projeto
    """
    project_repo = container.project_repository
    
    project = await project_repo.get_by_id(str(project_id))
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update fields
    if request.title is not None:
        project.title = request.title
    if request.description is not None:
        project.description = request.description
    if request.status is not None:
        project.status = request.status
    if request.trl_target is not None:
        project.trl_target = request.trl_target
    if request.budget is not None:
        project.budget = request.budget
    if request.objectives is not None:
        project.objectives = request.objectives
    if request.methodology is not None:
        project.methodology = request.methodology
    if request.expected_results is not None:
        project.expected_results = request.expected_results
    if request.competencies is not None:
        project.competencies = request.competencies
    
    project.updated_by = user_id
    project.updated_at = datetime.utcnow()
    
    updated = await project_repo.update(project)
    
    return ProjectResponse(
        id=updated.id,
        title=updated.title,
        description=updated.description,
        status=updated.status.value if hasattr(updated.status, 'value') else str(updated.status),
        trl_current=updated.trl_current if hasattr(updated, 'trl_current') else updated.current_trl,
        trl_target=getattr(updated, 'trl_target', None),
        research_area=getattr(updated, 'research_area', None),
        budget=float(updated.budget) if updated.budget else None,
        competencies=updated.competencies or [],
        lessons_learned=updated.lessons_learned or [],
        created_at=updated.created_at,
        updated_at=updated.updated_at,
    )


@router.delete("/projects/{project_id}", summary="Delete project", status_code=204)
async def delete_project(
    project_id: UUID,
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Soft delete a project.
    Implements RF-03.01: Exclusão de projeto
    """
    project_repo = container.project_repository
    
    success = await project_repo.delete(str(project_id))
    
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return None


# =============================================================================
# TRL Management
# =============================================================================

@router.post("/projects/{project_id}/advance-trl", summary="Advance project TRL")
async def advance_trl(
    project_id: UUID,
    request: TRLAdvanceRequest,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Advance a project to a higher TRL level.
    Implements RF-03.02: Avanço de maturidade tecnológica
    """
    use_case: ManagePortfolioUseCase = container.get_manage_portfolio_use_case()
    
    try:
        project = await use_case.advance_project_trl(
            project_id=project_id,
            new_trl=request.new_trl,
            user_id=user_id,
            tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
            lesson_learned=request.lesson_learned,
        )
        
        return {
            "message": f"TRL advanced to {request.new_trl}",
            "project_id": str(project_id),
            "previous_trl": project.trl_current - 1 if hasattr(project, 'trl_current') else None,
            "current_trl": project.trl_current if hasattr(project, 'trl_current') else project.current_trl,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/projects/{project_id}/trl-history", summary="Get TRL history")
async def get_trl_history(
    project_id: UUID,
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Get TRL advancement history for a project.
    Implements RF-03.02: Histórico de TRL
    """
    project_repo = container.project_repository
    
    project = await project_repo.get_by_id(str(project_id))
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    trl_history = getattr(project, 'trl_history', []) or []
    
    return {
        "project_id": str(project_id),
        "current_trl": project.trl_current if hasattr(project, 'trl_current') else project.current_trl,
        "target_trl": getattr(project, 'trl_target', None),
        "history": trl_history,
    }


# =============================================================================
# Lessons Learned
# =============================================================================

@router.get("/projects/{project_id}/lessons", summary="List lessons learned")
async def list_lessons(
    project_id: UUID,
    category: Optional[str] = Query(None, description="Filter by category"),
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    List lessons learned for a project.
    Implements RF-03.03: Gestão de lições aprendidas
    """
    project_repo = container.project_repository
    
    project = await project_repo.get_by_id(str(project_id))
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    lessons = project.lessons_learned or []
    
    if category:
        lessons = [l for l in lessons if l.get("category") == category]
    
    return {
        "project_id": str(project_id),
        "count": len(lessons),
        "lessons": lessons,
    }


@router.post("/projects/{project_id}/lessons", summary="Add lesson learned", status_code=201)
async def add_lesson(
    project_id: UUID,
    request: LessonLearnedRequest,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Add a lesson learned to a project.
    Implements RF-03.03: Registro de lição aprendida
    """
    use_case: ManagePortfolioUseCase = container.get_manage_portfolio_use_case()
    
    try:
        project = await use_case.add_lesson_learned(
            project_id=project_id,
            title=request.title,
            description=request.description,
            category=request.category,
            user_id=user_id,
            tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
        )
        
        return {
            "message": "Lesson learned added",
            "project_id": str(project_id),
            "total_lessons": len(project.lessons_learned),
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =============================================================================
# Portfolio Endpoints
# =============================================================================

@router.get("/", summary="List all portfolios", response_model=List[PortfolioResponse])
async def list_portfolios(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    List all portfolios.
    Implements RF-03.04: Listagem de portfólios
    """
    # For now, return project statistics as a "default" portfolio
    project_repo = container.project_repository
    
    stats = await project_repo.get_statistics()
    
    return [
        PortfolioResponse(
            id=UUID("00000000-0000-0000-0000-000000000001"),
            name="Portfólio Institucional",
            description="Portfólio padrão com todos os projetos",
            project_ids=[],
            strategic_areas=["P&D", "Inovação", "Tecnologia"],
            key_competencies=[],
            total_budget=stats.get("total_budget", 0),
            active_projects_count=stats.get("active_projects", 0),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
    ]


@router.post("/", summary="Create a new portfolio", response_model=PortfolioResponse, status_code=201)
async def create_portfolio(
    request: PortfolioCreateRequest,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Create a new portfolio.
    Implements RF-03.04: Criação de portfólio
    """
    use_case: ManagePortfolioUseCase = container.get_manage_portfolio_use_case()
    
    portfolio_data = {
        "name": request.name,
        "description": request.description,
        "strategic_areas": request.strategic_areas,
        "key_competencies": request.key_competencies,
    }
    
    try:
        portfolio = await use_case.create_portfolio(
            portfolio_data=portfolio_data,
            tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
            user_id=user_id,
        )
        
        return PortfolioResponse(
            id=portfolio.id,
            name=portfolio.name,
            description=portfolio.description,
            project_ids=portfolio.project_ids or [],
            strategic_areas=portfolio.strategic_areas or [],
            key_competencies=portfolio.key_competencies or [],
            total_budget=portfolio.total_budget,
            active_projects_count=portfolio.active_projects_count,
            created_at=portfolio.created_at,
            updated_at=portfolio.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{portfolio_id}/projects/{project_id}", summary="Add project to portfolio")
async def add_project_to_portfolio(
    portfolio_id: UUID,
    project_id: UUID,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Add a project to a portfolio.
    Implements RF-03.04: Gestão de projetos em portfólio
    """
    use_case: ManagePortfolioUseCase = container.get_manage_portfolio_use_case()
    
    try:
        portfolio = await use_case.add_project_to_portfolio(
            portfolio_id=portfolio_id,
            project_id=project_id,
            user_id=user_id,
            tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
        )
        
        return {
            "message": "Project added to portfolio",
            "portfolio_id": str(portfolio_id),
            "project_id": str(project_id),
            "total_projects": len(portfolio.project_ids),
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =============================================================================
# Statistics
# =============================================================================

@router.get("/statistics", summary="Get portfolio statistics", response_model=StatisticsResponse)
async def get_statistics(
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Get aggregated portfolio statistics.
    Implements RF-03.05: Estatísticas de portfólio
    """
    project_repo = container.project_repository
    
    stats = await project_repo.get_statistics()
    
    # Get projects for status/TRL distribution
    projects = await project_repo.list(limit=1000)
    
    projects_by_status = {}
    projects_by_trl = {}
    
    for p in projects:
        status = p.status.value if hasattr(p.status, 'value') else str(p.status)
        projects_by_status[status] = projects_by_status.get(status, 0) + 1
        
        trl = p.trl_current if hasattr(p, 'trl_current') else getattr(p, 'current_trl', 1)
        trl_key = f"TRL {trl}"
        projects_by_trl[trl_key] = projects_by_trl.get(trl_key, 0) + 1
    
    return StatisticsResponse(
        total_projects=stats.get("total_projects", 0),
        active_projects=stats.get("active_projects", 0),
        total_budget=stats.get("total_budget", 0),
        average_trl=stats.get("average_trl", 0),
        projects_by_status=projects_by_status,
        projects_by_trl=projects_by_trl,
    )


# =============================================================================
# Search and Export
# =============================================================================

@router.get("/search", summary="Search projects and lessons")
async def search_portfolio(
    q: str = Query(..., min_length=2, description="Search query"),
    include_lessons: bool = Query(True, description="Include lessons learned in search"),
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Search across projects and lessons learned.
    Implements RF-03.06: Busca em portfólio
    """
    project_repo = container.project_repository
    
    # Get all projects
    projects = await project_repo.list(limit=1000)
    
    results = {
        "projects": [],
        "lessons": [],
    }
    
    q_lower = q.lower()
    
    for p in projects:
        # Search in project fields
        if (q_lower in p.title.lower() or 
            q_lower in p.description.lower() or
            any(q_lower in c.lower() for c in (p.competencies or []))):
            results["projects"].append({
                "id": str(p.id),
                "title": p.title,
                "status": p.status.value if hasattr(p.status, 'value') else str(p.status),
                "trl": p.trl_current if hasattr(p, 'trl_current') else p.current_trl,
            })
        
        # Search in lessons learned
        if include_lessons:
            for lesson in (p.lessons_learned or []):
                if (q_lower in lesson.get("title", "").lower() or
                    q_lower in lesson.get("description", "").lower()):
                    results["lessons"].append({
                        "project_id": str(p.id),
                        "project_title": p.title,
                        **lesson,
                    })
    
    return {
        "query": q,
        "total_results": len(results["projects"]) + len(results["lessons"]),
        **results,
    }
