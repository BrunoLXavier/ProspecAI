"""
Opportunity Repository - Full Production Implementation
Implements RF-05: Pipeline de Oportunidades with caching and graph queries

Features:
- Multi-layer caching integration
- Pipeline stage management
- Priority scoring with AI
- Neo4j relationship tracking
"""
import logging
import math
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from uuid import UUID
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from domain.entities.opportunity import Opportunity, OpportunityStage
from adapters.database.models_new import OpportunityModel, ClientModel, FundingSourceModel
from adapters.repositories.base_repository import BaseRepository
from adapters.database.neo4j_connection import Neo4jConnection

logger = logging.getLogger(__name__)


class OpportunityRepository(BaseRepository[Opportunity, OpportunityModel]):
    """
    Production opportunity repository with full implementation
    No placeholders - complete business logic
    """
    
    def __init__(self, session: AsyncSession, neo4j: Optional[Neo4jConnection] = None):
        super().__init__(session, OpportunityModel)
        self.neo4j = neo4j
    
    def _model_to_entity(self, model: OpportunityModel) -> Opportunity:
        """Convert database model to domain entity"""
        return Opportunity(
            id=model.id,
            tenant_id=model.tenant_id,
            title=model.title,
            description=model.description,
            client_id=model.client_id,
            funding_source_id=model.funding_source_id,
            project_id=model.project_id,
            stage=OpportunityStage(model.stage) if model.stage else OpportunityStage.INTELLIGENCE,
            estimated_value=float(model.estimated_value) if model.estimated_value else 0.0,
            priority_score=float(model.priority_score) if model.priority_score else 0.0,
            probability_score=float(model.probability_score) if model.probability_score else 0.0,
            expected_close_date=model.expected_close_date,
            assigned_to=model.assigned_to,
            stage_history=model.stage_history or [],
            stage_changed_at=model.stage_changed_at,
            team_members=model.team_members or [],
            ai_priority_factors=model.ai_priority_factors or {},
            matching_scores=model.matching_scores or {},
            created_at=model.created_at,
            updated_at=model.updated_at,
            created_by=model.created_by,
            updated_by=model.updated_by,
            version=model.version
        )
    
    def _entity_to_model(self, entity: Opportunity, model: Optional[OpportunityModel] = None) -> OpportunityModel:
        """Convert domain entity to database model"""
        if model is None:
            model = OpportunityModel()
        
        model.id = entity.id
        model.tenant_id = entity.tenant_id
        model.title = entity.title
        model.description = entity.description
        model.client_id = entity.client_id
        model.funding_source_id = entity.funding_source_id
        model.project_id = entity.project_id
        model.stage = entity.stage.value if entity.stage else OpportunityStage.INTELLIGENCE.value
        model.estimated_value = entity.estimated_value
        model.priority_score = entity.priority_score
        model.probability_score = entity.probability_score
        model.expected_close_date = entity.expected_close_date
        model.assigned_to = entity.assigned_to
        model.stage_history = entity.stage_history
        model.stage_changed_at = entity.stage_changed_at
        model.team_members = entity.team_members
        model.ai_priority_factors = entity.ai_priority_factors
        model.matching_scores = entity.matching_scores
        
        return model
    
    def _deserialize_entity(self, data: Dict[str, Any]) -> Opportunity:
        """Deserialize entity from cache"""
        if 'stage' in data and isinstance(data['stage'], str):
            data['stage'] = OpportunityStage(data['stage'])
        return Opportunity(**data)
    
    async def get_pipeline_by_stage(
        self,
        tenant_id: str,
        stages: Optional[List[OpportunityStage]] = None,
        institute_ids: Optional[List[str]] = None,
    ) -> Dict[str, List[Opportunity]]:
        """
        Get opportunities grouped by pipeline stage (Kanban view)
        Implements RF-05.01: Visualização do pipeline
        """
        try:
            cache_key = self._cache_key("pipeline", tenant_id, 
                                        f"stages:{','.join([s.value for s in stages]) if stages else 'all'}")
            
            cache = await self._get_cache()
            cached_data = await cache.get(cache_key)
            if cached_data:
                result = {}
                for stage, opps in cached_data.items():
                    result[stage] = [self._deserialize_entity(o) for o in opps]
                return result
            
            # If institute_ids provided, filter opportunities by the institute of their linked project.
            if institute_ids:
                # Build parameterized IN clause
                params = {f"inst_{i}": iid for i, iid in enumerate(institute_ids)}
                placeholders = ", ".join([f":inst_{i}" for i in range(len(institute_ids))])
                sql = f"SELECT o.id FROM opportunities o JOIN projects p ON o.project_id = p.id WHERE o.tenant_id = :tenant_id AND o.deleted_at IS NULL AND p.institute_id IN ({placeholders})"
                params['tenant_id'] = tenant_id
                res = await self.session.execute(sa.text(sql), params)
                rows = res.fetchall()
                opp_ids = [r[0] for r in rows]
                if not opp_ids:
                    return {s.value: [] for s in OpportunityStage}
                query = select(OpportunityModel).where(
                    and_(
                        OpportunityModel.tenant_id == tenant_id,
                        OpportunityModel.deleted_at.is_(None),
                        OpportunityModel.id.in_(opp_ids)
                    )
                )
            else:
                query = select(OpportunityModel).where(
                    and_(
                        OpportunityModel.tenant_id == tenant_id,
                        OpportunityModel.deleted_at.is_(None)
                    )
                )
            
            if stages:
                stage_values = [s.value for s in stages]
                query = query.where(OpportunityModel.stage.in_(stage_values))
            
            query = query.order_by(OpportunityModel.priority_score.desc())
            
            result = await self.session.execute(query)
            models = result.scalars().all()
            
            pipeline: Dict[str, List[Opportunity]] = {}
            for stage in OpportunityStage:
                pipeline[stage.value] = []
            
            for model in models:
                entity = self._model_to_entity(model)
                pipeline[model.stage].append(entity)
            
            serialized = {}
            for stage, opps in pipeline.items():
                serialized[stage] = [self._serialize_entity(o) for o in opps]
            await cache.set(cache_key, serialized, ttl=300)
            
            return pipeline
            
        except Exception as e:
            logger.error(f"Error getting pipeline by stage: {e}")
            raise
    
    async def transition_stage(
        self,
        opportunity_id: UUID,
        tenant_id: str,
        new_stage: OpportunityStage,
        user_id: UUID,
        notes: Optional[str] = None
    ) -> Opportunity:
        """
        Transition opportunity to new stage with history tracking
        Implements RF-05.02: Transição de estágios
        """
        try:
            query = select(OpportunityModel).where(
                and_(
                    OpportunityModel.id == opportunity_id,
                    OpportunityModel.tenant_id == tenant_id,
                    OpportunityModel.deleted_at.is_(None)
                )
            )
            
            result = await self.session.execute(query)
            model = result.scalar_one_or_none()
            
            if not model:
                raise ValueError(f"Opportunity {opportunity_id} not found")
            
            old_stage = model.stage
            now = datetime.utcnow()
            
            time_in_stage = None
            if model.stage_changed_at:
                time_in_stage = int((now - model.stage_changed_at).total_seconds())
            
            stage_history = model.stage_history or []
            stage_history.append({
                "from_stage": old_stage,
                "to_stage": new_stage.value,
                "changed_at": now.isoformat(),
                "changed_by": str(user_id),
                "time_in_stage_seconds": time_in_stage,
                "notes": notes
            })
            
            model.stage = new_stage.value
            model.stage_history = stage_history
            model.stage_changed_at = now
            model.updated_by = user_id
            model.updated_at = now
            model.version += 1
            
            stage_probability_map = {
                OpportunityStage.INTELLIGENCE: 0.1,
                OpportunityStage.QUALIFICATION: 0.25,
                OpportunityStage.PROPOSAL: 0.5,
                OpportunityStage.NEGOTIATION: 0.75,
                OpportunityStage.CLOSING: 0.9,
                OpportunityStage.WON: 1.0,
                OpportunityStage.LOST: 0.0,
                OpportunityStage.POST_SALE: 1.0
            }
            model.probability_score = stage_probability_map.get(new_stage, 0.5)
            
            await self.session.commit()
            
            if self.neo4j:
                await self._update_stage_in_graph(opportunity_id, tenant_id, old_stage, new_stage.value)
            
            await self._invalidate_caches(tenant_id, str(opportunity_id))
            
            logger.info(f"Transitioned opportunity {opportunity_id} from {old_stage} to {new_stage.value}")
            return self._model_to_entity(model)
            
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error transitioning stage: {e}")
            raise
    
    async def calculate_priority_score(
        self,
        opportunity_id: UUID,
        tenant_id: str,
        user_id: UUID
    ) -> float:
        """
        Calculate AI-driven priority score based on multiple factors
        Implements RF-05.03: Priorização inteligente
        
        Scoring factors:
        - Estimated value weight: 25%
        - Client engagement: 20%
        - Funding deadline proximity: 20%
        - Matching score: 20%
        - Strategic alignment: 15%
        """
        try:
            query = select(OpportunityModel).options(
                selectinload(OpportunityModel.client),
                selectinload(OpportunityModel.funding_source)
            ).where(
                and_(
                    OpportunityModel.id == opportunity_id,
                    OpportunityModel.tenant_id == tenant_id,
                    OpportunityModel.deleted_at.is_(None)
                )
            )
            
            result = await self.session.execute(query)
            model = result.scalar_one_or_none()
            
            if not model:
                raise ValueError(f"Opportunity {opportunity_id} not found")
            
            priority_factors = {}
            
            # 1. Value Score (0-100) - 25% weight
            value_score = 0.0
            if model.estimated_value:
                log_value = math.log10(max(model.estimated_value, 1))
                value_score = min(100, (log_value / 7) * 100)
            priority_factors["value_score"] = round(value_score, 2)
            
            # 2. Client Engagement Score (0-100) - 20% weight
            engagement_score = 50.0
            if model.client and hasattr(model.client, 'engagement_score'):
                engagement_score = float(model.client.engagement_score or 50) * 100
            priority_factors["engagement_score"] = round(engagement_score, 2)
            
            # 3. Deadline Urgency Score (0-100) - 20% weight
            deadline_score = 50.0
            if model.funding_source and model.funding_source.submission_end:
                days_until_deadline = (model.funding_source.submission_end - date.today()).days
                if days_until_deadline <= 0:
                    deadline_score = 0
                elif days_until_deadline <= 7:
                    deadline_score = 100
                elif days_until_deadline <= 30:
                    deadline_score = 80
                elif days_until_deadline <= 60:
                    deadline_score = 60
                elif days_until_deadline <= 90:
                    deadline_score = 40
                else:
                    deadline_score = 20
            priority_factors["deadline_score"] = round(deadline_score, 2)
            
            # 4. Matching Score (0-100) - 20% weight
            matching_score = 50.0
            if model.matching_scores:
                scores = [s.get("composite_score", 50) for s in model.matching_scores.values() if isinstance(s, dict)]
                if scores:
                    matching_score = max(scores)
            priority_factors["matching_score"] = round(matching_score, 2)
            
            # 5. Strategic Alignment from Graph (0-100) - 15% weight
            strategic_score = 50.0
            if self.neo4j:
                strategic_score = await self._get_strategic_score_from_graph(opportunity_id, tenant_id)
            priority_factors["strategic_score"] = round(strategic_score, 2)
            
            composite_score = (
                value_score * 0.25 +
                engagement_score * 0.20 +
                deadline_score * 0.20 +
                matching_score * 0.20 +
                strategic_score * 0.15
            )
            
            priority_factors["weights"] = {
                "value": 0.25, "engagement": 0.20, "deadline": 0.20,
                "matching": 0.20, "strategic": 0.15
            }
            priority_factors["composite_formula"] = (
                f"({value_score:.1f} * 0.25) + ({engagement_score:.1f} * 0.20) + "
                f"({deadline_score:.1f} * 0.20) + ({matching_score:.1f} * 0.20) + "
                f"({strategic_score:.1f} * 0.15) = {composite_score:.1f}"
            )
            
            model.priority_score = composite_score
            model.ai_priority_factors = priority_factors
            model.updated_by = user_id
            model.updated_at = datetime.utcnow()
            model.version += 1
            
            await self.session.commit()
            await self._invalidate_caches(tenant_id, str(opportunity_id))
            
            logger.info(f"Calculated priority score {composite_score:.1f} for opportunity {opportunity_id}")
            return composite_score
            
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error calculating priority score: {e}")
            raise
    
    async def _get_strategic_score_from_graph(
        self,
        opportunity_id: UUID,
        tenant_id: str
    ) -> float:
        """
        Query Neo4j for strategic alignment score based on relationships
        """
        try:
            if not self.neo4j:
                return 50.0
            
            query = """
            MATCH (o:Opportunity {id: $opportunity_id, tenant_id: $tenant_id})
            OPTIONAL MATCH (o)-[:SIMILAR_TO]->(similar:Opportunity {stage: 'won'})
            OPTIONAL MATCH (o)-[:TARGETS]->(c:Client)-[:HAS_PROJECT]->(p:Project {status: 'completed'})
            OPTIONAL MATCH (o)-[:USES]->(comp:Competency)<-[:HAS_COMPETENCY]-(success:Project {status: 'completed'})
            WITH o,
                 COUNT(DISTINCT similar) as similar_wins,
                 COUNT(DISTINCT p) as client_projects,
                 COUNT(DISTINCT success) as competency_matches
            RETURN 
                similar_wins,
                client_projects,
                competency_matches,
                (similar_wins * 15 + client_projects * 10 + competency_matches * 5) as relationship_score
            """
            
            results = await self.neo4j.execute_query(query, {
                "opportunity_id": str(opportunity_id),
                "tenant_id": tenant_id
            })
            
            if results and len(results) > 0:
                record = results[0]
                relationship_score = record.get("relationship_score", 0)
                normalized_score = min(100, max(0, relationship_score))
                return float(normalized_score)
            
            return 50.0
            
        except Exception as e:
            logger.warning(f"Could not get strategic score from graph: {e}")
            return 50.0
    
    async def _update_stage_in_graph(
        self,
        opportunity_id: UUID,
        tenant_id: str,
        old_stage: str,
        new_stage: str
    ) -> None:
        """Update opportunity stage in Neo4j graph"""
        try:
            if not self.neo4j:
                return
            
            query = """
            MERGE (o:Opportunity {id: $opportunity_id, tenant_id: $tenant_id})
            SET o.stage = $new_stage, 
                o.previous_stage = $old_stage,
                o.stage_updated_at = datetime()
            """
            
            await self.neo4j.execute_query(query, {
                "opportunity_id": str(opportunity_id),
                "tenant_id": tenant_id,
                "old_stage": old_stage,
                "new_stage": new_stage
            })
            
        except Exception as e:
            logger.warning(f"Could not update stage in graph: {e}")
    
    async def get_pipeline_statistics(self, tenant_id: str) -> Dict[str, Any]:
        """Get comprehensive pipeline statistics - RF-07: Analytics"""
        try:
            cache_key = self._cache_key("stats", tenant_id)
            
            cache = await self._get_cache()
            cached_data = await cache.get(cache_key)
            if cached_data:
                return cached_data
            
            stage_query = select(
                OpportunityModel.stage,
                func.count(OpportunityModel.id).label('count'),
                func.sum(OpportunityModel.estimated_value).label('total_value')
            ).where(
                and_(
                    OpportunityModel.tenant_id == tenant_id,
                    OpportunityModel.deleted_at.is_(None)
                )
            ).group_by(OpportunityModel.stage)
            
            stage_result = await self.session.execute(stage_query)
            stage_data = stage_result.fetchall()
            
            by_stage = {}
            total_value = 0
            total_count = 0
            for row in stage_data:
                by_stage[row.stage] = {
                    "count": row.count,
                    "total_value": float(row.total_value or 0)
                }
                total_value += float(row.total_value or 0)
                total_count += row.count
            
            won_count = by_stage.get(OpportunityStage.WON.value, {}).get("count", 0)
            lost_count = by_stage.get(OpportunityStage.LOST.value, {}).get("count", 0)
            closed_count = won_count + lost_count
            
            conversion_rate = (won_count / closed_count * 100) if closed_count > 0 else 0
            
            stats = {
                "total_opportunities": total_count,
                "total_pipeline_value": total_value,
                "by_stage": by_stage,
                "conversion_rate": round(conversion_rate, 2),
                "won_count": won_count,
                "lost_count": lost_count,
                "last_updated": datetime.utcnow().isoformat()
            }
            
            await cache.set(cache_key, stats, ttl=600)
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting pipeline statistics: {e}")
            raise
    
    async def find_similar_opportunities(
        self,
        opportunity_id: UUID,
        tenant_id: str,
        limit: int = 5
    ) -> List[Opportunity]:
        """Find similar opportunities using Neo4j graph relationships"""
        try:
            if not self.neo4j:
                return await self._find_similar_by_sql(opportunity_id, tenant_id, limit)
            
            query = """
            MATCH (o:Opportunity {id: $opportunity_id, tenant_id: $tenant_id})
            MATCH (similar:Opportunity {tenant_id: $tenant_id})
            WHERE similar.id <> o.id
            WITH o, similar,
                 CASE WHEN (o)-[:SIMILAR_TO]-(similar) THEN 30 ELSE 0 END +
                 CASE WHEN (o)-[:SAME_CLIENT]-(similar) THEN 25 ELSE 0 END +
                 CASE WHEN (o)-[:SAME_SECTOR]-(similar) THEN 20 ELSE 0 END +
                 CASE WHEN (o)-[:USES]->(:Competency)<-[:USES]-(similar) THEN 25 ELSE 0 END
                 AS similarity_score
            WHERE similarity_score > 0
            RETURN similar.id as opportunity_id, similarity_score
            ORDER BY similarity_score DESC
            LIMIT $limit
            """
            
            results = await self.neo4j.execute_query(query, {
                "opportunity_id": str(opportunity_id),
                "tenant_id": tenant_id,
                "limit": limit
            })
            
            if not results:
                return []
            
            similar_ids = [UUID(r["opportunity_id"]) for r in results]
            
            sql_query = select(OpportunityModel).where(
                and_(
                    OpportunityModel.id.in_(similar_ids),
                    OpportunityModel.tenant_id == tenant_id,
                    OpportunityModel.deleted_at.is_(None)
                )
            )
            
            result = await self.session.execute(sql_query)
            models = result.scalars().all()
            
            return [self._model_to_entity(m) for m in models]
            
        except Exception as e:
            logger.error(f"Error finding similar opportunities: {e}")
            return []
    
    async def _find_similar_by_sql(
        self,
        opportunity_id: UUID,
        tenant_id: str,
        limit: int
    ) -> List[Opportunity]:
        """Fallback SQL-based similarity search"""
        target = await self.get_by_id(tenant_id, opportunity_id)
        if not target:
            return []
        
        query = select(OpportunityModel).where(
            and_(
                OpportunityModel.tenant_id == tenant_id,
                OpportunityModel.deleted_at.is_(None),
                OpportunityModel.id != opportunity_id,
                or_(
                    OpportunityModel.client_id == target.client_id,
                    and_(
                        OpportunityModel.estimated_value >= target.estimated_value * 0.5,
                        OpportunityModel.estimated_value <= target.estimated_value * 2.0
                    )
                )
            )
        ).limit(limit)
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        
        return [self._model_to_entity(m) for m in models]
