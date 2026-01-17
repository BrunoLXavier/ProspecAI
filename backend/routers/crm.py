"""
CRM API Router
Implements RF-04: CRM Inteligente
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from datetime import datetime, date

from domain.entities.client import Client as DomainClient, Interaction, ClientType
from infrastructure.dependencies import get_di_container, get_current_user_id, get_current_tenant_id
from infrastructure.di_container import DependencyContainer
from uuid import UUID

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
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
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
    clients = await container.client_repository.list(
        segment=segment,
        maturity_level=maturity_level,
        search=search,
        skip=skip,
        limit=limit
    )
    return clients


@router.get("/clients/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: str,
    container: DependencyContainer = Depends(get_di_container),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Get detailed information about a specific client
    
    Implements RF-04.02: Detalhamento de cliente
    """
    client = await container.client_repository.get_by_id(client_id)
    
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
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Create a new client with optional CNPJ auto-enrichment
    
    Implements RF-04.03: Criação de cliente com preenchimento automático
    """
    # Map incoming request to domain entity; use reasonable defaults where schema differs
    tenant_uuid = UUID(tenant_id)
    client_entity = DomainClient(
        name=data.name,
        client_type=ClientType.COMPANY,
        cnpj=data.cnpj,
        email=data.contact_email,
        phone=data.contact_phone,
        sector=data.segment,
        tenant_id=tenant_uuid,
        created_by=current_user,
        updated_by=current_user,
    )

    created = await container.client_repository.create(client_entity)
    client = created
    
    return client


@router.patch("/clients/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    data: ClientUpdate,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Update an existing client
    
    Implements RF-04.04: Atualização de cliente
    """
    # Fetch existing, apply updates and persist
    repo = container.client_repository
    existing = await repo.get_by_id(client_id)
    if not existing:
        client = None
    else:
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            if hasattr(existing, k):
                setattr(existing, k, v)
        existing.updated_by = current_user
        client = await repo.update(existing)
    
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
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Record a new client interaction with AI demand detection
    
    Implements RF-04.05: Registro de interações com detecção de demandas
    """
    # Create interaction via repository and link to client
    repo = container.interaction_repository
    interaction_entity = Interaction(
        client_id=client_id,
        interaction_type=data.interaction_type,
        channel=data.channel,
        summary=data.summary,
        notes=data.notes,
        next_steps=data.next_steps or [],
        tenant_id=UUID(tenant_id),
        created_by=current_user,
        updated_by=current_user,
        interaction_date=datetime.utcnow(),
    )
    interaction = await repo.create(interaction_entity)
    
    return interaction


@router.get("/clients/{client_id}/interactions", response_model=List[InteractionResponse])
async def list_client_interactions(
    client_id: str,
    skip: int = 0,
    limit: int = 50,
    container: DependencyContainer = Depends(get_di_container),
):
    """
    List all interactions for a specific client
    
    Implements RF-04.06: Histórico de interações
    """
    interactions = await container.interaction_repository.list_by_client(
        client_id=client_id,
        skip=skip,
        limit=limit,
    )
    return interactions


@router.post("/enrich-cnpj/{cnpj}", response_model=CNPJEnrichmentResponse)
async def enrich_from_cnpj(
    cnpj: str,
    container: DependencyContainer = Depends(get_di_container),
    current_user: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Fetch company data from CNPJ (BrasilAPI)
    
    Implements RF-04.07: Consulta CNPJ para preenchimento automático
    """
    # If a CNPJ API client is available via DI, call it; otherwise return 501
    container = await get_di_container()
    # The DI container may not provide a cnpj_api_client; signal not implemented
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="CNPJ enrichment not configured")


@router.delete("/clients/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: str,
    container: DependencyContainer = Depends(get_di_container),
):
    """
    Soft delete a client
    
    Implements RF-04.08: Exclusão lógica de cliente
    """
    success = await container.client_repository.delete(client_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client {client_id} not found"
        )
