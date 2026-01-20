"""Admin Users Routes
Provides administrative user management endpoints expected by the frontend.
"""
from typing import List
from uuid import UUID
import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from adapters.api.auth_middleware import require_admin, AuthenticatedUser
from adapters.database.connection import get_session
from adapters.repositories.user_repository import UserRepository

router = APIRouter(prefix="/api/v1/admin/users", tags=["admin-users"])

logger = logging.getLogger(__name__)


@router.get("", summary="List users (admin)")
async def list_users_admin(
    skip: int = 0,
    limit: int = 100,
    include_inactive: bool = False,
    user: AuthenticatedUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    """List users for tenant (admin only)."""
    tenant_id = user.tenant_id
    repo = UserRepository(session)
    users = await repo.list_users(tenant_id=tenant_id, skip=skip, limit=limit, include_inactive=include_inactive)

    # Convert to serializable dicts
    def to_dict(u):
        return {
            "id": str(u.id),
            "email": u.email,
            "username": u.username,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "is_active": u.is_active,
            "email_verified": u.email_verified,
            "roles": u.roles,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "updated_at": u.updated_at.isoformat() if u.updated_at else None,
        }

    return {"items": [to_dict(u) for u in users], "total": len(users), "skip": skip, "limit": limit}
