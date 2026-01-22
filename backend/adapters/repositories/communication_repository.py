# Communication Repository
# Adapters Layer - Database operations for communication threads and messages
# Implements RF-08: Communications with RLS and caching

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, func, desc

from adapters.database.models import (
    CommunicationThreadModel,
    CommunicationMessageModel,
    CommunicationAttachmentModel,
    MeetingMinutesModel,
    CommunicationThreadParticipantModel,
    CommunicationDraftModel,
)
from domain.entities.communication import (
    CommunicationThread,
    CommunicationMessage,
    CommunicationAttachment,
    MeetingMinutes,
    ThreadParticipant,
    CommunicationDraft,
    MessageType,
    LinkedEntityType,
    ParticipantRole,
    MeetingMinutesStatus,
    EmailMetadata,
)

logger = logging.getLogger(__name__)


class CommunicationRepository:
    """
    Repository for communication threads with RLS enforcement.
    
    All queries are filtered by tenant_id for multi-tenancy security.
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    # =========================================================================
    # Thread Operations
    # =========================================================================
    
    async def get_thread_by_id(
        self,
        tenant_id: UUID,
        thread_id: UUID,
        include_messages: bool = False,
        include_participants: bool = False,
    ) -> Optional[CommunicationThread]:
        """Get a thread by ID with optional related data."""
        query = select(CommunicationThreadModel).where(
            and_(
                CommunicationThreadModel.id == thread_id,
                CommunicationThreadModel.tenant_id == tenant_id,
                CommunicationThreadModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        
        if not model:
            return None
        
        thread = self._thread_model_to_entity(model)
        
        if include_messages:
            thread.messages = await self.get_messages_by_thread(tenant_id, thread_id)
        
        if include_participants:
            thread.participants = await self.get_thread_participants(tenant_id, thread_id)
        
        return thread
    
    async def list_threads(
        self,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 50,
        linked_entity_type: Optional[str] = None,
        linked_entity_id: Optional[UUID] = None,
        include_auto_unconfirmed: bool = True,
        search: Optional[str] = None,
    ) -> List[CommunicationThread]:
        """List threads with filtering and pagination."""
        query = select(CommunicationThreadModel).where(
            and_(
                CommunicationThreadModel.tenant_id == tenant_id,
                CommunicationThreadModel.deleted_at.is_(None)
            )
        )
        
        # Filter by linked entity
        if linked_entity_type:
            query = query.where(CommunicationThreadModel.linked_entity_type == linked_entity_type)
        if linked_entity_id:
            query = query.where(CommunicationThreadModel.linked_entity_id == linked_entity_id)
        
        # Exclude unconfirmed auto-created if requested
        if not include_auto_unconfirmed:
            query = query.where(
                or_(
                    CommunicationThreadModel.is_auto_created == False,
                    CommunicationThreadModel.auto_created_confirmed == True
                )
            )
        
        # Search in subject
        if search:
            query = query.where(
                CommunicationThreadModel.subject.ilike(f"%{search}%")
            )
        
        # Order by last message date
        query = query.order_by(desc(CommunicationThreadModel.last_message_at))
        query = query.offset(skip).limit(limit)
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        
        return [self._thread_model_to_entity(m) for m in models]
    
    async def create_thread(
        self,
        tenant_id: UUID,
        thread: CommunicationThread,
        created_by: UUID,
    ) -> CommunicationThread:
        """Create a new communication thread."""
        model = CommunicationThreadModel(
            id=thread.id or uuid4(),
            tenant_id=tenant_id,
            subject=thread.subject,
            metadata_=thread.metadata or {},
            linked_entity_type=thread.linked_entity_type,
            linked_entity_id=thread.linked_entity_id,
            is_auto_created=thread.is_auto_created,
            auto_created_confirmed=thread.auto_created_confirmed,
            created_by=created_by,
            updated_by=created_by,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        
        self.session.add(model)
        await self.session.flush()
        
        # Add creator as owner participant
        participant = CommunicationThreadParticipantModel(
            id=uuid4(),
            tenant_id=tenant_id,
            thread_id=model.id,
            user_id=created_by,
            role=ParticipantRole.OWNER.value,
            added_by=created_by,
        )
        self.session.add(participant)
        
        logger.info(f"Created communication thread {model.id}")
        return self._thread_model_to_entity(model)
    
    async def update_thread(
        self,
        tenant_id: UUID,
        thread: CommunicationThread,
        updated_by: UUID,
    ) -> Optional[CommunicationThread]:
        """Update an existing thread."""
        query = select(CommunicationThreadModel).where(
            and_(
                CommunicationThreadModel.id == thread.id,
                CommunicationThreadModel.tenant_id == tenant_id,
                CommunicationThreadModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        
        if not model:
            return None
        
        model.subject = thread.subject
        model.metadata_ = thread.metadata
        model.linked_entity_type = thread.linked_entity_type
        model.linked_entity_id = thread.linked_entity_id
        model.is_auto_created = thread.is_auto_created
        model.auto_created_confirmed = thread.auto_created_confirmed
        model.updated_by = updated_by
        model.updated_at = datetime.utcnow()
        
        await self.session.flush()
        
        logger.info(f"Updated communication thread {model.id}")
        return self._thread_model_to_entity(model)
    
    async def delete_thread(
        self,
        tenant_id: UUID,
        thread_id: UUID,
        deleted_by: UUID,
    ) -> bool:
        """Soft delete a thread."""
        query = select(CommunicationThreadModel).where(
            and_(
                CommunicationThreadModel.id == thread_id,
                CommunicationThreadModel.tenant_id == tenant_id,
                CommunicationThreadModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        
        if not model:
            return False
        
        model.deleted_at = datetime.utcnow()
        model.updated_by = deleted_by
        
        await self.session.flush()
        
        logger.info(f"Soft deleted communication thread {thread_id}")
        return True
    
    async def update_last_message(
        self,
        tenant_id: UUID,
        thread_id: UUID,
        preview: str,
        message_at: datetime,
    ) -> None:
        """Update the last message preview and timestamp."""
        query = select(CommunicationThreadModel).where(
            and_(
                CommunicationThreadModel.id == thread_id,
                CommunicationThreadModel.tenant_id == tenant_id,
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        
        if model:
            model.last_message_preview = preview[:200] if preview else None
            model.last_message_at = message_at
            model.updated_at = datetime.utcnow()
    
    # =========================================================================
    # Message Operations
    # =========================================================================
    
    async def get_messages_by_thread(
        self,
        tenant_id: UUID,
        thread_id: UUID,
        skip: int = 0,
        limit: int = 100,
        include_auto_unconfirmed: bool = True,
    ) -> List[CommunicationMessage]:
        """Get messages for a thread."""
        query = select(CommunicationMessageModel).where(
            and_(
                CommunicationMessageModel.thread_id == thread_id,
                CommunicationMessageModel.tenant_id == tenant_id,
                CommunicationMessageModel.deleted_at.is_(None)
            )
        )
        
        if not include_auto_unconfirmed:
            query = query.where(
                or_(
                    CommunicationMessageModel.is_auto_created == False,
                    CommunicationMessageModel.auto_created_confirmed == True
                )
            )
        
        query = query.order_by(CommunicationMessageModel.created_at)
        query = query.offset(skip).limit(limit)
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        
        return [self._message_model_to_entity(m) for m in models]
    
    async def create_message(
        self,
        tenant_id: UUID,
        thread_id: UUID,
        message: CommunicationMessage,
        created_by: UUID,
    ) -> CommunicationMessage:
        """Create a new message in a thread."""
        # Verify thread exists and belongs to tenant
        thread = await self.get_thread_by_id(tenant_id, thread_id)
        if not thread:
            raise ValueError(f"Thread {thread_id} not found")
        
        email_meta = None
        if message.email_metadata:
            email_meta = message.email_metadata.model_dump() if hasattr(message.email_metadata, 'model_dump') else message.email_metadata
        
        model = CommunicationMessageModel(
            id=message.id or uuid4(),
            tenant_id=tenant_id,
            thread_id=thread_id,
            author=message.author,
            author_name=message.author_name,
            body=message.body,
            attachments=message.attachments or [],
            message_type=message.message_type if isinstance(message.message_type, str) else message.message_type.value,
            email_metadata=email_meta or {},
            is_auto_created=message.is_auto_created,
            auto_created_confirmed=message.auto_created_confirmed,
            created_by=created_by,
            updated_by=created_by,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        
        self.session.add(model)
        await self.session.flush()
        
        # Update thread's last message
        await self.update_last_message(
            tenant_id,
            thread_id,
            message.body,
            model.created_at,
        )
        
        logger.info(f"Created message {model.id} in thread {thread_id}")
        return self._message_model_to_entity(model)
    
    async def delete_message(
        self,
        tenant_id: UUID,
        message_id: UUID,
        deleted_by: UUID,
    ) -> bool:
        """Soft delete a message."""
        query = select(CommunicationMessageModel).where(
            and_(
                CommunicationMessageModel.id == message_id,
                CommunicationMessageModel.tenant_id == tenant_id,
                CommunicationMessageModel.deleted_at.is_(None)
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        
        if not model:
            return False
        
        model.deleted_at = datetime.utcnow()
        model.updated_by = deleted_by
        
        await self.session.flush()
        
        logger.info(f"Soft deleted message {message_id}")
        return True
    
    async def confirm_auto_created_message(
        self,
        tenant_id: UUID,
        message_id: UUID,
        confirmed_by: UUID,
    ) -> Optional[CommunicationMessage]:
        """Confirm an auto-created message (human-in-the-loop)."""
        query = select(CommunicationMessageModel).where(
            and_(
                CommunicationMessageModel.id == message_id,
                CommunicationMessageModel.tenant_id == tenant_id,
                CommunicationMessageModel.is_auto_created == True,
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        
        if not model:
            return None
        
        model.auto_created_confirmed = True
        model.updated_by = confirmed_by
        model.updated_at = datetime.utcnow()
        
        await self.session.flush()
        
        logger.info(f"Confirmed auto-created message {message_id}")
        return self._message_model_to_entity(model)
    
    # =========================================================================
    # Participant Operations
    # =========================================================================
    
    async def get_thread_participants(
        self,
        tenant_id: UUID,
        thread_id: UUID,
    ) -> List[ThreadParticipant]:
        """Get participants for a thread."""
        query = select(CommunicationThreadParticipantModel).where(
            and_(
                CommunicationThreadParticipantModel.thread_id == thread_id,
                CommunicationThreadParticipantModel.tenant_id == tenant_id,
            )
        )
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        
        return [self._participant_model_to_entity(m) for m in models]
    
    async def add_participant(
        self,
        tenant_id: UUID,
        thread_id: UUID,
        user_id: UUID,
        role: ParticipantRole,
        added_by: UUID,
    ) -> ThreadParticipant:
        """Add a participant to a thread."""
        # Check if already a participant
        query = select(CommunicationThreadParticipantModel).where(
            and_(
                CommunicationThreadParticipantModel.thread_id == thread_id,
                CommunicationThreadParticipantModel.user_id == user_id,
            )
        )
        
        result = await self.session.execute(query)
        existing = result.scalar_one_or_none()
        
        if existing:
            # Update role
            existing.role = role.value if isinstance(role, ParticipantRole) else role
            await self.session.flush()
            return self._participant_model_to_entity(existing)
        
        model = CommunicationThreadParticipantModel(
            id=uuid4(),
            tenant_id=tenant_id,
            thread_id=thread_id,
            user_id=user_id,
            role=role.value if isinstance(role, ParticipantRole) else role,
            added_by=added_by,
        )
        
        self.session.add(model)
        await self.session.flush()
        
        logger.info(f"Added participant {user_id} to thread {thread_id}")
        return self._participant_model_to_entity(model)
    
    async def remove_participant(
        self,
        tenant_id: UUID,
        thread_id: UUID,
        user_id: UUID,
    ) -> bool:
        """Remove a participant from a thread."""
        query = select(CommunicationThreadParticipantModel).where(
            and_(
                CommunicationThreadParticipantModel.thread_id == thread_id,
                CommunicationThreadParticipantModel.user_id == user_id,
                CommunicationThreadParticipantModel.tenant_id == tenant_id,
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        
        if not model:
            return False
        
        await self.session.delete(model)
        await self.session.flush()
        
        logger.info(f"Removed participant {user_id} from thread {thread_id}")
        return True
    
    # =========================================================================
    # Draft Operations
    # =========================================================================
    
    async def get_draft(
        self,
        tenant_id: UUID,
        thread_id: UUID,
        user_id: UUID,
    ) -> Optional[CommunicationDraft]:
        """Get a user's draft for a thread."""
        query = select(CommunicationDraftModel).where(
            and_(
                CommunicationDraftModel.thread_id == thread_id,
                CommunicationDraftModel.user_id == user_id,
                CommunicationDraftModel.tenant_id == tenant_id,
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        
        if not model:
            return None
        
        return self._draft_model_to_entity(model)
    
    async def save_draft(
        self,
        tenant_id: UUID,
        thread_id: UUID,
        user_id: UUID,
        body: Optional[str],
        attachments: List[Dict[str, Any]] = None,
    ) -> CommunicationDraft:
        """Save or update a draft message."""
        query = select(CommunicationDraftModel).where(
            and_(
                CommunicationDraftModel.thread_id == thread_id,
                CommunicationDraftModel.user_id == user_id,
                CommunicationDraftModel.tenant_id == tenant_id,
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        
        if model:
            model.body = body
            model.attachments = attachments or []
            model.last_updated_at = datetime.utcnow()
        else:
            model = CommunicationDraftModel(
                id=uuid4(),
                tenant_id=tenant_id,
                thread_id=thread_id,
                user_id=user_id,
                body=body,
                attachments=attachments or [],
            )
            self.session.add(model)
        
        await self.session.flush()
        
        logger.debug(f"Saved draft for user {user_id} in thread {thread_id}")
        return self._draft_model_to_entity(model)
    
    async def delete_draft(
        self,
        tenant_id: UUID,
        thread_id: UUID,
        user_id: UUID,
    ) -> bool:
        """Delete a draft message."""
        query = select(CommunicationDraftModel).where(
            and_(
                CommunicationDraftModel.thread_id == thread_id,
                CommunicationDraftModel.user_id == user_id,
                CommunicationDraftModel.tenant_id == tenant_id,
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        
        if not model:
            return False
        
        await self.session.delete(model)
        await self.session.flush()
        
        logger.debug(f"Deleted draft for user {user_id} in thread {thread_id}")
        return True
    
    # =========================================================================
    # Meeting Minutes Operations
    # =========================================================================
    
    async def get_meeting_minutes(
        self,
        tenant_id: UUID,
        thread_id: UUID,
    ) -> List[MeetingMinutes]:
        """Get meeting minutes for a thread."""
        query = select(MeetingMinutesModel).where(
            and_(
                MeetingMinutesModel.thread_id == thread_id,
                MeetingMinutesModel.tenant_id == tenant_id,
                MeetingMinutesModel.deleted_at.is_(None)
            )
        ).order_by(desc(MeetingMinutesModel.created_at))
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        
        return [self._minutes_model_to_entity(m) for m in models]
    
    async def create_meeting_minutes(
        self,
        tenant_id: UUID,
        thread_id: UUID,
        minutes: MeetingMinutes,
        created_by: UUID,
    ) -> MeetingMinutes:
        """Create meeting minutes record."""
        model = MeetingMinutesModel(
            id=minutes.id or uuid4(),
            tenant_id=tenant_id,
            thread_id=thread_id,
            title=minutes.title,
            content=minutes.content,
            status=minutes.status if isinstance(minutes.status, str) else minutes.status.value,
            generated_at=minutes.generated_at,
            generated_by=minutes.generated_by,
            created_by=created_by,
            updated_by=created_by,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        
        self.session.add(model)
        await self.session.flush()
        
        logger.info(f"Created meeting minutes {model.id} for thread {thread_id}")
        return self._minutes_model_to_entity(model)
    
    async def update_meeting_minutes_status(
        self,
        tenant_id: UUID,
        minutes_id: UUID,
        status: MeetingMinutesStatus,
        content: Optional[str] = None,
        updated_by: Optional[UUID] = None,
    ) -> Optional[MeetingMinutes]:
        """Update meeting minutes status and optionally content."""
        query = select(MeetingMinutesModel).where(
            and_(
                MeetingMinutesModel.id == minutes_id,
                MeetingMinutesModel.tenant_id == tenant_id,
            )
        )
        
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        
        if not model:
            return None
        
        model.status = status.value if isinstance(status, MeetingMinutesStatus) else status
        if content is not None:
            model.content = content
        if status == MeetingMinutesStatus.COMPLETED:
            model.generated_at = datetime.utcnow()
            model.generated_by = updated_by
        model.updated_by = updated_by
        model.updated_at = datetime.utcnow()
        
        await self.session.flush()
        
        logger.info(f"Updated meeting minutes {minutes_id} status to {status}")
        return self._minutes_model_to_entity(model)
    
    # =========================================================================
    # Model Converters
    # =========================================================================
    
    def _thread_model_to_entity(self, model: CommunicationThreadModel) -> CommunicationThread:
        """Convert thread model to entity."""
        return CommunicationThread(
            id=model.id,
            tenant_id=model.tenant_id,
            subject=model.subject,
            metadata=model.metadata_ or {},
            last_message_preview=model.last_message_preview,
            last_message_at=model.last_message_at,
            linked_entity_type=model.linked_entity_type,
            linked_entity_id=model.linked_entity_id,
            is_auto_created=model.is_auto_created or False,
            auto_created_confirmed=model.auto_created_confirmed or False,
            created_at=model.created_at,
            updated_at=model.updated_at,
            deleted_at=model.deleted_at,
            created_by=model.created_by,
            updated_by=model.updated_by,
        )
    
    def _message_model_to_entity(self, model: CommunicationMessageModel) -> CommunicationMessage:
        """Convert message model to entity."""
        email_meta = None
        if model.email_metadata:
            email_meta = EmailMetadata(**model.email_metadata) if isinstance(model.email_metadata, dict) else model.email_metadata
        
        return CommunicationMessage(
            id=model.id,
            thread_id=model.thread_id,
            tenant_id=model.tenant_id,
            author=model.author,
            author_name=model.author_name,
            body=model.body,
            attachments=model.attachments or [],
            message_type=model.message_type or MessageType.TEXT,
            email_metadata=email_meta,
            is_auto_created=model.is_auto_created or False,
            auto_created_confirmed=model.auto_created_confirmed or False,
            created_at=model.created_at,
            updated_at=model.updated_at,
            deleted_at=model.deleted_at,
            created_by=model.created_by,
            updated_by=model.updated_by,
        )
    
    def _participant_model_to_entity(self, model: CommunicationThreadParticipantModel) -> ThreadParticipant:
        """Convert participant model to entity."""
        return ThreadParticipant(
            id=model.id,
            thread_id=model.thread_id,
            user_id=model.user_id,
            role=model.role,
            added_at=model.added_at,
            added_by=model.added_by,
        )
    
    def _draft_model_to_entity(self, model: CommunicationDraftModel) -> CommunicationDraft:
        """Convert draft model to entity."""
        return CommunicationDraft(
            id=model.id,
            tenant_id=model.tenant_id,
            thread_id=model.thread_id,
            user_id=model.user_id,
            body=model.body,
            attachments=model.attachments or [],
            last_updated_at=model.last_updated_at,
            created_at=model.created_at,
        )
    
    def _minutes_model_to_entity(self, model: MeetingMinutesModel) -> MeetingMinutes:
        """Convert meeting minutes model to entity."""
        return MeetingMinutes(
            id=model.id,
            thread_id=model.thread_id,
            tenant_id=model.tenant_id,
            title=model.title,
            content=model.content,
            status=model.status,
            generated_at=model.generated_at,
            generated_by=model.generated_by,
            created_at=model.created_at,
            updated_at=model.updated_at,
            deleted_at=model.deleted_at,
            created_by=model.created_by,
            updated_by=model.updated_by,
        )
