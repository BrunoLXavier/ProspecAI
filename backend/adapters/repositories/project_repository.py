"""
Portfolio Repository Implementation
PostgreSQL repository for Portfolio and Project entities
Implements RF-03: Gestão de Portfólio Institucional
"""
from typing import List, Optional
from datetime import date
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from domain.entities.portfolio import Project, Portfolio
from adapters.database.models import ProjectModel, PortfolioModel


class ProjectRepository:
    """
    Concrete repository for Project entities
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create(self, project: Project) -> Project:
        """
        Create a new project
        """
        model = ProjectModel(
            id=project.id,
            tenant_id=project.tenant_id,
            portfolio_id=project.portfolio_id,
            title=project.title,
            description=project.description,
            research_area=project.research_area,
            current_trl=project.current_trl,
            status=project.status,
            start_date=project.start_date,
            end_date=project.end_date,
            budget=project.budget,
            objectives=project.objectives,
            methodology=project.methodology,
            expected_results=project.expected_results,
            lessons_learned=project.lessons_learned,
            trl_history=project.trl_history,
        )
        
        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        
        return self._to_entity(model)
    
    async def get_by_id(self, project_id: str) -> Optional[Project]:
        """
        Get project by ID
        """
        stmt = select(ProjectModel).where(
            and_(
                ProjectModel.id == project_id,
                ProjectModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        
        return self._to_entity(model) if model else None
    
    async def list(
        self,
        status: Optional[str] = None,
        research_area: Optional[str] = None,
        trl_min: Optional[int] = None,
        trl_max: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Project]:
        """
        List projects with filters
        """
        conditions = [ProjectModel.deleted_at.is_(None)]
        
        if status:
            conditions.append(ProjectModel.status == status)
        
        if research_area:
            conditions.append(ProjectModel.research_area == research_area)
        
        if trl_min is not None:
            conditions.append(ProjectModel.current_trl >= trl_min)
        
        if trl_max is not None:
            conditions.append(ProjectModel.current_trl <= trl_max)
        
        stmt = (
            select(ProjectModel)
            .where(and_(*conditions))
            .offset(skip)
            .limit(limit)
            .order_by(ProjectModel.created_at.desc())
        )
        
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        
        return [self._to_entity(model) for model in models]
    
    async def update(self, project: Project) -> Project:
        """
        Update project
        """
        stmt = select(ProjectModel).where(ProjectModel.id == project.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one()
        
        # Update fields
        model.title = project.title
        model.description = project.description
        model.status = project.status
        model.current_trl = project.current_trl
        model.budget = project.budget
        model.lessons_learned = project.lessons_learned
        model.trl_history = project.trl_history
        
        await self.session.commit()
        await self.session.refresh(model)
        
        return self._to_entity(model)
    
    async def delete(self, project_id: str) -> bool:
        """
        Soft delete project
        """
        stmt = select(ProjectModel).where(ProjectModel.id == project_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        
        if not model:
            return False
        
        from datetime import datetime
        model.deleted_at = datetime.utcnow()
        
        await self.session.commit()
        return True
    
    async def get_statistics(self) -> dict:
        """
        Get portfolio statistics
        """
        # Total projects
        total_stmt = select(func.count(ProjectModel.id)).where(
            ProjectModel.deleted_at.is_(None)
        )
        total_result = await self.session.execute(total_stmt)
        total_projects = total_result.scalar()
        
        # Active projects
        active_stmt = select(func.count(ProjectModel.id)).where(
            and_(
                ProjectModel.status == "active",
                ProjectModel.deleted_at.is_(None)
            )
        )
        active_result = await self.session.execute(active_stmt)
        active_projects = active_result.scalar()
        
        # Total budget
        budget_stmt = select(func.sum(ProjectModel.budget)).where(
            ProjectModel.deleted_at.is_(None)
        )
        budget_result = await self.session.execute(budget_stmt)
        total_budget = budget_result.scalar() or 0
        
        # Average TRL
        trl_stmt = select(func.avg(ProjectModel.current_trl)).where(
            ProjectModel.deleted_at.is_(None)
        )
        trl_result = await self.session.execute(trl_stmt)
        average_trl = trl_result.scalar() or 0
        
        return {
            "total_projects": total_projects,
            "active_projects": active_projects,
            "total_budget": float(total_budget),
            "average_trl": float(average_trl),
        }
    
    def _to_entity(self, model: ProjectModel) -> Project:
        """
        Convert database model to domain entity
        """
        return Project(
            id=model.id,
            tenant_id=model.tenant_id,
            portfolio_id=model.portfolio_id,
            title=model.title,
            description=model.description,
            research_area=model.research_area,
            current_trl=model.current_trl,
            status=model.status,
            start_date=model.start_date,
            end_date=model.end_date,
            budget=model.budget,
            objectives=model.objectives,
            methodology=model.methodology,
            expected_results=model.expected_results,
            lessons_learned=model.lessons_learned,
            trl_history=model.trl_history,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
