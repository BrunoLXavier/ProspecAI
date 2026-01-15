# Implements RF-08: Gestão de Propostas e Conhecimento
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import Field
from .base import BaseEntity


class ProposalStatus(str, Enum):
    """Status of proposals."""
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    SUBMITTED = "submitted"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class ProposalVersion(BaseEntity):
    """
    Versioned proposal document (Git-like versioning).
    Implements RF-08: Gestão de Propostas e Conhecimento
    """
    
    proposal_id: UUID
    version_number: int = Field(ge=1)
    parent_version_id: Optional[UUID] = None
    
    # Content
    title: str = Field(..., max_length=500)
    content: str  # Main proposal text
    attachments: List[str] = Field(default_factory=list)  # File references
    
    # Metadata
    author_id: UUID
    commit_message: str
    
    # AI analysis
    adherence_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    adherence_analysis: Optional[Dict[str, Any]] = None
    
    def create_next_version(
        self,
        new_content: str,
        author_id: UUID,
        commit_message: str
    ) -> "ProposalVersion":
        """Create a new version based on this one."""
        return ProposalVersion(
            proposal_id=self.proposal_id,
            version_number=self.version_number + 1,
            parent_version_id=self.id,
            title=self.title,
            content=new_content,
            author_id=author_id,
            commit_message=commit_message,
            tenant_id=self.tenant_id,
            created_by=author_id,
            updated_by=author_id,
        )


class Proposal(BaseEntity):
    """
    Proposal for funding or project.
    Implements RF-08: Gestão de Propostas e Conhecimento
    """
    
    title: str = Field(..., max_length=500)
    description: str
    status: ProposalStatus = ProposalStatus.DRAFT
    
    # Related entities
    opportunity_id: Optional[UUID] = None
    funding_source_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    
    # Current version
    current_version_id: Optional[UUID] = None
    version_count: int = Field(default=0, ge=0)
    
    # Collaboration
    collaborators: List[UUID] = Field(default_factory=list)
    
    # AI-assisted adherence check
    last_adherence_check: Optional[datetime] = None
    adherence_to_funding: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    
    # Knowledge management
    tags: List[str] = Field(default_factory=list)
    lessons_learned: List[Dict[str, str]] = Field(default_factory=list)
    
    def add_collaborator(self, user_id: UUID) -> None:
        """Add a collaborator to the proposal."""
        if user_id not in self.collaborators:
            self.collaborators.append(user_id)
    
    def remove_collaborator(self, user_id: UUID) -> None:
        """Remove a collaborator."""
        if user_id in self.collaborators:
            self.collaborators.remove(user_id)
    
    def update_adherence_score(
        self,
        score: float,
        analysis: Dict[str, Any]
    ) -> None:
        """Update AI adherence analysis."""
        self.adherence_to_funding = score
        self.last_adherence_check = datetime.utcnow()
    
    def submit(self, user_id: UUID) -> None:
        """Submit the proposal."""
        if self.status != ProposalStatus.APPROVED:
            raise ValueError("Proposal must be approved before submission")
        self.status = ProposalStatus.SUBMITTED
        self.updated_by = user_id
        self.updated_at = datetime.utcnow()
