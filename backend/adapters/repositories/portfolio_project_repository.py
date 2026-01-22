# Portfolio Project Repository
# Implements RF-03: Portfólio Institucional
# Clean Architecture - Adapters Layer

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, func

from adapters.database.models import PortfolioProjectModel
from domain.entities.portfolio_project import (
    PortfolioProject,
    PortfolioProjectCreate,
    PortfolioProjectUpdate,
    PortfolioProjectStatus,
    SolutionCategory,
    CompanyType,
    TRLLevel
)


class PortfolioProjectRepository:
    """
    Repository for PortfolioProject entity.
    Manages portfolio projects tied to institutes.
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    def _model_to_entity(self, model: PortfolioProjectModel) -> PortfolioProject:
        """Convert database model to domain entity."""
        return PortfolioProject(
            id=model.id,
            tenant_id=model.tenant_id,
            instituto_id=model.instituto_id,
            nome=model.nome,
            descricao=model.descricao,
            status=PortfolioProjectStatus(model.status) if model.status else None,
            trl_entrada=TRLLevel(model.trl_entrada) if model.trl_entrada else None,
            trl_saida=TRLLevel(model.trl_saida) if model.trl_saida else None,
            categoria_solucao_resultante=SolutionCategory(model.categoria_solucao_resultante) if model.categoria_solucao_resultante else None,
            modalidade_fomento=model.modalidade_fomento,
            edital_fomento=model.edital_fomento,
            empresa_atendida_nome=model.empresa_atendida_nome,
            empresa_atendida_cnpj=model.empresa_atendida_cnpj,
            empresa_atendida_tipo=CompanyType(model.empresa_atendida_tipo) if model.empresa_atendida_tipo else None,
            empresa_atendida_cidade=model.empresa_atendida_cidade,
            empresa_atendida_uf=model.empresa_atendida_uf,
            empresa_atendida_pais=model.empresa_atendida_pais,
            data_inicio=model.data_inicio.date() if model.data_inicio else None,
            data_fim=model.data_fim.date() if model.data_fim else None,
            valor_total=float(model.valor_total) if model.valor_total else None,
            parceiros=model.parceiros or [],
            equipe_ids=model.equipe_ids or [],
            infraestrutura_ids=model.infraestrutura_ids or [],
            tematicas=model.tematicas or [],
            plataformas_tecnologicas=model.plataformas_tecnologicas or [],
            areas_conhecimento=model.areas_conhecimento or [],
            midias=model.midias or [],
            indicadores=model.indicadores or {},
            licoes_aprendidas=model.licoes_aprendidas,
            created_at=model.created_at,
            updated_at=model.updated_at,
            deleted_at=model.deleted_at,
            created_by=model.created_by,
            updated_by=model.updated_by,
        )
    
    async def create(
        self,
        tenant_id: UUID,
        data: PortfolioProjectCreate,
        user_id: UUID
    ) -> PortfolioProject:
        """Create a new portfolio project."""
        model = PortfolioProjectModel(
            tenant_id=tenant_id,
            instituto_id=data.instituto_id,
            nome=data.nome,
            descricao=data.descricao,
            status=data.status.value if data.status else PortfolioProjectStatus.EmDesenvolvimento.value,
            trl_entrada=data.trl_entrada.value if data.trl_entrada else None,
            trl_saida=data.trl_saida.value if data.trl_saida else None,
            categoria_solucao_resultante=data.categoria_solucao_resultante.value if data.categoria_solucao_resultante else None,
            modalidade_fomento=data.modalidade_fomento,
            edital_fomento=data.edital_fomento,
            empresa_atendida_nome=data.empresa_atendida_nome,
            empresa_atendida_cnpj=data.empresa_atendida_cnpj,
            empresa_atendida_tipo=data.empresa_atendida_tipo.value if data.empresa_atendida_tipo else None,
            empresa_atendida_cidade=data.empresa_atendida_cidade,
            empresa_atendida_uf=data.empresa_atendida_uf,
            empresa_atendida_pais=data.empresa_atendida_pais,
            data_inicio=data.data_inicio,
            data_fim=data.data_fim,
            valor_total=data.valor_total,
            parceiros=data.parceiros or [],
            equipe_ids=data.equipe_ids or [],
            infraestrutura_ids=data.infraestrutura_ids or [],
            tematicas=data.tematicas or [],
            plataformas_tecnologicas=data.plataformas_tecnologicas or [],
            areas_conhecimento=data.areas_conhecimento or [],
            midias=data.midias or [],
            indicadores=data.indicadores or {},
            licoes_aprendidas=data.licoes_aprendidas,
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
        project_id: UUID
    ) -> Optional[PortfolioProject]:
        """Get portfolio project by ID."""
        query = select(PortfolioProjectModel).where(
            and_(
                PortfolioProjectModel.id == project_id,
                PortfolioProjectModel.tenant_id == tenant_id,
                PortfolioProjectModel.deleted_at.is_(None)
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
        status: Optional[PortfolioProjectStatus] = None,
        trl_entrada: Optional[TRLLevel] = None,
        trl_saida: Optional[TRLLevel] = None,
        categoria: Optional[SolutionCategory] = None,
        search: Optional[str] = None,
    ) -> List[PortfolioProject]:
        """List portfolio projects for a specific institute."""
        query = select(PortfolioProjectModel).where(
            and_(
                PortfolioProjectModel.tenant_id == tenant_id,
                PortfolioProjectModel.instituto_id == institute_id,
                PortfolioProjectModel.deleted_at.is_(None)
            )
        )
        
        if status:
            query = query.where(PortfolioProjectModel.status == status.value)
        
        if trl_entrada:
            query = query.where(PortfolioProjectModel.trl_entrada == trl_entrada.value)
        
        if trl_saida:
            query = query.where(PortfolioProjectModel.trl_saida == trl_saida.value)
        
        if categoria:
            query = query.where(PortfolioProjectModel.categoria_solucao_resultante == categoria.value)
        
        if search:
            search_filter = or_(
                PortfolioProjectModel.nome.ilike(f"%{search}%"),
                PortfolioProjectModel.descricao.ilike(f"%{search}%"),
                PortfolioProjectModel.empresa_atendida_nome.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)
        
        query = query.order_by(PortfolioProjectModel.nome).offset(skip).limit(limit)
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        
        return [self._model_to_entity(m) for m in models]
    
    async def list_by_institutes(
        self,
        tenant_id: UUID,
        institute_ids: List[UUID],
        skip: int = 0,
        limit: int = 100,
        status: Optional[PortfolioProjectStatus] = None,
        search: Optional[str] = None,
    ) -> List[PortfolioProject]:
        """List portfolio projects for multiple institutes."""
        if not institute_ids:
            return []
        
        query = select(PortfolioProjectModel).where(
            and_(
                PortfolioProjectModel.tenant_id == tenant_id,
                PortfolioProjectModel.instituto_id.in_(institute_ids),
                PortfolioProjectModel.deleted_at.is_(None)
            )
        )
        
        if status:
            query = query.where(PortfolioProjectModel.status == status.value)
        
        if search:
            search_filter = or_(
                PortfolioProjectModel.nome.ilike(f"%{search}%"),
                PortfolioProjectModel.descricao.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)
        
        query = query.order_by(PortfolioProjectModel.nome).offset(skip).limit(limit)
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        
        return [self._model_to_entity(m) for m in models]
    
    async def update(
        self,
        tenant_id: UUID,
        project_id: UUID,
        data: PortfolioProjectUpdate,
        user_id: UUID
    ) -> Optional[PortfolioProject]:
        """Update a portfolio project."""
        query = select(PortfolioProjectModel).where(
            and_(
                PortfolioProjectModel.id == project_id,
                PortfolioProjectModel.tenant_id == tenant_id,
                PortfolioProjectModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalars().first()
        
        if not model:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            # Convert enums to values
            if field in ['status', 'trl_entrada', 'trl_saida', 'categoria_solucao_resultante', 'empresa_atendida_tipo']:
                if value and hasattr(value, 'value'):
                    value = value.value
            if hasattr(model, field):
                setattr(model, field, value)
        
        model.updated_by = user_id
        model.updated_at = datetime.utcnow()
        
        await self.session.flush()
        await self.session.refresh(model)
        
        return self._model_to_entity(model)
    
    async def soft_delete(
        self,
        tenant_id: UUID,
        project_id: UUID,
        user_id: UUID
    ) -> bool:
        """Soft delete a portfolio project."""
        query = select(PortfolioProjectModel).where(
            and_(
                PortfolioProjectModel.id == project_id,
                PortfolioProjectModel.tenant_id == tenant_id,
                PortfolioProjectModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalars().first()
        
        if not model:
            return False
        
        model.deleted_at = datetime.utcnow()
        model.updated_by = user_id
        model.status = PortfolioProjectStatus.Cancelado.value
        
        await self.session.flush()
        return True
    
    async def get_statistics(
        self,
        tenant_id: UUID,
        institute_ids: Optional[List[UUID]] = None
    ) -> Dict[str, Any]:
        """Get statistics for portfolio projects."""
        base_filter = and_(
            PortfolioProjectModel.tenant_id == tenant_id,
            PortfolioProjectModel.deleted_at.is_(None)
        )
        
        if institute_ids:
            base_filter = and_(base_filter, PortfolioProjectModel.instituto_id.in_(institute_ids))
        
        # Total count
        total_query = select(func.count(PortfolioProjectModel.id)).where(base_filter)
        total_result = await self.session.execute(total_query)
        total = total_result.scalar() or 0
        
        # Total value
        value_query = select(func.sum(PortfolioProjectModel.valor_total)).where(base_filter)
        value_result = await self.session.execute(value_query)
        total_value = float(value_result.scalar() or 0)
        
        # Count by status
        status_counts = {}
        for status in PortfolioProjectStatus:
            status_query = select(func.count(PortfolioProjectModel.id)).where(
                and_(base_filter, PortfolioProjectModel.status == status.value)
            )
            status_result = await self.session.execute(status_query)
            status_counts[status.value] = status_result.scalar() or 0
        
        # Count by TRL entrada
        trl_entrada_counts = {}
        for trl in TRLLevel:
            trl_query = select(func.count(PortfolioProjectModel.id)).where(
                and_(base_filter, PortfolioProjectModel.trl_entrada == trl.value)
            )
            trl_result = await self.session.execute(trl_query)
            trl_entrada_counts[trl.value] = trl_result.scalar() or 0
        
        # Count by TRL saída
        trl_saida_counts = {}
        for trl in TRLLevel:
            trl_query = select(func.count(PortfolioProjectModel.id)).where(
                and_(base_filter, PortfolioProjectModel.trl_saida == trl.value)
            )
            trl_result = await self.session.execute(trl_query)
            trl_saida_counts[trl.value] = trl_result.scalar() or 0
        
        # Count by category
        category_counts = {}
        for cat in SolutionCategory:
            cat_query = select(func.count(PortfolioProjectModel.id)).where(
                and_(base_filter, PortfolioProjectModel.categoria_solucao_resultante == cat.value)
            )
            cat_result = await self.session.execute(cat_query)
            category_counts[cat.value] = cat_result.scalar() or 0
        
        return {
            "total": total,
            "total_value": total_value,
            "by_status": status_counts,
            "by_trl_entrada": trl_entrada_counts,
            "by_trl_saida": trl_saida_counts,
            "by_category": category_counts,
        }
    
    async def get_trl_evolution(
        self,
        tenant_id: UUID,
        institute_ids: Optional[List[UUID]] = None
    ) -> List[Dict[str, Any]]:
        """Get TRL evolution data for projects."""
        base_filter = and_(
            PortfolioProjectModel.tenant_id == tenant_id,
            PortfolioProjectModel.deleted_at.is_(None),
            PortfolioProjectModel.trl_entrada.isnot(None),
            PortfolioProjectModel.trl_saida.isnot(None)
        )
        
        if institute_ids:
            base_filter = and_(base_filter, PortfolioProjectModel.instituto_id.in_(institute_ids))
        
        query = select(
            PortfolioProjectModel.id,
            PortfolioProjectModel.nome,
            PortfolioProjectModel.trl_entrada,
            PortfolioProjectModel.trl_saida
        ).where(base_filter)
        
        result = await self.session.execute(query)
        rows = result.all()
        
        return [
            {
                "id": str(row[0]),
                "nome": row[1],
                "trl_entrada": row[2],
                "trl_saida": row[3],
                "delta": int(row[3].replace("TRL", "")) - int(row[2].replace("TRL", "")) if row[2] and row[3] else 0
            }
            for row in rows
        ]
