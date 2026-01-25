"""
Activity / Audit API Routes
Provides read-only access to recent audit logs for dashboard/activity feed.
"""
from fastapi import APIRouter, Depends, Query
from typing import List
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from sqlalchemy.exc import ProgrammingError

from adapters.database.models import AuditLogModel
from infrastructure.di_container import get_db_session
from infrastructure.dependencies import get_current_tenant_id
from adapters.api.auth_middleware import get_current_user, AuthenticatedUser

router = APIRouter(prefix="/api/v1/activity", tags=["activity"])


@router.get("/recent")
async def recent_activity(
    limit: int = Query(10, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: AuthenticatedUser | None = Depends(get_current_user),
):
    """Return recent audit log entries for tenant."""
    # Select a minimal set of columns that are most likely to exist across
    # older DB schemas. Avoid optional columns like `diff` or `notes` which
    # may be absent in some developer databases and cause ProgrammingError.
    q = select(
        AuditLogModel.id,
        AuditLogModel.action,
        AuditLogModel.entity_type,
        AuditLogModel.entity_id,
        AuditLogModel.user_id,
        AuditLogModel.timestamp,
    ).where(
        and_(
            AuditLogModel.tenant_id == tenant_id,
            AuditLogModel.deleted_at.is_(None)
        )
    ).order_by(desc(AuditLogModel.timestamp)).limit(limit)
    try:
        resp = await session.execute(q)
        rows = resp.all()
    except ProgrammingError as e:
        logging.exception("Database schema mismatch when querying audit logs")
        return {"activities": []}

    result = []
    for r in rows:
        # r is a Row object with positional columns
        _id, action, entity_type, entity_id, user_id, timestamp = r
        result.append({
            "id": str(_id),
            "type": action,  # Frontend expects 'type' for action type (create, update, delete, etc.)
            "action": action,
            "entity_type": entity_type,
            "entity": entity_type,  # Frontend also uses 'entity'
            "entity_id": str(entity_id) if entity_id else None,
            "user_id": str(user_id) if user_id else None,
            "timestamp": timestamp.isoformat() if timestamp else None,
            "actor": {
                "id": str(user_id) if user_id else "system",
                "name": "Usuário do Sistema",
                "type": "user" if user_id else "system",
            },
            "metadata": {},
        })

    return {"activities": result}
