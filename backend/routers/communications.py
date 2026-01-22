"""
Communications API Router
Full implementation with repository pattern for communication threads, messages,
attachments, meeting minutes, and drafts.

Implements RF-08: Communications and collaboration with human-in-the-loop support.
"""
from typing import List, Any, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks, Query
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import uuid4, UUID

from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.file_storage import get_file_storage, StorageBucket
from adapters.database.connection import get_db
from infrastructure.dependencies import (
    get_current_user_id,
    get_current_tenant_id,
    get_current_institute_ids,
    ensure_user_member_or_admin,
)
from adapters.repositories.communication_repository import CommunicationRepository
from domain.entities.communication import (
    CommunicationThread,
    CommunicationMessage,
    MeetingMinutes,
    CommunicationDraft,
    MessageType,
    LinkedEntityType,
    ParticipantRole,
    MeetingMinutesStatus,
    CreateThreadRequest,
    CreateMessageRequest,
    UpdateDraftRequest,
    ConfirmAutoCreatedRequest,
    GenerateMeetingMinutesRequest,
)
from services.audit_service import get_kafka_producer

import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/communications", tags=["Communications"])


# =============================================================================
# Response Models
# =============================================================================

class ThreadResponse(BaseModel):
    id: str
    subject: Optional[str] = None
    preview: Optional[str] = None
    last_message_at: Optional[str] = None
    linked_entity_type: Optional[str] = None
    linked_entity_id: Optional[str] = None
    is_auto_created: bool = False
    auto_created_confirmed: bool = False
    created_at: Optional[str] = None
    participant_count: int = 0


class MessageResponse(BaseModel):
    id: str
    thread_id: str
    author: str
    author_name: Optional[str] = None
    body: str
    message_type: str = "text"
    created_at: str
    attachments: List[Any] = []
    is_auto_created: bool = False
    auto_created_confirmed: bool = False
    email_metadata: Optional[dict] = None


class ParticipantResponse(BaseModel):
    id: str
    user_id: str
    role: str
    added_at: str


class DraftResponse(BaseModel):
    thread_id: str
    body: Optional[str] = None
    attachments: List[Any] = []
    last_updated_at: str


class MeetingMinutesResponse(BaseModel):
    id: str
    thread_id: str
    title: Optional[str] = None
    content: Optional[str] = None
    status: str
    generated_at: Optional[str] = None
    created_at: str


class ThreadListResponse(BaseModel):
    items: List[ThreadResponse]
    total: int
    skip: int
    limit: int


# =============================================================================
# Thread Endpoints
# =============================================================================

@router.get("", response_model=ThreadListResponse)
async def list_threads(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    linked_entity_type: Optional[str] = None,
    linked_entity_id: Optional[str] = None,
    include_auto_unconfirmed: bool = True,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    institute_ids=Depends(get_current_institute_ids),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """List communication threads for the current tenant."""
    repo = CommunicationRepository(db)
    
    linked_id = UUID(linked_entity_id) if linked_entity_id else None
    
    threads = await repo.list_threads(
        tenant_id=UUID(tenant_id),
        skip=skip,
        limit=limit,
        linked_entity_type=linked_entity_type,
        linked_entity_id=linked_id,
        include_auto_unconfirmed=include_auto_unconfirmed,
        search=search,
    )
    
    # Get participant counts
    items = []
    for thread in threads:
        participants = await repo.get_thread_participants(UUID(tenant_id), thread.id)
        items.append(ThreadResponse(
            id=str(thread.id),
            subject=thread.subject,
            preview=thread.last_message_preview,
            last_message_at=thread.last_message_at.isoformat() if thread.last_message_at else None,
            linked_entity_type=thread.linked_entity_type,
            linked_entity_id=str(thread.linked_entity_id) if thread.linked_entity_id else None,
            is_auto_created=thread.is_auto_created,
            auto_created_confirmed=thread.auto_created_confirmed,
            created_at=thread.created_at.isoformat() if thread.created_at else None,
            participant_count=len(participants),
        ))
    
    return ThreadListResponse(
        items=items,
        total=len(items),  # TODO: implement count query
        skip=skip,
        limit=limit,
    )


@router.get("/{thread_id}", response_model=ThreadResponse)
async def get_thread(
    thread_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Get a specific thread by ID."""
    repo = CommunicationRepository(db)
    
    thread = await repo.get_thread_by_id(
        tenant_id=UUID(tenant_id),
        thread_id=UUID(thread_id),
        include_participants=True,
    )
    
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    return ThreadResponse(
        id=str(thread.id),
        subject=thread.subject,
        preview=thread.last_message_preview,
        last_message_at=thread.last_message_at.isoformat() if thread.last_message_at else None,
        linked_entity_type=thread.linked_entity_type,
        linked_entity_id=str(thread.linked_entity_id) if thread.linked_entity_id else None,
        is_auto_created=thread.is_auto_created,
        auto_created_confirmed=thread.auto_created_confirmed,
        created_at=thread.created_at.isoformat() if thread.created_at else None,
        participant_count=len(thread.participants),
    )


@router.post("", response_model=ThreadResponse)
async def create_thread(
    request: CreateThreadRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Create a new communication thread."""
    repo = CommunicationRepository(db)
    
    thread = CommunicationThread(
        subject=request.subject,
        linked_entity_type=request.linked_entity_type,
        linked_entity_id=request.linked_entity_id,
        metadata=request.metadata,
    )
    
    created = await repo.create_thread(
        tenant_id=UUID(tenant_id),
        thread=thread,
        created_by=user_id,
    )
    
    # Add additional participants
    for participant_id in request.participant_ids:
        await repo.add_participant(
            tenant_id=UUID(tenant_id),
            thread_id=created.id,
            user_id=participant_id,
            role=ParticipantRole.EDITOR,
            added_by=user_id,
        )
    
    # Create initial message if provided
    if request.initial_message:
        message = CommunicationMessage(
            thread_id=created.id,
            author=str(user_id),
            author_name=None,  # Will be populated from user data
            body=request.initial_message,
        )
        await repo.create_message(
            tenant_id=UUID(tenant_id),
            thread_id=created.id,
            message=message,
            created_by=user_id,
        )
    
    await db.commit()
    
    logger.info(f"Created thread {created.id} by user {user_id}")
    
    return ThreadResponse(
        id=str(created.id),
        subject=created.subject,
        preview=created.last_message_preview,
        last_message_at=created.last_message_at.isoformat() if created.last_message_at else None,
        linked_entity_type=created.linked_entity_type,
        linked_entity_id=str(created.linked_entity_id) if created.linked_entity_id else None,
        is_auto_created=created.is_auto_created,
        auto_created_confirmed=created.auto_created_confirmed,
        created_at=created.created_at.isoformat() if created.created_at else None,
        participant_count=1 + len(request.participant_ids),
    )


@router.delete("/{thread_id}")
async def delete_thread(
    thread_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Soft delete a thread."""
    repo = CommunicationRepository(db)
    
    success = await repo.delete_thread(
        tenant_id=UUID(tenant_id),
        thread_id=UUID(thread_id),
        deleted_by=user_id,
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    await db.commit()
    
    return {"status": "deleted", "thread_id": thread_id}


@router.post("/{thread_id}/confirm")
async def confirm_auto_created_thread(
    thread_id: str,
    request: ConfirmAutoCreatedRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Confirm an auto-created thread (human-in-the-loop)."""
    repo = CommunicationRepository(db)
    
    thread = await repo.get_thread_by_id(UUID(tenant_id), UUID(thread_id))
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    if not thread.is_auto_created:
        raise HTTPException(status_code=400, detail="Thread is not auto-created")
    
    thread.auto_created_confirmed = request.confirmed
    await repo.update_thread(UUID(tenant_id), thread, user_id)
    
    await db.commit()
    
    return {"status": "confirmed" if request.confirmed else "rejected", "thread_id": thread_id}


# =============================================================================
# Message Endpoints
# =============================================================================

@router.get("/{thread_id}/messages", response_model=List[MessageResponse])
async def list_messages(
    thread_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    include_auto_unconfirmed: bool = True,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Get messages for a thread."""
    repo = CommunicationRepository(db)
    
    messages = await repo.get_messages_by_thread(
        tenant_id=UUID(tenant_id),
        thread_id=UUID(thread_id),
        skip=skip,
        limit=limit,
        include_auto_unconfirmed=include_auto_unconfirmed,
    )
    
    return [
        MessageResponse(
            id=str(m.id),
            thread_id=str(m.thread_id),
            author=m.author,
            author_name=m.author_name,
            body=m.body,
            message_type=m.message_type if isinstance(m.message_type, str) else m.message_type.value,
            created_at=m.created_at.isoformat() if m.created_at else "",
            attachments=m.attachments or [],
            is_auto_created=m.is_auto_created,
            auto_created_confirmed=m.auto_created_confirmed,
            email_metadata=m.email_metadata.model_dump() if m.email_metadata and hasattr(m.email_metadata, 'model_dump') else m.email_metadata,
        )
        for m in messages
    ]


@router.post("/{thread_id}/messages", response_model=MessageResponse)
async def create_message(
    thread_id: str,
    request: CreateMessageRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Create a new message in a thread."""
    repo = CommunicationRepository(db)
    
    # Verify thread exists
    thread = await repo.get_thread_by_id(UUID(tenant_id), UUID(thread_id))
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    message = CommunicationMessage(
        thread_id=UUID(thread_id),
        author=str(user_id),
        body=request.body,
        message_type=request.message_type,
        email_metadata=request.email_metadata,
        attachments=request.attachments,
    )
    
    created = await repo.create_message(
        tenant_id=UUID(tenant_id),
        thread_id=UUID(thread_id),
        message=message,
        created_by=user_id,
    )
    
    # Delete any draft for this user/thread
    await repo.delete_draft(UUID(tenant_id), UUID(thread_id), user_id)
    
    await db.commit()
    
    # TODO: Broadcast via WebSocket
    
    return MessageResponse(
        id=str(created.id),
        thread_id=str(created.thread_id),
        author=created.author,
        author_name=created.author_name,
        body=created.body,
        message_type=created.message_type if isinstance(created.message_type, str) else created.message_type.value,
        created_at=created.created_at.isoformat(),
        attachments=created.attachments or [],
        is_auto_created=created.is_auto_created,
        auto_created_confirmed=created.auto_created_confirmed,
        email_metadata=None,
    )


@router.delete("/{thread_id}/messages/{message_id}")
async def delete_message(
    thread_id: str,
    message_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Soft delete a message."""
    repo = CommunicationRepository(db)
    
    success = await repo.delete_message(
        tenant_id=UUID(tenant_id),
        message_id=UUID(message_id),
        deleted_by=user_id,
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Message not found")
    
    await db.commit()
    
    return {"status": "deleted", "message_id": message_id}


@router.post("/{thread_id}/messages/{message_id}/confirm")
async def confirm_auto_created_message(
    thread_id: str,
    message_id: str,
    request: ConfirmAutoCreatedRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Confirm an auto-created message (human-in-the-loop)."""
    repo = CommunicationRepository(db)
    
    message = await repo.confirm_auto_created_message(
        tenant_id=UUID(tenant_id),
        message_id=UUID(message_id),
        confirmed_by=user_id,
    )
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found or not auto-created")
    
    await db.commit()
    
    return {"status": "confirmed", "message_id": message_id}


# =============================================================================
# Attachment Endpoints
# =============================================================================

@router.post("/{thread_id}/attachments")
async def upload_attachments(
    thread_id: str,
    files: List[UploadFile] = File(...),
    message_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Upload attachments to a thread."""
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    from adapters.database.models import CommunicationAttachmentModel
    
    fs = get_file_storage()
    results = []
    
    for f in files:
        content = await f.read()
        upload = await fs.upload_bytes(
            tenant_id=tenant_id,
            bucket=StorageBucket.ATTACHMENTS,
            filename=f.filename,
            content=content,
        )
        
        if not upload.success:
            results.append({"filename": f.filename, "error": upload.error})
            continue
        
        try:
            url = await fs.get_presigned_url(StorageBucket.ATTACHMENTS, upload.object_name)
        except Exception:
            url = None
        
        attach = CommunicationAttachmentModel(
            id=uuid4(),
            tenant_id=UUID(tenant_id),
            thread_id=UUID(thread_id),
            message_id=UUID(message_id) if message_id else None,
            filename=f.filename,
            object_name=upload.object_name,
            bucket=upload.bucket,
            url=url,
            content_type=upload.content_type,
            size=upload.size,
            created_by=user_id,
            updated_by=user_id,
        )
        db.add(attach)
        
        results.append({
            "id": str(attach.id),
            "filename": f.filename,
            "object_name": upload.object_name,
            "bucket": upload.bucket,
            "size": upload.size,
            "content_type": upload.content_type,
            "url": url,
        })
    
    await db.commit()
    
    return {"uploaded": results}


# =============================================================================
# Participant Endpoints
# =============================================================================

@router.get("/{thread_id}/participants", response_model=List[ParticipantResponse])
async def list_participants(
    thread_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Get participants for a thread."""
    repo = CommunicationRepository(db)
    
    participants = await repo.get_thread_participants(
        tenant_id=UUID(tenant_id),
        thread_id=UUID(thread_id),
    )
    
    return [
        ParticipantResponse(
            id=str(p.id),
            user_id=str(p.user_id),
            role=p.role if isinstance(p.role, str) else p.role.value,
            added_at=p.added_at.isoformat() if p.added_at else "",
        )
        for p in participants
    ]


@router.post("/{thread_id}/participants")
async def add_participant(
    thread_id: str,
    user_id_to_add: str,
    role: str = "viewer",
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Add a participant to a thread."""
    repo = CommunicationRepository(db)
    
    try:
        participant_role = ParticipantRole(role)
    except ValueError:
        participant_role = ParticipantRole.VIEWER
    
    participant = await repo.add_participant(
        tenant_id=UUID(tenant_id),
        thread_id=UUID(thread_id),
        user_id=UUID(user_id_to_add),
        role=participant_role,
        added_by=user_id,
    )
    
    await db.commit()
    
    return ParticipantResponse(
        id=str(participant.id),
        user_id=str(participant.user_id),
        role=participant.role if isinstance(participant.role, str) else participant.role.value,
        added_at=participant.added_at.isoformat() if participant.added_at else "",
    )


@router.delete("/{thread_id}/participants/{participant_user_id}")
async def remove_participant(
    thread_id: str,
    participant_user_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Remove a participant from a thread."""
    repo = CommunicationRepository(db)
    
    success = await repo.remove_participant(
        tenant_id=UUID(tenant_id),
        thread_id=UUID(thread_id),
        user_id=UUID(participant_user_id),
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    await db.commit()
    
    return {"status": "removed", "user_id": participant_user_id}


# =============================================================================
# Draft Endpoints
# =============================================================================

@router.get("/{thread_id}/draft", response_model=Optional[DraftResponse])
async def get_draft(
    thread_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Get the current user's draft for a thread."""
    repo = CommunicationRepository(db)
    
    draft = await repo.get_draft(
        tenant_id=UUID(tenant_id),
        thread_id=UUID(thread_id),
        user_id=user_id,
    )
    
    if not draft:
        return None
    
    return DraftResponse(
        thread_id=str(draft.thread_id),
        body=draft.body,
        attachments=draft.attachments or [],
        last_updated_at=draft.last_updated_at.isoformat() if draft.last_updated_at else "",
    )


@router.put("/{thread_id}/draft", response_model=DraftResponse)
async def save_draft(
    thread_id: str,
    request: UpdateDraftRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Save or update a draft message."""
    repo = CommunicationRepository(db)
    
    draft = await repo.save_draft(
        tenant_id=UUID(tenant_id),
        thread_id=UUID(thread_id),
        user_id=user_id,
        body=request.body,
        attachments=request.attachments,
    )
    
    await db.commit()
    
    return DraftResponse(
        thread_id=str(draft.thread_id),
        body=draft.body,
        attachments=draft.attachments or [],
        last_updated_at=draft.last_updated_at.isoformat() if draft.last_updated_at else "",
    )


@router.delete("/{thread_id}/draft")
async def delete_draft(
    thread_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Delete a draft message."""
    repo = CommunicationRepository(db)
    
    success = await repo.delete_draft(
        tenant_id=UUID(tenant_id),
        thread_id=UUID(thread_id),
        user_id=user_id,
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    await db.commit()
    
    return {"status": "deleted"}


# =============================================================================
# Meeting Minutes Endpoints
# =============================================================================

@router.get("/{thread_id}/minutes", response_model=List[MeetingMinutesResponse])
async def list_meeting_minutes(
    thread_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Get meeting minutes for a thread."""
    repo = CommunicationRepository(db)
    
    minutes_list = await repo.get_meeting_minutes(
        tenant_id=UUID(tenant_id),
        thread_id=UUID(thread_id),
    )
    
    return [
        MeetingMinutesResponse(
            id=str(m.id),
            thread_id=str(m.thread_id),
            title=m.title,
            content=m.content,
            status=m.status if isinstance(m.status, str) else m.status.value,
            generated_at=m.generated_at.isoformat() if m.generated_at else None,
            created_at=m.created_at.isoformat() if m.created_at else "",
        )
        for m in minutes_list
    ]


@router.post("/{thread_id}/generate-meeting-minutes", response_model=MeetingMinutesResponse)
async def generate_meeting_minutes(
    thread_id: str,
    request: GenerateMeetingMinutesRequest = GenerateMeetingMinutesRequest(),
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Request generation of meeting minutes for a thread."""
    repo = CommunicationRepository(db)
    
    # Verify thread exists
    thread = await repo.get_thread_by_id(UUID(tenant_id), UUID(thread_id))
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Create minutes record with pending status
    minutes = MeetingMinutes(
        thread_id=UUID(thread_id),
        title=request.title or f"Meeting Minutes - {thread.subject or 'Untitled'}",
        status=MeetingMinutesStatus.PENDING,
    )
    
    created = await repo.create_meeting_minutes(
        tenant_id=UUID(tenant_id),
        thread_id=UUID(thread_id),
        minutes=minutes,
        created_by=user_id,
    )
    
    await db.commit()
    
    # Enqueue processing via Kafka
    producer = get_kafka_producer()
    payload = {
        "minutes_id": str(created.id),
        "thread_id": str(thread_id),
        "tenant_id": str(tenant_id),
        "requested_by": str(user_id),
        "requested_at": datetime.utcnow().isoformat(),
        "include_attachments": request.include_attachments,
        "date_from": request.date_from.isoformat() if request.date_from else None,
        "date_to": request.date_to.isoformat() if request.date_to else None,
    }
    
    async def publish():
        try:
            await producer.send("prospecai.communications.minutes", key=str(created.id), value=str(payload))
            logger.info(f"Published meeting minutes job {created.id}")
        except Exception as e:
            logger.error(f"Failed to publish minutes job: {e}")
    
    if background_tasks:
        background_tasks.add_task(publish)
    
    return MeetingMinutesResponse(
        id=str(created.id),
        thread_id=str(created.thread_id),
        title=created.title,
        content=created.content,
        status=created.status if isinstance(created.status, str) else created.status.value,
        generated_at=created.generated_at.isoformat() if created.generated_at else None,
        created_at=created.created_at.isoformat() if created.created_at else "",
    )


@router.get("/{thread_id}/minutes/{minutes_id}", response_model=MeetingMinutesResponse)
async def get_meeting_minutes(
    thread_id: str,
    minutes_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Get specific meeting minutes by ID."""
    repo = CommunicationRepository(db)
    
    minutes_list = await repo.get_meeting_minutes(
        tenant_id=UUID(tenant_id),
        thread_id=UUID(thread_id),
    )
    
    for m in minutes_list:
        if str(m.id) == minutes_id:
            return MeetingMinutesResponse(
                id=str(m.id),
                thread_id=str(m.thread_id),
                title=m.title,
                content=m.content,
                status=m.status if isinstance(m.status, str) else m.status.value,
                generated_at=m.generated_at.isoformat() if m.generated_at else None,
                created_at=m.created_at.isoformat() if m.created_at else "",
            )
    
    raise HTTPException(status_code=404, detail="Meeting minutes not found")
