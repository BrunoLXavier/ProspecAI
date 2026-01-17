"""
User Preferences Routes
Provides endpoints to get/save user preferences per module
"""
from typing import Any, Dict, Optional
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel

from services.preferences_service import preferences_service

router = APIRouter(prefix="/api/v1/user/preferences", tags=["preferences"])


class PrefsRequest(BaseModel):
    user_id: Optional[str] = None
    module: str
    visibleStatIds: list | None = None
    orderOverride: Dict[str, int] | None = None
    reorderEnabled: bool | None = None
    updated_at: str | None = None


@router.get("/statistics")
async def get_statistics_preferences(
    request: Request,
    module: str = Query(...),
    user_id: Optional[str] = Query(None),
):
    # tenant_id is available in request.state if needed
    prefs = preferences_service.get_preferences(user_id, module)
    if not prefs:
        # return 404 to indicate no preferences, frontend can fallback to defaults
        raise HTTPException(status_code=404, detail="Preferences not found")
    return prefs


@router.put("/statistics")
async def save_statistics_preferences(req: PrefsRequest):
    prefs = req.model_dump()
    saved = preferences_service.save_preferences(prefs)
    return saved
