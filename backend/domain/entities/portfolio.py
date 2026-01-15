# Implements RF-03: Gestão do Portfólio Institucional
from enum import Enum
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import Field
from .base import BaseEntity


class ProjectStatus(str, Enum):
    """Status of institutional projects."""
    PLANNED = "planned"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Project(BaseEntity):
    """
    Individual project within the institutional portfolio.
    Implements RF-03: Gestão do Portfólio Institucional
    """
    
    title: str = Field(..., min_length=1, max_length=500)
    description: str
    status: ProjectStatus = ProjectStatus.PLANNED
    
    # TRL tracking (mandatory per RF-03 business rule)
    trl_current: int = Field(ge=1, le=9)
    trl_target: Optional[int] = Field(default=None, ge=1, le=9)
    
    # Team and competencies
    team_members: List[UUID] = Field(default_factory=list)
    competencies: List[str] = Field(default_factory=list)
    
    # Infrastructure
    infrastructure: Optional[Dict[str, Any]] = None
    
    # Lessons learned (mandatory per RF-03)
    lessons_learned: List[Dict[str, str]] = Field(default_factory=list)
    
    # Versioning
    version: int = Field(default=1, ge=1)
    parent_version_id: Optional[UUID] = None
    
    def add_lesson_learned(self, title: str, description: str, category: str) -> None:
        """Add a lesson learned to the project."""
        self.lessons_learned.append({
            "title": title,
            "description": description,
            "category": category,
            "timestamp": str(self.updated_at),
        })
    
    def advance_trl(self, new_trl: int, user_id: UUID) -> None:
        """Advance the project to a higher TRL level."""
        if new_trl <= self.trl_current:
            raise ValueError("New TRL must be higher than current TRL")
        if new_trl > 9:
            raise ValueError("TRL cannot exceed 9")
        self.trl_current = new_trl
        self.updated_by = user_id


class Portfolio(BaseEntity):
    """
    Institutional portfolio aggregating multiple projects.
    Implements RF-03: Gestão do Portfólio Institucional
    """
    
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    
    # References to projects (stored separately)
    project_ids: List[UUID] = Field(default_factory=list)
    
    # Strategic alignment
    strategic_areas: List[str] = Field(default_factory=list)
    key_competencies: List[str] = Field(default_factory=list)
    
    # Portfolio-level metrics
    total_budget: Optional[float] = None
    active_projects_count: int = Field(default=0, ge=0)
    
    def add_project(self, project_id: UUID) -> None:
        """Add a project to the portfolio."""
        if project_id not in self.project_ids:
            self.project_ids.append(project_id)
    
    def remove_project(self, project_id: UUID) -> None:
        """Remove a project from the portfolio."""
        if project_id in self.project_ids:
            self.project_ids.remove(project_id)
