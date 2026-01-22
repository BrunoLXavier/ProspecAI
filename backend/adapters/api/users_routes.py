"""Public Users Routes
Provides a lightweight users list endpoint used by the frontend selects.
This is intentionally permissive (tenant-scoped) and returns a small payload.
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends

from infrastructure.dependencies import get_current_tenant_id, get_db_session
from adapters.repositories.user_repository import UserRepository

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("", summary="List users")
async def list_users(
    skip: int = 0,
    limit: int = 100,
    include_inactive: bool = False,
    tenant_id: str = Depends(get_current_tenant_id),
    session = Depends(get_db_session),
):
    """Return a lightweight list of users for the current tenant.

    This endpoint is used by frontend selects and returns a compact shape
    similar to the admin users endpoint but without requiring admin rights.
    """
    repo = UserRepository(session)
    users = await repo.list_users(UUID(tenant_id), skip=skip, limit=limit, include_inactive=include_inactive)

    def to_dict(u):
        name = None
        try:
            name = f"{u.first_name or ''} {u.last_name or ''}".strip() or u.username or u.email
        except Exception:
            name = getattr(u, 'email', None) or str(getattr(u, 'id', ''))
        return {
            "id": str(u.id),
            "name": name,
            "email": getattr(u, 'email', None),
            "institutes": getattr(u, 'institutes', []),
        }

    return {"items": [to_dict(u) for u in users], "total": len(users), "skip": skip, "limit": limit}
