"""
Analytics Service
Implements RF-07: Analytics and Dashboard KPIs
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case

from adapters.database.models import (
    FundingSourceModel, ProjectModel, ClientModel,
    OpportunityModel, ProposalModel, MatchResultModel
)


class TimeRange(str, Enum):
    """Time range options for analytics"""
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"
    ALL = "all"


@dataclass
class KPIMetric:
    """Single KPI metric with trend"""
    value: float
    previous_value: float
    trend_percentage: float
    trend_direction: str  # up, down, stable
    label: str
    unit: str = ""


class AnalyticsService:
    """
    Analytics service for dashboard KPIs and reports.
    Provides aggregated metrics across all modules.
    """
    
    def __init__(self, session: AsyncSession, tenant_id: str):
        self.session = session
        self.tenant_id = tenant_id
    
    def _get_date_range(self, time_range: TimeRange) -> tuple[datetime, datetime]:
        """Calculate date range based on period"""
        now = datetime.now()
        
        if time_range == TimeRange.WEEK:
            start = now - timedelta(days=7)
        elif time_range == TimeRange.MONTH:
            start = now - timedelta(days=30)
        elif time_range == TimeRange.QUARTER:
            start = now - timedelta(days=90)
        elif time_range == TimeRange.YEAR:
            start = now - timedelta(days=365)
        else:
            start = datetime(2000, 1, 1)  # All time
        
        return start, now
    
    async def get_overview_kpis(self, time_range: TimeRange = TimeRange.MONTH) -> Dict[str, KPIMetric]:
        """
        Get main dashboard KPIs.
        Returns metrics for funding, projects, opportunities, proposals.
        """
        start, end = self._get_date_range(time_range)
        prev_start = start - (end - start)  # Previous period
        
        kpis = {}
        
        # Active Funding Sources
        current_funding = await self._count_active(FundingSourceModel, start, end)
        prev_funding = await self._count_active(FundingSourceModel, prev_start, start)
        kpis["active_funding"] = self._create_kpi(
            current_funding, prev_funding, "Active Funding", ""
        )
        
        # Total Projects
        current_projects = await self._count_active(ProjectModel, start, end)
        prev_projects = await self._count_active(ProjectModel, prev_start, start)
        kpis["total_projects"] = self._create_kpi(
            current_projects, prev_projects, "Projects", ""
        )
        
        # Pipeline Value (sum of opportunity values)
        current_pipeline = await self._sum_pipeline_value(start, end)
        prev_pipeline = await self._sum_pipeline_value(prev_start, start)
        kpis["pipeline_value"] = self._create_kpi(
            current_pipeline, prev_pipeline, "Pipeline Value", "R$"
        )
        
        # Conversion Rate (won opportunities / total)
        current_rate = await self._calculate_conversion_rate(start, end)
        prev_rate = await self._calculate_conversion_rate(prev_start, start)
        kpis["conversion_rate"] = self._create_kpi(
            current_rate, prev_rate, "Conversion Rate", "%"
        )
        
        # Proposals Submitted
        current_proposals = await self._count_submitted_proposals(start, end)
        prev_proposals = await self._count_submitted_proposals(prev_start, start)
        kpis["proposals_submitted"] = self._create_kpi(
            current_proposals, prev_proposals, "Proposals Submitted", ""
        )
        
        # Average Match Score
        current_score = await self._average_match_score(start, end)
        prev_score = await self._average_match_score(prev_start, start)
        kpis["avg_match_score"] = self._create_kpi(
            current_score, prev_score, "Average Match Score", "%"
        )
        
        return kpis
    
    async def get_pipeline_by_stage(self) -> List[Dict[str, Any]]:
        """Get opportunity count and value by pipeline stage"""
        query = select(
            OpportunityModel.stage,
            func.count(OpportunityModel.id).label("count"),
            func.sum(OpportunityModel.estimated_value).label("total_value")
        ).where(
            and_(
                OpportunityModel.tenant_id == self.tenant_id,
                OpportunityModel.deleted_at.is_(None)
            )
        ).group_by(OpportunityModel.stage)
        
        result = await self.session.execute(query)
        rows = result.fetchall()
        
        stages = [
            "intelligence", "qualification", "proposal",
            "negotiation", "won", "lost"
        ]
        
        stage_data = {row[0]: {"count": row[1], "value": float(row[2] or 0)} for row in rows}
        
        return [
            {
                "stage": stage,
                "count": stage_data.get(stage, {}).get("count", 0),
                "value": stage_data.get(stage, {}).get("value", 0),
            }
            for stage in stages
        ]
    
    async def get_funding_by_category(self) -> List[Dict[str, Any]]:
        """Get funding distribution by instrument type"""
        query = select(
            FundingSourceModel.instrument_type,
            func.count(FundingSourceModel.id).label("count"),
            func.sum(FundingSourceModel.total_amount).label("total_budget")
        ).where(
            and_(
                FundingSourceModel.tenant_id == self.tenant_id,
                FundingSourceModel.deleted_at.is_(None),
                FundingSourceModel.status == "open"
            )
        ).group_by(FundingSourceModel.instrument_type)
        
        result = await self.session.execute(query)
        rows = result.fetchall()
        
        return [
            {
                "category": row[0] or "Others",
                "count": row[1],
                "total_budget": float(row[2] or 0),
            }
            for row in rows
        ]
    
    async def get_projects_by_trl(self) -> List[Dict[str, Any]]:
        """Get project distribution by TRL level"""
        query = select(
            ProjectModel.trl_current,
            func.count(ProjectModel.id).label("count")
        ).where(
            and_(
                ProjectModel.tenant_id == self.tenant_id,
                ProjectModel.deleted_at.is_(None)
            )
        ).group_by(ProjectModel.trl_current)
        
        result = await self.session.execute(query)
        rows = result.fetchall()
        
        trl_data = {row[0]: row[1] for row in rows}
        
        return [
            {"trl": i, "count": trl_data.get(i, 0)}
            for i in range(1, 10)
        ]
    
    async def get_matching_trends(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get daily matching activity trends"""
        start_date = datetime.now() - timedelta(days=days)
        
        query = select(
            func.date(MatchResultModel.created_at).label("date"),
            func.count(MatchResultModel.id).label("count"),
            func.avg(MatchResultModel.composite_score).label("avg_score")
        ).where(
            and_(
                MatchResultModel.tenant_id == self.tenant_id,
                MatchResultModel.created_at >= start_date
            )
        ).group_by(
            func.date(MatchResultModel.created_at)
        ).order_by(
            func.date(MatchResultModel.created_at)
        )
        
        result = await self.session.execute(query)
        rows = result.fetchall()
        
        return [
            {
                "date": row[0].isoformat() if row[0] else None,
                "matches": row[1],
                "avg_score": round(float(row[2] or 0) * 100, 1),
            }
            for row in rows
        ]
    
    async def get_client_activity(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get most active clients by opportunity count"""
        query = select(
            ClientModel.id,
            ClientModel.name,
            func.count(OpportunityModel.id).label("opportunity_count"),
            func.sum(OpportunityModel.estimated_value).label("total_value")
        ).join(
            OpportunityModel, OpportunityModel.client_id == ClientModel.id
        ).where(
            and_(
                ClientModel.tenant_id == self.tenant_id,
                ClientModel.deleted_at.is_(None)
            )
        ).group_by(
            ClientModel.id, ClientModel.name
        ).order_by(
            func.count(OpportunityModel.id).desc()
        ).limit(limit)
        
        result = await self.session.execute(query)
        rows = result.fetchall()
        
        return [
            {
                "id": str(row[0]),
                "name": row[1],
                "opportunities": row[2],
                "total_value": float(row[3] or 0),
            }
            for row in rows
        ]
    
    # Helper methods
    async def _count_active(self, model, start: datetime, end: datetime) -> int:
        query = select(func.count(model.id)).where(
            and_(
                model.tenant_id == self.tenant_id,
                model.created_at >= start,
                model.created_at <= end,
                model.deleted_at.is_(None)
            )
        )
        result = await self.session.execute(query)
        return result.scalar() or 0
    
    async def _sum_pipeline_value(self, start: datetime, end: datetime) -> float:
        query = select(func.sum(OpportunityModel.estimated_value)).where(
            and_(
                OpportunityModel.tenant_id == self.tenant_id,
                OpportunityModel.created_at >= start,
                OpportunityModel.created_at <= end,
                OpportunityModel.deleted_at.is_(None),
                OpportunityModel.stage.notin_(["lost"])
            )
        )
        result = await self.session.execute(query)
        return float(result.scalar() or 0)
    
    async def _calculate_conversion_rate(self, start: datetime, end: datetime) -> float:
        total_query = select(func.count(OpportunityModel.id)).where(
            and_(
                OpportunityModel.tenant_id == self.tenant_id,
                OpportunityModel.created_at >= start,
                OpportunityModel.created_at <= end,
                OpportunityModel.deleted_at.is_(None)
            )
        )
        won_query = select(func.count(OpportunityModel.id)).where(
            and_(
                OpportunityModel.tenant_id == self.tenant_id,
                OpportunityModel.created_at >= start,
                OpportunityModel.created_at <= end,
                OpportunityModel.deleted_at.is_(None),
                OpportunityModel.stage == "won"
            )
        )
        
        total = (await self.session.execute(total_query)).scalar() or 0
        won = (await self.session.execute(won_query)).scalar() or 0
        
        return round((won / total * 100) if total > 0 else 0, 1)
    
    async def _count_submitted_proposals(self, start: datetime, end: datetime) -> int:
        try:
            query = select(func.count(ProposalModel.id)).where(
                and_(
                    ProposalModel.tenant_id == self.tenant_id,
                    ProposalModel.created_at >= start,
                    ProposalModel.created_at <= end,
                    ProposalModel.deleted_at.is_(None),
                    ProposalModel.status.in_( ["submitted", "approved", "rejected"] )
                )
            )
            result = await self.session.execute(query)
            return result.scalar() or 0
        except Exception:
            # Ensure transaction is clean before running fallback query.
            try:
                await self.session.rollback()
            except Exception:
                pass
            # Fallback for schema drift where `status` column may be missing.
            from sqlalchemy import text
            q = text(
                """
                SELECT COUNT(id) FROM proposals
                WHERE tenant_id = :tid AND created_at >= :start AND created_at <= :end AND deleted_at IS NULL
                """
            )
            try:
                # Use asyncpg directly to open a fresh connection (bypasses SQLAlchemy pool)
                import os
                import asyncpg
                dsn = os.environ.get("DATABASE_URL")
                if not dsn:
                    return 0
                # asyncpg expects a DSN without the +asyncpg driver marker
                if dsn.endswith("+asyncpg"):
                    dsn = dsn.replace("+asyncpg", "")
                # Connect, execute, and close explicitly
                conn = await asyncpg.connect(dsn)
                try:
                    res = await conn.fetchval(
                        "SELECT COUNT(id) FROM proposals WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3 AND deleted_at IS NULL",
                        str(self.tenant_id), start, end
                    )
                    return int(res or 0)
                finally:
                    await conn.close()
            except Exception:
                return 0
    
    async def _average_match_score(self, start: datetime, end: datetime) -> float:
        query = select(func.avg(MatchResultModel.composite_score)).where(
            and_(
                MatchResultModel.tenant_id == self.tenant_id,
                MatchResultModel.created_at >= start,
                MatchResultModel.created_at <= end
            )
        )
        result = await self.session.execute(query)
        score = result.scalar()
        return round((score or 0) * 100, 1)
    
    def _create_kpi(
        self, current: float, previous: float, label: str, unit: str
    ) -> KPIMetric:
        """Create KPI metric with trend calculation"""
        if previous > 0:
            trend = ((current - previous) / previous) * 100
        elif current > 0:
            trend = 100.0
        else:
            trend = 0.0
        
        if trend > 1:
            direction = "up"
        elif trend < -1:
            direction = "down"
        else:
            direction = "stable"
        
        return KPIMetric(
            value=current,
            previous_value=previous,
            trend_percentage=round(trend, 1),
            trend_direction=direction,
            label=label,
            unit=unit,
        )
