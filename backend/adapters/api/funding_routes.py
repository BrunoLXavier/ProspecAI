"""
Funding API Routes Stub
Implements RF-02: Gestão de fomento e editais (TRL 1-9)
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List

router = APIRouter(prefix="/api/v1/funding", tags=["funding"])

# Example GET endpoint stub
def get_stub_funding():
    """Stub endpoint for funding list"""
    return [{"id": 1, "name": "Edital Exemplo", "trl": 5}]

@router.get("/", summary="List all funding opportunities", response_model=List[dict])
def list_funding():
    return get_stub_funding()

# Example POST endpoint stub
@router.post("/", summary="Create a new funding opportunity", response_model=dict, status_code=201)
def create_funding(funding: dict):
    return {"id": 1, **funding}

# Example GET by ID stub
@router.get("/{funding_id}", summary="Get funding by ID", response_model=dict)
def get_funding(funding_id: int):
    for f in get_stub_funding():
        if f["id"] == funding_id:
            return f
    raise HTTPException(status_code=404, detail="Funding not found")

# Example PATCH endpoint stub
@router.patch("/{funding_id}", summary="Update funding by ID", response_model=dict)
def update_funding(funding_id: int, funding: dict):
    for f in get_stub_funding():
        if f["id"] == funding_id:
            return {"id": funding_id, **funding}
    raise HTTPException(status_code=404, detail="Funding not found")

# Example DELETE endpoint stub
@router.delete("/{funding_id}", summary="Delete funding by ID", status_code=204)
def delete_funding(funding_id: int):
    for f in get_stub_funding():
        if f["id"] == funding_id:
            return  # 204 No Content
    raise HTTPException(status_code=404, detail="Funding not found")
