"""
Opportunities API Routes Stub
Implements RF-05: Pipeline de Oportunidades (Kanban: Inteligência -> Pós-venda)
"""
from fastapi import APIRouter, HTTPException
from typing import List

router = APIRouter(prefix="/api/v1/opportunities", tags=["opportunities"])

# Example GET endpoint stub
def get_stub_opportunities():
    """Stub endpoint for opportunities list"""
    return [{"id": 1, "name": "Oportunidade Exemplo", "stage": "Inteligência"}]

@router.get("/", summary="List all opportunities", response_model=List[dict])
@router.get("", summary="List all opportunities (no trailing slash)", response_model=List[dict])
def list_opportunities():
    return get_stub_opportunities()

# Example POST endpoint stub
@router.post("/", summary="Create a new opportunity", response_model=dict)
def create_opportunity(opportunity: dict):
    return {"id": 2, **opportunity}

# Example GET by ID stub
@router.get("/{opportunity_id}", summary="Get opportunity by ID", response_model=dict)
def get_opportunity(opportunity_id: int):
    for o in get_stub_opportunities():
        if o["id"] == opportunity_id:
            return o
    raise HTTPException(status_code=404, detail="Opportunity not found")
