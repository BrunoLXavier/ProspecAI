"""Institutes API Routes
Provides list and basic CRUD for institutes (admin-only for create/update/delete).
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from infrastructure.dependencies import get_di_container, get_current_tenant_id, get_current_user_id
import sqlalchemy as sa

router = APIRouter(prefix="/api/v1/institutes", tags=["institutes"])


class InstituteOut(BaseModel):
    id: UUID
    name: str
    code: Optional[str] = None
    description: Optional[str] = None


@router.get("", response_model=List[InstituteOut])
async def list_institutes(
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    stmt = sa.text("SELECT id, name, code, description FROM institutes WHERE tenant_id = :tenant_id AND deleted_at IS NULL ORDER BY name")
    res = await container.session.execute(stmt, {'tenant_id': tenant_id})
    rows = res.fetchall()
    items = []
    for r in rows:
        items.append({
            'id': r[0],
            'name': r[1],
            'code': r[2],
            'description': r[3],
        })
    return items
