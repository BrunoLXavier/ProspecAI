# Layout Routes
# Adapters Layer - REST API for Layout Configuration
# Implements RF-07 (layout configuration per user/tenant)

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

from services.layout_service import (
    layout_service,
    LayoutConfig,
    LayoutConfigUpdate,
    AVAILABLE_NAV_ITEMS,
    AVAILABLE_WIDGETS
)

router = APIRouter(prefix="/api/v1/layout", tags=["layout"])


class LayoutResponse(BaseModel):
    """Response for layout configuration."""
    config: LayoutConfig
    available_nav_items: List[Dict[str, str]]
    available_widgets: List[Dict[str, str]]


@router.get("", response_model=LayoutResponse)
async def get_layout(
    request: Request,
    user_id: Optional[str] = Query(None, description="User ID for user-specific layout"),
):
    """Get layout configuration for current user/tenant."""
    # Get tenant from request state (set by middleware)
    tenant_id = getattr(request.state, "tenant_id", None)
    
    config = layout_service.get_layout(user_id=user_id, tenant_id=tenant_id)
    
    return LayoutResponse(
        config=config,
        available_nav_items=AVAILABLE_NAV_ITEMS,
        available_widgets=AVAILABLE_WIDGETS
    )


@router.put("", response_model=LayoutConfig)
async def update_layout(
    request: Request,
    update: LayoutConfigUpdate,
    user_id: Optional[str] = Query(None, description="User ID for user-specific layout"),
):
    """Update layout configuration."""
    tenant_id = getattr(request.state, "tenant_id", None)
    
    try:
        return layout_service.update_layout(
            update=update,
            user_id=user_id,
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reset", response_model=LayoutConfig)
async def reset_layout(
    request: Request,
    user_id: Optional[str] = Query(None, description="User ID for user-specific layout"),
):
    """Reset layout to default."""
    tenant_id = getattr(request.state, "tenant_id", None)
    
    return layout_service.reset_layout(user_id=user_id, tenant_id=tenant_id)


@router.get("/nav-items", response_model=List[Dict[str, str]])
async def get_nav_items():
    """Get available navigation items."""
    return layout_service.get_available_nav_items()


@router.get("/widgets", response_model=List[Dict[str, str]])
async def get_widgets():
    """Get available dashboard widgets."""
    return layout_service.get_available_widgets()
