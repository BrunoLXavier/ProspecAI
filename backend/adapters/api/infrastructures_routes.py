"""Infrastructures API Routes
Basic listing and CRUD for infrastructure items tied to institutes.
"""
from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from infrastructure.dependencies import get_di_container, get_current_tenant_id, get_current_user_id, ensure_user_member_or_admin
from services.institute_service import get_institute_service, InstituteService
import sqlalchemy as sa

router = APIRouter(prefix="/api/v1/infrastructures", tags=["infrastructures"])


class InfrastructureOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    institute_id: UUID
    capacity: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class InfrastructureCreate(BaseModel):
    name: str
    description: Optional[str] = None
    institute_id: UUID
    capacity: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


@router.get("", response_model=List[InfrastructureOut])
async def list_infrastructures(
    institute_id: Optional[str] = None,
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    stmt = sa.text("SELECT id, name, description, institute_id, capacity, metadata FROM infrastructures WHERE tenant_id = :tenant_id AND deleted_at IS NULL" + (" AND institute_id = :inst" if institute_id else "") + " ORDER BY name")
    params = {'tenant_id': tenant_id}
    if institute_id:
        params['inst'] = institute_id
    res = await container.session.execute(stmt, params)
    rows = res.fetchall()
    return [{ 'id': r[0], 'name': r[1], 'description': r[2], 'institute_id': r[3], 'capacity': r[4] if len(r) > 4 else {}, 'metadata': r[5] if len(r) > 5 else {} } for r in rows]


@router.post("", response_model=InfrastructureOut)
async def create_infrastructure(
    req: InfrastructureCreate,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    institute_service: InstituteService = Depends(get_institute_service),
):
    # membership check
    allowed = await institute_service.user_belongs_to_institute(user_id, req.institute_id)
    if not allowed:
        raise HTTPException(status_code=403, detail="User is not a member of the target institute")

    stmt = sa.text("INSERT INTO infrastructures (id, tenant_id, institute_id, name, description, capacity, metadata, created_at, updated_at, created_by, updated_by) VALUES (gen_random_uuid(), :tenant_id, :inst, :name, :desc, :capacity::jsonb, :metadata::jsonb, now(), now(), :created_by, :updated_by) RETURNING id, name, description, institute_id, capacity, metadata")
    params = {'tenant_id': tenant_id, 'inst': str(req.institute_id), 'name': req.name, 'desc': req.description, 'capacity': req.capacity or {}, 'metadata': req.metadata or {}, 'created_by': str(user_id), 'updated_by': str(user_id)}
    res = await container.session.execute(stmt, params)
    await container.session.commit()
    row = res.first()
    return {'id': row[0], 'name': row[1], 'description': row[2], 'institute_id': row[3], 'capacity': row[4], 'metadata': row[5]}


class InfrastructureUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    capacity: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


@router.patch("/{infra_id}", response_model=InfrastructureOut)
async def update_infrastructure(
    infra_id: UUID,
    req: InfrastructureUpdate,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    stmt = sa.text("SELECT id, name, description, institute_id FROM infrastructures WHERE id = :id AND tenant_id = :tenant_id AND deleted_at IS NULL")
    res = await container.session.execute(stmt, {'id': str(infra_id), 'tenant_id': tenant_id})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Infrastructure not found")

    institute_id = row[3]
    await ensure_user_member_or_admin(user_id, [institute_id], container)

    updates = []
    params = {'id': str(infra_id), 'tenant_id': tenant_id}
    if req.name is not None:
        updates.append('name = :name')
        params['name'] = req.name
    if req.description is not None:
        updates.append('description = :description')
        params['description'] = req.description
    if req.capacity is not None:
        updates.append('capacity = :capacity::jsonb')
        params['capacity'] = req.capacity
    if req.metadata is not None:
        updates.append('metadata = :metadata::jsonb')
        params['metadata'] = req.metadata

    if not updates:
        return {'id': row[0], 'name': row[1], 'description': row[2], 'institute_id': row[3]}

    q = sa.text(f"UPDATE infrastructures SET {', '.join(updates)}, updated_at = now(), updated_by = :updated_by WHERE id = :id AND tenant_id = :tenant_id AND deleted_at IS NULL RETURNING id, name, description, institute_id, capacity, metadata")
    params['updated_by'] = str(user_id)
    res2 = await container.session.execute(q, params)
    await container.session.commit()
    r2 = res2.first()
    return {'id': r2[0], 'name': r2[1], 'description': r2[2], 'institute_id': r2[3], 'capacity': r2[4], 'metadata': r2[5]}


@router.delete("/{infra_id}", status_code=204)
async def delete_infrastructure(
    infra_id: UUID,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    stmt = sa.text("SELECT institute_id FROM infrastructures WHERE id = :id AND tenant_id = :tenant_id AND deleted_at IS NULL")
    res = await container.session.execute(stmt, {'id': str(infra_id), 'tenant_id': tenant_id})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Infrastructure not found")

    institute_id = row[0]
    await ensure_user_member_or_admin(user_id, [institute_id], container)

    q = sa.text("UPDATE infrastructures SET deleted_at = now(), updated_by = :updated_by WHERE id = :id AND tenant_id = :tenant_id AND deleted_at IS NULL RETURNING id")
    res2 = await container.session.execute(q, {'id': str(infra_id), 'tenant_id': tenant_id, 'updated_by': str(user_id)})
    await container.session.commit()
    if not res2.first():
        raise HTTPException(status_code=404, detail="Infrastructure not found")
    return None
