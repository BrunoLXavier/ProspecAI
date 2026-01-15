"""
Project Entity
Implements RF-03: Portfólio institucional e lições aprendidas
"""
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from pydantic import Field
from .base import BaseEntity


class ProjectStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"
    PLANNED = "planned"
    ON_HOLD = "on_hold"
    CANCELLED = "cancelled"


class TRLLevel(int, Enum):
    TRL_1 = 1
    TRL_2 = 2
    TRL_3 = 3
    TRL_4 = 4
    TRL_5 = 5
    TRL_6 = 6
    TRL_7 = 7
    TRL_8 = 8
    TRL_9 = 9


class Project(BaseEntity):
    """
    Project entity for institutional portfolio.
    Implements RF-03: Gestão do Portfólio Institucional
    """
    name: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.DRAFT
    
    # TRL tracking
    current_trl: TRLLevel = TRLLevel.TRL_1
    target_trl: Optional[TRLLevel] = None
    
    # Team and competencies
    team_members: List[UUID] = Field(default_factory=list)
    competencies: List[str] = Field(default_factory=list)
    
    # Dates
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    # Infrastructure
    infrastructure: Optional[Dict[str, Any]] = None
    
    # Lessons learned (mandatory per RF-03)
    lessons_learned: List[Dict[str, str]] = Field(default_factory=list)
    
    # Versioning
    version: int = Field(default=1, ge=1)
    parent_version_id: Optional[UUID] = None
    
    # Active flag
    is_active: bool = True
    
    def add_lesson_learned(self, title: str, description: str, category: str) -> None:
        """Add a lesson learned to the project."""
        self.lessons_learned.append({
            "title": title,
            "description": description,
            "category": category,
            "timestamp": str(datetime.utcnow()),
        })
    
    def advance_trl(self, new_trl: TRLLevel, user_id: UUID) -> None:
        """Advance the project to a higher TRL level."""
        if new_trl.value <= self.current_trl.value:
            raise ValueError("New TRL must be higher than current TRL")
        self.current_trl = new_trl
        self.updated_by = user_id
        self.updated_at = datetime.utcnow()

