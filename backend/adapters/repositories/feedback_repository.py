"""
Feedback Repository Implementation
PostgreSQL repository for user feedback with screenshots and annotations
Implements User Feedback System with Visual Context
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlalchemy import select, and_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from domain.entities.feedback import (
    Feedback, FeedbackCreate, FeedbackStatus, FeedbackType, 
    FeedbackSeverity, FeedbackStatistics
)
from adapters.database.models import FeedbackModel


class FeedbackRepository:
    """
    Concrete repository for Feedback entities.
    Handles CRUD operations with multi-tenant isolation and soft delete.
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create(self, feedback: Feedback) -> Feedback:
        """
        Create a new feedback entry.
        """
        model = FeedbackModel(
            id=feedback.id,
            tenant_id=feedback.tenant_id,
            user_id=feedback.user_id,
            feedback_type=feedback.feedback_type.value,
            severity=feedback.severity.value,
            description=feedback.description,
            page_url=feedback.page_url,
            page_title=feedback.page_title,
            entity_type=feedback.entity_type,
            entity_id=feedback.entity_id,
            screenshot_url=feedback.screenshot_url,
            annotation_image_url=feedback.annotation_image_url,
            annotation_data=feedback.annotation_data,
            user_agent=feedback.user_agent,
            screen_width=feedback.screen_width,
            screen_height=feedback.screen_height,
            status=feedback.status.value,
            created_by=feedback.created_by,
            updated_by=feedback.updated_by,
        )
        
        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        
        return self._to_entity(model)
    
    async def get_by_id(
        self, 
        feedback_id: UUID, 
        tenant_id: UUID
    ) -> Optional[Feedback]:
        """
        Get feedback by ID with tenant isolation.
        """
        stmt = select(FeedbackModel).where(
            and_(
                FeedbackModel.id == feedback_id,
                FeedbackModel.tenant_id == tenant_id,
                FeedbackModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        
        return self._to_entity(model) if model else None
    
    async def list_by_tenant(
        self,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 50,
        status: Optional[FeedbackStatus] = None,
        feedback_type: Optional[FeedbackType] = None,
        severity: Optional[FeedbackSeverity] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Feedback]:
        """
        List feedbacks with filters and pagination.
        Admins can list all, users can only see their own.
        """
        conditions = [
            FeedbackModel.tenant_id == tenant_id,
            FeedbackModel.deleted_at.is_(None)
        ]
        
        if status:
            conditions.append(FeedbackModel.status == status.value)
        
        if feedback_type:
            conditions.append(FeedbackModel.feedback_type == feedback_type.value)
        
        if severity:
            conditions.append(FeedbackModel.severity == severity.value)
        
        if user_id:
            conditions.append(FeedbackModel.user_id == user_id)
        
        stmt = (
            select(FeedbackModel)
            .where(and_(*conditions))
            .order_by(desc(FeedbackModel.created_at))
            .offset(skip)
            .limit(limit)
        )
        
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        
        return [self._to_entity(model) for model in models]
    
    async def list_by_user(
        self,
        user_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Feedback]:
        """
        List feedbacks created by a specific user.
        """
        return await self.list_by_tenant(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            user_id=user_id,
        )
    
    async def count_by_tenant(
        self,
        tenant_id: UUID,
        status: Optional[FeedbackStatus] = None,
        feedback_type: Optional[FeedbackType] = None,
        severity: Optional[FeedbackSeverity] = None,
        user_id: Optional[UUID] = None,
    ) -> int:
        """
        Count feedbacks with optional filters.
        Mirrors the same filter params as list_by_tenant for accurate pagination.
        """
        conditions = [
            FeedbackModel.tenant_id == tenant_id,
            FeedbackModel.deleted_at.is_(None)
        ]
        
        if status:
            conditions.append(FeedbackModel.status == status.value)
        
        if feedback_type:
            conditions.append(FeedbackModel.feedback_type == feedback_type.value)
        
        if severity:
            conditions.append(FeedbackModel.severity == severity.value)
        
        if user_id:
            conditions.append(FeedbackModel.user_id == user_id)
        
        stmt = select(func.count(FeedbackModel.id)).where(and_(*conditions))
        result = await self.session.execute(stmt)
        
        return result.scalar() or 0
    
    async def update_status(
        self,
        feedback_id: UUID,
        tenant_id: UUID,
        new_status: FeedbackStatus,
        updated_by: UUID,
    ) -> Optional[Feedback]:
        """
        Update feedback status.
        """
        stmt = select(FeedbackModel).where(
            and_(
                FeedbackModel.id == feedback_id,
                FeedbackModel.tenant_id == tenant_id,
                FeedbackModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        
        if not model:
            return None
        
        model.status = new_status.value
        model.updated_by = updated_by
        model.updated_at = datetime.utcnow()
        
        if new_status == FeedbackStatus.RESOLVED:
            model.resolved_at = datetime.utcnow()
        
        await self.session.commit()
        await self.session.refresh(model)
        
        return self._to_entity(model)
    
    async def update_severity(
        self,
        feedback_id: UUID,
        tenant_id: UUID,
        new_severity: FeedbackSeverity,
        updated_by: UUID,
    ) -> Optional[Feedback]:
        """
        Update feedback severity/priority.
        """
        stmt = select(FeedbackModel).where(
            and_(
                FeedbackModel.id == feedback_id,
                FeedbackModel.tenant_id == tenant_id,
                FeedbackModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        
        if not model:
            return None
        
        model.severity = new_severity.value
        model.updated_by = updated_by
        model.updated_at = datetime.utcnow()
        
        await self.session.commit()
        await self.session.refresh(model)
        
        return self._to_entity(model)
    
    async def add_response(
        self,
        feedback_id: UUID,
        tenant_id: UUID,
        response: str,
        responded_by: UUID,
    ) -> Optional[Feedback]:
        """
        Add admin response to feedback.
        """
        stmt = select(FeedbackModel).where(
            and_(
                FeedbackModel.id == feedback_id,
                FeedbackModel.tenant_id == tenant_id,
                FeedbackModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        
        if not model:
            return None
        
        model.response = response
        model.responded_by = responded_by
        model.responded_at = datetime.utcnow()
        model.status = FeedbackStatus.ACKNOWLEDGED.value
        model.updated_by = responded_by
        model.updated_at = datetime.utcnow()
        
        await self.session.commit()
        await self.session.refresh(model)
        
        return self._to_entity(model)
    
    async def soft_delete(
        self,
        feedback_id: UUID,
        tenant_id: UUID,
        deleted_by: UUID,
    ) -> bool:
        """
        Soft delete a feedback entry.
        """
        stmt = select(FeedbackModel).where(
            and_(
                FeedbackModel.id == feedback_id,
                FeedbackModel.tenant_id == tenant_id,
                FeedbackModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        
        if not model:
            return False
        
        model.deleted_at = datetime.utcnow()
        model.updated_by = deleted_by
        model.updated_at = datetime.utcnow()
        
        await self.session.commit()
        
        return True
    
    async def get_statistics(
        self,
        tenant_id: UUID,
    ) -> FeedbackStatistics:
        """
        Get aggregated feedback statistics for dashboard.
        """
        # Total count
        total_stmt = select(func.count(FeedbackModel.id)).where(
            and_(
                FeedbackModel.tenant_id == tenant_id,
                FeedbackModel.deleted_at.is_(None)
            )
        )
        total_result = await self.session.execute(total_stmt)
        total = total_result.scalar() or 0
        
        # Count by status
        open_count = await self.count_by_tenant(tenant_id, FeedbackStatus.OPEN)
        in_progress = await self.count_by_tenant(tenant_id, FeedbackStatus.IN_PROGRESS)
        resolved = await self.count_by_tenant(tenant_id, FeedbackStatus.RESOLVED)
        
        # Count by type
        type_stats: Dict[str, int] = {}
        for ftype in FeedbackType:
            type_stmt = select(func.count(FeedbackModel.id)).where(
                and_(
                    FeedbackModel.tenant_id == tenant_id,
                    FeedbackModel.feedback_type == ftype.value,
                    FeedbackModel.deleted_at.is_(None)
                )
            )
            type_result = await self.session.execute(type_stmt)
            count = type_result.scalar() or 0
            if count > 0:
                type_stats[ftype.value] = count
        
        # Count by severity
        severity_stats: Dict[str, int] = {}
        for severity in FeedbackSeverity:
            severity_stmt = select(func.count(FeedbackModel.id)).where(
                and_(
                    FeedbackModel.tenant_id == tenant_id,
                    FeedbackModel.severity == severity.value,
                    FeedbackModel.deleted_at.is_(None)
                )
            )
            severity_result = await self.session.execute(severity_stmt)
            count = severity_result.scalar() or 0
            if count > 0:
                severity_stats[severity.value] = count
        
        # Average resolution time (for resolved feedbacks)
        avg_resolution_time = None
        resolved_stmt = select(
            func.avg(
                func.extract('epoch', FeedbackModel.resolved_at - FeedbackModel.created_at) / 3600
            )
        ).where(
            and_(
                FeedbackModel.tenant_id == tenant_id,
                FeedbackModel.resolved_at.isnot(None),
                FeedbackModel.deleted_at.is_(None)
            )
        )
        resolved_result = await self.session.execute(resolved_stmt)
        avg_hours = resolved_result.scalar()
        if avg_hours is not None:
            avg_resolution_time = float(avg_hours)
        
        return FeedbackStatistics(
            tenant_id=tenant_id,
            created_by=tenant_id,  # System-generated
            updated_by=tenant_id,
            total_feedbacks=total,
            open_feedbacks=open_count,
            in_progress_feedbacks=in_progress,
            resolved_feedbacks=resolved,
            by_type=type_stats,
            by_severity=severity_stats,
            avg_resolution_time_hours=avg_resolution_time,
        )
    
    def _to_entity(self, model: FeedbackModel) -> Feedback:
        """
        Convert database model to domain entity.
        """
        return Feedback(
            id=model.id,
            tenant_id=model.tenant_id,
            user_id=model.user_id,
            feedback_type=FeedbackType(model.feedback_type),
            severity=FeedbackSeverity(model.severity),
            description=model.description,
            page_url=model.page_url,
            page_title=model.page_title,
            entity_type=model.entity_type,
            entity_id=model.entity_id,
            screenshot_url=model.screenshot_url,
            annotation_image_url=model.annotation_image_url,
            annotation_data=model.annotation_data,
            user_agent=model.user_agent,
            screen_width=model.screen_width,
            screen_height=model.screen_height,
            status=FeedbackStatus(model.status),
            response=model.response,
            responded_by=model.responded_by,
            responded_at=model.responded_at,
            resolved_at=model.resolved_at,
            resolution_notes=model.resolution_notes,
            created_at=model.created_at,
            updated_at=model.updated_at,
            deleted_at=model.deleted_at,
            created_by=model.created_by,
            updated_by=model.updated_by,
        )
