# Institute Repository
# Implements RF-03: Portfólio Institucional
# Clean Architecture - Adapters Layer

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, func, text

from adapters.database.models import InstituteModel, UserInstituteModel
from domain.entities.institute import Institute, InstituteCreate, InstituteUpdate


class InstituteRepository:
    """
    Repository for Institute entity.
    Implements Clean Architecture repository pattern with RLS enforcement.
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    def _model_to_entity(self, model: InstituteModel) -> Institute:
        """Convert database model to domain entity."""
        return Institute(
            id=model.id,
            tenant_id=model.tenant_id,
            nome=model.nome,
            nome_fantasia=model.nome_fantasia,
            isi_sigla=model.isi_sigla,
            endereco_rua=model.endereco_rua,
            endereco_numero=model.endereco_numero,
            endereco_complemento=model.endereco_complemento,
            endereco_bairro=model.endereco_bairro,
            endereco_cep=model.endereco_cep,
            endereco_cidade=model.endereco_cidade,
            endereco_uf=model.endereco_uf,
            descricao=model.descricao,
            area_predial_m2=model.area_predial_m2,
            status_operacional=model.status_operacional,
            status=model.status,
            maturidade_gestao=model.maturidade_gestao,
            maturidade_base_tecnologica=model.maturidade_base_tecnologica,
            maturidade_produtos_servicos=model.maturidade_produtos_servicos,
            maturidade_cooperacao=model.maturidade_cooperacao,
            credenciamento_cati=model.credenciamento_cati or False,
            credenciamento_ed=model.credenciamento_ed or False,
            logo_url=model.logo_url,
            created_at=model.created_at,
            updated_at=model.updated_at,
            deleted_at=model.deleted_at,
            created_by=model.created_by,
            updated_by=model.updated_by,
        )
    
    async def create(
        self,
        tenant_id: UUID,
        data: InstituteCreate,
        user_id: UUID
    ) -> Institute:
        """Create a new institute."""
        model = InstituteModel(
            tenant_id=tenant_id,
            nome=data.nome,
            nome_fantasia=data.nome_fantasia,
            isi_sigla=data.isi_sigla,
            endereco_rua=data.endereco_rua,
            endereco_numero=data.endereco_numero,
            endereco_complemento=data.endereco_complemento,
            endereco_bairro=data.endereco_bairro,
            endereco_cep=data.endereco_cep,
            endereco_cidade=data.endereco_cidade,
            endereco_uf=data.endereco_uf,
            descricao=data.descricao,
            area_predial_m2=data.area_predial_m2,
            status_operacional=data.status_operacional.value if data.status_operacional else 'Operacional',
            status='Ativo',
            maturidade_gestao=data.maturidade_gestao,
            maturidade_base_tecnologica=data.maturidade_base_tecnologica,
            maturidade_produtos_servicos=data.maturidade_produtos_servicos,
            maturidade_cooperacao=data.maturidade_cooperacao,
            credenciamento_cati=data.credenciamento_cati,
            credenciamento_ed=data.credenciamento_ed,
            logo_url=data.logo_url,
            # Legacy compatibility
            name=data.nome,
            code=data.isi_sigla,
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
        institute_id: UUID
    ) -> Optional[Institute]:
        """Get institute by ID with RLS enforcement."""
        query = select(InstituteModel).where(
            and_(
                InstituteModel.id == institute_id,
                InstituteModel.tenant_id == tenant_id,
                InstituteModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalars().first()
        
        return self._model_to_entity(model) if model else None
    
    async def list_all(
        self,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        status_operacional: Optional[str] = None,
        cidade: Optional[str] = None,
        uf: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Institute]:
        """List all institutes with optional filters."""
        query = select(InstituteModel).where(
            and_(
                InstituteModel.tenant_id == tenant_id,
                InstituteModel.deleted_at.is_(None)
            )
        )
        
        if status:
            query = query.where(InstituteModel.status == status)
        
        if status_operacional:
            query = query.where(InstituteModel.status_operacional == status_operacional)
        
        if cidade:
            query = query.where(InstituteModel.endereco_cidade.ilike(f"%{cidade}%"))
        
        if uf:
            query = query.where(InstituteModel.endereco_uf == uf.upper())
        
        if search:
            search_filter = or_(
                InstituteModel.nome.ilike(f"%{search}%"),
                InstituteModel.nome_fantasia.ilike(f"%{search}%"),
                InstituteModel.isi_sigla.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)
        
        query = query.order_by(InstituteModel.nome).offset(skip).limit(limit)
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        
        return [self._model_to_entity(m) for m in models]
    
    async def list_by_user_membership(
        self,
        tenant_id: UUID,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Institute]:
        """List institutes where user has membership - with deduplication."""
        query = (
            select(InstituteModel)
            .join(
                UserInstituteModel,
                and_(
                    UserInstituteModel.institute_id == InstituteModel.id,
                    UserInstituteModel.user_id == user_id,
                    UserInstituteModel.deleted_at.is_(None)
                )
            )
            .where(
                and_(
                    InstituteModel.tenant_id == tenant_id,
                    InstituteModel.deleted_at.is_(None)
                )
            )
            .group_by(InstituteModel.id)
            .order_by(InstituteModel.nome)
            .offset(skip)
            .limit(limit)
        )
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        
        return [self._model_to_entity(m) for m in models]
    
    async def update(
        self,
        tenant_id: UUID,
        institute_id: UUID,
        data: InstituteUpdate,
        user_id: UUID
    ) -> Optional[Institute]:
        """Update an existing institute."""
        query = select(InstituteModel).where(
            and_(
                InstituteModel.id == institute_id,
                InstituteModel.tenant_id == tenant_id,
                InstituteModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalars().first()
        
        if not model:
            return None
        
        # Update fields from data
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(model, field):
                # Handle enum values
                if hasattr(value, 'value'):
                    value = value.value
                setattr(model, field, value)
        
        model.updated_by = user_id
        model.updated_at = datetime.utcnow()
        
        # Update legacy compatibility fields
        if data.nome:
            model.name = data.nome
        if data.isi_sigla:
            model.code = data.isi_sigla
        if data.descricao:
            model.description = data.descricao
        
        await self.session.flush()
        await self.session.refresh(model)
        
        return self._model_to_entity(model)
    
    async def soft_delete(
        self,
        tenant_id: UUID,
        institute_id: UUID,
        user_id: UUID
    ) -> bool:
        """Soft delete an institute."""
        query = select(InstituteModel).where(
            and_(
                InstituteModel.id == institute_id,
                InstituteModel.tenant_id == tenant_id,
                InstituteModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalars().first()
        
        if not model:
            return False
        
        model.deleted_at = datetime.utcnow()
        model.updated_by = user_id
        model.status = 'Inativo'
        
        await self.session.flush()
        return True
    
    async def get_statistics(
        self,
        tenant_id: UUID,
        institute_ids: Optional[List[UUID]] = None
    ) -> Dict[str, Any]:
        """Get statistics for institutes."""
        base_filter = and_(
            InstituteModel.tenant_id == tenant_id,
            InstituteModel.deleted_at.is_(None)
        )
        
        if institute_ids:
            base_filter = and_(base_filter, InstituteModel.id.in_(institute_ids))
        
        # Total count
        total_query = select(func.count(InstituteModel.id)).where(base_filter)
        total_result = await self.session.execute(total_query)
        total = total_result.scalar() or 0
        
        # Count by status
        operational_query = select(func.count(InstituteModel.id)).where(
            and_(base_filter, InstituteModel.status_operacional == 'Operacional')
        )
        operational_result = await self.session.execute(operational_query)
        operational = operational_result.scalar() or 0
        
        # Total area
        area_query = select(func.sum(InstituteModel.area_predial_m2)).where(base_filter)
        area_result = await self.session.execute(area_query)
        total_area = area_result.scalar() or 0
        
        # Count with CATI accreditation
        cati_query = select(func.count(InstituteModel.id)).where(
            and_(base_filter, InstituteModel.credenciamento_cati == True)
        )
        cati_result = await self.session.execute(cati_query)
        with_cati = cati_result.scalar() or 0
        
        return {
            "total": total,
            "operational": operational,
            "implementing": total - operational,
            "total_area_m2": total_area,
            "with_cati": with_cati,
        }
    
    async def check_user_membership(
        self,
        tenant_id: UUID,
        user_id: UUID,
        institute_id: UUID
    ) -> bool:
        """Check if user has membership in an institute."""
        query = select(UserInstituteModel.id).where(
            and_(
                UserInstituteModel.user_id == user_id,
                UserInstituteModel.institute_id == institute_id,
                UserInstituteModel.tenant_id == tenant_id,
                UserInstituteModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(query)
        return result.scalars().first() is not None
    
    async def get_user_institute_ids(
        self,
        tenant_id: UUID,
        user_id: UUID
    ) -> List[UUID]:
        """Get list of institute IDs where user has membership."""
        query = select(UserInstituteModel.institute_id).where(
            and_(
                UserInstituteModel.user_id == user_id,
                UserInstituteModel.tenant_id == tenant_id,
                UserInstituteModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(query)
        return list(result.scalars().all())
