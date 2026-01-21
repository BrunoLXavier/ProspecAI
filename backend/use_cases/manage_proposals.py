# Implements RF-08: Gestão de Propostas e Conhecimento
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime
from domain.entities import Proposal, ProposalVersion, ProposalStatus
import logging

logger = logging.getLogger(__name__)


class ManageProposalsUseCase:
    """
    Manages proposals with Git-like versioning and AI adherence analysis.
    Implements RF-08: Gestão de Propostas e Conhecimento
    """
    
    def __init__(
        self,
        proposal_repository=None,
        version_repository=None,
        ai_adherence_analyzer=None,
        collaboration_service=None,
        audit_service=None
    ):
        self.proposal_repository = proposal_repository
        self.version_repository = version_repository
        self.ai_adherence_analyzer = ai_adherence_analyzer
        self.collaboration_service = collaboration_service
        self.audit_service = audit_service
    
    async def create_proposal(
        self,
        proposal_data: Dict[str, Any],
        initial_content: str,
        tenant_id: UUID,
        user_id: UUID
    ) -> Proposal:
        """Create a new proposal with initial version."""
        # Create proposal
        proposal = Proposal(
            **proposal_data,
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            status=ProposalStatus.DRAFT,
            collaborators=[user_id]
        )
        
        saved_proposal = await self.proposal_repository.create(proposal)
        
        # Create initial version
        initial_version = ProposalVersion(
            proposal_id=saved_proposal.id,
            version_number=1,
            title=proposal_data["title"],
            content=initial_content,
            author_id=user_id,
            commit_message="Initial version",
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id
        )
        
        saved_version = await self.version_repository.create(initial_version)
        
        # Update proposal with current version
        saved_proposal.current_version_id = saved_version.id
        saved_proposal.version_count = 1
        await self.proposal_repository.update(saved_proposal)
        
        await self.audit_service.log_creation(
            entity_type="Proposal",
            entity_id=saved_proposal.id,
            user_id=user_id,
            tenant_id=tenant_id,
            after_state=saved_proposal.model_dump()
        )
        
        logger.info(f"Created proposal {saved_proposal.id} with initial version")
        
        return saved_proposal
    
    async def create_new_version(
        self,
        proposal_id: UUID,
        new_content: str,
        commit_message: str,
        user_id: UUID,
        tenant_id: UUID
    ) -> ProposalVersion:
        """Create a new version of the proposal (Git-like commit)."""
        proposal = await self.proposal_repository.get_by_id(proposal_id, tenant_id)
        
        if not proposal:
            raise ValueError(f"Proposal {proposal_id} not found")
        
        # Get current version
        current_version = await self.version_repository.get_by_id(
            proposal.current_version_id, tenant_id
        )
        
        # Create new version
        new_version = current_version.create_next_version(
            new_content=new_content,
            author_id=user_id,
            commit_message=commit_message
        )
        
        saved_version = await self.version_repository.create(new_version)
        
        # Update proposal
        proposal.current_version_id = saved_version.id
        proposal.version_count += 1
        proposal.updated_by = user_id
        proposal.updated_at = datetime.utcnow()
        
        await self.proposal_repository.update(proposal)
        
        # Notify collaborators via WebSocket
        await self.collaboration_service.notify_version_update(
            proposal_id=proposal_id,
            version_number=saved_version.version_number,
            author_id=user_id
        )
        
        logger.info(
            f"Created version {saved_version.version_number} for proposal {proposal_id}"
        )
        
        return saved_version
    
    async def analyze_adherence_to_funding(
        self,
        proposal_id: UUID,
        funding_source_id: UUID,
        user_id: UUID,
        tenant_id: UUID
    ) -> Dict[str, Any]:
        """
        Analyze proposal adherence to funding requirements using AI (RF-08).
        """
        proposal = await self.proposal_repository.get_by_id(proposal_id, tenant_id)
        
        if not proposal:
            raise ValueError(f"Proposal {proposal_id} not found")
        
        # Get current version content
        current_version = await self.version_repository.get_by_id(
            proposal.current_version_id, tenant_id
        )
        
        logger.info(
            f"Analyzing adherence for proposal {proposal_id} "
            f"to funding {funding_source_id}"
        )
        
        # Run AI analysis
        analysis_result = await self.ai_adherence_analyzer.analyze(
            proposal_content=current_version.content,
            funding_source_id=funding_source_id,
            tenant_id=tenant_id
        )
        
        # Update proposal
        proposal.update_adherence_score(
            score=analysis_result["adherence_score"],
            analysis=analysis_result["details"]
        )
        proposal.funding_source_id = funding_source_id
        
        await self.proposal_repository.update(proposal)
        
        # Update version with adherence data
        current_version.adherence_score = analysis_result["adherence_score"]
        current_version.adherence_analysis = analysis_result["details"]
        await self.version_repository.update(current_version)
        
        logger.info(
            f"Adherence analysis complete. Score: {analysis_result['adherence_score']}"
        )
        
        return analysis_result
    
    async def add_collaborator(
        self,
        proposal_id: UUID,
        collaborator_id: UUID,
        user_id: UUID,
        tenant_id: UUID
    ) -> Proposal:
        """Add a collaborator to the proposal."""
        proposal = await self.proposal_repository.get_by_id(proposal_id, tenant_id)
        
        if not proposal:
            raise ValueError(f"Proposal {proposal_id} not found")
        
        before_state = proposal.model_dump()
        
        proposal.add_collaborator(collaborator_id)
        proposal.updated_by = user_id
        proposal.updated_at = datetime.utcnow()
        
        updated = await self.proposal_repository.update(proposal)
        
        # Notify via WebSocket
        await self.collaboration_service.notify_collaborator_added(
            proposal_id=proposal_id,
            collaborator_id=collaborator_id
        )
        
        await self.audit_service.log_update(
            entity_type="Proposal",
            entity_id=proposal_id,
            user_id=user_id,
            tenant_id=tenant_id,
            before_state=before_state,
            after_state=updated.model_dump()
        )
        
        return updated
    
    async def get_proposal_history(
        self,
        proposal_id: UUID,
        tenant_id: UUID
    ) -> List[ProposalVersion]:
        """Get full version history of a proposal."""
        versions = await self.version_repository.find_by_criteria({
            "proposal_id": proposal_id,
            "tenant_id": tenant_id
        })
        
        # Sort by version number
        versions.sort(key=lambda v: v.version_number)
        
        return versions

    async def list_proposals_filtered(
        self,
        filters: Dict[str, Any],
        skip: int = 0,
        limit: int = 20,
        tenant_id: Optional[UUID] = None,
        institute_ids: Optional[List[UUID]] = None
    ) -> List[Proposal]:
        """
        List proposals with optional institute scoping. When `institute_ids` is
        provided, the repository is expected to support the `institute_ids`
        criteria to restrict proposals related to opportunities/projects of
        those institutes.
        """
        criteria: Dict[str, Any] = {}
        if tenant_id:
            criteria["tenant_id"] = tenant_id

        # Merge simple filters into criteria
        for k, v in filters.items():
            if v is None:
                continue
            criteria[k] = v

        if institute_ids:
            criteria["institute_ids"] = institute_ids

        results = await self.proposal_repository.find_by_criteria(criteria, skip=skip, limit=limit)
        return results
