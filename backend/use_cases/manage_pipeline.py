# Implements RF-05: Pipeline de Oportunidades
from typing import List, Dict, Any, Optional
from uuid import UUID
from domain.entities import Opportunity, OpportunityStage
import logging

logger = logging.getLogger(__name__)


class ManagePipelineUseCase:
    """
    Manages opportunity pipeline with Kanban stages and priority scoring.
    Implements RF-05: Pipeline de Oportunidades
    """
    
    def __init__(
        self,
        opportunity_repository=None,
        audit_service=None
    ):
        self.opportunity_repository = opportunity_repository
        self.audit_service = audit_service
    
    async def create_opportunity(
        self,
        opportunity_data: Dict[str, Any],
        tenant_id: UUID,
        user_id: UUID
    ) -> Opportunity:
        """Create a new opportunity in the pipeline."""
        opportunity = Opportunity(
            **opportunity_data,
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id,
            stage=OpportunityStage.INTELLIGENCE  # Always starts at intelligence
        )
        
        saved = await self.opportunity_repository.create(opportunity)
        
        await self.audit_service.log_creation(
            entity_type="Opportunity",
            entity_id=saved.id,
            user_id=user_id,
            tenant_id=tenant_id,
            after_state=saved.model_dump()
        )
        
        return saved
    
    async def move_opportunity_stage(
        self,
        opportunity_id: UUID,
        new_stage: OpportunityStage,
        user_id: UUID,
        tenant_id: UUID,
        notes: Optional[str] = None
    ) -> Opportunity:
        """Move opportunity to a new stage with audit trail."""
        opportunity = await self.opportunity_repository.get_by_id(
            opportunity_id, tenant_id
        )
        
        if not opportunity:
            raise ValueError(f"Opportunity {opportunity_id} not found")
        
        before_state = opportunity.model_dump()
        
        opportunity.move_to_stage(new_stage, user_id, notes)
        
        updated = await self.opportunity_repository.update(opportunity)
        
        await self.audit_service.log_update(
            entity_type="Opportunity",
            entity_id=opportunity_id,
            user_id=user_id,
            tenant_id=tenant_id,
            before_state=before_state,
            after_state=updated.model_dump()
        )
        
        logger.info(
            f"Opportunity {opportunity_id} moved from {before_state['stage']} "
            f"to {new_stage}"
        )
        
        return updated
    
    async def calculate_and_update_priority(
        self,
        opportunity_id: UUID,
        technical_score: float,
        financial_score: float,
        strategic_score: float,
        user_id: UUID,
        tenant_id: UUID,
        urgency_multiplier: float = 1.0
    ) -> Opportunity:
        """
        Calculate priority score using transparent formula (RF-05).
        Formula: Score = (Technical * 0.3 + Financial * 0.4 + Strategic * 0.3) * Urgency
        """
        opportunity = await self.opportunity_repository.get_by_id(
            opportunity_id, tenant_id
        )
        
        if not opportunity:
            raise ValueError(f"Opportunity {opportunity_id} not found")
        
        before_state = opportunity.model_dump()
        
        # Calculate score with transparent formula
        opportunity.calculate_priority_score(
            technical_score=technical_score,
            financial_score=financial_score,
            strategic_score=strategic_score,
            urgency_multiplier=urgency_multiplier
        )
        
        opportunity.updated_by = user_id
        
        updated = await self.opportunity_repository.update(opportunity)
        
        await self.audit_service.log_update(
            entity_type="Opportunity",
            entity_id=opportunity_id,
            user_id=user_id,
            tenant_id=tenant_id,
            before_state=before_state,
            after_state=updated.model_dump()
        )
        
        logger.info(
            f"Opportunity {opportunity_id} priority updated to {updated.priority_score}. "
            f"Formula: {updated.score_formula}"
        )
        
        return updated
    
    async def get_pipeline_by_stage(
        self,
        tenant_id: UUID,
        stage: Optional[OpportunityStage] = None,
        institute_ids: Optional[List[UUID]] = None
    ) -> List[Opportunity]:
        """Get all opportunities in a specific stage (Kanban view)."""
        filters = {"tenant_id": tenant_id}

        if stage:
            filters["stage"] = stage

        if institute_ids:
            filters["institute_ids"] = institute_ids

        opportunities = await self.opportunity_repository.find_by_criteria(filters)
        
        # Sort by priority score (highest first)
        opportunities.sort(key=lambda x: x.priority_score, reverse=True)
        
        return opportunities

    async def list_opportunities_filtered(
        self,
        filters: Dict[str, Any],
        skip: int = 0,
        limit: int = 20,
        tenant_id: Optional[UUID] = None,
        institute_ids: Optional[List[UUID]] = None
    ) -> List[Opportunity]:
        """
        Generic listing for opportunities supporting `institute_ids` scoping.
        """
        criteria: Dict[str, Any] = {}
        if tenant_id:
            criteria["tenant_id"] = tenant_id

        for k, v in filters.items():
            if v is None:
                continue
            criteria[k] = v

        if institute_ids:
            criteria["institute_ids"] = institute_ids

        results = await self.opportunity_repository.find_by_criteria(criteria, skip=skip, limit=limit)
        return results
    
    async def get_pipeline_statistics(
        self,
        tenant_id: UUID
    ) -> Dict[str, Any]:
        """Get pipeline statistics for dashboards."""
        all_opportunities = await self.opportunity_repository.find_by_criteria(
            {"tenant_id": tenant_id}
        )
        
        stats = {
            "total": len(all_opportunities),
            "by_stage": {},
            "by_priority": {"low": 0, "medium": 0, "high": 0, "critical": 0},
            "total_estimated_value": 0,
            "weighted_value": 0  # value * probability
        }
        
        for opp in all_opportunities:
            # Count by stage
            stage_name = opp.stage.value
            stats["by_stage"][stage_name] = stats["by_stage"].get(stage_name, 0) + 1
            
            # Count by priority
            priority_name = opp.priority.value
            stats["by_priority"][priority_name] += 1
            
            # Financial metrics
            if opp.estimated_value:
                stats["total_estimated_value"] += float(opp.estimated_value)
                stats["weighted_value"] += float(opp.estimated_value) * opp.probability
        
        return stats
