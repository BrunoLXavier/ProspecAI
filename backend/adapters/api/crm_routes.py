"""
CRM API Routes Stub
Implements RF-04: CRM Inteligente (preenchimento automático via CNPJ)
"""
from fastapi import APIRouter, HTTPException
from typing import List

router = APIRouter(prefix="/api/v1/crm", tags=["crm"])

# Example GET endpoint stub
def get_stub_clients():
    """Stub endpoint for CRM clients list"""
    return [{"id": 1, "name": "Empresa Exemplo", "cnpj": "00.000.000/0001-00"}]

@router.get("/", summary="List all CRM clients", response_model=List[dict])
@router.get("/clients", summary="List all CRM clients (clients path)", response_model=List[dict])
def list_clients():
    return get_stub_clients()

# Example POST endpoint stub
@router.post("/", summary="Create a new CRM client", response_model=dict)
def create_client(client: dict):
    return {"id": 2, **client}

# Example GET by ID stub
@router.get("/{client_id}", summary="Get CRM client by ID", response_model=dict)
def get_client(client_id: int):
    for c in get_stub_clients():
        if c["id"] == client_id:
            return c
    raise HTTPException(status_code=404, detail="Client not found")
