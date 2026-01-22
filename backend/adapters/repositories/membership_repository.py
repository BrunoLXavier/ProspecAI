# Membership Repository
# Implements RF-03: Portfólio Institucional
# Clean Architecture - Adapters Layer

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, func

from adapters.database.models import UserInstituteModel, InstituteModel, UserModel


class UserInstituteMembership:
    """Domain entity for user-institute membership."""
    def __init__(
        self,
        id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        institute_id: UUID,
        role: str,
        user_name: Optional[str] = None,
        user_email: Optional[str] = None,
        institute_name: Optional[str] = None,
        institute_sigla: Optional[str] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        deleted_at: Optional[datetime] = None,
        created_by: Optional[UUID] = None,
        updated_by: Optional[UUID] = None,
    ):
        self.id = id
        self.tenant_id = tenant_id
        self.user_id = user_id
        self.institute_id = institute_id
        self.role = role
        self.user_name = user_name
        self.user_email = user_email
        self.institute_name = institute_name
        self.institute_sigla = institute_sigla
        self.created_at = created_at
        self.updated_at = updated_at
        self.deleted_at = deleted_at
        self.created_by = created_by
        self.updated_by = updated_by


class MembershipRepository:
    """
    Repository for User-Institute Membership.
    Manages the link between users and institutes.
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create(
        self,
        tenant_id: UUID,
        user_id: UUID,
        institute_id: UUID,
        role: str,
        created_by: UUID
    ) -> UserInstituteMembership:
        """Create a new membership."""
        # Check if membership already exists
        existing = await self.get_membership(tenant_id, user_id, institute_id)
        if existing:
            # Reactivate if deleted
            if existing.deleted_at:
                return await self.reactivate(tenant_id, user_id, institute_id, role, created_by)
            return existing
        
        model = UserInstituteModel(
            tenant_id=tenant_id,
            user_id=user_id,
            institute_id=institute_id,
            role=role,
            created_by=created_by,
            updated_by=created_by,
        )
        
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        
        return await self._model_to_entity(model)
    
    async def reactivate(
        self,
        tenant_id: UUID,
        user_id: UUID,
        institute_id: UUID,
        role: str,
        updated_by: UUID
    ) -> Optional[UserInstituteMembership]:
        """Reactivate a deleted membership."""
        query = select(UserInstituteModel).where(
            and_(
                UserInstituteModel.tenant_id == tenant_id,
                UserInstituteModel.user_id == user_id,
                UserInstituteModel.institute_id == institute_id,
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalars().first()
        
        if not model:
            return None
        
        model.deleted_at = None
        model.role = role
        model.updated_by = updated_by
        model.updated_at = datetime.utcnow()
        
        await self.session.flush()
        await self.session.refresh(model)
        
        return await self._model_to_entity(model)
    
    async def get_membership(
        self,
        tenant_id: UUID,
        user_id: UUID,
        institute_id: UUID,
        include_deleted: bool = False
    ) -> Optional[UserInstituteMembership]:
        """Get specific membership."""
        query = select(UserInstituteModel).where(
            and_(
                UserInstituteModel.tenant_id == tenant_id,
                UserInstituteModel.user_id == user_id,
                UserInstituteModel.institute_id == institute_id,
            )
        )
        
        if not include_deleted:
            query = query.where(UserInstituteModel.deleted_at.is_(None))
        
        result = await self.session.execute(query)
        model = result.scalars().first()
        
        return await self._model_to_entity(model) if model else None
    
    async def list_by_user(
        self,
        tenant_id: UUID,
        user_id: UUID,
        include_deleted: bool = False
    ) -> List[UserInstituteMembership]:
        """List all memberships for a user."""
        query = select(UserInstituteModel).where(
            and_(
                UserInstituteModel.tenant_id == tenant_id,
                UserInstituteModel.user_id == user_id,
            )
        )
        
        if not include_deleted:
            query = query.where(UserInstituteModel.deleted_at.is_(None))
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        
        memberships = []
        for m in models:
            entity = await self._model_to_entity(m)
            memberships.append(entity)
        
        return memberships
    
    async def list_by_institute(
        self,
        tenant_id: UUID,
        institute_id: UUID,
        skip: int = 0,
        limit: int = 100,
        role: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[UserInstituteMembership]:
        """List all memberships for an institute."""
        query = select(UserInstituteModel, UserModel).join(
            UserModel, UserInstituteModel.user_id == UserModel.id
        ).where(
            and_(
                UserInstituteModel.tenant_id == tenant_id,
                UserInstituteModel.institute_id == institute_id,
                UserInstituteModel.deleted_at.is_(None),
            )
        )
        
        if role:
            query = query.where(UserInstituteModel.role == role)
        
        if search:
            search_filter = or_(
                UserModel.name.ilike(f"%{search}%"),
                UserModel.email.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)
        
        query = query.order_by(UserModel.name).offset(skip).limit(limit)
        
        result = await self.session.execute(query)
        rows = result.all()
        
        memberships = []
        for membership_model, user_model in rows:
            memberships.append(UserInstituteMembership(
                id=membership_model.id,
                tenant_id=membership_model.tenant_id,
                user_id=membership_model.user_id,
                institute_id=membership_model.institute_id,
                role=membership_model.role,
                user_name=user_model.name,
                user_email=user_model.email,
                created_at=membership_model.created_at,
                updated_at=membership_model.updated_at,
                deleted_at=membership_model.deleted_at,
                created_by=membership_model.created_by,
                updated_by=membership_model.updated_by,
            ))
        
        return memberships
    
    async def update_role(
        self,
        tenant_id: UUID,
        user_id: UUID,
        institute_id: UUID,
        role: str,
        updated_by: UUID
    ) -> Optional[UserInstituteMembership]:
        """Update membership role."""
        query = select(UserInstituteModel).where(
            and_(
                UserInstituteModel.tenant_id == tenant_id,
                UserInstituteModel.user_id == user_id,
                UserInstituteModel.institute_id == institute_id,
                UserInstituteModel.deleted_at.is_(None),
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalars().first()
        
        if not model:
            return None
        
        model.role = role
        model.updated_by = updated_by
        model.updated_at = datetime.utcnow()
        
        await self.session.flush()
        await self.session.refresh(model)
        
        return await self._model_to_entity(model)
    
    async def remove(
        self,
        tenant_id: UUID,
        user_id: UUID,
        institute_id: UUID,
        removed_by: UUID
    ) -> bool:
        """Soft delete a membership."""
        query = select(UserInstituteModel).where(
            and_(
                UserInstituteModel.tenant_id == tenant_id,
                UserInstituteModel.user_id == user_id,
                UserInstituteModel.institute_id == institute_id,
                UserInstituteModel.deleted_at.is_(None),
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalars().first()
        
        if not model:
            return False
        
        model.deleted_at = datetime.utcnow()
        model.updated_by = removed_by
        
        await self.session.flush()
        return True
    
    async def check_membership(
        self,
        tenant_id: UUID,
        user_id: UUID,
        institute_id: UUID
    ) -> bool:
        """Check if user has active membership in institute."""
        query = select(UserInstituteModel.id).where(
            and_(
                UserInstituteModel.tenant_id == tenant_id,
                UserInstituteModel.user_id == user_id,
                UserInstituteModel.institute_id == institute_id,
                UserInstituteModel.deleted_at.is_(None),
            )
        )
        
        result = await self.session.execute(query)
        return result.scalars().first() is not None
    
    async def check_membership_any(
        self,
        tenant_id: UUID,
        user_id: UUID,
        institute_ids: List[UUID]
    ) -> bool:
        """Check if user has active membership in any of the institutes."""
        if not institute_ids:
            return False
        
        query = select(UserInstituteModel.id).where(
            and_(
                UserInstituteModel.tenant_id == tenant_id,
                UserInstituteModel.user_id == user_id,
                UserInstituteModel.institute_id.in_(institute_ids),
                UserInstituteModel.deleted_at.is_(None),
            )
        )
        
        result = await self.session.execute(query)
        return result.scalars().first() is not None
    
    async def get_user_institute_ids(
        self,
        tenant_id: UUID,
        user_id: UUID
    ) -> List[UUID]:
        """Get all institute IDs where user has membership."""
        query = select(UserInstituteModel.institute_id).where(
            and_(
                UserInstituteModel.tenant_id == tenant_id,
                UserInstituteModel.user_id == user_id,
                UserInstituteModel.deleted_at.is_(None),
            )
        )
        
        result = await self.session.execute(query)
        return list(result.scalars().all())
    
    async def get_statistics(
        self,
        tenant_id: UUID,
        institute_ids: Optional[List[UUID]] = None
    ) -> Dict[str, Any]:
        """Get membership statistics."""
        base_filter = and_(
            UserInstituteModel.tenant_id == tenant_id,
            UserInstituteModel.deleted_at.is_(None)
        )
        
        if institute_ids:
            base_filter = and_(base_filter, UserInstituteModel.institute_id.in_(institute_ids))
        
        # Total memberships
        total_query = select(func.count(UserInstituteModel.id)).where(base_filter)
        total_result = await self.session.execute(total_query)
        total = total_result.scalar() or 0
        
        # Distinct users
        users_query = select(func.count(func.distinct(UserInstituteModel.user_id))).where(base_filter)
        users_result = await self.session.execute(users_query)
        distinct_users = users_result.scalar() or 0
        
        # Distinct institutes
        institutes_query = select(func.count(func.distinct(UserInstituteModel.institute_id))).where(base_filter)
        institutes_result = await self.session.execute(institutes_query)
        distinct_institutes = institutes_result.scalar() or 0
        
        # By role
        roles_query = select(
            UserInstituteModel.role,
            func.count(UserInstituteModel.id)
        ).where(base_filter).group_by(UserInstituteModel.role)
        
        roles_result = await self.session.execute(roles_query)
        by_role = {row[0]: row[1] for row in roles_result.all()}
        
        return {
            "total_memberships": total,
            "distinct_users": distinct_users,
            "distinct_institutes": distinct_institutes,
            "by_role": by_role,
        }
    
    async def _model_to_entity(self, model: UserInstituteModel) -> UserInstituteMembership:
        """Convert model to entity with related data."""
        # Fetch user and institute names
        user_name = None
        user_email = None
        institute_name = None
        institute_sigla = None
        
        if model.user_id:
            user_query = select(UserModel.name, UserModel.email).where(UserModel.id == model.user_id)
            user_result = await self.session.execute(user_query)
            user_row = user_result.first()
            if user_row:
                user_name = user_row[0]
                user_email = user_row[1]
        
        if model.institute_id:
            institute_query = select(InstituteModel.nome, InstituteModel.isi_sigla).where(
                InstituteModel.id == model.institute_id
            )
            institute_result = await self.session.execute(institute_query)
            institute_row = institute_result.first()
            if institute_row:
                institute_name = institute_row[0] or institute_row[1]
                institute_sigla = institute_row[1]
        
        return UserInstituteMembership(
            id=model.id,
            tenant_id=model.tenant_id,
            user_id=model.user_id,
            institute_id=model.institute_id,
            role=model.role,
            user_name=user_name,
            user_email=user_email,
            institute_name=institute_name,
            institute_sigla=institute_sigla,
            created_at=model.created_at,
            updated_at=model.updated_at,
            deleted_at=model.deleted_at,
            created_by=model.created_by,
            updated_by=model.updated_by,
        )
