"""Institutes API Routes
Provides list and basic CRUD for institutes (admin-only for create/update/delete).
"""
from typing import List, Optional, Dict, Any
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
    metadata: Optional[Dict[str, Any]] = None


class InstituteCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class InstituteUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@router.get("", response_model=List[InstituteOut])
async def list_institutes(
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    stmt = sa.text("SELECT id, name, code, description, metadata FROM institutes WHERE tenant_id = :tenant_id AND deleted_at IS NULL ORDER BY name")
    res = await container.session.execute(stmt, {'tenant_id': tenant_id})
    rows = res.fetchall()
    items = []
    for r in rows:
        items.append({
            'id': r[0],
            'name': r[1],
            'code': r[2],
            'description': r[3],
            'metadata': r[4],
        })
    return items


@router.post("", response_model=InstituteOut, status_code=201)
async def create_institute(
    req: InstituteCreate,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    # Only admins may create institutes; quick check against user_roles
    try:
        r = await container.session.execute(sa.text("SELECT 1 FROM user_roles WHERE user_id = :user_id AND role_id = 'admin' LIMIT 1"), {'user_id': str(user_id)})
        if r.scalar() is None:
            raise HTTPException(status_code=403, detail="User must be an admin to create institutes")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=403, detail="User must be an admin to create institutes")

    stmt = sa.text("INSERT INTO institutes (id, tenant_id, name, code, description, metadata, created_at, updated_at, created_by, updated_by) VALUES (gen_random_uuid(), :tenant_id, :name, :code, :description, :metadata::jsonb, now(), now(), :created_by, :updated_by) RETURNING id, name, code, description, metadata")
    params = {'tenant_id': tenant_id, 'name': req.name, 'code': req.code, 'description': req.description, 'metadata': req.metadata or {}, 'created_by': str(user_id), 'updated_by': str(user_id)}
    res = await container.session.execute(stmt, params)
    await container.session.commit()
    row = res.first()
    return {'id': row[0], 'name': row[1], 'code': row[2], 'description': row[3], 'metadata': row[4]}


@router.patch("/{inst_id}", response_model=InstituteOut)
async def update_institute(
    inst_id: UUID,
    req: InstituteUpdate,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    # Only admins may update institutes
    try:
        r = await container.session.execute(sa.text("SELECT 1 FROM user_roles WHERE user_id = :user_id AND role_id = 'admin' LIMIT 1"), {'user_id': str(user_id)})
        if r.scalar() is None:
            raise HTTPException(status_code=403, detail="User must be an admin to update institutes")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=403, detail="User must be an admin to update institutes")

    stmt = sa.text("SELECT id, name, code, description, metadata FROM institutes WHERE id = :id AND tenant_id = :tenant_id AND deleted_at IS NULL")
    res = await container.session.execute(stmt, {'id': str(inst_id), 'tenant_id': tenant_id})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Institute not found")

    updates = []
    params = {'id': str(inst_id), 'tenant_id': tenant_id}
    if req.name is not None:
        updates.append('name = :name')
        params['name'] = req.name
    if req.code is not None:
        updates.append('code = :code')
        params['code'] = req.code
    if req.description is not None:
        updates.append('description = :description')
        params['description'] = req.description
    if req.metadata is not None:
        updates.append('metadata = :metadata::jsonb')
        params['metadata'] = req.metadata

    if not updates:
        return {'id': row[0], 'name': row[1], 'code': row[2], 'description': row[3], 'metadata': row[4]}

    q = sa.text(f"UPDATE institutes SET {', '.join(updates)}, updated_at = now(), updated_by = :updated_by WHERE id = :id AND tenant_id = :tenant_id AND deleted_at IS NULL RETURNING id, name, code, description, metadata")
    params['updated_by'] = str(user_id)
    res2 = await container.session.execute(q, params)
    await container.session.commit()
    r2 = res2.first()
    return {'id': r2[0], 'name': r2[1], 'code': r2[2], 'description': r2[3], 'metadata': r2[4]}


@router.delete("/{inst_id}", status_code=204)
async def delete_institute(
    inst_id: UUID,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    # Only admins may delete institutes
    try:
        r = await container.session.execute(sa.text("SELECT 1 FROM user_roles WHERE user_id = :user_id AND role_id = 'admin' LIMIT 1"), {'user_id': str(user_id)})
        if r.scalar() is None:
            raise HTTPException(status_code=403, detail="User must be an admin to delete institutes")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=403, detail="User must be an admin to delete institutes")

    stmt = sa.text("UPDATE institutes SET deleted_at = now(), updated_by = :updated_by WHERE id = :id AND tenant_id = :tenant_id AND deleted_at IS NULL RETURNING id")
    res = await container.session.execute(stmt, {'id': str(inst_id), 'tenant_id': tenant_id, 'updated_by': str(user_id)})
    await container.session.commit()
    if not res.first():
        raise HTTPException(status_code=404, detail="Institute not found")
    return None
