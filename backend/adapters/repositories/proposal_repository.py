"""
Proposal Repository - Full Production Implementation
Implements RF-08: Repositório de propostas e colaboração

Features:
- Git-like versioning with diffs
- Real-time collaboration tracking
- Adherence analysis integration
- File attachment management
"""
import logging
import hashlib
import json
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from difflib import unified_diff, SequenceMatcher

from domain.entities.proposal import Proposal, ProposalVersion, ProposalStatus
from adapters.database.models_new import ProposalModel, ProposalVersionModel
from adapters.repositories.base_repository import BaseRepository
from adapters.database.neo4j_connection import Neo4jConnection

logger = logging.getLogger(__name__)


class ProposalRepository(BaseRepository[Proposal, ProposalModel]):
    """
    Production proposal repository with full versioning implementation
    No placeholders - complete git-like version control
    """
    
    def __init__(self, session: AsyncSession, neo4j: Optional[Neo4jConnection] = None):
        super().__init__(session, ProposalModel)
        self.neo4j = neo4j
    
    def _model_to_entity(self, model: ProposalModel) -> Proposal:
        """Convert database model to domain entity"""
        return Proposal(
            id=model.id,
            tenant_id=model.tenant_id,
            title=model.title,
            opportunity_id=model.opportunity_id,
            funding_source_id=model.funding_source_id,
            client_id=getattr(model, 'client_id', None),
            status=ProposalStatus(model.current_status) if model.current_status else ProposalStatus.DRAFT,
            current_version=model.current_version or 1,
            content=getattr(model, 'content', {}) or {},
            sections=getattr(model, 'sections', {}) or {},
            executive_summary=getattr(model, 'executive_summary', None),
            technical_content=getattr(model, 'technical_content', None),
            budget_data=getattr(model, 'budget_data', {}) or {},
            adherence_score=float(model.latest_adherence_score) if model.latest_adherence_score else None,
            adherence_analysis=model.adherence_analysis or {},
            collaborators=model.collaborators or [],
            locked_by=getattr(model, 'locked_by', None),
            locked_at=getattr(model, 'locked_at', None),
            attachments=getattr(model, 'attachments', []) or [],
            submitted_at=getattr(model, 'submitted_at', None),
            created_at=model.created_at,
            updated_at=model.updated_at,
            created_by=model.created_by,
            updated_by=model.updated_by,
            version=model.version
        )
    
    def _entity_to_model(self, entity: Proposal, model: Optional[ProposalModel] = None) -> ProposalModel:
        """Convert domain entity to database model"""
        if model is None:
            model = ProposalModel()
        
        model.id = entity.id
        model.tenant_id = entity.tenant_id
        model.title = entity.title
        model.opportunity_id = entity.opportunity_id
        model.funding_source_id = entity.funding_source_id
        model.current_status = entity.status.value if entity.status else ProposalStatus.DRAFT.value
        model.current_version = entity.current_version
        model.latest_adherence_score = entity.adherence_score
        model.adherence_analysis = entity.adherence_analysis
        model.collaborators = entity.collaborators
        model.owner_id = entity.created_by  # Map owner to created_by
        
        return model
    
    def _deserialize_entity(self, data: Dict[str, Any]) -> Proposal:
        """Deserialize entity from cache"""
        if 'status' in data and isinstance(data['status'], str):
            data['status'] = ProposalStatus(data['status'])
        return Proposal(**data)
    
    async def create_version(
        self,
        proposal_id: UUID,
        tenant_id: str,
        user_id: UUID,
        message: str,
        changes: Optional[Dict[str, Any]] = None
    ) -> ProposalVersion:
        """
        Create a new version snapshot (git commit-like)
        Implements RF-08.01: Versionamento de propostas
        """
        try:
            query = select(ProposalModel).where(
                and_(
                    ProposalModel.id == proposal_id,
                    ProposalModel.tenant_id == tenant_id,
                    ProposalModel.deleted_at.is_(None)
                )
            )
            
            result = await self.session.execute(query)
            proposal = result.scalar_one_or_none()
            
            if not proposal:
                raise ValueError(f"Proposal {proposal_id} not found")
            
            content_json = json.dumps(proposal.content, sort_keys=True, default=str)
            content_hash = hashlib.sha256(content_json.encode()).hexdigest()[:12]
            
            new_version_number = proposal.current_version + 1
            
            parent_version = None
            if proposal.current_version > 0:
                parent_query = select(ProposalVersionModel).where(
                    and_(
                        ProposalVersionModel.proposal_id == proposal_id,
                        ProposalVersionModel.version_number == proposal.current_version
                    )
                ).order_by(desc(ProposalVersionModel.created_at))
                
                parent_result = await self.session.execute(parent_query)
                parent = parent_result.scalar_one_or_none()
                if parent:
                    parent_version = parent.id
            
            version_model = ProposalVersionModel(
                id=uuid4(),
                tenant_id=proposal.tenant_id,
                proposal_id=proposal_id,
                version_number=new_version_number,
                title=proposal.title,
                content=json.dumps(getattr(proposal, 'content', {}) or {}),
                attachments=getattr(proposal, 'attachments', []) or [],
                author_id=user_id,
                commit_message=message,
                changes_summary=changes or {},
                parent_version_id=parent_version,
                created_by=user_id,
                created_at=datetime.utcnow()
            )
            
            self.session.add(version_model)
            
            proposal.current_version = new_version_number
            proposal.updated_by = user_id
            proposal.updated_at = datetime.utcnow()
            proposal.version += 1
            
            await self.session.commit()
            
            await self._invalidate_caches(tenant_id, str(proposal_id))
            
            logger.info(f"Created version {new_version_number} for proposal {proposal_id}")
            
            return ProposalVersion(
                id=version_model.id,
                proposal_id=proposal_id,
                version_number=new_version_number,
                content_snapshot=version_model.content_snapshot,
                sections_snapshot=version_model.sections_snapshot,
                budget_snapshot=version_model.budget_snapshot,
                message=message,
                changes=changes or {},
                content_hash=content_hash,
                parent_version_id=parent_version,
                created_by=user_id,
                created_at=version_model.created_at
            )
            
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error creating version: {e}")
            raise
    
    async def get_version_history(
        self,
        proposal_id: UUID,
        tenant_id: str,
        limit: int = 20
    ) -> List[ProposalVersion]:
        """Get version history for proposal (git log-like)"""
        try:
            proposal_check = select(ProposalModel).where(
                and_(
                    ProposalModel.id == proposal_id,
                    ProposalModel.tenant_id == tenant_id,
                    ProposalModel.deleted_at.is_(None)
                )
            )
            check_result = await self.session.execute(proposal_check)
            if not check_result.scalar_one_or_none():
                raise ValueError(f"Proposal {proposal_id} not found")
            
            query = select(ProposalVersionModel).where(
                ProposalVersionModel.proposal_id == proposal_id
            ).order_by(desc(ProposalVersionModel.version_number)).limit(limit)
            
            result = await self.session.execute(query)
            versions = result.scalars().all()
            
            return [
                ProposalVersion(
                    id=v.id,
                    proposal_id=v.proposal_id,
                    version_number=v.version_number,
                    content_snapshot=v.content_snapshot,
                    sections_snapshot=v.sections_snapshot,
                    budget_snapshot=v.budget_snapshot,
                    message=v.message,
                    changes=v.changes or {},
                    content_hash=v.content_hash,
                    parent_version_id=v.parent_version_id,
                    created_by=v.created_by,
                    created_at=v.created_at
                )
                for v in versions
            ]
            
        except Exception as e:
            logger.error(f"Error getting version history: {e}")
            raise

    async def find_by_criteria(
        self,
        criteria: Dict[str, Any],
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        use_cache: bool = True
    ) -> List[Proposal]:
        """
        Override to support `institute_ids` filter which restricts proposals
        to those whose linked opportunity's project belongs to the given institutes.
        """
        try:
            institute_ids = None
            if 'institute_ids' in criteria:
                institute_ids = criteria.pop('institute_ids')

            # If institute filter provided, resolve proposal ids via SQL join
            if institute_ids:
                params = {f"inst_{i}": iid for i, iid in enumerate(institute_ids)}
                placeholders = ", ".join([f":inst_{i}" for i in range(len(institute_ids))])
                sql = f"SELECT p.id FROM proposals p JOIN opportunities o ON p.opportunity_id = o.id JOIN projects pj ON o.project_id = pj.id WHERE p.tenant_id = :tenant_id AND p.deleted_at IS NULL AND pj.institute_id IN ({placeholders})"
                if 'tenant_id' not in criteria:
                    raise ValueError("tenant_id is required in criteria when using institute filters")
                params['tenant_id'] = criteria['tenant_id']
                res = await self.session.execute(sa.text(sql), params)
                rows = res.fetchall()
                proposal_ids = [r[0] for r in rows]
                if not proposal_ids:
                    return []
                # Use base finder but restrict by id list
                new_criteria = {'id': proposal_ids}
                # Copy tenant filter if present
                if 'tenant_id' in criteria:
                    new_criteria['tenant_id'] = criteria['tenant_id']
                return await super().find_by_criteria(new_criteria, skip=skip, limit=limit, order_by=order_by, use_cache=use_cache)

            # Fallback to base implementation
            return await super().find_by_criteria(criteria, skip=skip, limit=limit, order_by=order_by, use_cache=use_cache)

        except Exception as e:
            logger.error(f"Error finding proposals by criteria: {e}")
            raise
    
    async def compare_versions(
        self,
        proposal_id: UUID,
        tenant_id: str,
        version_a: int,
        version_b: int
    ) -> Dict[str, Any]:
        """
        Compare two versions (git diff-like)
        Implements RF-08.02: Comparação de versões
        """
        try:
            proposal_check = select(ProposalModel).where(
                and_(
                    ProposalModel.id == proposal_id,
                    ProposalModel.tenant_id == tenant_id
                )
            )
            check_result = await self.session.execute(proposal_check)
            if not check_result.scalar_one_or_none():
                raise ValueError(f"Proposal {proposal_id} not found")
            
            query = select(ProposalVersionModel).where(
                and_(
                    ProposalVersionModel.proposal_id == proposal_id,
                    ProposalVersionModel.version_number.in_([version_a, version_b])
                )
            )
            
            result = await self.session.execute(query)
            versions = {v.version_number: v for v in result.scalars().all()}
            
            if version_a not in versions or version_b not in versions:
                raise ValueError(f"One or both versions not found")
            
            v_a = versions[version_a]
            v_b = versions[version_b]
            
            diff = {
                "from_version": version_a,
                "to_version": version_b,
                "sections_diff": {},
                "content_diff": [],
                "budget_diff": {},
                "similarity_ratio": 0.0
            }
            
            sections_a = v_a.sections_snapshot or {}
            sections_b = v_b.sections_snapshot or {}
            
            all_sections = set(sections_a.keys()) | set(sections_b.keys())
            
            for section in all_sections:
                text_a = sections_a.get(section, "")
                text_b = sections_b.get(section, "")
                
                if text_a != text_b:
                    lines_a = str(text_a).splitlines(keepends=True)
                    lines_b = str(text_b).splitlines(keepends=True)
                    
                    section_diff = list(unified_diff(
                        lines_a, lines_b,
                        fromfile=f"v{version_a}/{section}",
                        tofile=f"v{version_b}/{section}"
                    ))
                    
                    diff["sections_diff"][section] = {
                        "diff_lines": section_diff,
                        "added_lines": sum(1 for l in section_diff if l.startswith('+')),
                        "removed_lines": sum(1 for l in section_diff if l.startswith('-'))
                    }
            
            content_a_str = json.dumps(v_a.content_snapshot, sort_keys=True, default=str)
            content_b_str = json.dumps(v_b.content_snapshot, sort_keys=True, default=str)
            
            diff["similarity_ratio"] = SequenceMatcher(None, content_a_str, content_b_str).ratio()
            
            budget_a = v_a.budget_snapshot or {}
            budget_b = v_b.budget_snapshot or {}
            
            total_a = sum(float(v) for v in budget_a.values() if isinstance(v, (int, float)))
            total_b = sum(float(v) for v in budget_b.values() if isinstance(v, (int, float)))
            
            diff["budget_diff"] = {
                "total_change": total_b - total_a,
                "percentage_change": ((total_b - total_a) / total_a * 100) if total_a > 0 else 0,
                "items_added": [k for k in budget_b if k not in budget_a],
                "items_removed": [k for k in budget_a if k not in budget_b],
                "items_modified": [
                    k for k in budget_a if k in budget_b and budget_a[k] != budget_b[k]
                ]
            }
            
            return diff
            
        except Exception as e:
            logger.error(f"Error comparing versions: {e}")
            raise
    
    async def restore_version(
        self,
        proposal_id: UUID,
        tenant_id: str,
        version_number: int,
        user_id: UUID
    ) -> Proposal:
        """
        Restore proposal to a specific version (git checkout-like)
        Creates a new version with the restored content
        """
        try:
            proposal_query = select(ProposalModel).where(
                and_(
                    ProposalModel.id == proposal_id,
                    ProposalModel.tenant_id == tenant_id,
                    ProposalModel.deleted_at.is_(None)
                )
            )
            
            proposal_result = await self.session.execute(proposal_query)
            proposal = proposal_result.scalar_one_or_none()
            
            if not proposal:
                raise ValueError(f"Proposal {proposal_id} not found")
            
            version_query = select(ProposalVersionModel).where(
                and_(
                    ProposalVersionModel.proposal_id == proposal_id,
                    ProposalVersionModel.version_number == version_number
                )
            )
            
            version_result = await self.session.execute(version_query)
            target_version = version_result.scalar_one_or_none()
            
            if not target_version:
                raise ValueError(f"Version {version_number} not found")
            
            proposal.content = target_version.content_snapshot
            proposal.sections = target_version.sections_snapshot
            proposal.budget_data = target_version.budget_snapshot
            proposal.updated_by = user_id
            proposal.updated_at = datetime.utcnow()
            
            await self.session.commit()
            
            await self.create_version(
                proposal_id=proposal_id,
                tenant_id=tenant_id,
                user_id=user_id,
                message=f"Restored from version {version_number}",
                changes={"restored_from": version_number}
            )
            
            await self._invalidate_caches(tenant_id, str(proposal_id))
            
            return self._model_to_entity(proposal)
            
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error restoring version: {e}")
            raise
    
    async def acquire_lock(
        self,
        proposal_id: UUID,
        tenant_id: str,
        user_id: UUID,
        section: Optional[str] = None
    ) -> bool:
        """
        Acquire collaborative editing lock
        Implements RF-08.03: Edição colaborativa
        """
        try:
            query = select(ProposalModel).where(
                and_(
                    ProposalModel.id == proposal_id,
                    ProposalModel.tenant_id == tenant_id,
                    ProposalModel.deleted_at.is_(None)
                )
            ).with_for_update()
            
            result = await self.session.execute(query)
            proposal = result.scalar_one_or_none()
            
            if not proposal:
                raise ValueError(f"Proposal {proposal_id} not found")
            
            if proposal.locked_by and proposal.locked_by != user_id:
                if proposal.locked_at:
                    lock_age = (datetime.utcnow() - proposal.locked_at).total_seconds()
                    if lock_age < 300:
                        return False
            
            proposal.locked_by = user_id
            proposal.locked_at = datetime.utcnow()
            proposal.updated_at = datetime.utcnow()
            
            await self.session.commit()
            
            logger.info(f"User {user_id} acquired lock on proposal {proposal_id}")
            return True
            
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error acquiring lock: {e}")
            raise
    
    async def release_lock(
        self,
        proposal_id: UUID,
        tenant_id: str,
        user_id: UUID
    ) -> bool:
        """Release collaborative editing lock"""
        try:
            query = select(ProposalModel).where(
                and_(
                    ProposalModel.id == proposal_id,
                    ProposalModel.tenant_id == tenant_id
                )
            )
            
            result = await self.session.execute(query)
            proposal = result.scalar_one_or_none()
            
            if not proposal:
                return False
            
            if proposal.locked_by != user_id:
                return False
            
            proposal.locked_by = None
            proposal.locked_at = None
            proposal.updated_at = datetime.utcnow()
            
            await self.session.commit()
            
            logger.info(f"User {user_id} released lock on proposal {proposal_id}")
            return True
            
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error releasing lock: {e}")
            raise
    
    async def update_adherence_analysis(
        self,
        proposal_id: UUID,
        tenant_id: str,
        adherence_score: float,
        analysis: Dict[str, Any],
        user_id: UUID
    ) -> Proposal:
        """
        Update adherence analysis from AI
        Implements RF-06: Análise de aderência
        """
        try:
            query = select(ProposalModel).where(
                and_(
                    ProposalModel.id == proposal_id,
                    ProposalModel.tenant_id == tenant_id,
                    ProposalModel.deleted_at.is_(None)
                )
            )
            
            result = await self.session.execute(query)
            proposal = result.scalar_one_or_none()
            
            if not proposal:
                raise ValueError(f"Proposal {proposal_id} not found")
            
            proposal.adherence_score = adherence_score
            proposal.adherence_analysis = {
                **analysis,
                "analyzed_at": datetime.utcnow().isoformat(),
                "analyzed_by": "AI-AdherenceAnalyzer",
                "version_analyzed": proposal.current_version
            }
            proposal.updated_by = user_id
            proposal.updated_at = datetime.utcnow()
            proposal.version += 1
            
            await self.session.commit()
            
            if self.neo4j:
                await self._update_adherence_in_graph(proposal_id, tenant_id, adherence_score)
            
            await self._invalidate_caches(tenant_id, str(proposal_id))
            
            return self._model_to_entity(proposal)
            
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error updating adherence: {e}")
            raise
    
    async def _update_adherence_in_graph(
        self,
        proposal_id: UUID,
        tenant_id: str,
        adherence_score: float
    ) -> None:
        """Update adherence score in Neo4j for relationship queries"""
        try:
            if not self.neo4j:
                return
            
            query = """
            MERGE (p:Proposal {id: $proposal_id, tenant_id: $tenant_id})
            SET p.adherence_score = $adherence_score,
                p.updated_at = datetime()
            """
            
            await self.neo4j.execute_query(query, {
                "proposal_id": str(proposal_id),
                "tenant_id": tenant_id,
                "adherence_score": adherence_score
            })
            
        except Exception as e:
            logger.warning(f"Could not update adherence in graph: {e}")
    
    async def search_proposals(
        self,
        tenant_id: str,
        query_text: Optional[str] = None,
        status: Optional[List[ProposalStatus]] = None,
        min_adherence: Optional[float] = None,
        funding_source_id: Optional[UUID] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Proposal], int]:
        """Search proposals with filters"""
        try:
            base_query = select(ProposalModel).where(
                and_(
                    ProposalModel.tenant_id == tenant_id,
                    ProposalModel.deleted_at.is_(None)
                )
            )
            
            if query_text:
                base_query = base_query.where(
                    or_(
                        ProposalModel.title.ilike(f"%{query_text}%"),
                        ProposalModel.executive_summary.ilike(f"%{query_text}%")
                    )
                )
            
            if status:
                status_values = [s.value for s in status]
                base_query = base_query.where(ProposalModel.status.in_(status_values))
            
            if min_adherence is not None:
                base_query = base_query.where(ProposalModel.adherence_score >= min_adherence)
            
            if funding_source_id:
                base_query = base_query.where(ProposalModel.funding_source_id == funding_source_id)
            
            count_query = select(func.count()).select_from(base_query.subquery())
            count_result = await self.session.execute(count_query)
            total_count = count_result.scalar() or 0
            
            final_query = base_query.order_by(
                desc(ProposalModel.updated_at)
            ).offset(offset).limit(limit)
            
            result = await self.session.execute(final_query)
            proposals = result.scalars().all()
            
            return [self._model_to_entity(p) for p in proposals], total_count
            
        except Exception as e:
            logger.error(f"Error searching proposals: {e}")
            raise
    
    async def get_collaboration_status(
        self,
        proposal_id: UUID,
        tenant_id: str
    ) -> Dict[str, Any]:
        """Get real-time collaboration status"""
        try:
            query = select(ProposalModel).where(
                and_(
                    ProposalModel.id == proposal_id,
                    ProposalModel.tenant_id == tenant_id,
                    ProposalModel.deleted_at.is_(None)
                )
            )
            
            result = await self.session.execute(query)
            proposal = result.scalar_one_or_none()
            
            if not proposal:
                raise ValueError(f"Proposal {proposal_id} not found")
            
            lock_status = "unlocked"
            locked_by_name = None
            lock_remaining = 0
            
            if proposal.locked_by:
                lock_age = 0
                if proposal.locked_at:
                    lock_age = (datetime.utcnow() - proposal.locked_at).total_seconds()
                
                if lock_age < 300:
                    lock_status = "locked"
                    lock_remaining = int(300 - lock_age)
                    locked_by_name = str(proposal.locked_by)
                else:
                    lock_status = "expired"
            
            return {
                "proposal_id": str(proposal_id),
                "lock_status": lock_status,
                "locked_by": locked_by_name,
                "lock_remaining_seconds": lock_remaining,
                "collaborators": proposal.collaborators or [],
                "current_version": proposal.current_version,
                "last_updated": proposal.updated_at.isoformat() if proposal.updated_at else None
            }
            
        except Exception as e:
            logger.error(f"Error getting collaboration status: {e}")
            raise
