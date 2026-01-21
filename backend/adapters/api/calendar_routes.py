"""
Calendar API Routes
Now returns events aggregated from DB: funding submission deadlines, opportunity expected close dates, and recent proposals.
"""
from fastapi import APIRouter, Depends, Query
from datetime import datetime, timedelta
from typing import List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from adapters.database.models import FundingSourceModel, OpportunityModel, ProposalModel
from infrastructure.di_container import get_db_session
from adapters.api.auth_middleware import get_current_user, AuthenticatedUser
from infrastructure.dependencies import get_current_tenant_id

router = APIRouter(prefix="/api/v1/calendar", tags=["calendar"])


def _parse_date(s: str | None, default: datetime) -> datetime:
    if not s:
        return default
    try:
        # Accept YYYY-MM-DD
        return datetime.fromisoformat(s)
    except Exception:
        return default


@router.get("/events", summary="List calendar events")
async def list_events(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    session: AsyncSession = Depends(get_db_session),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: AuthenticatedUser | None = Depends(get_current_user),
):
    """
    Aggregate calendar events for the tenant from several domain tables.
    Returns funding submission deadlines, opportunity expected close dates, and recent proposals.
    """
    # Parse date range (defaults: now .. now+30d)
    now = datetime.utcnow()
    start = _parse_date(start_date, now)
    end = _parse_date(end_date, now + timedelta(days=30))

    events: List[dict] = []

    # Funding submission deadlines (submission_start/submission_end)
    q_funding = select(FundingSourceModel).where(
        and_(
            FundingSourceModel.tenant_id == tenant_id,
            FundingSourceModel.deleted_at.is_(None),
            FundingSourceModel.submission_end >= start,
            FundingSourceModel.submission_end <= end,
        )
    )
    # Some dev environments may have schema drift (missing execution_start/execution_end).
    # Protect the endpoint from raising 500 by catching DB ProgrammingError and
    # falling back to skipping funding events when the expected columns are absent.
    try:
        resp = await session.execute(q_funding)
        for row in resp.scalars().all():
            events.append({
                "id": f"funding-{str(row.id)}",
                "title": row.name,
                "date": row.submission_end.isoformat() if row.submission_end else None,
                "type": "deadline",
                "related_entity": "funding",
                "related_entity_id": str(row.id),
                "priority": "high" if row.submission_end and row.submission_end <= (now + timedelta(days=7)) else "medium",
            })
    except Exception as e:
        # Log a concise warning and continue; avoid exposing raw DB errors to clients.
        import logging
        logging.getLogger(__name__).warning("Calendar: skipping funding events due to DB error: %s", e)
        try:
            await session.rollback()
        except Exception:
            pass

    # Opportunity expected close dates
    q_opps = select(OpportunityModel).where(
        and_(
            OpportunityModel.tenant_id == tenant_id,
            OpportunityModel.deleted_at.is_(None),
            OpportunityModel.expected_close_date.isnot(None),
            OpportunityModel.expected_close_date >= start,
            OpportunityModel.expected_close_date <= end,
        )
    )
    try:
        resp2 = await session.execute(q_opps)
        for row in resp2.scalars().all():
            events.append({
                "id": f"opp-{str(row.id)}",
                "title": row.title,
                "date": row.expected_close_date.isoformat() if row.expected_close_date else None,
                "type": "deadline",
                "related_entity": "opportunity",
                "related_entity_id": str(row.id),
                "priority": "medium",
            })
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Calendar: skipping opportunities due to DB error: %s", e)
        try:
            await session.rollback()
        except Exception:
            pass

    # Recent proposals (creation date within window)
    q_props = select(ProposalModel).where(
        and_(
            ProposalModel.tenant_id == tenant_id,
            ProposalModel.deleted_at.is_(None),
            ProposalModel.created_at >= start,
            ProposalModel.created_at <= end,
        )
    ).limit(20)
    try:
        resp3 = await session.execute(q_props)
        for row in resp3.scalars().all():
            events.append({
                "id": f"prop-{str(row.id)}",
                "title": row.title,
                "date": row.created_at.isoformat() if row.created_at else None,
                "type": "reminder",
                "related_entity": "proposal",
                "related_entity_id": str(row.id),
                "priority": "low",
            })
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Calendar: skipping proposals due to DB error: %s", e)
        try:
            await session.rollback()
        except Exception:
            pass

    # Sort by date
    events_sorted = sorted([e for e in events if e.get("date")], key=lambda x: x["date"])

    return {"events": events_sorted}
