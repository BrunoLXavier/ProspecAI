# Implements RF-08: Git-like Versioning for Proposals
"""
Proposal Version Repository Implementation
PostgreSQL repository for proposal versions with Git-like versioning
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from domain.entities.proposal import ProposalVersion
from adapters.database.models import ProposalVersionModel

import logging

logger = logging.getLogger(__name__)


class ProposalVersionRepository:
    """
    Concrete repository for ProposalVersion entities.
    Handles CRUD operations with multi-tenant isolation.
    Implements RF-08: Git-like versioning for proposals.
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create(self, version: ProposalVersion) -> ProposalVersion:
        """
        Create a new proposal version.
        """
        # Handle changes_summary - entity has Optional[str], model expects JSONB
        changes_summary_dict = {}
        if version.changes_summary:
            if isinstance(version.changes_summary, dict):
                changes_summary_dict = version.changes_summary
            elif isinstance(version.changes_summary, str):
                changes_summary_dict = {"description": version.changes_summary}
        
        model = ProposalVersionModel(
            id=version.id,
            tenant_id=version.tenant_id,
            proposal_id=version.proposal_id,
            version_number=version.version_number,
            parent_version_id=version.parent_version_id,
            title=version.title,
            content=version.content,
            attachments=version.attachments or [],
            author_id=version.author_id,
            commit_message=version.commit_message,
            changes_summary=changes_summary_dict,
            adherence_score=version.adherence_score,
            adherence_details=version.adherence_analysis or {},
            created_by=version.created_by,
            updated_by=version.updated_by,
        )
        
        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        
        return self._to_entity(model)
    
    async def get_by_id(
        self, 
        version_id: UUID, 
        tenant_id: UUID
    ) -> Optional[ProposalVersion]:
        """
        Get version by ID with tenant isolation.
        """
        stmt = select(ProposalVersionModel).where(
            and_(
                ProposalVersionModel.id == version_id,
                ProposalVersionModel.tenant_id == tenant_id,
                ProposalVersionModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        
        return self._to_entity(model) if model else None
    
    async def update(self, version: ProposalVersion) -> ProposalVersion:
        """
        Update an existing proposal version.
        """
        stmt = select(ProposalVersionModel).where(
            and_(
                ProposalVersionModel.id == version.id,
                ProposalVersionModel.tenant_id == version.tenant_id,
                ProposalVersionModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        
        if not model:
            raise ValueError(f"ProposalVersion {version.id} not found")
        
        # Update fields
        model.title = version.title
        model.content = version.content
        model.attachments = version.attachments or []
        model.commit_message = version.commit_message
        model.changes_summary = version.changes_summary or {}
        model.adherence_score = version.adherence_score
        model.adherence_details = version.adherence_analysis or {}
        model.updated_by = version.updated_by
        model.updated_at = datetime.utcnow()
        
        await self.session.commit()
        await self.session.refresh(model)
        
        return self._to_entity(model)
    
    async def find_by_criteria(
        self,
        criteria: Dict[str, Any],
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None
    ) -> List[ProposalVersion]:
        """
        Find versions by flexible criteria.
        Supports: proposal_id, tenant_id, version_number, author_id
        """
        conditions = [ProposalVersionModel.deleted_at.is_(None)]
        
        for key, value in criteria.items():
            if value is None:
                continue
            if hasattr(ProposalVersionModel, key):
                conditions.append(getattr(ProposalVersionModel, key) == value)
        
        stmt = select(ProposalVersionModel).where(and_(*conditions))
        
        # Apply ordering
        if order_by:
            if order_by.startswith("-"):
                stmt = stmt.order_by(desc(getattr(ProposalVersionModel, order_by[1:])))
            else:
                stmt = stmt.order_by(getattr(ProposalVersionModel, order_by))
        else:
            stmt = stmt.order_by(desc(ProposalVersionModel.version_number))
        
        stmt = stmt.offset(skip).limit(limit)
        
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        
        return [self._to_entity(m) for m in models]
    
    async def get_version_history(
        self,
        proposal_id: UUID,
        tenant_id: UUID,
        limit: int = 20
    ) -> List[ProposalVersion]:
        """
        Get version history for a proposal (git log-like).
        Returns versions ordered by version_number descending.
        """
        return await self.find_by_criteria(
            criteria={"proposal_id": proposal_id, "tenant_id": tenant_id},
            limit=limit,
            order_by="-version_number"
        )
    
    async def get_latest_version(
        self,
        proposal_id: UUID,
        tenant_id: UUID
    ) -> Optional[ProposalVersion]:
        """
        Get the latest version of a proposal.
        """
        versions = await self.find_by_criteria(
            criteria={"proposal_id": proposal_id, "tenant_id": tenant_id},
            limit=1,
            order_by="-version_number"
        )
        return versions[0] if versions else None
    
    async def get_version_by_number(
        self,
        proposal_id: UUID,
        tenant_id: UUID,
        version_number: int
    ) -> Optional[ProposalVersion]:
        """
        Get a specific version by its version number.
        """
        versions = await self.find_by_criteria(
            criteria={
                "proposal_id": proposal_id,
                "tenant_id": tenant_id,
                "version_number": version_number
            },
            limit=1
        )
        return versions[0] if versions else None
    
    def _to_entity(self, model: ProposalVersionModel) -> ProposalVersion:
        """
        Convert database model to domain entity.
        """
        import json
        
        # Handle changes_summary - model has JSONB, entity expects Optional[str]
        changes_summary = None
        if model.changes_summary:
            if isinstance(model.changes_summary, str):
                changes_summary = model.changes_summary
            elif isinstance(model.changes_summary, dict):
                # Convert dict to string representation if needed
                changes_summary = json.dumps(model.changes_summary) if model.changes_summary else None
        
        # Handle content - may be JSONB in older records or Text in newer ones
        content = model.content
        if content is not None and not isinstance(content, str):
            # Convert dict/JSONB to string
            if isinstance(content, dict):
                content = json.dumps(content)
            else:
                content = str(content)
        content = content or ""
        
        return ProposalVersion(
            id=model.id,
            tenant_id=model.tenant_id,
            proposal_id=model.proposal_id,
            version_number=model.version_number,
            parent_version_id=model.parent_version_id,
            title=model.title or "Sem título",
            content=content,
            attachments=model.attachments or [],
            author_id=model.author_id,
            commit_message=model.commit_message or "Versão inicial",
            changes_summary=changes_summary,
            adherence_score=float(model.adherence_score) if model.adherence_score else None,
            adherence_analysis=model.adherence_details,
            created_by=model.created_by,
            updated_by=model.updated_by,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
