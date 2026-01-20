"""
Feedback API Routes - User Feedback with Screenshots & Annotations
Implements: User Feedback System

Features:
- Submit feedback with screenshots and annotations
- List user's own feedback or all (admin)
- Admin response and status management
- Statistics for admin dashboard
"""
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel, Field
import logging

from infrastructure.dependencies import get_di_container, get_current_user_id, get_current_tenant_id
from adapters.api.auth_middleware import get_current_user, AuthenticatedUser
from use_cases.manage_feedback import ManageFeedbackUseCase
from domain.entities.feedback import (
    FeedbackCreate, FeedbackType, FeedbackSeverity, FeedbackStatus
)


router = APIRouter(prefix="/api/v1/feedback", tags=["feedback"])

logger = logging.getLogger(__name__)


# =============================================================================
# Request/Response Models
# =============================================================================

class FeedbackCreateRequest(BaseModel):
    """Request model for creating feedback"""
    feedback_type: FeedbackType = Field(default=FeedbackType.UI_FEEDBACK)
    severity: FeedbackSeverity = Field(default=FeedbackSeverity.MEDIUM)
    description: str = Field(..., min_length=1, max_length=500)
    
    page_url: str = Field(..., min_length=1)
    page_title: Optional[str] = Field(None, max_length=500)
    entity_type: Optional[str] = Field(None, max_length=50)
    entity_id: Optional[UUID] = None
    
    # Screenshot and annotation as base64
    screenshot_base64: Optional[str] = None
    annotation_image_base64: Optional[str] = None
    annotation_data: Optional[Dict[str, Any]] = None
    
    screen_width: Optional[int] = None
    screen_height: Optional[int] = None


class FeedbackStatusUpdateRequest(BaseModel):
    """Request model for updating feedback status"""
    status: FeedbackStatus


class FeedbackResponseRequest(BaseModel):
    """Request model for admin response to feedback"""
    response: str = Field(..., min_length=1, max_length=2000)


class FeedbackResolveRequest(BaseModel):
    """Request model for resolving feedback"""
    resolution_notes: Optional[str] = Field(None, max_length=2000)


class FeedbackResponse(BaseModel):
    """Response model for feedback"""
    id: UUID
    user_id: UUID
    feedback_type: str
    severity: str
    description: str
    
    page_url: str
    page_title: Optional[str]
    entity_type: Optional[str]
    entity_id: Optional[UUID]
    
    screenshot_url: Optional[str]
    annotation_image_url: Optional[str]
    annotation_data: Optional[Dict[str, Any]]
    
    screen_width: Optional[int]
    screen_height: Optional[int]
    
    status: str
    response: Optional[str]
    responded_by: Optional[UUID]
    responded_at: Optional[datetime]
    
    resolved_at: Optional[datetime]
    resolution_notes: Optional[str]
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class FeedbackListResponse(BaseModel):
    """Response model for feedback list"""
    items: List[FeedbackResponse]
    total: int
    skip: int
    limit: int


class FeedbackStatisticsResponse(BaseModel):
    """Response model for feedback statistics"""
    total_feedbacks: int
    open_feedbacks: int
    in_progress_feedbacks: int
    resolved_feedbacks: int
    by_type: Dict[str, int]
    by_severity: Dict[str, int]
    avg_resolution_time_hours: Optional[float]


# =============================================================================
# Helper Functions
# =============================================================================

def _feedback_to_response(feedback) -> FeedbackResponse:
    """Convert feedback entity to response model"""
    return FeedbackResponse(
        id=feedback.id,
        user_id=feedback.user_id,
        feedback_type=feedback.feedback_type.value if hasattr(feedback.feedback_type, 'value') else str(feedback.feedback_type),
        severity=feedback.severity.value if hasattr(feedback.severity, 'value') else str(feedback.severity),
        description=feedback.description,
        page_url=feedback.page_url,
        page_title=feedback.page_title,
        entity_type=feedback.entity_type,
        entity_id=feedback.entity_id,
        screenshot_url=feedback.screenshot_url,
        annotation_image_url=feedback.annotation_image_url,
        annotation_data=feedback.annotation_data,
        screen_width=feedback.screen_width,
        screen_height=feedback.screen_height,
        status=feedback.status.value if hasattr(feedback.status, 'value') else str(feedback.status),
        response=feedback.response,
        responded_by=feedback.responded_by,
        responded_at=feedback.responded_at,
        resolved_at=feedback.resolved_at,
        resolution_notes=feedback.resolution_notes,
        created_at=feedback.created_at,
        updated_at=feedback.updated_at,
    )


def _ensure_uuid(val):
    """Return a UUID instance for the given value (no-op if already UUID)"""
    if isinstance(val, UUID):
        return val
    return UUID(val)


async def _get_use_case(container) -> ManageFeedbackUseCase:
    """Get feedback use case from DI container"""
    return container.get_manage_feedback_use_case()


async def _is_admin(container, user_id: UUID, tenant_id: str) -> bool:
    """Check if user has admin role"""
    # TODO: Implement proper role checking via ACL service
    # For now, check if user is in admin list
    try:
        user_repo = container.user_repository
        user = await user_repo.get_by_id(user_id)
        if user and hasattr(user, 'roles'):
            return 'admin' in user.roles
        return False
    except Exception:
        return False


# =============================================================================
# Endpoints
# =============================================================================

@router.post("", summary="Create feedback", response_model=FeedbackResponse, status_code=201)
@router.post("/", summary="Create feedback (trailing slash)", response_model=FeedbackResponse, status_code=201)
async def create_feedback(
    request: FeedbackCreateRequest,
    http_request: Request,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Create a new feedback entry with optional screenshot and annotations.
    
    - Screenshot and annotation should be provided as base64-encoded PNG
    - Description is limited to 500 characters
    - Annotations are stored as JSON for traceability
    """
    use_case = await _get_use_case(container)
    
    # Get user agent from request
    user_agent = http_request.headers.get("User-Agent")
    # Debug logging: capture full request URL and query params to diagnose CORS/param issues
    try:
        logger.info(f"[feedback] Incoming request URL: {http_request.url}")
        logger.info(f"[feedback] Query params: {dict(http_request.query_params)}")
        logger.info(f"[feedback] Headers: {{'origin': {http_request.headers.get('origin')}, 'x-tenant-id': {http_request.headers.get('x-tenant-id')}}}")
    except Exception:
        logger.exception("Failed to log incoming feedback request details")
    
    # Create feedback DTO
    feedback_create = FeedbackCreate(
        tenant_id=_ensure_uuid(tenant_id),
        created_by=user_id,
        updated_by=user_id,
        feedback_type=request.feedback_type,
        severity=request.severity,
        description=request.description,
        page_url=request.page_url,
        page_title=request.page_title,
        entity_type=request.entity_type,
        entity_id=request.entity_id,
        screenshot_base64=request.screenshot_base64,
        annotation_image_base64=request.annotation_image_base64,
        annotation_data=request.annotation_data,
        user_agent=user_agent,
        screen_width=request.screen_width,
        screen_height=request.screen_height,
    )
    
    try:
        feedback = await use_case.create_feedback(
            feedback_data=feedback_create,
            tenant_id=_ensure_uuid(tenant_id),
            user_id=user_id,
            user_agent=user_agent,
        )
        
        return _feedback_to_response(feedback)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create feedback: {str(e)}")


@router.get("/", summary="List feedbacks", response_model=FeedbackListResponse)
async def list_feedbacks(
    status: Optional[FeedbackStatus] = Query(None, description="Filter by status"),
    feedback_type: Optional[FeedbackType] = Query(None, description="Filter by type"),
    severity: Optional[FeedbackSeverity] = Query(None, description="Filter by severity"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    current_user: Optional[AuthenticatedUser] = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    List feedbacks with optional filters.
    
    - Admin users can see all feedbacks
    - Regular users can only see their own feedbacks
    """
    use_case = await _get_use_case(container)
    # Prefer token-based role check when available (faster, avoids DB lookup)
    if current_user is not None:
        is_admin = current_user.is_admin()
    else:
        is_admin = await _is_admin(container, user_id, tenant_id)
    
    feedbacks = await use_case.list_feedbacks(
        tenant_id=_ensure_uuid(tenant_id),
        user_id=user_id,
        is_admin=is_admin,
        skip=skip,
        limit=limit,
        status=status,
        feedback_type=feedback_type,
        severity=severity,
    )
    
    # Get total count for pagination
    total = len(feedbacks)  # TODO: Implement proper count in repository
    
    return FeedbackListResponse(
        items=[_feedback_to_response(f) for f in feedbacks],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/my", summary="List my feedbacks", response_model=FeedbackListResponse)
async def list_my_feedbacks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    List only the current user's feedbacks.
    """
    use_case = await _get_use_case(container)
    
    feedbacks = await use_case.list_feedbacks(
        tenant_id=_ensure_uuid(tenant_id),
        user_id=user_id,
        is_admin=False,
        skip=skip,
        limit=limit,
    )
    
    return FeedbackListResponse(
        items=[_feedback_to_response(f) for f in feedbacks],
        total=len(feedbacks),
        skip=skip,
        limit=limit,
    )


@router.get("/statistics", summary="Get feedback statistics", response_model=FeedbackStatisticsResponse)
async def get_statistics(
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    current_user: Optional[AuthenticatedUser] = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Get aggregated feedback statistics for admin dashboard.
    Requires admin role.
    """
    # Prefer token-based role check when available
    if current_user is not None:
        if not current_user.is_admin():
            raise HTTPException(status_code=403, detail="Admin access required")
    else:
        is_admin = await _is_admin(container, user_id, tenant_id)
        if not is_admin:
            raise HTTPException(status_code=403, detail="Admin access required")
    
    use_case = await _get_use_case(container)
    
    stats = await use_case.get_statistics(tenant_id=_ensure_uuid(tenant_id))
    
    return FeedbackStatisticsResponse(
        total_feedbacks=stats.total_feedbacks,
        open_feedbacks=stats.open_feedbacks,
        in_progress_feedbacks=stats.in_progress_feedbacks,
        resolved_feedbacks=stats.resolved_feedbacks,
        by_type=stats.by_type,
        by_severity=stats.by_severity,
        avg_resolution_time_hours=stats.avg_resolution_time_hours,
    )


@router.get("/{feedback_id}", summary="Get feedback by ID", response_model=FeedbackResponse)
async def get_feedback(
    feedback_id: UUID,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Get a specific feedback by ID.
    
    - Admin users can view any feedback
    - Regular users can only view their own feedback
    """
    use_case = await _get_use_case(container)
    is_admin = await _is_admin(container, user_id, tenant_id)
    
    feedback = await use_case.get_feedback(
        feedback_id=feedback_id,
        tenant_id=_ensure_uuid(tenant_id),
        user_id=user_id,
        is_admin=is_admin,
    )
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    return _feedback_to_response(feedback)


@router.patch("/{feedback_id}/status", summary="Update feedback status", response_model=FeedbackResponse)
async def update_feedback_status(
    feedback_id: UUID,
    request: FeedbackStatusUpdateRequest,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Update feedback status (admin only).
    """
    is_admin = await _is_admin(container, user_id, tenant_id)
    
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    use_case = await _get_use_case(container)
    
    feedback = await use_case.update_status(
        feedback_id=feedback_id,
        tenant_id=_ensure_uuid(tenant_id),
        new_status=request.status,
        updated_by=user_id,
    )
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    return _feedback_to_response(feedback)


@router.post("/{feedback_id}/respond", summary="Add admin response", response_model=FeedbackResponse)
async def respond_to_feedback(
    feedback_id: UUID,
    request: FeedbackResponseRequest,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Add admin response to feedback.
    Automatically sets status to ACKNOWLEDGED.
    """
    is_admin = await _is_admin(container, user_id, tenant_id)
    
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    use_case = await _get_use_case(container)
    
    feedback = await use_case.respond_to_feedback(
        feedback_id=feedback_id,
        tenant_id=UUID(tenant_id),
        response=request.response,
        responded_by=user_id,
    )
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    return _feedback_to_response(feedback)


@router.post("/{feedback_id}/resolve", summary="Resolve feedback", response_model=FeedbackResponse)
async def resolve_feedback(
    feedback_id: UUID,
    request: FeedbackResolveRequest,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Mark feedback as resolved with optional resolution notes.
    """
    is_admin = await _is_admin(container, user_id, tenant_id)
    
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    use_case = await _get_use_case(container)
    
    feedback = await use_case.resolve_feedback(
        feedback_id=feedback_id,
        tenant_id=UUID(tenant_id),
        resolution_notes=request.resolution_notes,
        resolved_by=user_id,
    )
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    return _feedback_to_response(feedback)


@router.delete("/{feedback_id}", summary="Delete feedback", status_code=204)
async def delete_feedback(
    feedback_id: UUID,
    container=Depends(get_di_container),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
):
    """
    Soft delete a feedback entry.
    Admin can delete any feedback, users can only delete their own.
    """
    use_case = await _get_use_case(container)
    is_admin = await _is_admin(container, user_id, tenant_id)
    
    # Check if user can delete
    feedback = await use_case.get_feedback(
        feedback_id=feedback_id,
        tenant_id=UUID(tenant_id),
        user_id=user_id,
        is_admin=is_admin,
    )
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    # Only admin or owner can delete
    if not is_admin and feedback.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this feedback")
    
    success = await use_case.delete_feedback(
        feedback_id=feedback_id,
        tenant_id=UUID(tenant_id),
        deleted_by=user_id,
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete feedback")
    
    return None
