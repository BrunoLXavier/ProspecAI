# Implements: User Feedback System with Screenshots & Annotations
"""
Manage Feedback Use Case
Orchestrates feedback creation, listing, response, and statistics.
"""
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime
import logging
import base64

from domain.entities.feedback import (
    Feedback, FeedbackCreate, FeedbackResponse, FeedbackStatistics,
    FeedbackType, FeedbackSeverity, FeedbackStatus
)
from adapters.repositories.feedback_repository import FeedbackRepository

logger = logging.getLogger(__name__)


class ManageFeedbackUseCase:
    """
    Manages user feedback with screenshots and annotations.
    Orchestrates the complete feedback lifecycle.
    """
    
    def __init__(
        self,
        feedback_repository: FeedbackRepository,
        file_service=None,
        audit_service=None,
    ):
        self.feedback_repository = feedback_repository
        self.file_service = file_service
        self.audit_service = audit_service
    
    async def create_feedback(
        self,
        feedback_data: FeedbackCreate,
        tenant_id: UUID,
        user_id: UUID,
        user_agent: Optional[str] = None,
    ) -> Feedback:
        """
        Create a new feedback entry with optional screenshot and annotations.
        
        Flow:
        1. Upload screenshot to MinIO (if provided)
        2. Upload annotated image to MinIO (if provided)
        3. Create feedback record with URLs
        4. Log audit trail
        """
        feedback_id = uuid4()
        
        # Upload screenshot if provided as base64
        screenshot_url = None
        if feedback_data.screenshot_base64 and self.file_service:
            try:
                screenshot_url = await self._upload_base64_image(
                    base64_data=feedback_data.screenshot_base64,
                    tenant_id=tenant_id,
                    user_id=user_id,
                    feedback_id=feedback_id,
                    suffix="screenshot",
                )
            except Exception as e:
                logger.error(f"Failed to upload screenshot: {e}")
        
        # Upload annotated image if provided as base64
        annotation_image_url = None
        if feedback_data.annotation_image_base64 and self.file_service:
            try:
                annotation_image_url = await self._upload_base64_image(
                    base64_data=feedback_data.annotation_image_base64,
                    tenant_id=tenant_id,
                    user_id=user_id,
                    feedback_id=feedback_id,
                    suffix="annotated",
                )
            except Exception as e:
                logger.error(f"Failed to upload annotated image: {e}")
        
        # Create feedback entity
        feedback = Feedback(
            id=feedback_id,
            tenant_id=tenant_id,
            user_id=user_id,
            feedback_type=feedback_data.feedback_type,
            severity=feedback_data.severity,
            description=feedback_data.description,
            page_url=feedback_data.page_url,
            page_title=feedback_data.page_title,
            entity_type=feedback_data.entity_type,
            entity_id=feedback_data.entity_id,
            screenshot_url=screenshot_url,
            annotation_image_url=annotation_image_url,
            annotation_data=feedback_data.annotation_data,
            user_agent=user_agent or feedback_data.user_agent,
            screen_width=feedback_data.screen_width,
            screen_height=feedback_data.screen_height,
            status=FeedbackStatus.OPEN,
            created_by=user_id,
            updated_by=user_id,
        )
        
        # Save to database
        saved_feedback = await self.feedback_repository.create(feedback)
        
        # Log audit
        if self.audit_service:
            await self.audit_service.log_creation(
                entity_type="Feedback",
                entity_id=saved_feedback.id,
                user_id=user_id,
                tenant_id=tenant_id,
                after_state={
                    "id": str(saved_feedback.id),
                    "feedback_type": saved_feedback.feedback_type.value,
                    "severity": saved_feedback.severity.value,
                    "page_url": saved_feedback.page_url,
                    "status": saved_feedback.status.value,
                }
            )
        
        logger.info(f"Created feedback {saved_feedback.id} from user {user_id}")
        
        return saved_feedback
    
    async def list_feedbacks(
        self,
        tenant_id: UUID,
        user_id: UUID,
        is_admin: bool = False,
        skip: int = 0,
        limit: int = 50,
        status: Optional[FeedbackStatus] = None,
        feedback_type: Optional[FeedbackType] = None,
        severity: Optional[FeedbackSeverity] = None,
    ) -> List[Feedback]:
        """
        List feedbacks with filters.
        
        - Admins can see all feedbacks in tenant
        - Regular users can only see their own feedbacks
        """
        if is_admin:
            return await self.feedback_repository.list_by_tenant(
                tenant_id=tenant_id,
                skip=skip,
                limit=limit,
                status=status,
                feedback_type=feedback_type,
                severity=severity,
            )
        else:
            return await self.feedback_repository.list_by_user(
                user_id=user_id,
                tenant_id=tenant_id,
                skip=skip,
                limit=limit,
            )
    
    async def get_feedback(
        self,
        feedback_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        is_admin: bool = False,
    ) -> Optional[Feedback]:
        """
        Get feedback by ID.
        
        - Admins can view any feedback
        - Users can only view their own feedback
        """
        feedback = await self.feedback_repository.get_by_id(
            feedback_id=feedback_id,
            tenant_id=tenant_id,
        )
        
        if not feedback:
            return None
        
        # Check permissions
        if not is_admin and feedback.user_id != user_id:
            logger.warning(
                f"User {user_id} attempted to access feedback {feedback_id} owned by {feedback.user_id}"
            )
            return None
        
        return feedback
    
    async def update_status(
        self,
        feedback_id: UUID,
        tenant_id: UUID,
        new_status: FeedbackStatus,
        updated_by: UUID,
    ) -> Optional[Feedback]:
        """
        Update feedback status (admin only).
        """
        feedback = await self.feedback_repository.update_status(
            feedback_id=feedback_id,
            tenant_id=tenant_id,
            new_status=new_status,
            updated_by=updated_by,
        )
        
        if feedback and self.audit_service:
            await self.audit_service.log_update(
                entity_type="Feedback",
                entity_id=feedback_id,
                user_id=updated_by,
                tenant_id=tenant_id,
                changes={"status": new_status.value}
            )
        
        return feedback
    
    async def update_severity(
        self,
        feedback_id: UUID,
        tenant_id: UUID,
        new_severity: FeedbackSeverity,
        updated_by: UUID,
    ) -> Optional[Feedback]:
        """
        Update feedback severity/priority (admin only).
        """
        feedback = await self.feedback_repository.update_severity(
            feedback_id=feedback_id,
            tenant_id=tenant_id,
            new_severity=new_severity,
            updated_by=updated_by,
        )
        
        if feedback and self.audit_service:
            await self.audit_service.log_update(
                entity_type="Feedback",
                entity_id=feedback_id,
                user_id=updated_by,
                tenant_id=tenant_id,
                changes={"severity": new_severity.value}
            )
        
        return feedback
    
    async def respond_to_feedback(
        self,
        feedback_id: UUID,
        tenant_id: UUID,
        response: str,
        responded_by: UUID,
    ) -> Optional[Feedback]:
        """
        Add admin response to feedback.
        """
        feedback = await self.feedback_repository.add_response(
            feedback_id=feedback_id,
            tenant_id=tenant_id,
            response=response,
            responded_by=responded_by,
        )
        
        if feedback and self.audit_service:
            await self.audit_service.log_update(
                entity_type="Feedback",
                entity_id=feedback_id,
                user_id=responded_by,
                tenant_id=tenant_id,
                changes={
                    "response": response[:100] + "..." if len(response) > 100 else response,
                    "status": FeedbackStatus.ACKNOWLEDGED.value,
                }
            )
        
        logger.info(f"Admin {responded_by} responded to feedback {feedback_id}")
        
        return feedback
    
    async def resolve_feedback(
        self,
        feedback_id: UUID,
        tenant_id: UUID,
        resolution_notes: Optional[str],
        resolved_by: UUID,
    ) -> Optional[Feedback]:
        """
        Mark feedback as resolved with optional notes.
        """
        feedback = await self.feedback_repository.get_by_id(
            feedback_id=feedback_id,
            tenant_id=tenant_id,
        )
        
        if not feedback:
            return None
        
        feedback.resolve(resolution_notes, resolved_by)
        
        updated = await self.feedback_repository.update_status(
            feedback_id=feedback_id,
            tenant_id=tenant_id,
            new_status=FeedbackStatus.RESOLVED,
            updated_by=resolved_by,
        )
        
        if updated and self.audit_service:
            await self.audit_service.log_update(
                entity_type="Feedback",
                entity_id=feedback_id,
                user_id=resolved_by,
                tenant_id=tenant_id,
                changes={
                    "status": FeedbackStatus.RESOLVED.value,
                    "resolution_notes": resolution_notes,
                }
            )
        
        return updated
    
    async def delete_feedback(
        self,
        feedback_id: UUID,
        tenant_id: UUID,
        deleted_by: UUID,
    ) -> bool:
        """
        Soft delete a feedback entry.
        """
        success = await self.feedback_repository.soft_delete(
            feedback_id=feedback_id,
            tenant_id=tenant_id,
            deleted_by=deleted_by,
        )
        
        if success and self.audit_service:
            await self.audit_service.log_deletion(
                entity_type="Feedback",
                entity_id=feedback_id,
                user_id=deleted_by,
                tenant_id=tenant_id,
            )
        
        return success
    
    async def get_statistics(
        self,
        tenant_id: UUID,
    ) -> FeedbackStatistics:
        """
        Get aggregated feedback statistics for admin dashboard.
        """
        return await self.feedback_repository.get_statistics(tenant_id=tenant_id)
    
    async def _upload_base64_image(
        self,
        base64_data: str,
        tenant_id: UUID,
        user_id: UUID,
        feedback_id: UUID,
        suffix: str,
    ) -> Optional[str]:
        """
        Upload base64-encoded image to MinIO and return the object path.
        The path is stored in DB; a backend proxy endpoint serves the image
        so we avoid Docker-internal presigned URLs reaching the browser.
        """
        from infrastructure.file_storage import StorageBucket
        try:
            # Remove data URL prefix if present
            if "," in base64_data:
                base64_data = base64_data.split(",")[1]

            # Decode base64
            image_bytes = base64.b64decode(base64_data)

            # Generate object name (stored under tenant/user/feedback path)
            object_name = f"{tenant_id}/{user_id}/{feedback_id}_{suffix}.png"

            # Upload to MinIO via file service
            if self.file_service:
                result = await self.file_service.upload_bytes(
                    tenant_id=str(tenant_id),
                    bucket=StorageBucket.FEEDBACKS,
                    filename=f"{feedback_id}_{suffix}.png",
                    content=image_bytes,
                    content_type="image/png",
                    prefix=f"{user_id}",
                    file_category="images",
                )

                if result.success:
                    # Return the object path (not a presigned URL).
                    # The frontend will use a backend proxy endpoint to display.
                    return result.object_name
                else:
                    logger.error(f"Upload failed for {suffix}: {result.error}")
                    return None

            return None

        except Exception as e:
            logger.error(f"Error uploading image: {e}")
            raise
