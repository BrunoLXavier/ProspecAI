# Implements RF-06: Matching Estratégico
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import Field, field_validator
from .base import BaseEntity


class MatchingScore(BaseEntity):
    """
    Score calculation for demand-capability-funding matching.
    Implements RF-06: Matching Estratégico
    Formula: Score = (Technical Feasibility * 0.4) + (Financial * 0.3) + (Strategic * 0.3)
    """
    
    # Entities being matched
    demand_id: UUID
    capability_id: UUID  # Portfolio/Project ID
    funding_source_id: Optional[UUID] = None
    
    # Component scores (0-100 scale)
    technical_feasibility_score: float = Field(ge=0.0, le=100.0)
    financial_viability_score: float = Field(ge=0.0, le=100.0)
    strategic_alignment_score: float = Field(ge=0.0, le=100.0)
    
    # Final composite score
    composite_score: float = Field(ge=0.0, le=100.0)
    
    # Transparent formula display for human validation
    calculation_formula: str
    calculation_details: Dict[str, Any] = Field(default_factory=dict)
    
    # Human-in-the-loop validation
    human_validated: bool = False
    validated_by: Optional[UUID] = None
    validated_at: Optional[datetime] = None
    validation_notes: Optional[str] = None
    
    # AI confidence
    ai_confidence: float = Field(ge=0.0, le=1.0)
    
    @field_validator("composite_score", mode="before")
    @classmethod
    def calculate_composite_score(cls, v: Any, info) -> float:
        """Calculate composite score using the standard formula."""
        if v is not None:
            return v
            
        data = info.data
        technical = data.get("technical_feasibility_score", 0.0)
        financial = data.get("financial_viability_score", 0.0)
        strategic = data.get("strategic_alignment_score", 0.0)
        
        return (technical * 0.4) + (financial * 0.3) + (strategic * 0.3)
    
    def validate_by_human(self, user_id: UUID, notes: Optional[str] = None) -> None:
        """
        Human validation of the AI-generated matching score.
        Implements RNF-04: Human-in-the-loop requirement.
        """
        self.human_validated = True
        self.validated_by = user_id
        self.validated_at = datetime.utcnow()
        self.validation_notes = notes
    
    def get_confidence_badge(self) -> str:
        """Return confidence badge color."""
        if self.ai_confidence >= 0.8:
            return "green"
        if self.ai_confidence >= 0.6:
            return "yellow"
        return "red"


class MatchingResult(BaseEntity):
    """
    Complete matching result with multiple scores and graph representation.
    """
    
    opportunity_id: UUID
    
    # Top matching scores
    matching_scores: List[UUID] = Field(default_factory=list)
    
    # Graph data for Neo4j visualization
    graph_data: Optional[Dict[str, Any]] = None
    
    # Matching metadata
    algorithm_version: str
    execution_timestamp: datetime = Field(default_factory=datetime.utcnow)
    processing_time_ms: Optional[int] = None
    
    # Human review
    reviewed: bool = False
    reviewed_by: Optional[UUID] = None
    review_notes: Optional[str] = None
    
    def add_matching_score(self, score_id: UUID) -> None:
        """Add a matching score to the result."""
        if score_id not in self.matching_scores:
            self.matching_scores.append(score_id)
    
    def mark_as_reviewed(self, user_id: UUID, notes: str) -> None:
        """Mark the matching result as reviewed by a human."""
        self.reviewed = True
        self.reviewed_by = user_id
        self.review_notes = notes
        self.updated_at = datetime.utcnow()
