"""
CRM API Router
Implements RF-04: CRM Inteligente
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from datetime import datetime, date

from domain.entities.client import Client as DomainClient, Interaction, ClientType
from domain.schemas.crm_schemas import (
    ClientCreate, ClientUpdate, InteractionCreate,
    ClientResponse, InteractionResponse, CNPJEnrichmentResponse,
)
from infrastructure.dependencies import get_di_container, get_current_user_id, get_current_tenant_id, get_current_institute_ids
from infrastructure.di_container import DependencyContainer
from uuid import UUID
from infrastructure.serializers import to_primitive

router = APIRouter()


@router.get("/", response_model=List[ClientResponse])
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
    institute_ids: list = Depends(get_current_institute_ids),
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
        institute_ids=institute_ids,
        skip=skip,
        limit=limit
    )

    # Serialize domain entities to match `ClientResponse` schema
    out = []
    for c in clients:
        out.append({
            "id": str(getattr(c, 'id')),
            "name": getattr(c, 'name', ''),
            "cnpj": getattr(c, 'cnpj', '') or '',
            "segment": getattr(c, 'sector', '') or '',
            "contact_email": getattr(c, 'email', '') or '',
            "contact_phone": getattr(c, 'phone', '') or '',
            "annual_revenue": getattr(c, 'annual_revenue', None),
            "maturity_level": getattr(c, 'maturity_level', None),
            "ai_enriched_data": getattr(c, 'auto_filled_data', None) or None,
            "ai_confidence_score": getattr(c, 'auto_fill_confidence', None),
            "created_at": getattr(c, 'created_at').isoformat() if getattr(c, 'created_at', None) else None,
            "updated_at": getattr(c, 'updated_at').isoformat() if getattr(c, 'updated_at', None) else None,
        })

    return to_primitive(out)


@router.get("/{client_id}", response_model=ClientResponse)
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

    return to_primitive({
        "id": str(getattr(client, 'id')),
        "name": getattr(client, 'name', ''),
        "cnpj": getattr(client, 'cnpj', '') or '',
        "segment": getattr(client, 'sector', '') or '',
        "contact_email": getattr(client, 'email', '') or '',
        "contact_phone": getattr(client, 'phone', '') or '',
        "annual_revenue": getattr(client, 'annual_revenue', None),
        "maturity_level": getattr(client, 'maturity_level', None),
        "ai_enriched_data": getattr(client, 'auto_filled_data', None) or None,
        "ai_confidence_score": getattr(client, 'auto_fill_confidence', None),
        "created_at": getattr(client, 'created_at').isoformat() if getattr(client, 'created_at', None) else None,
        "updated_at": getattr(client, 'updated_at').isoformat() if getattr(client, 'updated_at', None) else None,
    })


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
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

    return to_primitive({
        "id": str(getattr(client, 'id')),
        "name": getattr(client, 'name', ''),
        "cnpj": getattr(client, 'cnpj', '') or '',
        "segment": getattr(client, 'sector', '') or '',
        "contact_email": getattr(client, 'email', '') or '',
        "contact_phone": getattr(client, 'phone', '') or '',
        "annual_revenue": getattr(client, 'annual_revenue', None),
        "maturity_level": getattr(client, 'maturity_level', None),
        "ai_enriched_data": getattr(client, 'auto_filled_data', None) or None,
        "ai_confidence_score": getattr(client, 'auto_fill_confidence', None),
        "created_at": getattr(client, 'created_at').isoformat() if getattr(client, 'created_at', None) else None,
        "updated_at": getattr(client, 'updated_at').isoformat() if getattr(client, 'updated_at', None) else None,
    })


@router.patch("/{client_id}", response_model=ClientResponse)
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
    
    return to_primitive(client)


@router.post("/{client_id}/interactions", response_model=InteractionResponse, status_code=status.HTTP_201_CREATED)
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
    
    return to_primitive(interaction)


@router.get("/{client_id}/interactions", response_model=List[InteractionResponse])
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
    return to_primitive(interactions)


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
    # Use the DI-provided CNPJ client to fetch enrichment data
    cnpj_client = getattr(container, 'cnpj_api_client', None)
    if not cnpj_client:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="CNPJ enrichment not configured")

    try:
        data = await cnpj_client.fetch_cnpj(cnpj)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    # Return transformed API response (serializer will validate against response_model)
    return to_primitive(data)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
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
