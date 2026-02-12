"""
Selective Cache Warming System
Implements background jobs for warming critical data caches

Features:
- Intelligent warming prioritization
- Background task scheduling
- Critical data identification
- Performance monitoring
- Tenant-aware warming strategies
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from celery import Celery

from infrastructure.cache.cache_manager import CacheManager, get_cache
from adapters.database.connection import get_session
from adapters.database.models import (
    FundingSourceModel, ProjectModel, ClientModel, OpportunityModel
)
from adapters.repositories.funding_repository import FundingRepository

logger = logging.getLogger(__name__)


class WarmingPriority(Enum):
    """Cache warming priority levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class WarmingStrategy(Enum):
    """Cache warming strategies"""
    IMMEDIATE = "immediate"      # Warm immediately 
    SCHEDULED = "scheduled"      # Warm on schedule
    ON_DEMAND = "on_demand"      # Warm when requested
    ADAPTIVE = "adaptive"        # Intelligent adaptive warming


class CacheWarmingConfig:
    """Configuration for cache warming"""
    
    # Critical data warming intervals (minutes)
    FUNDING_SOURCES_INTERVAL = 30
    ACTIVE_OPPORTUNITIES_INTERVAL = 15
    PROJECT_COMPETENCIES_INTERVAL = 60
    CLIENT_ENGAGEMENT_INTERVAL = 45
    
    # Maximum items to warm per batch
    MAX_ITEMS_PER_BATCH = 100
    
    # Warming priorities by entity type
    ENTITY_PRIORITIES = {
        "funding_active": WarmingPriority.CRITICAL,
        "opportunities_pipeline": WarmingPriority.CRITICAL,
        "project_competencies": WarmingPriority.HIGH,
        "client_hot": WarmingPriority.HIGH,
        "matching_scores": WarmingPriority.MEDIUM
    }


class CacheWarmer:
    """Selective cache warming implementation"""
    
    def __init__(self, cache_manager: CacheManager):
        self.cache = cache_manager
        self.config = CacheWarmingConfig()
        self.warming_stats = {
            "total_warmed": 0,
            "by_priority": {p.value: 0 for p in WarmingPriority},
            "by_entity": {},
            "last_run": None,
            "avg_warm_time_ms": 0
        }
    
    async def warm_critical_data(self, tenant_id: str) -> Dict[str, Any]:
        """
        Warm all critical data for a tenant
        """
        start_time = datetime.utcnow()
        results = {}
        
        try:
            # Get database session
            async with get_session() as session:
                # Warm active funding sources
                funding_count = await self._warm_active_funding_sources(
                    session, tenant_id
                )
                results["active_funding"] = funding_count
                
                # Warm pipeline opportunities
                opportunities_count = await self._warm_pipeline_opportunities(
                    session, tenant_id
                )
                results["opportunities"] = opportunities_count
                
                # Warm project competencies
                competencies_count = await self._warm_project_competencies(
                    session, tenant_id
                )
                results["competencies"] = competencies_count
                
                # Warm high-engagement clients
                clients_count = await self._warm_hot_clients(
                    session, tenant_id
                )
                results["hot_clients"] = clients_count
            
            # Update stats
            end_time = datetime.utcnow()
            duration_ms = (end_time - start_time).total_seconds() * 1000
            
            total_items = sum(results.values())
            self.warming_stats["total_warmed"] += total_items
            self.warming_stats["last_run"] = end_time.isoformat()
            
            if total_items > 0:
                self.warming_stats["avg_warm_time_ms"] = duration_ms / total_items
            
            results["duration_ms"] = duration_ms
            results["timestamp"] = end_time.isoformat()
            
            logger.info(f"Cache warming completed for tenant {tenant_id}: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Cache warming failed for tenant {tenant_id}: {e}")
            return {"error": str(e), "timestamp": datetime.utcnow().isoformat()}
    
    async def _warm_active_funding_sources(
        self, 
        session: AsyncSession, 
        tenant_id: str
    ) -> int:
        """Warm active funding sources cache"""
        try:
            # Get active funding sources
            query = select(FundingSourceModel).where(
                and_(
                    FundingSourceModel.tenant_id == tenant_id,
                    FundingSourceModel.deleted_at.is_(None),
                    FundingSourceModel.status == 'active',
                    FundingSourceModel.submission_end >= datetime.utcnow().date()
                )
            ).order_by(FundingSourceModel.submission_end.asc())
            
            result = await session.execute(query)
            models = result.scalars().all()
            
            # Warm individual and list caches
            funding_repo = FundingRepository(session)
            
            for model in models:
                # Warm individual cache
                entity = funding_repo._model_to_entity(model)
                cache_key = funding_repo._cache_key("get", tenant_id, str(model.id))
                serialized = funding_repo._serialize_entity(entity)
                await self.cache.set(cache_key, serialized, ttl=1800)  # 30 min
            
            # Warm list cache
            entities = [funding_repo._model_to_entity(model) for model in models]
            list_cache_key = funding_repo._cache_key("active", tenant_id, f"date:{datetime.utcnow().date()}")
            serialized_list = [funding_repo._serialize_entity(entity) for entity in entities]
            await self.cache.set(list_cache_key, serialized_list, ttl=300)  # 5 min
            
            self.warming_stats["by_priority"][WarmingPriority.CRITICAL.value] += len(models)
            self.warming_stats["by_entity"]["funding_active"] = len(models)
            
            logger.debug(f"Warmed {len(models)} active funding sources for tenant {tenant_id}")
            return len(models)
            
        except Exception as e:
            logger.error(f"Failed to warm funding sources: {e}")
            return 0
    
    async def _warm_pipeline_opportunities(
        self, 
        session: AsyncSession, 
        tenant_id: str
    ) -> int:
        """Warm pipeline opportunities cache"""
        try:
            # Get opportunities in active stages
            active_stages = ['qualification', 'proposal', 'negotiation']
            
            query = select(OpportunityModel).where(
                and_(
                    OpportunityModel.tenant_id == tenant_id,
                    OpportunityModel.deleted_at.is_(None),
                    OpportunityModel.stage.in_(active_stages)
                )
            ).order_by(OpportunityModel.priority_score.desc())
            
            result = await session.execute(query)
            models = result.scalars().all()
            
            # Warm caches by stage
            for stage in active_stages:
                stage_opportunities = [m for m in models if m.stage == stage]
                
                # Create stage-specific cache entries
                cache_key = f"opportunities:pipeline:{tenant_id}:stage:{stage}"
                opportunity_data = [
                    {
                        "id": str(o.id),
                        "title": o.title,
                        "priority_score": float(o.priority_score) if o.priority_score else 0,
                        "expected_close_date": o.expected_close_date.isoformat() if o.expected_close_date else None,
                        "client_id": str(o.client_id) if o.client_id else None,
                        "stage": o.stage
                    }
                    for o in stage_opportunities
                ]
                
                await self.cache.set(cache_key, opportunity_data, ttl=900)  # 15 min
            
            self.warming_stats["by_priority"][WarmingPriority.CRITICAL.value] += len(models)
            self.warming_stats["by_entity"]["opportunities_pipeline"] = len(models)
            
            logger.debug(f"Warmed {len(models)} pipeline opportunities for tenant {tenant_id}")
            return len(models)
            
        except Exception as e:
            logger.error(f"Failed to warm opportunities: {e}")
            return 0
    
    async def _warm_project_competencies(
        self, 
        session: AsyncSession, 
        tenant_id: str
    ) -> int:
        """Warm project competencies cache"""
        try:
            # Get projects with core competencies
            query = select(ProjectModel).where(
                and_(
                    ProjectModel.tenant_id == tenant_id,
                    ProjectModel.deleted_at.is_(None),
                    ProjectModel.core_competencies.is_not(None)
                )
            )
            
            result = await session.execute(query)
            models = result.scalars().all()
            
            # Aggregate unique competencies
            all_competencies = set()
            competency_projects = {}
            
            for project in models:
                if project.core_competencies:
                    for competency in project.core_competencies:
                        all_competencies.add(competency)
                        
                        if competency not in competency_projects:
                            competency_projects[competency] = []
                        
                        competency_projects[competency].append({
                            "id": str(project.id),
                            "title": project.title,
                            "status": project.status,
                            "current_trl": project.current_trl
                        })
            
            # Cache competency mappings
            cache_key = f"competencies:mapping:{tenant_id}"
            competencies_data = {
                "all_competencies": list(all_competencies),
                "competency_projects": competency_projects,
                "total_projects": len(models),
                "last_updated": datetime.utcnow().isoformat()
            }
            
            await self.cache.set(cache_key, competencies_data, ttl=3600)  # 1 hour
            
            # Cache individual competency queries (most common ones)
            top_competencies = sorted(
                competency_projects.items(),
                key=lambda x: len(x[1]),
                reverse=True
            )[:20]  # Top 20 competencies
            
            for competency, projects in top_competencies:
                comp_cache_key = f"competencies:projects:{tenant_id}:{competency}"
                await self.cache.set(comp_cache_key, projects, ttl=1800)  # 30 min
            
            self.warming_stats["by_priority"][WarmingPriority.HIGH.value] += len(all_competencies)
            self.warming_stats["by_entity"]["project_competencies"] = len(all_competencies)
            
            logger.debug(f"Warmed {len(all_competencies)} competencies for tenant {tenant_id}")
            return len(all_competencies)
            
        except Exception as e:
            logger.error(f"Failed to warm competencies: {e}")
            return 0
    
    async def _warm_hot_clients(
        self, 
        session: AsyncSession, 
        tenant_id: str
    ) -> int:
        """Warm high-engagement clients cache"""
        try:
            # Get clients with high engagement scores
            query = select(ClientModel).where(
                and_(
                    ClientModel.tenant_id == tenant_id,
                    ClientModel.deleted_at.is_(None),
                    ClientModel.engagement_score >= 0.7  # High engagement threshold
                )
            ).order_by(ClientModel.engagement_score.desc()).limit(50)  # Top 50
            
            result = await session.execute(query)
            models = result.scalars().all()
            
            # Warm individual client caches
            for client in models:
                cache_key = f"client:hot:{tenant_id}:{client.id}"
                client_data = {
                    "id": str(client.id),
                    "name": client.name,
                    "client_type": client.client_type,
                    "sector": client.sector,
                    "engagement_score": float(client.engagement_score) if client.engagement_score else 0,
                    "detected_demands": client.detected_demands,
                    "interaction_patterns": client.interaction_patterns
                }
                
                await self.cache.set(cache_key, client_data, ttl=2700)  # 45 min
            
            # Warm hot clients list
            hot_clients_key = f"clients:hot_list:{tenant_id}"
            hot_clients_data = [
                {
                    "id": str(c.id),
                    "name": c.name,
                    "engagement_score": float(c.engagement_score) if c.engagement_score else 0
                }
                for c in models
            ]
            
            await self.cache.set(hot_clients_key, hot_clients_data, ttl=1800)  # 30 min
            
            self.warming_stats["by_priority"][WarmingPriority.HIGH.value] += len(models)
            self.warming_stats["by_entity"]["client_hot"] = len(models)
            
            logger.debug(f"Warmed {len(models)} hot clients for tenant {tenant_id}")
            return len(models)
            
        except Exception as e:
            logger.error(f"Failed to warm hot clients: {e}")
            return 0
    
    async def intelligent_warming(
        self, 
        tenant_id: str, 
        access_patterns: Dict[str, int]
    ) -> Dict[str, Any]:
        """
        Intelligent adaptive cache warming based on access patterns
        """
        try:
            # Analyze access patterns to prioritize warming
            sorted_patterns = sorted(
                access_patterns.items(),
                key=lambda x: x[1],
                reverse=True
            )
            
            warming_plan = []
            
            for pattern, frequency in sorted_patterns[:10]:  # Top 10 patterns
                if "funding" in pattern and frequency > 5:
                    warming_plan.append(("funding_active", WarmingPriority.CRITICAL))
                elif "opportunity" in pattern and frequency > 3:
                    warming_plan.append(("opportunities_pipeline", WarmingPriority.HIGH))
                elif "competenc" in pattern and frequency > 2:
                    warming_plan.append(("project_competencies", WarmingPriority.MEDIUM))
            
            # Execute adaptive warming
            results = {"adaptive_plan": warming_plan}
            
            for entity_type, priority in warming_plan:
                if entity_type == "funding_active":
                    async with get_session() as session:
                        count = await self._warm_active_funding_sources(session, tenant_id)
                        results[entity_type] = count
                # Add other adaptive warming types as needed
            
            logger.info(f"Intelligent warming completed for tenant {tenant_id}: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Intelligent warming failed for tenant {tenant_id}: {e}")
            return {"error": str(e)}
    
    def get_warming_statistics(self) -> Dict[str, Any]:
        """Get cache warming statistics"""
        return {
            **self.warming_stats,
            "cache_health": asyncio.create_task(self.cache.health_check())
        }


# Background task for scheduled warming
async def scheduled_cache_warming():
    """
    Background task for scheduled cache warming
    Run this as a periodic task (e.g., every 30 minutes)
    """
    try:
        cache_manager = await get_cache()
        warmer = CacheWarmer(cache_manager)
        
        # Get all active tenants (you'll need to implement this)
        async with get_session() as session:
            # For now, warming for a sample tenant
            # In production, you'd query for all active tenants
            sample_tenant_id = "00000000-0000-0000-0000-000000000001"
            
            result = await warmer.warm_critical_data(sample_tenant_id)
            logger.info(f"Scheduled warming completed: {result}")
            
            return result
    
    except Exception as e:
        logger.error(f"Scheduled warming failed: {e}")
        return {"error": str(e)}


# Celery task for distributed warming (if using Celery)
def setup_celery_warming(celery_app: Celery):
    """Setup Celery tasks for distributed cache warming"""
    
    @celery_app.task(name="warm_tenant_cache")
    def warm_tenant_cache(tenant_id: str):
        """Celery task for tenant cache warming"""
        async def _warm():
            cache_manager = await get_cache()
            warmer = CacheWarmer(cache_manager)
            return await warmer.warm_critical_data(tenant_id)
        
        return asyncio.run(_warm())
    
    @celery_app.task(name="intelligent_cache_warming")
    def intelligent_cache_warming(tenant_id: str, access_patterns: Dict[str, int]):
        """Celery task for intelligent warming"""
        async def _warm():
            cache_manager = await get_cache()
            warmer = CacheWarmer(cache_manager)
            return await warmer.intelligent_warming(tenant_id, access_patterns)
        
        return asyncio.run(_warm())


# Global cache warmer instance
_cache_warmer: Optional[CacheWarmer] = None


async def get_cache_warmer() -> CacheWarmer:
    """Get global cache warmer instance"""
    global _cache_warmer
    
    if not _cache_warmer:
        cache_manager = await get_cache()
        _cache_warmer = CacheWarmer(cache_manager)
    
    return _cache_warmer