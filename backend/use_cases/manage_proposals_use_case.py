# Implements RF-08: Gestão de Propostas e Conhecimento
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime
from domain.entities import Proposal, ProposalVersion, ProposalStatus
from domain.entities.proposal import (
    ProposalTemplate, ProposalFieldTemplate, ProposalFieldValue,
    ProposalAttachment, AttachmentStatus, FieldType, ProposalTemplateType,
    STANDARD_PROPOSAL_FIELDS
)
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
        template_repository=None,
        field_template_repository=None,
        field_value_repository=None,
        attachment_repository=None,
        suggestion_repository=None,
        ai_adherence_analyzer=None,
        collaboration_service=None,
        audit_service=None,
        auto_fill_service=None,
        report_service=None
    ):
        self.proposal_repository = proposal_repository
        self.version_repository = version_repository
        self.template_repository = template_repository
        self.field_template_repository = field_template_repository
        self.field_value_repository = field_value_repository
        self.attachment_repository = attachment_repository
        self.suggestion_repository = suggestion_repository
        self.ai_adherence_analyzer = ai_adherence_analyzer
        self.collaboration_service = collaboration_service
        self.audit_service = audit_service
        self.auto_fill_service = auto_fill_service
        self.report_service = report_service
    
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

    # ========================================================================
    # PROPOSAL TEMPLATE METHODS
    # Implements RF-08: Dynamic proposal fields based on funding source type
    # ========================================================================
    
    async def create_proposal_template(
        self,
        template_data: Dict[str, Any],
        fields: List[Dict[str, Any]],
        tenant_id: UUID,
        user_id: UUID
    ) -> ProposalTemplate:
        """
        Create a new proposal template with fields.
        Requires admin role (enforced by router via ACL).
        """
        # Create template
        template = ProposalTemplate(
            **template_data,
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id
        )
        
        saved_template = await self.template_repository.create(template)
        
        # Create field templates
        for idx, field_data in enumerate(fields):
            field_template = ProposalFieldTemplate(
                template_id=saved_template.id,
                order=field_data.get("order", idx),
                tenant_id=tenant_id,
                created_by=user_id,
                updated_by=user_id,
                **{k: v for k, v in field_data.items() if k != "order"}
            )
            await self.field_template_repository.create(field_template)
        
        await self.audit_service.log_creation(
            entity_type="ProposalTemplate",
            entity_id=saved_template.id,
            user_id=user_id,
            tenant_id=tenant_id,
            after_state={"template": template_data, "fields_count": len(fields)}
        )
        
        logger.info(f"Created proposal template {saved_template.id} with {len(fields)} fields")
        return saved_template
    
    async def get_template_for_funding_source(
        self,
        funding_source_id: Optional[UUID],
        tenant_id: UUID
    ) -> Dict[str, Any]:
        """
        Get template with fields for a given funding source.
        Returns standard fields + specific fields merged.
        """
        # Start with standard fields
        standard_fields = [
            ProposalFieldTemplate(
                template_id=None,
                tenant_id=tenant_id,
                created_by=None,
                updated_by=None,
                **field_data
            )
            for field_data in STANDARD_PROPOSAL_FIELDS
        ]
        
        template = None
        specific_fields = []
        
        if funding_source_id:
            # Find template for this funding source
            templates = await self.template_repository.find_by_criteria({
                "funding_source_id": funding_source_id,
                "is_active": True,
                "tenant_id": tenant_id
            })
            
            if templates:
                template = templates[0]
                specific_fields = await self.field_template_repository.find_by_criteria({
                    "template_id": template.id,
                    "tenant_id": tenant_id
                })
        
        # If no specific template, look for default generic
        if not template:
            templates = await self.template_repository.find_by_criteria({
                "is_default": True,
                "template_type": ProposalTemplateType.GENERIC.value,
                "is_active": True,
                "tenant_id": tenant_id
            })
            if templates:
                template = templates[0]
                specific_fields = await self.field_template_repository.find_by_criteria({
                    "template_id": template.id,
                    "tenant_id": tenant_id
                })
        
        # Merge fields (standard first, then specific, sorted by section/order)
        all_fields = []
        
        if template is None or template.include_standard_fields:
            all_fields.extend([f.model_dump() for f in standard_fields])
        
        all_fields.extend([f.model_dump() for f in specific_fields])
        
        # Sort by section order then field order
        sections_order = {"general": 1, "technical": 2, "budget": 3, "timeline": 4, "team": 5}
        all_fields.sort(key=lambda f: (sections_order.get(f["section"], 99), f["order"]))
        
        return {
            "template": template.model_dump() if template else None,
            "fields": all_fields,
            "sections": template.sections if template else [
                {"key": "general", "label": "Informações Gerais", "order": 1},
                {"key": "technical", "label": "Informações Técnicas", "order": 2},
                {"key": "budget", "label": "Orçamento", "order": 3},
                {"key": "timeline", "label": "Cronograma", "order": 4},
                {"key": "team", "label": "Equipe", "order": 5},
            ]
        }
    
    async def create_proposal_with_template(
        self,
        proposal_data: Dict[str, Any],
        field_values: Dict[str, Any],
        template_id: Optional[UUID],
        tenant_id: UUID,
        user_id: UUID
    ) -> Proposal:
        """
        Create proposal with dynamic field values based on template.
        """
        # Create base proposal
        proposal = Proposal(
            **proposal_data,
            template_id=template_id,
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
            content=field_values.get("executive_summary", ""),
            author_id=user_id,
            commit_message="Criação inicial da proposta",
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id
        )
        
        saved_version = await self.version_repository.create(initial_version)
        
        # Update proposal with version
        saved_proposal.current_version_id = saved_version.id
        saved_proposal.head_version_id = saved_version.id
        saved_proposal.current_version = 1
        await self.proposal_repository.update(saved_proposal)
        
        # Save field values
        for field_key, value in field_values.items():
            field_value = ProposalFieldValue(
                proposal_id=saved_proposal.id,
                version_id=saved_version.id,
                field_key=field_key,
                value=value,
                is_confirmed=True,  # User-entered values are confirmed
                confirmed_by=user_id,
                confirmed_at=datetime.utcnow(),
                tenant_id=tenant_id,
                created_by=user_id,
                updated_by=user_id
            )
            await self.field_value_repository.create(field_value)
        
        await self.audit_service.log_creation(
            entity_type="Proposal",
            entity_id=saved_proposal.id,
            user_id=user_id,
            tenant_id=tenant_id,
            after_state=saved_proposal.model_dump()
        )
        
        logger.info(f"Created proposal {saved_proposal.id} with {len(field_values)} field values")
        return saved_proposal
    
    async def update_proposal_with_version(
        self,
        proposal_id: UUID,
        field_values: Dict[str, Any],
        commit_message: str,
        changes_summary: Optional[str],
        tenant_id: UUID,
        user_id: UUID
    ) -> ProposalVersion:
        """
        Update proposal creating a new version (explicit commit).
        Commit message is required.
        """
        if not commit_message or len(commit_message.strip()) == 0:
            raise ValueError("Commit message is required for saving changes")
        
        proposal = await self.proposal_repository.get_by_id(proposal_id, tenant_id)
        if not proposal:
            raise ValueError(f"Proposal {proposal_id} not found")
        
        # Get current version
        current_version = await self.version_repository.get_by_id(
            proposal.current_version_id, tenant_id
        )
        
        # Create new version
        new_version = ProposalVersion(
            proposal_id=proposal_id,
            version_number=current_version.version_number + 1,
            parent_version_id=current_version.id,
            title=field_values.get("title", proposal.title),
            content=field_values.get("executive_summary", current_version.content),
            author_id=user_id,
            commit_message=commit_message,
            changes_summary=changes_summary,
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id
        )
        
        saved_version = await self.version_repository.create(new_version)
        
        # Update proposal
        proposal.current_version_id = saved_version.id
        proposal.head_version_id = saved_version.id
        proposal.current_version = saved_version.version_number
        proposal.title = field_values.get("title", proposal.title)
        proposal.updated_by = user_id
        proposal.updated_at = datetime.utcnow()
        
        await self.proposal_repository.update(proposal)
        
        # Save field values for new version
        for field_key, value in field_values.items():
            # Get previous value
            prev_values = await self.field_value_repository.find_by_criteria({
                "proposal_id": proposal_id,
                "field_key": field_key,
                "version_id": current_version.id,
                "tenant_id": tenant_id
            })
            previous_value = prev_values[0].value if prev_values else None
            
            field_value = ProposalFieldValue(
                proposal_id=proposal_id,
                version_id=saved_version.id,
                field_key=field_key,
                value=value,
                previous_value=previous_value,
                is_confirmed=True,
                confirmed_by=user_id,
                confirmed_at=datetime.utcnow(),
                tenant_id=tenant_id,
                created_by=user_id,
                updated_by=user_id
            )
            await self.field_value_repository.create(field_value)
        
        # Notify via WebSocket
        if self.collaboration_service:
            await self.collaboration_service.notify_version_update(
                proposal_id=proposal_id,
                version_number=saved_version.version_number,
                author_id=user_id
            )
        
        logger.info(f"Created version {saved_version.version_number} for proposal {proposal_id}")
        return saved_version
    
    async def get_proposal_field_values(
        self,
        proposal_id: UUID,
        version_id: Optional[UUID],
        tenant_id: UUID
    ) -> Dict[str, Any]:
        """Get all field values for a proposal version."""
        criteria = {
            "proposal_id": proposal_id,
            "tenant_id": tenant_id
        }
        if version_id:
            criteria["version_id"] = version_id
        
        field_values = await self.field_value_repository.find_by_criteria(criteria)
        
        # Convert to dict
        result = {}
        for fv in field_values:
            result[fv.field_key] = {
                "value": fv.value,
                "is_confirmed": fv.is_confirmed,
                "confidence": fv.extraction_confidence,
                "extracted_from": fv.extracted_from_file
            }
        
        return result
    
    # ========================================================================
    # ATTACHMENT AND AUTO-FILL METHODS
    # Implements RF-08: Auto-fill from uploaded documents via AI
    # ========================================================================
    
    async def upload_attachment(
        self,
        proposal_id: UUID,
        file_key: str,
        file_name: str,
        file_type: str,
        file_size: int,
        tenant_id: UUID,
        user_id: UUID,
        trigger_auto_fill: bool = True
    ) -> ProposalAttachment:
        """
        Upload attachment and optionally trigger auto-fill extraction.
        """
        proposal = await self.proposal_repository.get_by_id(proposal_id, tenant_id)
        if not proposal:
            raise ValueError(f"Proposal {proposal_id} not found")
        
        attachment = ProposalAttachment(
            proposal_id=proposal_id,
            version_id=proposal.current_version_id,
            file_key=file_key,
            file_name=file_name,
            file_type=file_type,
            file_size=file_size,
            extraction_status=AttachmentStatus.PENDING,
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id
        )
        
        saved_attachment = await self.attachment_repository.create(attachment)
        
        if trigger_auto_fill and self.auto_fill_service:
            # Publish to Kafka for async processing
            await self.auto_fill_service.request_extraction(
                attachment_id=saved_attachment.id,
                proposal_id=proposal_id,
                file_key=file_key,
                file_type=file_type,
                tenant_id=tenant_id
            )
            
            logger.info(f"Triggered auto-fill extraction for attachment {saved_attachment.id}")
        
        return saved_attachment
    
    async def get_auto_fill_suggestions(
        self,
        proposal_id: UUID,
        tenant_id: UUID
    ) -> List[Dict[str, Any]]:
        """Get pending auto-fill suggestions for a proposal."""
        suggestions = await self.suggestion_repository.find_by_criteria({
            "proposal_id": proposal_id,
            "status": "pending",
            "tenant_id": tenant_id
        })
        
        return [
            {
                "id": str(s.id),
                "field_key": s.field_key,
                "suggested_value": s.suggested_value,
                "confidence_score": float(s.confidence_score) if s.confidence_score else 0,
                "source_text": s.source_text,
                "source_page": s.source_page,
                "confidence_badge": (
                    "green" if s.confidence_score >= 0.8
                    else "yellow" if s.confidence_score >= 0.6
                    else "red"
                )
            }
            for s in suggestions
        ]
    
    async def confirm_auto_fill_suggestion(
        self,
        suggestion_id: UUID,
        accepted: bool,
        tenant_id: UUID,
        user_id: UUID
    ) -> bool:
        """Accept or reject an auto-fill suggestion."""
        suggestion = await self.suggestion_repository.get_by_id(suggestion_id, tenant_id)
        if not suggestion:
            raise ValueError(f"Suggestion {suggestion_id} not found")
        
        suggestion.status = "accepted" if accepted else "rejected"
        suggestion.decided_by = user_id
        suggestion.decided_at = datetime.utcnow()
        suggestion.updated_by = user_id
        suggestion.updated_at = datetime.utcnow()
        
        await self.suggestion_repository.update(suggestion)
        
        if accepted:
            # Save as field value
            proposal = await self.proposal_repository.get_by_id(
                suggestion.proposal_id, tenant_id
            )
            
            field_value = ProposalFieldValue(
                proposal_id=suggestion.proposal_id,
                version_id=proposal.current_version_id,
                field_key=suggestion.field_key,
                value=suggestion.suggested_value,
                extracted_from_file=str(suggestion.attachment_id),
                extraction_confidence=suggestion.confidence_score,
                is_confirmed=True,
                confirmed_by=user_id,
                confirmed_at=datetime.utcnow(),
                tenant_id=tenant_id,
                created_by=user_id,
                updated_by=user_id
            )
            await self.field_value_repository.create(field_value)
            
            logger.info(f"Applied auto-fill suggestion {suggestion_id} to field {suggestion.field_key}")
        
        return True
    
    async def confirm_all_auto_fill_suggestions(
        self,
        proposal_id: UUID,
        accepted_ids: List[UUID],
        rejected_ids: List[UUID],
        tenant_id: UUID,
        user_id: UUID
    ) -> Dict[str, int]:
        """Bulk confirm/reject auto-fill suggestions."""
        accepted_count = 0
        rejected_count = 0
        
        for sid in accepted_ids:
            try:
                await self.confirm_auto_fill_suggestion(sid, True, tenant_id, user_id)
                accepted_count += 1
            except Exception as e:
                logger.warning(f"Failed to accept suggestion {sid}: {e}")
        
        for sid in rejected_ids:
            try:
                await self.confirm_auto_fill_suggestion(sid, False, tenant_id, user_id)
                rejected_count += 1
            except Exception as e:
                logger.warning(f"Failed to reject suggestion {sid}: {e}")
        
        return {"accepted": accepted_count, "rejected": rejected_count}
    
    async def get_proposal_attachments(
        self,
        proposal_id: UUID,
        tenant_id: UUID
    ) -> List[ProposalAttachment]:
        """Get all attachments for a proposal."""
        return await self.attachment_repository.find_by_criteria({
            "proposal_id": proposal_id,
            "tenant_id": tenant_id
        })
    
    # ========================================================================
    # REPORT GENERATION METHODS
    # Implements RF-08: Generate proposal reports in PDF/DOCX
    # ========================================================================
    
    async def generate_proposal_report(
        self,
        proposal_id: UUID,
        format_type: str,  # "pdf" or "docx"
        report_template_id: Optional[UUID],
        tenant_id: UUID,
        user_id: UUID
    ) -> Dict[str, str]:
        """
        Generate proposal report in specified format.
        Returns MinIO presigned URL for download.
        """
        proposal = await self.proposal_repository.get_by_id(proposal_id, tenant_id)
        if not proposal:
            raise ValueError(f"Proposal {proposal_id} not found")
        
        # Get field values
        field_values = await self.get_proposal_field_values(
            proposal_id, proposal.current_version_id, tenant_id
        )
        
        # Get template info
        template_info = await self.get_template_for_funding_source(
            proposal.funding_source_id, tenant_id
        )
        
        # Get version history
        versions = await self.get_proposal_history(proposal_id, tenant_id)
        
        # Prepare report data
        report_data = {
            "proposal": proposal.model_dump(),
            "field_values": {k: v["value"] for k, v in field_values.items()},
            "template": template_info,
            "versions": [v.model_dump() for v in versions],
            "generated_at": datetime.utcnow().isoformat(),
            "generated_by": str(user_id)
        }
        
        # Generate report via report service
        report_result = await self.report_service.generate_proposal_report(
            report_data=report_data,
            format_type=format_type,
            template_id=report_template_id,
            tenant_id=tenant_id
        )
        
        logger.info(f"Generated {format_type} report for proposal {proposal_id}")
        
        return report_result