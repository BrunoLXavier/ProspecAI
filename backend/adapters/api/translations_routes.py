# Translations Routes
# Adapters Layer - REST API for Translation Management
# Implements RF-01 (i18n support for pt-BR, en-US, es-ES)

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.translations_service import (
    translations_service,
    TranslationKey,
    TranslationUpdate,
    TranslationCreate,
    SUPPORTED_LOCALES
)

router = APIRouter(prefix="/api/v1/translations", tags=["translations"])


class TranslationsListResponse(BaseModel):
    """Response for listing translations."""
    translations: List[TranslationKey]
    total: int
    namespaces: List[str]
    locales: List[str]


class BulkUpdateRequest(BaseModel):
    """Request for bulk updating translations."""
    updates: List[TranslationUpdate]


class BulkUpdateResponse(BaseModel):
    """Response for bulk update."""
    updated: int
    errors: List[str]


@router.get("", response_model=TranslationsListResponse)
async def list_translations(
    namespace: Optional[str] = Query(None, description="Filter by namespace (e.g., 'navigation', 'dashboard')"),
    search: Optional[str] = Query(None, description="Search in keys or values")
):
    """List all translations with optional filtering."""
    if namespace:
        translations = translations_service.get_translations_by_namespace(namespace)
    else:
        translations = translations_service.get_all_translations()
    
    # Apply search filter
    if search:
        search_lower = search.lower()
        translations = [
            t for t in translations
            if search_lower in t.path.lower() or
               any(search_lower in v.lower() for v in t.values.values())
        ]
    
    namespaces = translations_service.get_namespaces()
    
    return TranslationsListResponse(
        translations=translations,
        total=len(translations),
        namespaces=namespaces,
        locales=SUPPORTED_LOCALES
    )


@router.get("/namespaces", response_model=List[str])
async def list_namespaces():
    """List all available translation namespaces."""
    return translations_service.get_namespaces()


@router.get("/locales", response_model=List[str])
async def list_locales():
    """List all supported locales."""
    return SUPPORTED_LOCALES


@router.get("/{path:path}", response_model=TranslationKey)
async def get_translation(path: str):
    """Get a specific translation by path."""
    translation = translations_service.get_translation(path)
    if not translation:
        raise HTTPException(status_code=404, detail=f"Translation not found: {path}")
    return translation


@router.put("/{path:path}", response_model=TranslationKey)
async def update_translation(
    path: str,
    locale: str = Query(..., description="Locale to update"),
    value: str = Query(..., description="New translation value")
):
    """Update a single translation value."""
    if locale not in SUPPORTED_LOCALES:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported locale: {locale}. Supported: {SUPPORTED_LOCALES}"
        )
    
    update = TranslationUpdate(path=path, locale=locale, value=value)
    try:
        result = translations_service.update_translation(update)
        if not result:
            raise HTTPException(status_code=404, detail=f"Translation not found: {path}")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=TranslationKey, status_code=201)
async def create_translation(create: TranslationCreate):
    """Create a new translation key."""
    # Check if already exists
    existing = translations_service.get_translation(create.path)
    if existing:
        raise HTTPException(
            status_code=409, 
            detail=f"Translation already exists: {create.path}"
        )
    
    try:
        return translations_service.create_translation(create)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{path:path}", status_code=204)
async def delete_translation(path: str):
    """Delete a translation key from all locales."""
    deleted = translations_service.delete_translation(path)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Translation not found: {path}")


@router.post("/bulk-update", response_model=BulkUpdateResponse)
async def bulk_update_translations(request: BulkUpdateRequest):
    """Bulk update multiple translations."""
    updated = 0
    errors = []
    
    for update in request.updates:
        try:
            translations_service.update_translation(update)
            updated += 1
        except Exception as e:
            errors.append(f"{update.path} ({update.locale}): {str(e)}")
    
    return BulkUpdateResponse(updated=updated, errors=errors)


@router.get("/export/{locale}", response_model=Dict[str, Any])
async def export_locale(locale: str):
    """Export a complete locale file as JSON."""
    if locale not in SUPPORTED_LOCALES:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported locale: {locale}. Supported: {SUPPORTED_LOCALES}"
        )
    
    return translations_service.export_locale(locale)


@router.post("/import/{locale}", status_code=201)
async def import_locale(locale: str, data: Dict[str, Any]):
    """Import/replace a complete locale file."""
    if locale not in SUPPORTED_LOCALES:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported locale: {locale}. Supported: {SUPPORTED_LOCALES}"
        )
    
    try:
        translations_service.import_locale(locale, data)
        return {"message": f"Locale {locale} imported successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
