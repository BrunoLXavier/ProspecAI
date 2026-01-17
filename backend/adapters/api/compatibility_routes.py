"""
Compatibility routes for legacy frontend paths

Provides plural endpoints used by older clients:
- GET /api/v1/portfolios
- GET /api/v1/projects

These delegate to existing repositories to return lightweight lists.
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from infrastructure.dependencies import get_di_container, get_current_tenant_id
from adapters.database.connection import get_db
from adapters.database.models import PortfolioModel, ProjectModel

router = APIRouter(prefix="/api/v1", tags=["compatibility"])


@router.get("/portfolios", response_model=List[dict])
async def list_portfolios(tenant_id: str = Depends(get_current_tenant_id), session=Depends(get_db)):
    """Return list of portfolios for compatibility with older frontend clients."""
    try:
        stmt = select(PortfolioModel).where(PortfolioModel.tenant_id == tenant_id, PortfolioModel.deleted_at == None)
        result = await session.execute(stmt)
        rows = result.scalars().all()

        return [
            {
                "id": str(p.id),
                "name": p.name,
                "description": p.description,
                "project_ids": p.project_ids or [],
                "total_budget": float(p.total_budget) if p.total_budget is not None else None,
                "active_projects_count": p.active_projects_count,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            }
            for p in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects", response_model=List[dict])
async def list_projects(container=Depends(get_di_container), tenant_id: str = Depends(get_current_tenant_id)):
    """Return list of projects for compatibility with older frontend clients."""
    try:
        project_repo = container.project_repository
        projects = await project_repo.list(limit=100, skip=0)

        return [
            {
                "id": str(p.id),
                "title": p.title,
                "description": p.description,
                "status": p.status.value if hasattr(p, 'status') and getattr(p, 'status') else getattr(p, 'status', None),
                "trl_current": getattr(p, 'trl_current', getattr(p, 'current_trl', None)),
                "budget": float(p.budget) if getattr(p, 'budget', None) is not None else None,
                "created_at": p.created_at.isoformat() if getattr(p, 'created_at', None) else None,
                "updated_at": p.updated_at.isoformat() if getattr(p, 'updated_at', None) else None,
            }
            for p in projects
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
