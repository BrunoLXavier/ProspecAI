# Team Repository
# Implements RF-03: Portfólio Institucional
# Clean Architecture - Adapters Layer

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, func

from adapters.database.models import TeamModel, UserInstituteModel
from domain.entities.team import Team, TeamCreate, TeamUpdate


class TeamRepository:
    """
    Repository for Team (Equipe) entity.
    Links users to institutes with professional roles.
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    def _model_to_entity(self, model: TeamModel) -> Team:
        """Convert database model to domain entity."""
        return Team(
            id=model.id,
            tenant_id=model.tenant_id,
            usuario_id=model.usuario_id,
            instituto_id=model.instituto_id,
            cargo=model.cargo,
            funcao_principal=model.funcao_principal,
            vinculo_principal=model.vinculo_principal or False,
            email_profissional=model.email_profissional,
            telefone_celular=model.telefone_celular,
            linkedin_url=model.linkedin_url,
            lattes_url=model.lattes_url,
            orcid_id=model.orcid_id,
            researchgate_url=model.researchgate_url,
            scopus_author_id=model.scopus_author_id,
            web_of_science_researcher_id=model.web_of_science_researcher_id,
            foto_perfil_url=model.foto_perfil_url,
            data_vinculo_inicio=model.data_vinculo_inicio.date() if model.data_vinculo_inicio else None,
            data_vinculo_fim=model.data_vinculo_fim.date() if model.data_vinculo_fim else None,
            created_at=model.created_at,
            updated_at=model.updated_at,
            deleted_at=model.deleted_at,
            created_by=model.created_by,
            updated_by=model.updated_by,
        )
    
    async def create(
        self,
        tenant_id: UUID,
        data: TeamCreate,
        user_id: UUID
    ) -> Team:
        """Create a new team member link."""
        model = TeamModel(
            tenant_id=tenant_id,
            usuario_id=data.usuario_id,
            instituto_id=data.instituto_id,
            cargo=data.cargo,
            funcao_principal=data.funcao_principal,
            vinculo_principal=data.vinculo_principal,
            email_profissional=data.email_profissional,
            telefone_celular=data.telefone_celular,
            linkedin_url=data.linkedin_url,
            lattes_url=data.lattes_url,
            orcid_id=data.orcid_id,
            researchgate_url=data.researchgate_url,
            scopus_author_id=data.scopus_author_id,
            web_of_science_researcher_id=data.web_of_science_researcher_id,
            foto_perfil_url=data.foto_perfil_url,
            data_vinculo_inicio=data.data_vinculo_inicio,
            data_vinculo_fim=data.data_vinculo_fim,
            # Legacy compatibility
            name=data.cargo,
            description=data.funcao_principal,
            created_by=user_id,
            updated_by=user_id,
        )
        
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        
        # Also create UserInstitute membership if not exists
        await self._ensure_user_membership(tenant_id, data.usuario_id, data.instituto_id, user_id)
        
        return self._model_to_entity(model)
    
    async def _ensure_user_membership(
        self,
        tenant_id: UUID,
        user_id: UUID,
        institute_id: UUID,
        created_by: UUID
    ) -> None:
        """Ensure user has membership in institute."""
        query = select(UserInstituteModel.id).where(
            and_(
                UserInstituteModel.user_id == user_id,
                UserInstituteModel.institute_id == institute_id,
                UserInstituteModel.tenant_id == tenant_id,
            )
        )
        
        result = await self.session.execute(query)
        if not result.scalars().first():
            membership = UserInstituteModel(
                tenant_id=tenant_id,
                user_id=user_id,
                institute_id=institute_id,
                role='member',
                created_by=created_by,
                updated_by=created_by,
            )
            self.session.add(membership)
            await self.session.flush()
    
    async def get_by_id(
        self,
        tenant_id: UUID,
        team_id: UUID
    ) -> Optional[Team]:
        """Get team member by ID."""
        query = select(TeamModel).where(
            and_(
                TeamModel.id == team_id,
                TeamModel.tenant_id == tenant_id,
                TeamModel.deleted_at.is_(None)
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
        cargo: Optional[str] = None,
        vinculo_principal: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> List[Team]:
        """List team members for a specific institute."""
        query = select(TeamModel).where(
            and_(
                TeamModel.tenant_id == tenant_id,
                TeamModel.instituto_id == institute_id,
                TeamModel.deleted_at.is_(None)
            )
        )
        
        if cargo:
            query = query.where(TeamModel.cargo.ilike(f"%{cargo}%"))
        
        if vinculo_principal is not None:
            query = query.where(TeamModel.vinculo_principal == vinculo_principal)
        
        if search:
            search_filter = or_(
                TeamModel.cargo.ilike(f"%{search}%"),
                TeamModel.funcao_principal.ilike(f"%{search}%"),
                TeamModel.email_profissional.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)
        
        query = query.order_by(TeamModel.cargo).offset(skip).limit(limit)
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        
        return [self._model_to_entity(m) for m in models]
    
    async def list_by_institutes(
        self,
        tenant_id: UUID,
        institute_ids: List[UUID],
        skip: int = 0,
        limit: int = 100,
    ) -> List[Team]:
        """List team members for multiple institutes."""
        if not institute_ids:
            return []
        
        query = select(TeamModel).where(
            and_(
                TeamModel.tenant_id == tenant_id,
                TeamModel.instituto_id.in_(institute_ids),
                TeamModel.deleted_at.is_(None)
            )
        ).order_by(TeamModel.cargo).offset(skip).limit(limit)
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        
        return [self._model_to_entity(m) for m in models]
    
    async def list_by_user(
        self,
        tenant_id: UUID,
        user_id: UUID,
    ) -> List[Team]:
        """List all team links for a specific user."""
        query = select(TeamModel).where(
            and_(
                TeamModel.tenant_id == tenant_id,
                TeamModel.usuario_id == user_id,
                TeamModel.deleted_at.is_(None)
            )
        ).order_by(TeamModel.vinculo_principal.desc(), TeamModel.cargo)
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        
        return [self._model_to_entity(m) for m in models]
    
    async def update(
        self,
        tenant_id: UUID,
        team_id: UUID,
        data: TeamUpdate,
        user_id: UUID
    ) -> Optional[Team]:
        """Update a team member link."""
        query = select(TeamModel).where(
            and_(
                TeamModel.id == team_id,
                TeamModel.tenant_id == tenant_id,
                TeamModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalars().first()
        
        if not model:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(model, field):
                setattr(model, field, value)
        
        model.updated_by = user_id
        model.updated_at = datetime.utcnow()
        
        # Update legacy fields
        if data.cargo:
            model.name = data.cargo
        if data.funcao_principal:
            model.description = data.funcao_principal
        
        await self.session.flush()
        await self.session.refresh(model)
        
        return self._model_to_entity(model)
    
    async def soft_delete(
        self,
        tenant_id: UUID,
        team_id: UUID,
        user_id: UUID
    ) -> bool:
        """Soft delete a team member link."""
        query = select(TeamModel).where(
            and_(
                TeamModel.id == team_id,
                TeamModel.tenant_id == tenant_id,
                TeamModel.deleted_at.is_(None)
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
        """Get statistics for team members."""
        base_filter = and_(
            TeamModel.tenant_id == tenant_id,
            TeamModel.deleted_at.is_(None)
        )
        
        if institute_ids:
            base_filter = and_(base_filter, TeamModel.instituto_id.in_(institute_ids))
        
        # Total count
        total_query = select(func.count(TeamModel.id)).where(base_filter)
        total_result = await self.session.execute(total_query)
        total = total_result.scalar() or 0
        
        # Count with primary link
        primary_query = select(func.count(TeamModel.id)).where(
            and_(base_filter, TeamModel.vinculo_principal == True)
        )
        primary_result = await self.session.execute(primary_query)
        primary_links = primary_result.scalar() or 0
        
        # Distinct users
        distinct_users_query = select(func.count(func.distinct(TeamModel.usuario_id))).where(base_filter)
        distinct_users_result = await self.session.execute(distinct_users_query)
        distinct_users = distinct_users_result.scalar() or 0
        
        return {
            "total": total,
            "primary_links": primary_links,
            "distinct_users": distinct_users,
        }
