# Implements RF-03: Gestão do Portfólio Institucional
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime
from domain.entities import Portfolio, Project
import logging

logger = logging.getLogger(__name__)


class ManagePortfolioUseCase:
    """
    Manages institutional portfolio and projects with versioning.
    Implements RF-03: Gestão do Portfólio Institucional
    """
    
    def __init__(
        self,
        portfolio_repository,
        project_repository,
        audit_service
    ):
        self.portfolio_repository = portfolio_repository
        self.project_repository = project_repository
        self.audit_service = audit_service
    
    async def create_project(
        self,
        project_data: Dict[str, Any],
        tenant_id: UUID,
        user_id: UUID
    ) -> Project:
        """
        Create a new project.
        Business Rule: Must have TRL level and lessons learned structure.
        """
        # Validate required fields per RF-03
        if "trl_current" not in project_data:
            raise ValueError("trl_current is mandatory per RF-03")
        
        project = Project(
            **project_data,
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            version=1
        )
        
        saved = await self.project_repository.create(project)
        
        await self.audit_service.log_creation(
            entity_type="Project",
            entity_id=saved.id,
            user_id=user_id,
            tenant_id=tenant_id,
            after_state=saved.model_dump()
        )
        
        return saved
    
    async def add_lesson_learned(
        self,
        project_id: UUID,
        title: str,
        description: str,
        category: str,
        user_id: UUID,
        tenant_id: UUID
    ) -> Project:
        """
        Add a lesson learned to a project (RF-03 requirement).
        """
        project = await self.project_repository.get_by_id(project_id, tenant_id)
        
        if not project:
            raise ValueError(f"Project {project_id} not found")
        
        before_state = project.model_dump()
        
        project.add_lesson_learned(title, description, category)
        project.updated_by = user_id
        project.updated_at = datetime.utcnow()
        
        updated = await self.project_repository.update(project)
        
        await self.audit_service.log_update(
            entity_type="Project",
            entity_id=project_id,
            user_id=user_id,
            tenant_id=tenant_id,
            before_state=before_state,
            after_state=updated.model_dump()
        )
        
        return updated
    
    async def advance_project_trl(
        self,
        project_id: UUID,
        new_trl: int,
        user_id: UUID,
        tenant_id: UUID,
        lesson_learned: Optional[Dict[str, str]] = None
    ) -> Project:
        """
        Advance a project to a higher TRL level.
        Optionally record a lesson learned from the advancement.
        """
        project = await self.project_repository.get_by_id(project_id, tenant_id)
        
        if not project:
            raise ValueError(f"Project {project_id} not found")
        
        before_state = project.model_dump()
        
        project.advance_trl(new_trl, user_id)
        
        if lesson_learned:
            project.add_lesson_learned(
                title=lesson_learned.get("title", f"TRL Advancement to {new_trl}"),
                description=lesson_learned["description"],
                category=lesson_learned.get("category", "trl_advancement")
            )
        
        updated = await self.project_repository.update(project)
        
        await self.audit_service.log_update(
            entity_type="Project",
            entity_id=project_id,
            user_id=user_id,
            tenant_id=tenant_id,
            before_state=before_state,
            after_state=updated.model_dump()
        )
        
        return updated
    
    async def create_portfolio(
        self,
        portfolio_data: Dict[str, Any],
        tenant_id: UUID,
        user_id: UUID
    ) -> Portfolio:
        """Create a new portfolio."""
        portfolio = Portfolio(
            **portfolio_data,
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id
        )
        
        saved = await self.portfolio_repository.create(portfolio)
        
        await self.audit_service.log_creation(
            entity_type="Portfolio",
            entity_id=saved.id,
            user_id=user_id,
            tenant_id=tenant_id,
            after_state=saved.model_dump()
        )
        
        return saved
    
    async def add_project_to_portfolio(
        self,
        portfolio_id: UUID,
        project_id: UUID,
        user_id: UUID,
        tenant_id: UUID
    ) -> Portfolio:
        """Add a project to a portfolio."""
        portfolio = await self.portfolio_repository.get_by_id(
            portfolio_id, tenant_id
        )
        
        if not portfolio:
            raise ValueError(f"Portfolio {portfolio_id} not found")
        
        # Verify project exists
        project = await self.project_repository.get_by_id(project_id, tenant_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")
        
        before_state = portfolio.model_dump()
        
        portfolio.add_project(project_id)
        portfolio.updated_by = user_id
        portfolio.updated_at = datetime.utcnow()
        
        updated = await self.portfolio_repository.update(portfolio)
        
        await self.audit_service.log_update(
            entity_type="Portfolio",
            entity_id=portfolio_id,
            user_id=user_id,
            tenant_id=tenant_id,
            before_state=before_state,
            after_state=updated.model_dump()
        )
        
        return updated
