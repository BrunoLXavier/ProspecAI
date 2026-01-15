"""
Calendar API Routes (stubs)
Provides a simple endpoint for calendar events used by the Dashboard widget.
"""
from fastapi import APIRouter
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/v1/calendar", tags=["calendar"])


def _now_iso():
    return datetime.utcnow().isoformat()


@router.get("/events", summary="List calendar events")
def list_events(start_date: str | None = None, end_date: str | None = None):
    # Return a deterministic set of example events for the requested period
    today = datetime.utcnow()
    events = [
        {
            "id": "evt-1",
            "title": "Prazo FINEP Inovação",
            "date": (today + timedelta(days=2)).isoformat(),
            "type": "deadline",
            "related_entity": "funding",
            "related_entity_id": "fund-1",
            "priority": "high",
        },
        {
            "id": "evt-2",
            "title": "Reunião TechCorp",
            "date": (today + timedelta(days=5)).isoformat(),
            "type": "meeting",
            "related_entity": "client",
            "related_entity_id": "client-1",
            "priority": "medium",
        },
    ]

    return {"events": events}
