# Implements RF-02: Gestão de Fontes de Fomento
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime, date
from domain.entities import FundingSource, FundingStatus
import logging

logger = logging.getLogger(__name__)


class ManageFundingUseCase:
    """
    Manages funding sources with AI-assisted field extraction.
    Implements RF-02: Gestão de Fontes de Fomento
    """
    
    def __init__(
        self,
        funding_repository,
        ai_extractor,
        audit_service
    ):
        self.funding_repository = funding_repository
        self.ai_extractor = ai_extractor
        self.audit_service = audit_service
    
    async def list_funding_sources_filtered(
        self,
        filters: Dict[str, Any],
        skip: int = 0,
        limit: int = 20,
        tenant_id: Optional[UUID] = None,
        institute_ids: Optional[List[UUID]] = None
    ) -> Tuple[List[FundingSource], int]:
        """
        List funding sources with advanced filtering.
        
        Supported filters:
        - status: Filter by funding status
        - instrument_type: Filter by instrument type
        - deadline_after: Submission end after this date
        - deadline_before: Submission end before this date
        - min_amount: Minimum total_amount
        - max_amount: Maximum total_amount
        - trl_min: Minimum TRL level
        - trl_max: Maximum TRL level
        - institution: Partial match on institution name
        - search: Full-text search in name and description
        
        Returns:
            Tuple of (list of funding sources, total count)
        """
        logger.info(f"Listing funding sources with filters: {filters}")
        
        # Build repository query criteria
        criteria = {}
        
        if tenant_id:
            criteria["tenant_id"] = tenant_id
        
        # Status filter
        if "status" in filters:
            status_str = filters["status"].lower()
            try:
                criteria["status"] = FundingStatus(status_str)
            except ValueError:
                logger.warning(f"Invalid status filter: {status_str}")
        
        # Instrument type filter
        if "instrument_type" in filters:
            criteria["instrument_type"] = filters["instrument_type"]
        
        # Deadline filters
        if "deadline_after" in filters:
            criteria["submission_end_gte"] = filters["deadline_after"]
        if "deadline_before" in filters:
            criteria["submission_end_lte"] = filters["deadline_before"]
        
        # Amount filters
        if "min_amount" in filters:
            criteria["total_amount_gte"] = filters["min_amount"]
        if "max_amount" in filters:
            criteria["total_amount_lte"] = filters["max_amount"]
        
        # TRL filters
        if "trl_min" in filters:
            criteria["trl_min_lte"] = filters["trl_min"]
        if "trl_max" in filters:
            criteria["trl_max_gte"] = filters["trl_max"]
        
        # Institution filter (partial match)
        if "institution" in filters:
            criteria["institution_like"] = filters["institution"]
        
        # Search filter
        if "search" in filters:
            criteria["search_text"] = filters["search"]
        
        # Apply institute scoping when provided
        if institute_ids:
            criteria["institute_ids"] = institute_ids

        # Execute query with pagination
        results = await self.funding_repository.find_by_criteria(
            criteria,
            skip=skip,
            limit=limit
        )
        
        # Get total count for pagination
        total = await self.funding_repository.count_by_criteria(criteria)
        
        logger.info(f"Found {len(results)} funding sources (total: {total})")
        
        return results, total
    
    async def create_funding_source(
        self,
        funding_data: Dict[str, Any],
        tenant_id: UUID,
        user_id: UUID,
        edital_text: Optional[str] = None
    ) -> FundingSource:
        """
        Create a new funding source with optional AI extraction from edital text.
        
        Args:
            funding_data: Base funding data
            tenant_id: Tenant ID for multi-tenancy
            user_id: User creating the funding
            edital_text: Optional text from the edital for AI extraction
        """
        # If edital text provided, use AI to suggest field values
        if edital_text:
            logger.info("Running AI extraction on edital text")
            ai_suggestions = await self.ai_extractor.extract_funding_fields(
                edital_text
            )
            
            # Merge AI suggestions with provided data
            # Human-provided data takes precedence
            for field, value in ai_suggestions["extracted_fields"].items():
                if field not in funding_data and value is not None:
                    funding_data[field] = value
            
            funding_data["ai_extracted_data"] = ai_suggestions["extracted_fields"]
            funding_data["ai_confidence_score"] = ai_suggestions["confidence"]
        
        # Create entity
        funding = FundingSource(
            **funding_data,
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id
        )
        
        # Persist
        saved_funding = await self.funding_repository.create(funding)
        
        # Audit
        await self.audit_service.log_creation(
            entity_type="FundingSource",
            entity_id=saved_funding.id,
            user_id=user_id,
            tenant_id=tenant_id,
            after_state=saved_funding.model_dump()
        )
        
        return saved_funding
    
    async def update_funding_source(
        self,
        funding_id: UUID,
        updates: Dict[str, Any],
        user_id: UUID,
        tenant_id: UUID
    ) -> FundingSource:
        """Update an existing funding source."""
        # Get current state
        current = await self.funding_repository.get_by_id(
            funding_id, tenant_id
        )
        
        if not current:
            raise ValueError(f"Funding source {funding_id} not found")
        
        before_state = current.model_dump()
        
        # Apply updates
        for key, value in updates.items():
            if hasattr(current, key):
                setattr(current, key, value)
        
        current.updated_by = user_id
        current.updated_at = datetime.utcnow()
        
        # Persist
        updated = await self.funding_repository.update(current)
        
        # Audit
        await self.audit_service.log_update(
            entity_type="FundingSource",
            entity_id=funding_id,
            user_id=user_id,
            tenant_id=tenant_id,
            before_state=before_state,
            after_state=updated.model_dump()
        )
        
        return updated
    
    async def get_open_funding_sources(
        self,
        tenant_id: UUID,
        trl_min: Optional[int] = None,
        trl_max: Optional[int] = None
    ) -> List[FundingSource]:
        """
        Get all open funding sources, optionally filtered by TRL.
        """
        filters = {
            "status": FundingStatus.OPEN,
            "tenant_id": tenant_id
        }
        
        if trl_min:
            filters["trl_min_lte"] = trl_min
        if trl_max:
            filters["trl_max_gte"] = trl_max

        # Note: repository supports institute scoping via `institute_ids` in criteria
        return await self.funding_repository.find_by_criteria(filters)
    
    async def soft_delete_funding(
        self,
        funding_id: UUID,
        user_id: UUID,
        tenant_id: UUID
    ) -> None:
        """Soft delete a funding source."""
        funding = await self.funding_repository.get_by_id(funding_id, tenant_id)
        
        if not funding:
            raise ValueError(f"Funding source {funding_id} not found")
        
        before_state = funding.model_dump()
        
        funding.soft_delete(user_id)
        await self.funding_repository.update(funding)
        
        # Audit
        await self.audit_service.log_delete(
            entity_type="FundingSource",
            entity_id=funding_id,
            user_id=user_id,
            tenant_id=tenant_id,
            before_state=before_state
        )
