"""
Notification Service
Implements RF-07: Active notifications with user preferences and multi-channel delivery.
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
import logging

from sqlalchemy import select, update, delete, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from adapters.database.models import NotificationModel, UserNotificationPreferenceModel

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Service for managing notifications and user notification preferences.
    Supports in-app, email, and push notification channels.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # =========================================================================
    # NOTIFICATION CRUD
    # =========================================================================

    async def create_notification(
        self,
        tenant_id: UUID,
        user_id: UUID,
        title: str,
        body: str,
        notification_type: str = 'info',
        priority: str = 'normal',
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        action_url: Optional[str] = None,
        institute_id: Optional[UUID] = None,
        scheduled_at: Optional[datetime] = None,
        expires_at: Optional[datetime] = None,
        channels: Optional[List[str]] = None,
        created_by: Optional[UUID] = None
    ) -> NotificationModel:
        """
        Create a new notification for a user.
        Respects user preferences for channels and delivery.
        """
        # Check user preferences
        prefs = await self.get_user_preferences(tenant_id, user_id)
        
        # Filter channels based on preferences
        requested_channels = channels or ['in_app']
        effective_channels = self._filter_channels_by_preferences(
            requested_channels, notification_type, prefs
        )
        
        if not effective_channels:
            logger.info(f"Notification skipped for user {user_id} - all channels disabled for type {notification_type}")
            return None

        notification = NotificationModel(
            id=uuid4(),
            tenant_id=tenant_id,
            user_id=user_id,
            institute_id=institute_id,
            title=title,
            body=body,
            notification_type=notification_type,
            priority=priority,
            entity_type=entity_type,
            entity_id=entity_id,
            action_url=action_url,
            scheduled_at=scheduled_at,
            expires_at=expires_at,
            channels=effective_channels,
            delivery_status={},
            created_by=created_by or user_id,
            updated_by=created_by or user_id
        )
        
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        
        # Trigger delivery for immediate notifications
        if not scheduled_at or scheduled_at <= datetime.utcnow():
            await self._deliver_notification(notification, prefs)
        
        return notification

    async def get_notification(self, notification_id: UUID, tenant_id: UUID) -> Optional[NotificationModel]:
        """Get a single notification by ID."""
        result = await self.db.execute(
            select(NotificationModel).where(
                and_(
                    NotificationModel.id == notification_id,
                    NotificationModel.tenant_id == tenant_id,
                    NotificationModel.deleted_at.is_(None)
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_notifications(
        self,
        tenant_id: UUID,
        user_id: UUID,
        unread_only: bool = False,
        notification_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        include_dismissed: bool = False
    ) -> List[NotificationModel]:
        """List notifications for a user with filtering."""
        query = select(NotificationModel).where(
            and_(
                NotificationModel.tenant_id == tenant_id,
                NotificationModel.user_id == user_id,
                NotificationModel.deleted_at.is_(None),
                or_(
                    NotificationModel.scheduled_at.is_(None),
                    NotificationModel.scheduled_at <= datetime.utcnow()
                )
            )
        )
        
        if unread_only:
            query = query.where(NotificationModel.read == False)
        
        if not include_dismissed:
            query = query.where(NotificationModel.dismissed == False)
        
        if notification_type:
            query = query.where(NotificationModel.notification_type == notification_type)
        
        # Exclude expired notifications
        query = query.where(
            or_(
                NotificationModel.expires_at.is_(None),
                NotificationModel.expires_at > datetime.utcnow()
            )
        )
        
        query = query.order_by(NotificationModel.created_at.desc())
        query = query.limit(limit).offset(offset)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_unread_count(self, tenant_id: UUID, user_id: UUID) -> int:
        """Get count of unread notifications."""
        result = await self.db.execute(
            select(func.count(NotificationModel.id)).where(
                and_(
                    NotificationModel.tenant_id == tenant_id,
                    NotificationModel.user_id == user_id,
                    NotificationModel.read == False,
                    NotificationModel.dismissed == False,
                    NotificationModel.deleted_at.is_(None),
                    or_(
                        NotificationModel.expires_at.is_(None),
                        NotificationModel.expires_at > datetime.utcnow()
                    )
                )
            )
        )
        return result.scalar() or 0

    async def mark_as_read(
        self,
        notification_ids: List[UUID],
        tenant_id: UUID,
        user_id: UUID
    ) -> int:
        """Mark one or more notifications as read."""
        result = await self.db.execute(
            update(NotificationModel)
            .where(
                and_(
                    NotificationModel.id.in_(notification_ids),
                    NotificationModel.tenant_id == tenant_id,
                    NotificationModel.user_id == user_id
                )
            )
            .values(read=True, read_at=datetime.utcnow())
        )
        await self.db.commit()
        return result.rowcount

    async def mark_all_as_read(self, tenant_id: UUID, user_id: UUID) -> int:
        """Mark all notifications as read for a user."""
        result = await self.db.execute(
            update(NotificationModel)
            .where(
                and_(
                    NotificationModel.tenant_id == tenant_id,
                    NotificationModel.user_id == user_id,
                    NotificationModel.read == False
                )
            )
            .values(read=True, read_at=datetime.utcnow())
        )
        await self.db.commit()
        return result.rowcount

    async def dismiss_notification(
        self,
        notification_id: UUID,
        tenant_id: UUID,
        user_id: UUID
    ) -> bool:
        """Dismiss a notification (hide without deleting)."""
        result = await self.db.execute(
            update(NotificationModel)
            .where(
                and_(
                    NotificationModel.id == notification_id,
                    NotificationModel.tenant_id == tenant_id,
                    NotificationModel.user_id == user_id
                )
            )
            .values(dismissed=True, dismissed_at=datetime.utcnow())
        )
        await self.db.commit()
        return result.rowcount > 0

    async def delete_notification(
        self,
        notification_id: UUID,
        tenant_id: UUID,
        user_id: UUID
    ) -> bool:
        """Soft delete a notification."""
        result = await self.db.execute(
            update(NotificationModel)
            .where(
                and_(
                    NotificationModel.id == notification_id,
                    NotificationModel.tenant_id == tenant_id,
                    NotificationModel.user_id == user_id
                )
            )
            .values(deleted_at=datetime.utcnow())
        )
        await self.db.commit()
        return result.rowcount > 0

    # =========================================================================
    # USER PREFERENCES
    # =========================================================================

    async def get_user_preferences(
        self,
        tenant_id: UUID,
        user_id: UUID
    ) -> Optional[UserNotificationPreferenceModel]:
        """Get notification preferences for a user."""
        result = await self.db.execute(
            select(UserNotificationPreferenceModel).where(
                and_(
                    UserNotificationPreferenceModel.tenant_id == tenant_id,
                    UserNotificationPreferenceModel.user_id == user_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_or_create_preferences(
        self,
        tenant_id: UUID,
        user_id: UUID
    ) -> UserNotificationPreferenceModel:
        """Get or create default preferences for a user."""
        prefs = await self.get_user_preferences(tenant_id, user_id)
        if prefs:
            return prefs
        
        # Create default preferences
        prefs = UserNotificationPreferenceModel(
            id=uuid4(),
            tenant_id=tenant_id,
            user_id=user_id,
            type_preferences={
                'info': {'enabled': True, 'channels': ['in_app']},
                'warning': {'enabled': True, 'channels': ['in_app', 'email']},
                'deadline': {'enabled': True, 'channels': ['in_app', 'email']},
                'matching': {'enabled': True, 'channels': ['in_app']},
                'success': {'enabled': True, 'channels': ['in_app']},
                'error': {'enabled': True, 'channels': ['in_app', 'email']},
            },
            email_enabled=True,
            push_enabled=True,
            in_app_enabled=True
        )
        
        self.db.add(prefs)
        await self.db.commit()
        await self.db.refresh(prefs)
        return prefs

    async def update_preferences(
        self,
        tenant_id: UUID,
        user_id: UUID,
        updates: Dict[str, Any]
    ) -> UserNotificationPreferenceModel:
        """Update user notification preferences."""
        prefs = await self.get_or_create_preferences(tenant_id, user_id)
        
        # Update allowed fields
        allowed_fields = [
            'type_preferences', 'email_enabled', 'push_enabled', 'in_app_enabled',
            'quiet_hours', 'email_digest_frequency', 'digest_time'
        ]
        
        for field in allowed_fields:
            if field in updates:
                setattr(prefs, field, updates[field])
        
        prefs.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(prefs)
        return prefs

    # =========================================================================
    # BULK NOTIFICATIONS
    # =========================================================================

    async def notify_institute_members(
        self,
        tenant_id: UUID,
        institute_id: UUID,
        title: str,
        body: str,
        notification_type: str = 'info',
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        action_url: Optional[str] = None,
        created_by: Optional[UUID] = None,
        member_ids: Optional[List[UUID]] = None
    ) -> List[NotificationModel]:
        """
        Send notification to all members of an institute.
        If member_ids is provided, only those members receive the notification.
        """
        # This would typically query institute_memberships to get member list
        # For now, we accept an explicit member_ids list
        if not member_ids:
            logger.warning(f"notify_institute_members called without member_ids for institute {institute_id}")
            return []
        
        notifications = []
        for user_id in member_ids:
            notification = await self.create_notification(
                tenant_id=tenant_id,
                user_id=user_id,
                title=title,
                body=body,
                notification_type=notification_type,
                entity_type=entity_type,
                entity_id=entity_id,
                action_url=action_url,
                institute_id=institute_id,
                created_by=created_by
            )
            if notification:
                notifications.append(notification)
        
        return notifications

    async def create_deadline_notification(
        self,
        tenant_id: UUID,
        user_id: UUID,
        title: str,
        body: str,
        deadline: datetime,
        entity_type: str,
        entity_id: UUID,
        action_url: Optional[str] = None,
        days_before: int = 7,
        created_by: Optional[UUID] = None
    ) -> Optional[NotificationModel]:
        """
        Create a notification scheduled before a deadline.
        """
        scheduled_at = deadline - timedelta(days=days_before)
        
        # Don't schedule if the scheduled time is in the past
        if scheduled_at < datetime.utcnow():
            scheduled_at = datetime.utcnow()
        
        return await self.create_notification(
            tenant_id=tenant_id,
            user_id=user_id,
            title=title,
            body=body,
            notification_type='deadline',
            priority='high',
            entity_type=entity_type,
            entity_id=entity_id,
            action_url=action_url,
            scheduled_at=scheduled_at,
            expires_at=deadline,
            channels=['in_app', 'email'],
            created_by=created_by
        )

    # =========================================================================
    # INTERNAL HELPERS
    # =========================================================================

    def _filter_channels_by_preferences(
        self,
        requested_channels: List[str],
        notification_type: str,
        prefs: Optional[UserNotificationPreferenceModel]
    ) -> List[str]:
        """Filter channels based on user preferences."""
        if not prefs:
            return requested_channels
        
        effective = []
        
        # Get type-specific preferences
        type_prefs = (prefs.type_preferences or {}).get(notification_type, {})
        if not type_prefs.get('enabled', True):
            return []
        
        allowed_for_type = type_prefs.get('channels', requested_channels)
        
        for channel in requested_channels:
            if channel not in allowed_for_type:
                continue
            
            # Check global channel settings
            if channel == 'email' and not prefs.email_enabled:
                continue
            if channel == 'push' and not prefs.push_enabled:
                continue
            if channel == 'in_app' and not prefs.in_app_enabled:
                continue
            
            effective.append(channel)
        
        return effective

    async def _deliver_notification(
        self,
        notification: NotificationModel,
        prefs: Optional[UserNotificationPreferenceModel]
    ):
        """
        Deliver notification through configured channels.
        Updates delivery_status on the notification.
        """
        status = {}
        
        for channel in (notification.channels or ['in_app']):
            try:
                if channel == 'in_app':
                    # In-app is always "delivered" since it's just stored
                    status['in_app'] = 'delivered'
                
                elif channel == 'email':
                    # Check quiet hours
                    if self._is_quiet_hours(prefs):
                        status['email'] = 'queued_quiet_hours'
                    else:
                        # TODO: Integrate with email_service.py
                        status['email'] = 'pending'
                        logger.info(f"Email notification queued for {notification.user_id}: {notification.title}")
                
                elif channel == 'push':
                    # TODO: Integrate with push notification service
                    status['push'] = 'pending'
                    logger.info(f"Push notification queued for {notification.user_id}: {notification.title}")
                
            except Exception as e:
                logger.error(f"Failed to deliver notification via {channel}: {e}")
                status[channel] = f'failed: {str(e)}'
        
        # Update delivery status
        notification.delivery_status = status
        await self.db.commit()

    def _is_quiet_hours(self, prefs: Optional[UserNotificationPreferenceModel]) -> bool:
        """Check if current time is within user's quiet hours."""
        if not prefs or not prefs.quiet_hours:
            return False
        
        quiet = prefs.quiet_hours
        if not quiet.get('start') or not quiet.get('end'):
            return False
        
        try:
            now = datetime.utcnow()
            # Simple check - for production, use timezone-aware comparison
            start_hour, start_min = map(int, quiet['start'].split(':'))
            end_hour, end_min = map(int, quiet['end'].split(':'))
            
            current_minutes = now.hour * 60 + now.minute
            start_minutes = start_hour * 60 + start_min
            end_minutes = end_hour * 60 + end_min
            
            if start_minutes <= end_minutes:
                return start_minutes <= current_minutes <= end_minutes
            else:
                # Spans midnight
                return current_minutes >= start_minutes or current_minutes <= end_minutes
        except Exception:
            return False

    # =========================================================================
    # CLEANUP
    # =========================================================================

    async def cleanup_expired_notifications(self, tenant_id: Optional[UUID] = None) -> int:
        """Remove expired notifications (soft delete)."""
        query = update(NotificationModel).where(
            and_(
                NotificationModel.expires_at.isnot(None),
                NotificationModel.expires_at < datetime.utcnow(),
                NotificationModel.deleted_at.is_(None)
            )
        ).values(deleted_at=datetime.utcnow())
        
        if tenant_id:
            query = query.where(NotificationModel.tenant_id == tenant_id)
        
        result = await self.db.execute(query)
        await self.db.commit()
        return result.rowcount
