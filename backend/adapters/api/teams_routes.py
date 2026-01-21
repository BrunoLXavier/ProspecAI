"""Teams API Routes
Basic listing and CRUD for teams scoped to institutes.
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from infrastructure.dependencies import get_di_container, get_current_tenant_id, get_current_user_id, ensure_user_member_or_admin
from services.institute_service import get_institute_service, InstituteService
import sqlalchemy as sa

router = APIRouter(prefix="/api/v1/teams", tags=["teams"])


class TeamOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    institute_id: UUID


class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    institute_id: UUID


@router.get("", response_model=List[TeamOut])
async def list_teams(
    institute_id: Optional[str] = None,
    container=Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    stmt = sa.text("SELECT id, name, description, institute_id FROM teams WHERE tenant_id = :tenant_id AND deleted_at IS NULL" + (" AND institute_id = :inst" if institute_id else "") + " ORDER BY name")
    params = {'tenant_id': tenant_id}
    if institute_id:
        params['inst'] = institute_id
    res = await container.session.execute(stmt, params)
    rows = res.fetchall()
    return [{ 'id': r[0], 'name': r[1], 'description': r[2], 'institute_id': r[3] } for r in rows]


@router.post("", response_model=TeamOut)
async def create_team(
    req: TeamCreate,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    institute_service: InstituteService = Depends(get_institute_service),
):
    # membership check
    allowed = await institute_service.user_belongs_to_institute(user_id, req.institute_id)
    if not allowed:
        raise HTTPException(status_code=403, detail="User is not a member of the target institute")

    stmt = sa.text("INSERT INTO teams (id, tenant_id, institute_id, name, description, created_at, updated_at) VALUES (gen_random_uuid(), :tenant_id, :inst, :name, :desc, now(), now()) RETURNING id, name, description, institute_id")
    res = await container.session.execute(stmt, {'tenant_id': tenant_id, 'inst': str(req.institute_id), 'name': req.name, 'desc': req.description})
    await container.session.commit()
    row = res.first()
    return {'id': row[0], 'name': row[1], 'description': row[2], 'institute_id': row[3]}


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


@router.patch("/{team_id}", response_model=TeamOut)
async def update_team(
    team_id: UUID,
    req: TeamUpdate,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    # fetch existing
    stmt = sa.text("SELECT id, name, description, institute_id FROM teams WHERE id = :id AND tenant_id = :tenant_id AND deleted_at IS NULL")
    res = await container.session.execute(stmt, {'id': str(team_id), 'tenant_id': tenant_id})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Team not found")

    institute_id = row[3]
    # enforce membership/admin
    await ensure_user_member_or_admin(user_id, [institute_id], container)

    updates = []
    params = {'id': str(team_id), 'tenant_id': tenant_id}
    if req.name is not None:
        updates.append('name = :name')
        params['name'] = req.name
    if req.description is not None:
        updates.append('description = :description')
        params['description'] = req.description

    if not updates:
        # nothing to update
        return {'id': row[0], 'name': row[1], 'description': row[2], 'institute_id': row[3]}

    q = sa.text(f"UPDATE teams SET {', '.join(updates)}, updated_at = now(), updated_by = :updated_by WHERE id = :id AND tenant_id = :tenant_id AND deleted_at IS NULL RETURNING id, name, description, institute_id")
    params['updated_by'] = str(user_id)
    res2 = await container.session.execute(q, params)
    await container.session.commit()
    r2 = res2.first()
    return {'id': r2[0], 'name': r2[1], 'description': r2[2], 'institute_id': r2[3]}


@router.delete("/{team_id}", status_code=204)
async def delete_team(
    team_id: UUID,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    stmt = sa.text("SELECT institute_id FROM teams WHERE id = :id AND tenant_id = :tenant_id AND deleted_at IS NULL")
    res = await container.session.execute(stmt, {'id': str(team_id), 'tenant_id': tenant_id})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Team not found")

    institute_id = row[0]
    await ensure_user_member_or_admin(user_id, [institute_id], container)

    q = sa.text("UPDATE teams SET deleted_at = now(), updated_by = :updated_by WHERE id = :id AND tenant_id = :tenant_id AND deleted_at IS NULL RETURNING id")
    res2 = await container.session.execute(q, {'id': str(team_id), 'tenant_id': tenant_id, 'updated_by': str(user_id)})
    await container.session.commit()
    if not res2.first():
        raise HTTPException(status_code=404, detail="Team not found")
    return None
