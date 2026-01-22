# Infrastructure Repository
# Implements RF-03: Portfólio Institucional
# Clean Architecture - Adapters Layer

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, func

from adapters.database.models import InfrastructureModel
from domain.entities.infrastructure import (
    Infrastructure,
    InfrastructureCreate,
    InfrastructureUpdate,
    InfrastructureStatus
)


class InfrastructureRepository:
    """
    Repository for Infrastructure entity.
    Manages labs, equipment and physical resources tied to institutes.
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    def _model_to_entity(self, model: InfrastructureModel) -> Infrastructure:
        """Convert database model to domain entity."""
        return Infrastructure(
            id=model.id,
            tenant_id=model.tenant_id,
            instituto_id=model.instituto_id,
            nome=model.nome or model.name,  # Fallback to legacy
            descricao=model.descricao or model.description,
            email_laboratorio=model.email_laboratorio,
            email_responsavel=model.email_responsavel,
            telefone=model.telefone,
            site_url=model.site_url,
            endereco_completo=model.endereco_completo,
            area_predial_m2=float(model.area_predial_m2) if model.area_predial_m2 else None,
            status_isi=InfrastructureStatus(model.status_isi) if model.status_isi else None,
            maturidade_regulatoria=model.maturidade_regulatoria,
            maturidade_laboratorial=model.maturidade_laboratorial,
            maturidade_gestao=model.maturidade_gestao,
            plataformas_tecnologicas=model.plataformas_tecnologicas or [],
            areas_conhecimento=model.areas_conhecimento or [],
            macroareas_pesquisa=model.macroareas_pesquisa or [],
            midias=model.midias or [],
            equipamentos=model.equipamentos or [],
            created_at=model.created_at,
            updated_at=model.updated_at,
            deleted_at=model.deleted_at,
            created_by=model.created_by,
            updated_by=model.updated_by,
        )
    
    async def create(
        self,
        tenant_id: UUID,
        data: InfrastructureCreate,
        user_id: UUID
    ) -> Infrastructure:
        """Create a new infrastructure item."""
        model = InfrastructureModel(
            tenant_id=tenant_id,
            instituto_id=data.instituto_id,
            nome=data.nome,
            descricao=data.descricao,
            email_laboratorio=data.email_laboratorio,
            email_responsavel=data.email_responsavel,
            telefone=data.telefone,
            site_url=data.site_url,
            endereco_completo=data.endereco_completo,
            area_predial_m2=data.area_predial_m2,
            status_isi=data.status_isi.value if data.status_isi else None,
            maturidade_regulatoria=data.maturidade_regulatoria,
            maturidade_laboratorial=data.maturidade_laboratorial,
            maturidade_gestao=data.maturidade_gestao,
            plataformas_tecnologicas=data.plataformas_tecnologicas or [],
            areas_conhecimento=data.areas_conhecimento or [],
            macroareas_pesquisa=data.macroareas_pesquisa or [],
            midias=data.midias or [],
            equipamentos=data.equipamentos or [],
            # Legacy compatibility
            name=data.nome,
            description=data.descricao,
            created_by=user_id,
            updated_by=user_id,
        )
        
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        
        return self._model_to_entity(model)
    
    async def get_by_id(
        self,
        tenant_id: UUID,
        infrastructure_id: UUID
    ) -> Optional[Infrastructure]:
        """Get infrastructure by ID."""
        query = select(InfrastructureModel).where(
            and_(
                InfrastructureModel.id == infrastructure_id,
                InfrastructureModel.tenant_id == tenant_id,
                InfrastructureModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalars().first()
        
        return self._model_to_entity(model) if model else None
    
    async def list_by_institute(
        self,
        tenant_id: UUID,
        institute_id: UUID,
        skip: int = 0,
        limit: int = 100,
        status_isi: Optional[InfrastructureStatus] = None,
        search: Optional[str] = None,
    ) -> List[Infrastructure]:
        """List infrastructure items for a specific institute."""
        query = select(InfrastructureModel).where(
            and_(
                InfrastructureModel.tenant_id == tenant_id,
                InfrastructureModel.instituto_id == institute_id,
                InfrastructureModel.deleted_at.is_(None)
            )
        )
        
        if status_isi:
            query = query.where(InfrastructureModel.status_isi == status_isi.value)
        
        if search:
            search_filter = or_(
                InfrastructureModel.nome.ilike(f"%{search}%"),
                InfrastructureModel.descricao.ilike(f"%{search}%"),
                InfrastructureModel.email_laboratorio.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)
        
        query = query.order_by(InfrastructureModel.nome).offset(skip).limit(limit)
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        
        return [self._model_to_entity(m) for m in models]
    
    async def list_by_institutes(
        self,
        tenant_id: UUID,
        institute_ids: List[UUID],
        skip: int = 0,
        limit: int = 100,
        status_isi: Optional[InfrastructureStatus] = None,
        search: Optional[str] = None,
    ) -> List[Infrastructure]:
        """List infrastructure items for multiple institutes."""
        if not institute_ids:
            return []
        
        query = select(InfrastructureModel).where(
            and_(
                InfrastructureModel.tenant_id == tenant_id,
                InfrastructureModel.instituto_id.in_(institute_ids),
                InfrastructureModel.deleted_at.is_(None)
            )
        )
        
        if status_isi:
            query = query.where(InfrastructureModel.status_isi == status_isi.value)
        
        if search:
            search_filter = or_(
                InfrastructureModel.nome.ilike(f"%{search}%"),
                InfrastructureModel.descricao.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)
        
        query = query.order_by(InfrastructureModel.nome).offset(skip).limit(limit)
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        
        return [self._model_to_entity(m) for m in models]
    
    async def update(
        self,
        tenant_id: UUID,
        infrastructure_id: UUID,
        data: InfrastructureUpdate,
        user_id: UUID
    ) -> Optional[Infrastructure]:
        """Update an infrastructure item."""
        query = select(InfrastructureModel).where(
            and_(
                InfrastructureModel.id == infrastructure_id,
                InfrastructureModel.tenant_id == tenant_id,
                InfrastructureModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalars().first()
        
        if not model:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == 'status_isi' and value:
                value = value.value if hasattr(value, 'value') else value
            if hasattr(model, field):
                setattr(model, field, value)
        
        model.updated_by = user_id
        model.updated_at = datetime.utcnow()
        
        # Update legacy fields
        if data.nome:
            model.name = data.nome
        if data.descricao:
            model.description = data.descricao
        
        await self.session.flush()
        await self.session.refresh(model)
        
        return self._model_to_entity(model)
    
    async def soft_delete(
        self,
        tenant_id: UUID,
        infrastructure_id: UUID,
        user_id: UUID
    ) -> bool:
        """Soft delete an infrastructure item."""
        query = select(InfrastructureModel).where(
            and_(
                InfrastructureModel.id == infrastructure_id,
                InfrastructureModel.tenant_id == tenant_id,
                InfrastructureModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalars().first()
        
        if not model:
            return False
        
        model.deleted_at = datetime.utcnow()
        model.updated_by = user_id
        
        await self.session.flush()
        return True
    
    async def get_statistics(
        self,
        tenant_id: UUID,
        institute_ids: Optional[List[UUID]] = None
    ) -> Dict[str, Any]:
        """Get statistics for infrastructure items."""
        base_filter = and_(
            InfrastructureModel.tenant_id == tenant_id,
            InfrastructureModel.deleted_at.is_(None)
        )
        
        if institute_ids:
            base_filter = and_(base_filter, InfrastructureModel.instituto_id.in_(institute_ids))
        
        # Total count
        total_query = select(func.count(InfrastructureModel.id)).where(base_filter)
        total_result = await self.session.execute(total_query)
        total = total_result.scalar() or 0
        
        # Total area
        area_query = select(func.sum(InfrastructureModel.area_predial_m2)).where(base_filter)
        area_result = await self.session.execute(area_query)
        total_area = float(area_result.scalar() or 0)
        
        # Count by status
        status_counts = {}
        for status in InfrastructureStatus:
            status_query = select(func.count(InfrastructureModel.id)).where(
                and_(base_filter, InfrastructureModel.status_isi == status.value)
            )
            status_result = await self.session.execute(status_query)
            status_counts[status.value] = status_result.scalar() or 0
        
        return {
            "total": total,
            "total_area_m2": total_area,
            "by_status": status_counts,
        }
