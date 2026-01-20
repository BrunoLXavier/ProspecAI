"""
CRM Repository Implementation
PostgreSQL repository for Client and Interaction entities
Implements RF-04: CRM Inteligente
"""
from typing import List, Optional
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from domain.entities.client import Client, Interaction
from adapters.database.models import ClientModel, InteractionModel


class ClientRepository:
    """
    Concrete repository for Client entities
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create(self, client: Client) -> Client:
        """
        Create a new client
        """
        # Build kwargs only for attributes present on the model to support
        # databases with slightly different schemas (some columns optional).
        model_kwargs = {
            "id": client.id,
            "tenant_id": client.tenant_id,
            "name": client.name,
            "cnpj": client.cnpj,
        }

        if hasattr(ClientModel, 'segment'):
            model_kwargs['segment'] = client.segment
        if hasattr(ClientModel, 'contact_email'):
            model_kwargs['contact_email'] = client.contact_email
        if hasattr(ClientModel, 'contact_phone'):
            model_kwargs['contact_phone'] = client.contact_phone
        if hasattr(ClientModel, 'annual_revenue'):
            model_kwargs['annual_revenue'] = client.annual_revenue
        if hasattr(ClientModel, 'maturity_level'):
            model_kwargs['maturity_level'] = client.maturity_level
        if hasattr(ClientModel, 'ai_enriched_data'):
            model_kwargs['ai_enriched_data'] = client.ai_enriched_data
        if hasattr(ClientModel, 'ai_confidence_score'):
            model_kwargs['ai_confidence_score'] = client.ai_confidence_score

        model = ClientModel(**model_kwargs)
        
        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        
        return self._to_entity(model)
    
    async def get_by_id(self, client_id: str) -> Optional[Client]:
        """
        Get client by ID
        """
        stmt = select(ClientModel).where(
            and_(
                ClientModel.id == client_id,
                ClientModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        
        return self._to_entity(model) if model else None
    
    async def get_by_cnpj(self, cnpj: str) -> Optional[Client]:
        """
        Get client by CNPJ
        """
        stmt = select(ClientModel).where(
            and_(
                ClientModel.cnpj == cnpj,
                ClientModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        
        return self._to_entity(model) if model else None
    
    async def list(
        self,
        segment: Optional[str] = None,
        maturity_level: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Client]:
        """
        List clients with filters
        """
        conditions = [ClientModel.deleted_at.is_(None)]
        
        if segment:
            conditions.append(ClientModel.segment == segment)
        
        if maturity_level:
            conditions.append(ClientModel.maturity_level == maturity_level)
        
        if search:
            conditions.append(
                or_(
                    ClientModel.name.ilike(f"%{search}%"),
                    ClientModel.cnpj.ilike(f"%{search}%")
                )
            )
        
        stmt = (
            select(ClientModel)
            .where(and_(*conditions))
            .offset(skip)
            .limit(limit)
            .order_by(ClientModel.created_at.desc())
        )
        
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        
        return [self._to_entity(model) for model in models]
    
    async def update(self, client: Client) -> Client:
        """
        Update client
        """
        stmt = select(ClientModel).where(ClientModel.id == client.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one()
        
        # Update fields safely if they exist on the model
        model.name = client.name
        if hasattr(model, 'contact_email'):
            model.contact_email = client.contact_email
        if hasattr(model, 'contact_phone'):
            model.contact_phone = client.contact_phone
        if hasattr(model, 'annual_revenue'):
            model.annual_revenue = client.annual_revenue
        if hasattr(model, 'maturity_level'):
            model.maturity_level = client.maturity_level
        if hasattr(model, 'ai_enriched_data'):
            model.ai_enriched_data = client.ai_enriched_data
        if hasattr(model, 'ai_confidence_score'):
            model.ai_confidence_score = client.ai_confidence_score
        
        await self.session.commit()
        await self.session.refresh(model)
        
        return self._to_entity(model)
    
    async def delete(self, client_id: str) -> bool:
        """
        Soft delete client
        """
        stmt = select(ClientModel).where(ClientModel.id == client_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        
        if not model:
            return False
        
        from datetime import datetime
        model.deleted_at = datetime.utcnow()
        
        await self.session.commit()
        return True
    
    def _to_entity(self, model: ClientModel) -> Client:
        """
        Convert database model to domain entity
        """
        # Normalize creator/updater fields: DB model may have raw UUIDs or
        # relationship objects with `id` attribute. Ensure we pass UUIDs.
        created_by = getattr(model, 'created_by', None)
        if hasattr(created_by, 'id'):
            created_by = getattr(created_by, 'id')

        updated_by = getattr(model, 'updated_by', None)
        if hasattr(updated_by, 'id'):
            updated_by = getattr(updated_by, 'id')

        # Fallbacks for required fields
        from uuid import UUID as _UUID
        default_user = _UUID('00000000-0000-0000-0000-000000000001')
        if created_by is None:
            created_by = default_user
        if updated_by is None:
            updated_by = created_by

        client_type_val = getattr(model, 'client_type', None) or 'other'

        return Client(
            id=getattr(model, 'id'),
            tenant_id=getattr(model, 'tenant_id', None),
            name=getattr(model, 'name', ''),
            client_type=client_type_val,
            cnpj=getattr(model, 'cnpj', None),
            email=getattr(model, 'email', None),
            phone=getattr(model, 'phone', None),
            address=getattr(model, 'address', None),
            auto_filled_data=getattr(model, 'auto_filled_data', None),
            auto_fill_confidence=getattr(model, 'auto_fill_confidence', None),
            contact_person=getattr(model, 'contact_person', None),
            sector=getattr(model, 'sector', None),
            website=getattr(model, 'website', None),
            interaction_ids=getattr(model, 'interaction_ids', []) or [],
            detected_demands=getattr(model, 'detected_demands', []) or [],
            created_at=getattr(model, 'created_at', None),
            updated_at=getattr(model, 'updated_at', None),
            created_by=created_by,
            updated_by=updated_by,
        )


class InteractionRepository:
    """
    Concrete repository for Interaction entities
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create(self, interaction: Interaction) -> Interaction:
        """
        Create a new interaction
        """
        model = InteractionModel(
            id=interaction.id,
            tenant_id=interaction.tenant_id,
            client_id=interaction.client_id,
            interaction_type=interaction.interaction_type,
            channel=interaction.channel,
            summary=interaction.summary,
            notes=interaction.notes,
            next_steps=interaction.next_steps,
            implicit_demands=interaction.implicit_demands,
            ai_confidence_score=interaction.ai_confidence_score,
            occurred_at=interaction.occurred_at,
        )
        
        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        
        return self._to_entity(model)
    
    async def list_by_client(
        self,
        client_id: str,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Interaction]:
        """
        List interactions for a specific client
        """
        stmt = (
            select(InteractionModel)
            .where(
                and_(
                    InteractionModel.client_id == client_id,
                    InteractionModel.deleted_at.is_(None)
                )
            )
            .offset(skip)
            .limit(limit)
            .order_by(InteractionModel.occurred_at.desc())
        )
        
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        
        return [self._to_entity(model) for model in models]
    
    def _to_entity(self, model: InteractionModel) -> Interaction:
        """
        Convert database model to domain entity
        """
        return Interaction(
            id=model.id,
            tenant_id=model.tenant_id,
            client_id=model.client_id,
            interaction_type=model.interaction_type,
            channel=model.channel,
            summary=model.summary,
            notes=model.notes,
            next_steps=model.next_steps,
            implicit_demands=model.implicit_demands,
            ai_confidence_score=model.ai_confidence_score,
            occurred_at=model.occurred_at,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )


# Alias for compatibility with legacy imports
CRMRepository = ClientRepository
