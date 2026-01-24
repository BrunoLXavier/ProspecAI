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
from sqlalchemy.future import select

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
    UpdateThreadRequest,
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


# NOTE: Static routes must come BEFORE dynamic /{thread_id} route
@router.get("/report-templates", response_model=List[dict])
async def list_report_templates(
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
):
    """
    List available report templates for transcription reports.
    """
    from services.report_service import REPORT_TEMPLATES
    
    templates = []
    for template_id, template in REPORT_TEMPLATES.items():
        templates.append({
            "id": template.id,
            "name": template.name,
            "description": template.description,
            "type": template.type.value,
            "sections": template.sections,
            "default_format": template.default_format.value,
        })
    
    return templates


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


@router.patch("/{thread_id}", response_model=ThreadResponse)
async def update_thread(
    thread_id: str,
    request: UpdateThreadRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Update a communication thread's metadata."""
    repo = CommunicationRepository(db)
    
    # Get existing thread
    thread = await repo.get_thread_by_id(UUID(tenant_id), UUID(thread_id))
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Apply updates to the domain entity
    if request.subject is not None:
        thread.subject = request.subject
    if request.linked_entity_type is not None:
        thread.linked_entity_type = request.linked_entity_type if request.linked_entity_type else None
    if request.linked_entity_id is not None:
        thread.linked_entity_id = UUID(request.linked_entity_id) if request.linked_entity_id else None
    
    # Use repository update method
    updated_thread = await repo.update_thread(UUID(tenant_id), thread, user_id)
    if not updated_thread:
        raise HTTPException(status_code=500, detail="Failed to update thread")
    
    await db.commit()
    
    # Get participant count
    participants = await repo.get_thread_participants(UUID(tenant_id), UUID(thread_id))
    participant_count = len(participants) if participants else 0
    
    logger.info(f"Updated thread {thread_id} by user {user_id}")
    
    return ThreadResponse(
        id=str(updated_thread.id),
        subject=updated_thread.subject,
        preview=updated_thread.last_message_preview,
        last_message_at=updated_thread.last_message_at.isoformat() if updated_thread.last_message_at else None,
        linked_entity_type=updated_thread.linked_entity_type,
        linked_entity_id=str(updated_thread.linked_entity_id) if updated_thread.linked_entity_id else None,
        is_auto_created=updated_thread.is_auto_created,
        auto_created_confirmed=updated_thread.auto_created_confirmed,
        created_at=updated_thread.created_at.isoformat() if updated_thread.created_at else None,
        participant_count=participant_count,
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
    """Get messages for a thread with fresh attachment URLs."""
    from adapters.database.models import CommunicationAttachmentModel
    from adapters.database.connection import set_tenant_context
    from sqlalchemy import and_
    
    # Set tenant context for RLS
    await set_tenant_context(db, tenant_id)
    
    repo = CommunicationRepository(db)
    
    messages = await repo.get_messages_by_thread(
        tenant_id=UUID(tenant_id),
        thread_id=UUID(thread_id),
        skip=skip,
        limit=limit,
        include_auto_unconfirmed=include_auto_unconfirmed,
    )
    
    # Load attachments from database with fresh presigned URLs
    fs = get_file_storage()
    attachments_query = select(CommunicationAttachmentModel).where(
        and_(
            CommunicationAttachmentModel.thread_id == UUID(thread_id),
            CommunicationAttachmentModel.tenant_id == UUID(tenant_id),
        )
    )
    att_result = await db.execute(attachments_query)
    all_attachments = att_result.scalars().all()
    
    # Build a map of message_id -> attachments with fresh URLs
    attachments_by_message: dict = {}
    for att in all_attachments:
        if att.message_id:
            msg_id_str = str(att.message_id)
            if msg_id_str not in attachments_by_message:
                attachments_by_message[msg_id_str] = []
            
            # Generate fresh presigned URL
            try:
                url = await fs.get_presigned_url(
                    StorageBucket(att.bucket),
                    att.object_name,
                    expires_in=3600,
                )
            except Exception:
                url = None
            
            attachments_by_message[msg_id_str].append({
                "id": str(att.id),
                "filename": att.filename,
                "content_type": att.content_type,
                "size": att.size,
                "url": url,
            })
    
    return [
        MessageResponse(
            id=str(m.id),
            thread_id=str(m.thread_id),
            author=m.author,
            author_name=m.author_name,
            body=m.body,
            message_type=m.message_type if isinstance(m.message_type, str) else m.message_type.value,
            created_at=m.created_at.isoformat() if m.created_at else "",
            attachments=attachments_by_message.get(str(m.id), m.attachments or []),
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
    from adapters.database.connection import set_tenant_context
    
    # Set tenant context for RLS
    await set_tenant_context(db, tenant_id)
    
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
        
        attachment_id = uuid4()
        logger.info(f"Creating attachment {attachment_id} for file {f.filename} in thread {thread_id}, message {message_id}")
        
        attach = CommunicationAttachmentModel(
            id=attachment_id,
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
        logger.info(f"Added attachment {attachment_id} to session (tenant={tenant_id}, thread={thread_id})")
        
        results.append({
            "id": str(attach.id),
            "filename": f.filename,
            "object_name": upload.object_name,
            "bucket": upload.bucket,
            "size": upload.size,
            "content_type": upload.content_type,
            "url": url,
        })
    
    try:
        await db.flush()  # Flush to detect any errors before commit
        logger.info(f"Flushed {len(results)} attachments to session for thread {thread_id}")
        await db.commit()
        logger.info(f"Committed {len(results)} attachments for thread {thread_id}, message {message_id}")
    except Exception as e:
        logger.error(f"Error committing attachments for thread {thread_id}: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save attachments: {str(e)}")
    
    return {"uploaded": results}


@router.get("/{thread_id}/attachments/{attachment_id}/download")
async def download_attachment(
    thread_id: str,
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """
    Download an attachment file.
    
    This endpoint downloads the file from storage and streams it to the client,
    solving the issue of presigned URLs pointing to internal Docker hostnames.
    """
    from adapters.database.models import CommunicationAttachmentModel
    from sqlalchemy import and_
    from fastapi.responses import StreamingResponse
    import io
    
    # Find the attachment
    query = select(CommunicationAttachmentModel).where(
        and_(
            CommunicationAttachmentModel.id == UUID(attachment_id),
            CommunicationAttachmentModel.thread_id == UUID(thread_id),
            CommunicationAttachmentModel.tenant_id == UUID(tenant_id),
        )
    )
    result = await db.execute(query)
    attachment = result.scalar_one_or_none()
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Download file from storage
    fs = get_file_storage()
    try:
        content = await fs.download_file(
            StorageBucket(attachment.bucket),
            attachment.object_name,
        )
        if not content:
            raise HTTPException(status_code=404, detail="File not found in storage")
    except Exception as e:
        logger.error(f"Failed to download file: {e}")
        raise HTTPException(status_code=500, detail="Failed to download file")
    
    # Stream the file to the client
    return StreamingResponse(
        io.BytesIO(content),
        media_type=attachment.content_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{attachment.filename}"',
            "Content-Length": str(attachment.size or len(content)),
        }
    )


@router.get("/{thread_id}/attachments")
async def list_attachments(
    thread_id: str,
    message_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """
    List all attachments for a thread with fresh presigned URLs.
    
    Optionally filter by message_id.
    """
    from adapters.database.models import CommunicationAttachmentModel
    from sqlalchemy import and_
    
    conditions = [
        CommunicationAttachmentModel.thread_id == UUID(thread_id),
        CommunicationAttachmentModel.tenant_id == UUID(tenant_id),
    ]
    
    if message_id:
        conditions.append(CommunicationAttachmentModel.message_id == UUID(message_id))
    
    query = select(CommunicationAttachmentModel).where(and_(*conditions))
    result = await db.execute(query)
    attachments = result.scalars().all()
    
    # Generate fresh presigned URLs for each attachment
    fs = get_file_storage()
    results = []
    
    for att in attachments:
        try:
            url = await fs.get_presigned_url(
                StorageBucket(att.bucket),
                att.object_name,
                expires_in=3600,
            )
        except Exception:
            url = None
        
        results.append({
            "id": str(att.id),
            "message_id": str(att.message_id) if att.message_id else None,
            "filename": att.filename,
            "content_type": att.content_type,
            "size": att.size,
            "url": url,
        })
    
    return results


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


# =============================================================================
# Email Ingestion Configuration Endpoints
# =============================================================================

class EmailConfigRequest(BaseModel):
    """Request model for email configuration."""
    enabled: bool = True
    whitelist: List[str] = Field(default_factory=list)
    auto_confirm: bool = False


class EmailConfigResponse(BaseModel):
    """Response model for email configuration."""
    inbound_address: str
    enabled: bool
    whitelist: List[str]
    auto_confirm: bool


class InboundEmailRequest(BaseModel):
    """Request model for inbound email webhook (from email service)."""
    from_address: str
    from_name: Optional[str] = None
    to_address: str
    cc_addresses: List[str] = Field(default_factory=list)
    subject: Optional[str] = None
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    received_at: Optional[datetime] = None
    message_id: Optional[str] = None
    in_reply_to: Optional[str] = None
    attachments: List[dict] = Field(default_factory=list)


@router.get("/{thread_id}/email-config", response_model=EmailConfigResponse)
async def get_email_config(
    thread_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Get email ingestion configuration for a thread."""
    repo = CommunicationRepository(db)
    
    thread = await repo.get_thread_by_id(UUID(tenant_id), UUID(thread_id))
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Get or create email config from thread metadata
    email_config = thread.metadata.get("email_config", {})
    
    # Generate inbound address based on thread ID
    inbound_address = f"thread-{thread_id[:8]}@inbound.prospecai.com"
    
    return EmailConfigResponse(
        inbound_address=email_config.get("inbound_address", inbound_address),
        enabled=email_config.get("enabled", True),
        whitelist=email_config.get("whitelist", []),
        auto_confirm=email_config.get("auto_confirm", False),
    )


@router.put("/{thread_id}/email-config", response_model=EmailConfigResponse)
async def update_email_config(
    thread_id: str,
    request: EmailConfigRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: str = Depends(get_current_tenant_id),
    _allowed: bool = Depends(ensure_user_member_or_admin),
):
    """Update email ingestion configuration for a thread."""
    repo = CommunicationRepository(db)
    
    thread = await repo.get_thread_by_id(UUID(tenant_id), UUID(thread_id))
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Generate inbound address
    inbound_address = f"thread-{thread_id[:8]}@inbound.prospecai.com"
    
    # Update metadata with email config
    thread.metadata["email_config"] = {
        "inbound_address": inbound_address,
        "enabled": request.enabled,
        "whitelist": [email.lower() for email in request.whitelist],
        "auto_confirm": request.auto_confirm,
    }
    
    await repo.update_thread(UUID(tenant_id), thread, user_id)
    await db.commit()
    
    return EmailConfigResponse(
        inbound_address=inbound_address,
        enabled=request.enabled,
        whitelist=request.whitelist,
        auto_confirm=request.auto_confirm,
    )


@router.post("/inbound-email", tags=["Email Webhook"])
async def receive_inbound_email(
    request: InboundEmailRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Webhook endpoint for receiving inbound emails.
    
    This endpoint is called by the email service (SendGrid, Mailgun, etc.)
    when an email is received at the thread's inbound address.
    
    The email is inserted as a message in the corresponding thread
    with human-in-the-loop flag set (unless auto_confirm is enabled).
    """
    # Extract thread ID from inbound address
    # Format: thread-XXXXXXXX@inbound.prospecai.com
    to_address = request.to_address.lower()
    
    if not to_address.startswith("thread-") or "@" not in to_address:
        raise HTTPException(status_code=400, detail="Invalid inbound address format")
    
    thread_prefix = to_address.split("@")[0]  # thread-XXXXXXXX
    thread_short_id = thread_prefix.replace("thread-", "")  # XXXXXXXX
    
    if len(thread_short_id) < 8:
        raise HTTPException(status_code=400, detail="Invalid thread identifier")
    
    # Find thread by partial ID match
    from sqlalchemy import select, text
    from adapters.database.models import CommunicationThreadModel
    
    stmt = select(CommunicationThreadModel).where(
        CommunicationThreadModel.deleted_at.is_(None),
        text(f"CAST(id AS TEXT) LIKE '{thread_short_id}%'")
    ).limit(1)
    
    result = await db.execute(stmt)
    thread_model = result.scalar_one_or_none()
    
    if not thread_model:
        logger.warning(f"Thread not found for inbound email: {to_address}")
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Check email config
    email_config = thread_model.metadata.get("email_config", {})
    
    if not email_config.get("enabled", True):
        logger.info(f"Email ingestion disabled for thread {thread_model.id}")
        return {"status": "ignored", "reason": "Email ingestion disabled"}
    
    # Check whitelist
    whitelist = email_config.get("whitelist", [])
    sender_email = request.from_address.lower()
    
    if whitelist and sender_email not in whitelist:
        logger.info(f"Sender {sender_email} not in whitelist for thread {thread_model.id}")
        return {"status": "ignored", "reason": "Sender not in whitelist"}
    
    # Determine if auto-confirm based on config
    auto_confirm = email_config.get("auto_confirm", False)
    
    # Create email message
    from domain.entities.communication import EmailMetadata
    
    email_metadata = EmailMetadata(
        from_address=request.from_address,
        from_name=request.from_name,
        to_addresses=[request.to_address],
        cc_addresses=request.cc_addresses,
        subject=request.subject,
        received_at=request.received_at or datetime.utcnow(),
        message_id=request.message_id,
        in_reply_to=request.in_reply_to,
    )
    
    # Parse email body (prefer text, fallback to HTML stripped)
    body = request.body_text or ""
    if not body and request.body_html:
        import re
        body = re.sub(r'<[^>]+>', '', request.body_html)
    
    message = CommunicationMessage(
        thread_id=thread_model.id,
        author=request.from_address,
        author_name=request.from_name or request.from_address,
        body=body.strip() or f"[{request.subject or 'No content'}]",
        message_type=MessageType.EMAIL,
        email_metadata=email_metadata,
        is_auto_created=True,
        auto_created_confirmed=auto_confirm,
    )
    
    repo = CommunicationRepository(db)
    
    # Use system user for auto-created messages
    system_user_id = UUID("00000000-0000-0000-0000-000000000001")
    
    created = await repo.create_message(
        tenant_id=thread_model.tenant_id,
        thread_id=thread_model.id,
        message=message,
        created_by=system_user_id,
    )
    
    await db.commit()
    
    # Handle attachments if any
    if request.attachments:
        fs = get_file_storage()
        for attachment in request.attachments:
            try:
                # Decode base64 content if present
                import base64
                content = attachment.get("content")
                if content:
                    content_bytes = base64.b64decode(content)
                    filename = attachment.get("filename", "attachment")
                    
                    upload = await fs.upload_bytes(
                        tenant_id=str(thread_model.tenant_id),
                        bucket=StorageBucket.ATTACHMENTS,
                        filename=filename,
                        content=content_bytes,
                    )
                    
                    if upload.success:
                        from adapters.database.models import CommunicationAttachmentModel
                        
                        attach = CommunicationAttachmentModel(
                            id=uuid4(),
                            tenant_id=thread_model.tenant_id,
                            thread_id=thread_model.id,
                            message_id=created.id,
                            filename=filename,
                            object_name=upload.object_name,
                            bucket=upload.bucket,
                            content_type=attachment.get("content_type"),
                            size=len(content_bytes),
                            created_by=system_user_id,
                            updated_by=system_user_id,
                        )
                        db.add(attach)
            except Exception as e:
                logger.error(f"Failed to process email attachment: {e}")
        
        await db.commit()
    
    # Publish event to Kafka for notifications
    producer = get_kafka_producer()
    
    async def publish_event():
        try:
            event = {
                "type": "email_received",
                "thread_id": str(thread_model.id),
                "message_id": str(created.id),
                "tenant_id": str(thread_model.tenant_id),
                "from_address": request.from_address,
                "subject": request.subject,
                "needs_confirmation": not auto_confirm,
                "received_at": datetime.utcnow().isoformat(),
            }
            await producer.send("prospecai.communications.events", key=str(created.id), value=str(event))
            logger.info(f"Published email received event for message {created.id}")
        except Exception as e:
            logger.error(f"Failed to publish email event: {e}")
    
    background_tasks.add_task(publish_event)
    
    logger.info(f"Created email message {created.id} in thread {thread_model.id}")
    
    return {
        "status": "created",
        "message_id": str(created.id),
        "thread_id": str(thread_model.id),
        "auto_confirmed": auto_confirm,
    }


# =============================================================================
# Transcription and Report Generation
# =============================================================================

class TranscriptionRequest(BaseModel):
    """Request for transcription with optional report generation"""
    language: Optional[str] = "auto"  # auto, pt, en, es


class TranscriptionResponse(BaseModel):
    """Response with transcription result"""
    text: str
    language: str
    duration_seconds: float
    confidence: float
    segments: List[dict]


class TranscriptionReportRequest(BaseModel):
    """Request to generate report from transcription"""
    template_id: str
    transcription_text: str
    transcription_language: str = "pt"
    additional_context: Optional[str] = None
    attach_to_thread: bool = True  # Whether to attach report as message


class TranscriptionReportResponse(BaseModel):
    """Response with generated report"""
    template_id: str
    template_name: str
    report_content: str
    report_format: str
    generated_at: str
    message_id: Optional[str] = None  # If attached to thread
    download_url: Optional[str] = None


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio_video(
    file: UploadFile = File(...),
    language: str = Query("auto", description="Language: auto, pt, en, es"),
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
):
    """
    Transcribe audio or video file using Whisper.
    
    Supports WebM, MP3, WAV, MP4, OGG formats.
    Returns transcription text with timing segments.
    """
    from services.ai.transcription_service import (
        get_transcription_service,
        TranscriptionLanguage,
    )
    
    # Read file content
    content = await file.read()
    
    if len(content) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=413, detail="File too large. Max 50MB.")
    
    # Map language
    lang_map = {
        "auto": TranscriptionLanguage.AUTO,
        "pt": TranscriptionLanguage.PORTUGUESE,
        "en": TranscriptionLanguage.ENGLISH,
        "es": TranscriptionLanguage.SPANISH,
    }
    trans_lang = lang_map.get(language, TranscriptionLanguage.AUTO)
    
    try:
        service = get_transcription_service()
        result = await service.transcribe(
            audio_data=content,
            filename=file.filename or "audio.webm",
            language=trans_lang,
        )
        
        return TranscriptionResponse(
            text=result.text,
            language=result.language,
            duration_seconds=result.duration_seconds,
            confidence=result.confidence,
            segments=result.segments,
        )
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post(
    "/{thread_id}/transcription-report",
    response_model=TranscriptionReportResponse,
)
async def generate_transcription_report(
    thread_id: UUID,
    request: TranscriptionReportRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    institute_ids: List[UUID] = Depends(get_current_institute_ids),
):
    """
    Generate a report from transcription text using a template.
    
    The report can be attached as a file message in the thread.
    Uses LLM to structure the transcription into report sections.
    """
    from services.ai.transcription_service import (
        get_transcription_report_generator,
        TranscriptionResult,
        TranscriptionProvider,
    )
    from services.report_service import REPORT_TEMPLATES
    
    # Verify thread exists and user has access
    repo = CommunicationRepository(db)
    thread = await repo.get_thread(tenant_id, thread_id)
    
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Validate template
    if request.template_id not in REPORT_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Unknown template: {request.template_id}")
    
    template = REPORT_TEMPLATES[request.template_id]
    
    # Create transcription result object from text
    transcription = TranscriptionResult(
        text=request.transcription_text,
        language=request.transcription_language,
        duration_seconds=0.0,  # Not available from text-only
        segments=[],
        confidence=0.85,
        provider=TranscriptionProvider.MOCK,  # Text input
        transcribed_at=datetime.utcnow(),
    )
    
    try:
        # Generate report
        generator = get_transcription_report_generator(str(tenant_id))
        report = await generator.generate_report_from_transcription(
            transcription=transcription,
            template_id=request.template_id,
            additional_context=request.additional_context,
        )
        
        response = TranscriptionReportResponse(
            template_id=report["template_id"],
            template_name=report["template_name"],
            report_content=report["content"],
            report_format=report["format"],
            generated_at=report["generated_at"],
        )
        
        # Attach to thread if requested
        if request.attach_to_thread:
            # Save report as HTML file
            fs = get_file_storage()
            report_filename = f"report_{template.id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.html"
            
            upload = await fs.upload_bytes(
                tenant_id=str(tenant_id),
                bucket=StorageBucket.ATTACHMENTS,
                filename=report_filename,
                content=report["content"].encode("utf-8"),
            )
            
            if upload.success:
                # Create message with attachment
                message = CommunicationMessage(
                    thread_id=thread_id,
                    author=str(user_id),
                    author_name="Sistema",
                    body=f"📄 Relatório gerado: {template.name}\n\nBaseado em transcrição de áudio/vídeo.",
                    message_type=MessageType.SYSTEM,
                )
                
                created_msg = await repo.create_message(
                    tenant_id=tenant_id,
                    thread_id=thread_id,
                    message=message,
                    created_by=user_id,
                )
                
                # Create attachment
                from adapters.database.models import CommunicationAttachmentModel
                
                attachment = CommunicationAttachmentModel(
                    id=uuid4(),
                    tenant_id=tenant_id,
                    thread_id=thread_id,
                    message_id=created_msg.id,
                    filename=report_filename,
                    object_name=upload.object_name,
                    bucket=upload.bucket,
                    content_type="text/html",
                    size=len(report["content"].encode("utf-8")),
                    created_by=user_id,
                    updated_by=user_id,
                )
                db.add(attachment)
                await db.commit()
                
                response.message_id = str(created_msg.id)
                
                # Generate download URL
                download_url = await fs.get_presigned_url(
                    tenant_id=str(tenant_id),
                    bucket=StorageBucket.ATTACHMENTS,
                    object_name=upload.object_name,
                )
                response.download_url = download_url
        
        return response
        
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


@router.post("/transcribe-and-report/{thread_id}")
async def transcribe_and_generate_report(
    thread_id: UUID,
    file: UploadFile = File(...),
    template_id: str = Query(..., description="Report template ID"),
    language: str = Query("auto", description="Language: auto, pt, en, es"),
    additional_context: Optional[str] = Query(None, description="Additional context for report"),
    attach_to_thread: bool = Query(True, description="Attach report as message"),
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    institute_ids: List[UUID] = Depends(get_current_institute_ids),
):
    """
    Combined endpoint: Transcribe audio/video and generate report in one call.
    
    1. Transcribes the uploaded file
    2. Uses LLM to structure content into report sections
    3. Generates report using template
    4. Optionally attaches report file as message in thread
    """
    from services.ai.transcription_service import (
        get_transcription_service,
        get_transcription_report_generator,
        TranscriptionLanguage,
    )
    from services.report_service import REPORT_TEMPLATES
    
    # Verify thread exists
    repo = CommunicationRepository(db)
    thread = await repo.get_thread(tenant_id, thread_id)
    
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Validate template
    if template_id not in REPORT_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Unknown template: {template_id}")
    
    template = REPORT_TEMPLATES[template_id]
    
    # Read file
    content = await file.read()
    
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Max 50MB.")
    
    # Map language
    lang_map = {
        "auto": TranscriptionLanguage.AUTO,
        "pt": TranscriptionLanguage.PORTUGUESE,
        "en": TranscriptionLanguage.ENGLISH,
        "es": TranscriptionLanguage.SPANISH,
    }
    trans_lang = lang_map.get(language, TranscriptionLanguage.AUTO)
    
    try:
        # Step 1: Transcribe
        trans_service = get_transcription_service()
        transcription = await trans_service.transcribe(
            audio_data=content,
            filename=file.filename or "recording.webm",
            language=trans_lang,
        )
        
        # Step 2: Generate report
        report_gen = get_transcription_report_generator(str(tenant_id))
        report = await report_gen.generate_report_from_transcription(
            transcription=transcription,
            template_id=template_id,
            additional_context=additional_context,
        )
        
        result = {
            "transcription": {
                "text": transcription.text,
                "language": transcription.language,
                "duration_seconds": transcription.duration_seconds,
                "confidence": transcription.confidence,
            },
            "report": {
                "template_id": report["template_id"],
                "template_name": report["template_name"],
                "format": report["format"],
                "generated_at": report["generated_at"],
            },
        }
        
        # Step 3: Attach to thread if requested
        if attach_to_thread:
            fs = get_file_storage()
            report_filename = f"report_{template_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.html"
            
            upload = await fs.upload_bytes(
                tenant_id=str(tenant_id),
                bucket=StorageBucket.ATTACHMENTS,
                filename=report_filename,
                content=report["content"].encode("utf-8"),
            )
            
            if upload.success:
                message = CommunicationMessage(
                    thread_id=thread_id,
                    author=str(user_id),
                    author_name="Sistema",
                    body=f"📄 Relatório gerado: {template.name}\n\n"
                         f"Transcrição de {transcription.duration_seconds:.1f}s de áudio/vídeo.\n"
                         f"Confiança: {transcription.confidence * 100:.0f}%",
                    message_type=MessageType.SYSTEM,
                )
                
                created_msg = await repo.create_message(
                    tenant_id=tenant_id,
                    thread_id=thread_id,
                    message=message,
                    created_by=user_id,
                )
                
                from adapters.database.models import CommunicationAttachmentModel
                
                attachment = CommunicationAttachmentModel(
                    id=uuid4(),
                    tenant_id=tenant_id,
                    thread_id=thread_id,
                    message_id=created_msg.id,
                    filename=report_filename,
                    object_name=upload.object_name,
                    bucket=upload.bucket,
                    content_type="text/html",
                    size=len(report["content"].encode("utf-8")),
                    created_by=user_id,
                    updated_by=user_id,
                )
                db.add(attachment)
                await db.commit()
                
                result["message_id"] = str(created_msg.id)
                
                download_url = await fs.get_presigned_url(
                    tenant_id=str(tenant_id),
                    bucket=StorageBucket.ATTACHMENTS,
                    object_name=upload.object_name,
                )
                result["download_url"] = download_url
        
        return result
        
    except Exception as e:
        logger.error(f"Transcribe and report failed: {e}")
        raise HTTPException(status_code=500, detail=f"Process failed: {str(e)}")
