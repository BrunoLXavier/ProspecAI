"""
Notifications API Router
Provides a lightweight notifications endpoint to satisfy frontend requests.
This implements a safe fallback that returns an empty list when no notifications
are available. It can be extended to integrate with the notification service.
"""
from typing import List
from fastapi import APIRouter, Depends
from pydantic import BaseModel

# Expose under /api/v1/notifications to match frontend expectations
router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    id: str
    title: str
    body: str
    read: bool
    created_at: str

    class Config:
        from_attributes = True


@router.get("", response_model=List[NotificationResponse])
@router.get("/", response_model=List[NotificationResponse])
async def list_notifications():
    """
    Return recent notifications for the current tenant/user.

    This is a minimal implementation that returns an empty list so the
    frontend won't receive a 404 while a full notifications service is
    implemented.
    """
    return []
