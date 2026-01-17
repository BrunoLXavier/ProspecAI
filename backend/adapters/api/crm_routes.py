"""
CRM API Routes Stub
Implements RF-04: CRM Inteligente (preenchimento automático via CNPJ)
"""
from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/api/v1/crm", tags=["crm"])


@router.api_route("/{path_name:path}", methods=["GET", "POST", "PATCH", "DELETE", "PUT"])
def deprecated_route(path_name: str):
    """Deprecated stub router kept for backward compatibility in the codebase.

    The application now exposes a full-featured CRM implementation under
    `/api/v1/clients` (see `routers/crm.py`). This module is deprecated and
    will return HTTP 410 to indicate callers should migrate to the canonical
    endpoints.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail=(
            "Deprecated CRM stub. Use the canonical CRM API under '/api/v1/clients' "
            "or the routers.crm implementation. This endpoint is retained only "
            "for repository compatibility and will be removed in a future release."
        ),
    )
