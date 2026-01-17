from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from typing import List

router = APIRouter()


@router.get("", response_model=List[dict])
async def list_generated_reports():
    # Minimal fallback: return empty list
    return []


@router.get("/templates")
async def list_report_templates():
    return []


@router.post("/templates")
async def create_template(payload: dict):
    # Echo back created template with an id
    tpl = {**payload, "id": payload.get("id") or "tpl_1"}
    return tpl


@router.put("/templates/{template_id}")
async def update_template(template_id: str, payload: dict):
    tpl = {**payload, "id": template_id}
    return tpl


@router.delete("/templates/{template_id}", status_code=204)
async def delete_template(template_id: str):
    return Response(status_code=204)


@router.post("/generate/{format}")
async def generate_report(format: str, payload: dict):
    # Provide a simple HTML response for html format, and a dummy blob for others
    if format == 'html':
        html = f"<html><body><h1>Report: {payload.get('template_id') or 'report'}</h1><p>Generated</p></body></html>"
        return HTMLResponse(content=html, status_code=200)

    # For other formats, return a small text blob
    data = (f"Report {payload.get('template_id') or 'report'} - format={format}").encode('utf-8')
    media_type = 'application/octet-stream'
    return StreamingResponse(iter([data]), media_type=media_type)


@router.delete("/{report_id}")
async def delete_report(report_id: str):
    return Response(status_code=204)
