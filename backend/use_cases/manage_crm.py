# Implements RF-04: CRM Inteligente
from typing import Dict, Any, Optional
from uuid import UUID
from domain.entities import Client, Interaction
import logging

logger = logging.getLogger(__name__)


class ManageCRMUseCase:
    """
    Manages CRM with CNPJ auto-fill and implicit demand detection.
    Implements RF-04: CRM Inteligente
    """
    
    def __init__(
        self,
        client_repository,
        interaction_repository,
        cnpj_api_client,
        nlp_service,
        audit_service
    ):
        self.client_repository = client_repository
        self.interaction_repository = interaction_repository
        self.cnpj_api_client = cnpj_api_client
        self.nlp_service = nlp_service
        self.audit_service = audit_service
    
    async def create_client_from_cnpj(
        self,
        cnpj: str,
        tenant_id: UUID,
        user_id: UUID,
        additional_data: Optional[Dict[str, Any]] = None
    ) -> Client:
        """
        Create client with auto-fill from CNPJ API (RF-04 requirement).
        """
        logger.info(f"Fetching CNPJ data for {cnpj}")
        
        # Fetch data from CNPJ API
        cnpj_data = await self.cnpj_api_client.fetch_cnpj(cnpj)
        confidence = cnpj_data.get("confidence", 1.0)
        
        # Prepare client data
        client_data = additional_data or {}
        
        # Auto-fill from API
        if "nome" in cnpj_data:
            client_data.setdefault("name", cnpj_data["nome"])
        if "email" in cnpj_data:
            client_data.setdefault("email", cnpj_data["email"])
        
        client_data["cnpj"] = cnpj
        client_data["auto_filled_data"] = cnpj_data
        client_data["auto_fill_confidence"] = confidence
        
        # Create entity
        client = Client(
            **client_data,
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id
        )
        
        saved = await self.client_repository.create(client)
        
        await self.audit_service.log_creation(
            entity_type="Client",
            entity_id=saved.id,
            user_id=user_id,
            tenant_id=tenant_id,
            after_state=saved.model_dump()
        )
        
        logger.info(f"Client created with CNPJ {cnpj}, confidence: {confidence}")
        
        return saved
    
    async def record_interaction(
        self,
        client_id: UUID,
        interaction_data: Dict[str, Any],
        tenant_id: UUID,
        user_id: UUID,
        detect_implicit_demands: bool = True
    ) -> Interaction:
        """
        Record a client interaction with optional NLP analysis for implicit demands.
        """
        # Create interaction
        interaction = Interaction(
            **interaction_data,
            client_id=str(client_id),
            tenant_id=tenant_id,
            created_by=user_id,
            updated_by=user_id
        )
        
        # Detect implicit demands via NLP (RF-04)
        if detect_implicit_demands and "description" in interaction_data:
            logger.info("Running NLP analysis for implicit demands")
            
            nlp_result = await self.nlp_service.detect_implicit_demands(
                text=interaction_data["description"]
            )
            
            interaction.implicit_demands = nlp_result.get("demands", [])
            interaction.ai_confidence = nlp_result.get("confidence", 0.0)
        
        # Save interaction
        saved = await self.interaction_repository.create(interaction)
        
        # Update client
        client = await self.client_repository.get_by_id(client_id, tenant_id)
        if client:
            client.add_interaction(str(saved.id))
            
            # Add detected demands to client
            if interaction.implicit_demands:
                client.detected_demands.extend(interaction.implicit_demands)
            
            await self.client_repository.update(client)
        
        await self.audit_service.log_creation(
            entity_type="Interaction",
            entity_id=saved.id,
            user_id=user_id,
            tenant_id=tenant_id,
            after_state=saved.model_dump()
        )
        
        return saved
    
    async def get_client_with_interactions(
        self,
        client_id: UUID,
        tenant_id: UUID
    ) -> Dict[str, Any]:
        """Get client with all interactions."""
        client = await self.client_repository.get_by_id(client_id, tenant_id)
        
        if not client:
            raise ValueError(f"Client {client_id} not found")
        
        # Fetch interactions
        interactions = []
        for interaction_id in client.interaction_ids:
            interaction = await self.interaction_repository.get_by_id(
                UUID(interaction_id), tenant_id
            )
            if interaction:
                interactions.append(interaction)
        
        return {
            "client": client,
            "interactions": interactions,
            "detected_demands": client.detected_demands
        }
