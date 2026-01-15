"""
CRM API Router
Implements RF-04: CRM Inteligente
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from datetime import datetime, date

from domain.entities.client import Client, Interaction, ClientType
from use_cases.manage_crm import ManageCRMUseCase
from infrastructure.dependencies import get_crm_use_case

router = APIRouter()


# Request/Response Schemas
class ClientCreate(BaseModel):
    name: str
    cnpj: str
    segment: str
    contact_email: str
    contact_phone: str
    annual_revenue: float | None = None
    maturity_level: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    annual_revenue: float | None = None
    maturity_level: str | None = None


class InteractionCreate(BaseModel):
    client_id: str
    interaction_type: str
    channel: str
    summary: str
    notes: str | None = None
    next_steps: List[str] | None = None


class ClientResponse(BaseModel):
    id: str
    name: str
    cnpj: str
    segment: str
    contact_email: str
    contact_phone: str
    annual_revenue: float | None
    maturity_level: str | None
    ai_enriched_data: dict | None
    ai_confidence_score: float | None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class InteractionResponse(BaseModel):
    id: str
    client_id: str
    interaction_type: str
    channel: str
    summary: str
    implicit_demands: List[str] | None
    ai_confidence_score: float | None
    occurred_at: str
    created_at: str

    class Config:
        from_attributes = True


class CNPJEnrichmentResponse(BaseModel):
    company_name: str
    legal_nature: str
    establishment_date: str
    address: dict
    activities: List[str]
    employees_range: str | None
    confidence_score: float


@router.get("/clients", response_model=List[ClientResponse])
async def list_clients(
    segment: Optional[str] = Query(
        None,
        description="Filter by business segment"
    ),
    client_type: Optional[str] = Query(
        None,
        description="Filter by client type: company, research_center, university, startup, individual"
    ),
    maturity_level: Optional[str] = Query(
        None,
        description="Filter by maturity level"
    ),
    min_revenue: Optional[float] = Query(
        None,
        ge=0,
        description="Filter clients with annual_revenue >= this value"
    ),
    max_revenue: Optional[float] = Query(
        None,
        ge=0,
        description="Filter clients with annual_revenue <= this value"
    ),
    has_cnpj: Optional[bool] = Query(
        None,
        description="Filter clients that have/don't have CNPJ"
    ),
    created_after: Optional[date] = Query(
        None,
        description="Filter clients created after this date"
    ),
    created_before: Optional[date] = Query(
        None,
        description="Filter clients created before this date"
    ),
    search: Optional[str] = Query(
        None,
        description="Search in name, email, and CNPJ"
    ),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=200, description="Maximum items to return"),
    use_case: ManageCRMUseCase = Depends(get_crm_use_case),
):
    """
    List all clients with advanced filters
    
    Implements RF-04.01: Listagem de clientes
    
    Filters:
    - segment: Filter by business segment
    - client_type: Filter by client type
    - maturity_level: Filter by maturity level
    - min_revenue/max_revenue: Filter by annual revenue range
    - has_cnpj: Filter by CNPJ presence
    - created_after/created_before: Filter by creation date range
    - search: Full-text search in name, email, and CNPJ
    """
    clients = await use_case.list_clients(
        segment=segment,
        client_type=client_type,
        maturity_level=maturity_level,
        min_revenue=min_revenue,
        max_revenue=max_revenue,
        has_cnpj=has_cnpj,
        created_after=created_after,
        created_before=created_before,
        search=search,
        skip=skip,
        limit=limit
    )
    return clients


@router.get("/clients/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: str,
    use_case: ManageCRMUseCase = Depends(get_crm_use_case),
):
    """
    Get detailed information about a specific client
    
    Implements RF-04.02: Detalhamento de cliente
    """
    client = await use_case.get_client(client_id)
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client {client_id} not found"
        )
    
    return client


@router.post("/clients", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    data: ClientCreate,
    enrich_from_cnpj: bool = True,
    use_case: ManageCRMUseCase = Depends(get_crm_use_case),
):
    """
    Create a new client with optional CNPJ auto-enrichment
    
    Implements RF-04.03: Criação de cliente com preenchimento automático
    """
    client = await use_case.create_client(
        name=data.name,
        cnpj=data.cnpj,
        segment=data.segment,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone,
        annual_revenue=data.annual_revenue,
        maturity_level=data.maturity_level,
        enrich_from_cnpj=enrich_from_cnpj,
    )
    
    return client


@router.patch("/clients/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    data: ClientUpdate,
    use_case: ManageCRMUseCase = Depends(get_crm_use_case),
):
    """
    Update an existing client
    
    Implements RF-04.04: Atualização de cliente
    """
    client = await use_case.update_client(
        client_id=client_id,
        **data.model_dump(exclude_unset=True)
    )
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client {client_id} not found"
        )
    
    return client


@router.post("/clients/{client_id}/interactions", response_model=InteractionResponse, status_code=status.HTTP_201_CREATED)
async def create_interaction(
    client_id: str,
    data: InteractionCreate,
    detect_demands: bool = True,
    use_case: ManageCRMUseCase = Depends(get_crm_use_case),
):
    """
    Record a new client interaction with AI demand detection
    
    Implements RF-04.05: Registro de interações com detecção de demandas
    """
    interaction = await use_case.create_interaction(
        client_id=client_id,
        interaction_type=data.interaction_type,
        channel=data.channel,
        summary=data.summary,
        notes=data.notes,
        next_steps=data.next_steps,
        detect_demands=detect_demands,
    )
    
    return interaction


@router.get("/clients/{client_id}/interactions", response_model=List[InteractionResponse])
async def list_client_interactions(
    client_id: str,
    skip: int = 0,
    limit: int = 50,
    use_case: ManageCRMUseCase = Depends(get_crm_use_case),
):
    """
    List all interactions for a specific client
    
    Implements RF-04.06: Histórico de interações
    """
    interactions = await use_case.list_interactions(
        client_id=client_id,
        skip=skip,
        limit=limit
    )
    return interactions


@router.post("/enrich-cnpj/{cnpj}", response_model=CNPJEnrichmentResponse)
async def enrich_from_cnpj(
    cnpj: str,
    use_case: ManageCRMUseCase = Depends(get_crm_use_case),
):
    """
    Fetch company data from CNPJ (BrasilAPI)
    
    Implements RF-04.07: Consulta CNPJ para preenchimento automático
    """
    try:
        enrichment_data = await use_case.enrich_from_cnpj(cnpj)
        return enrichment_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to enrich CNPJ: {str(e)}"
        )


@router.delete("/clients/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: str,
    use_case: ManageCRMUseCase = Depends(get_crm_use_case),
):
    """
    Soft delete a client
    
    Implements RF-04.08: Exclusão lógica de cliente
    """
    success = await use_case.delete_client(client_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client {client_id} not found"
        )
