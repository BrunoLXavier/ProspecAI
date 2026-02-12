"""
Notifications API Router
Implements RF-07: Active notifications with user preferences and multi-channel delivery.
Full CRUD for notifications and user notification preferences.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from domain.schemas.notification_schemas import (
    NotificationCreate, NotificationResponse, NotificationListResponse,
    MarkReadRequest, NotificationPreferencesUpdate,
    NotificationPreferencesResponse, UnreadCountResponse,
)
from infrastructure.dependencies import get_db_session, get_current_user_id, get_current_tenant_id
from services.notification_service import NotificationService

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


def get_notification_service(db: AsyncSession = Depends(get_db_session)) -> NotificationService:
    return NotificationService(db)


# =============================================================================
# NOTIFICATION ENDPOINTS
# =============================================================================

@router.get("", response_model=List[NotificationResponse])
@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    unread_only: bool = Query(False, description="Return only unread notifications"),
    notification_type: Optional[str] = Query(None, description="Filter by notification type"),
    include_dismissed: bool = Query(False, description="Include dismissed notifications"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: NotificationService = Depends(get_notification_service)
):
    """
    List notifications for the current user.
    Supports filtering by read status and notification type.
    """
    user_id = current_user_id
    notifications = await service.list_notifications(
        tenant_id=tenant_id,
        user_id=user_id,
        unread_only=unread_only,
        notification_type=notification_type,
        include_dismissed=include_dismissed,
        limit=limit,
        offset=offset
    )
    
    return [NotificationResponse.model_validate(n) for n in notifications]


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: NotificationService = Depends(get_notification_service)
):
    """Get count of unread notifications for the current user."""
    count = await service.get_unread_count(tenant_id, current_user_id)
    return UnreadCountResponse(count=count)


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: NotificationService = Depends(get_notification_service)
):
    """Get a single notification by ID."""
    notification = await service.get_notification(notification_id, tenant_id)
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    if notification.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return NotificationResponse.model_validate(notification)


@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    data: NotificationCreate,
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: NotificationService = Depends(get_notification_service)
):
    """
    Create a new notification.
    Usually called by system processes or admins to notify users.
    """
    notification = await service.create_notification(
        tenant_id=tenant_id,
        user_id=data.user_id,
        title=data.title,
        body=data.body,
        notification_type=data.notification_type,
        priority=data.priority,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        action_url=data.action_url,
        institute_id=data.institute_id,
        scheduled_at=data.scheduled_at,
        expires_at=data.expires_at,
        channels=data.channels,
        created_by=current_user_id
    )
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_204_NO_CONTENT,
            detail="Notification skipped due to user preferences"
        )
    
    return NotificationResponse.model_validate(notification)


@router.post("/mark-read", response_model=dict)
async def mark_notifications_read(
    data: MarkReadRequest,
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: NotificationService = Depends(get_notification_service)
):
    """Mark one or more notifications as read."""
    user_id = current_user_id
    count = await service.mark_as_read(data.notification_ids, tenant_id, user_id)
    return {"marked_read": count}


@router.post("/mark-all-read", response_model=dict)
async def mark_all_notifications_read(
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: NotificationService = Depends(get_notification_service)
):
    """Mark all notifications as read for the current user."""
    user_id = current_user_id
    count = await service.mark_all_as_read(tenant_id, user_id)
    return {"marked_read": count}


@router.post("/{notification_id}/dismiss", response_model=dict)
async def dismiss_notification(
    notification_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: NotificationService = Depends(get_notification_service)
):
    """Dismiss a notification (hide without deleting)."""
    user_id = current_user_id
    success = await service.dismiss_notification(notification_id, tenant_id, user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"dismissed": True}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: NotificationService = Depends(get_notification_service)
):
    """Delete a notification (soft delete)."""
    user_id = current_user_id
    success = await service.delete_notification(notification_id, tenant_id, user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return None


# =============================================================================
# PREFERENCES ENDPOINTS
# =============================================================================

@router.get("/preferences/me", response_model=NotificationPreferencesResponse)
async def get_my_preferences(
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: NotificationService = Depends(get_notification_service)
):
    """Get notification preferences for the current user."""
    user_id = current_user_id
    prefs = await service.get_or_create_preferences(tenant_id, user_id)
    return NotificationPreferencesResponse.model_validate(prefs)


@router.put("/preferences/me", response_model=NotificationPreferencesResponse)
async def update_my_preferences(
    data: NotificationPreferencesUpdate,
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: NotificationService = Depends(get_notification_service)
):
    """Update notification preferences for the current user."""
    user_id = current_user_id
    updates = data.model_dump(exclude_unset=True)
    prefs = await service.update_preferences(tenant_id, user_id, updates)
    
    return NotificationPreferencesResponse.model_validate(prefs)


# =============================================================================
# ADMIN/SYSTEM ENDPOINTS
# =============================================================================

@router.post("/broadcast", response_model=dict)
async def broadcast_notification(
    title: str,
    body: str,
    user_ids: List[UUID],
    notification_type: str = 'info',
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: NotificationService = Depends(get_notification_service)
):
    """
    Broadcast a notification to multiple users.
    Requires admin permissions.
    """
    creator_id = current_user_id
    
    # TODO: Check admin permission
    
    created = 0
    for user_id in user_ids:
        notification = await service.create_notification(
            tenant_id=tenant_id,
            user_id=user_id,
            title=title,
            body=body,
            notification_type=notification_type,
            created_by=creator_id
        )
        if notification:
            created += 1
    
    return {"sent": created, "total": len(user_ids)}


@router.post("/cleanup-expired", response_model=dict)
async def cleanup_expired_notifications(
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: NotificationService = Depends(get_notification_service)
):
    """
    Clean up expired notifications (soft delete).
    Typically called by a scheduled job.
    """
    # TODO: Check admin permission
    
    count = await service.cleanup_expired_notifications(tenant_id)
    return {"cleaned": count}
