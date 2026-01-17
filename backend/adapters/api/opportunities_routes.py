"""Deprecated Opportunities demo adapter.

Keep this file as a deprecated shim that returns 410 for all
endpoints so callers are forced to use the canonical
`/api/v1/opportunities` router implemented in `routers.opportunities`.
"""
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/v1/opportunities", tags=["opportunities"])


@router.get("/", summary="Deprecated demo route")
async def deprecated_list_opportunities():
    raise HTTPException(status_code=410, detail="Deprecated demo route. Use canonical /api/v1/opportunities router.")


@router.post("/", summary="Deprecated demo route")
async def deprecated_create_opportunity():
    raise HTTPException(status_code=410, detail="Deprecated demo route. Use canonical /api/v1/opportunities router.")


@router.get("/{opportunity_id}", summary="Deprecated demo route")
async def deprecated_get_opportunity(opportunity_id: int):
    raise HTTPException(status_code=410, detail="Deprecated demo route. Use canonical /api/v1/opportunities router.")


@router.get("/stats/pipeline", summary="Deprecated demo route")
async def deprecated_get_pipeline_stats():
    raise HTTPException(status_code=410, detail="Deprecated demo route. Use canonical /api/v1/opportunities router.")
