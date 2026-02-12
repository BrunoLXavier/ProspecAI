# Implements RF-05: Pipeline de Oportunidades
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
from uuid import UUID
from decimal import Decimal
from pydantic import Field
from .base import BaseEntity


class OpportunityStage(str, Enum):
    """
    Kanban stages for opportunity pipeline.
    Implements RF-05: Pipeline de Oportunidades
    """
    INTELLIGENCE = "intelligence"
    QUALIFICATION = "qualification"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"
    # Legacy stages (kept for backward compatibility)
    VALIDATION = "validation"
    APPROACH = "approach"
    REGISTRATION = "registration"
    CONVERSION = "conversion"
    POST_SALE = "post_sale"
    LOST = "lost"


class OpportunityPriority(str, Enum):
    """Priority levels for opportunities."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Opportunity(BaseEntity):
    """
    Opportunity in the sales/project pipeline.
    Implements RF-05: Pipeline de Oportunidades
    """
    
    title: str = Field(..., min_length=1, max_length=500)
    description: str
    
    # Pipeline stage
    stage: OpportunityStage = OpportunityStage.INTELLIGENCE
    priority: OpportunityPriority = OpportunityPriority.MEDIUM
    
    # Institute scope (RF-05: institute-level pipeline filtering)
    institute_id: Optional[UUID] = None
    
    # Related entities
    client_id: Optional[UUID] = None
    funding_source_id: Optional[UUID] = None
    portfolio_id: Optional[UUID] = None
    
    # Financial estimates
    estimated_value: Optional[Decimal] = None
    probability: float = Field(default=0.5, ge=0.0, le=1.0)
    
    # Dates
    expected_close_date: Optional[datetime] = None
    actual_close_date: Optional[datetime] = None
    
    # Prioritization score (0-100) - calculated with transparent formula
    priority_score: float = Field(default=0.0, ge=0.0, le=100.0)
    score_formula: Optional[str] = None  # Transparent formula display
    
    # Stage history for tracking
    stage_history: list[Dict[str, Any]] = Field(default_factory=list)
    
    # Assigned team
    assigned_to: Optional[UUID] = None
    
    def move_to_stage(
        self, 
        new_stage: OpportunityStage, 
        user_id: UUID,
        notes: Optional[str] = None
    ) -> None:
        """Move opportunity to a new stage with audit trail."""
        old_stage = self.stage
        self.stage = new_stage
        self.updated_by = user_id
        
        # Record stage transition
        self.stage_history.append({
            "from_stage": old_stage.value,
            "to_stage": new_stage.value,
            "changed_by": str(user_id),
            "changed_at": str(datetime.utcnow()),
            "notes": notes,
        })
    
    def calculate_priority_score(
        self,
        technical_score: float,
        financial_score: float,
        strategic_score: float,
        urgency_multiplier: float = 1.0
    ) -> None:
        """
        Calculate priority score with transparent formula.
        Formula: Score = (Technical * 0.3 + Financial * 0.4 + Strategic * 0.3) * Urgency
        Max score: 100
        """
        base_score = (
            technical_score * 0.3 +
            financial_score * 0.4 +
            strategic_score * 0.3
        )
        
        self.priority_score = min(base_score * urgency_multiplier, 100.0)
        self.score_formula = (
            f"({technical_score} * 0.3 + {financial_score} * 0.4 + "
            f"{strategic_score} * 0.3) * {urgency_multiplier}"
        )
    
    def mark_as_won(self, user_id: UUID, value: Decimal) -> None:
        """Mark opportunity as won."""
        self.move_to_stage(OpportunityStage.CONVERSION, user_id, "Opportunity won")
        self.estimated_value = value
        self.actual_close_date = datetime.utcnow()
        self.probability = 1.0
    
    def mark_as_lost(self, user_id: UUID, reason: str) -> None:
        """Mark opportunity as lost."""
        self.move_to_stage(OpportunityStage.LOST, user_id, f"Lost: {reason}")
        self.actual_close_date = datetime.utcnow()
        self.probability = 0.0

# Alias for compatibility with legacy imports
PipelineStage = OpportunityStage
