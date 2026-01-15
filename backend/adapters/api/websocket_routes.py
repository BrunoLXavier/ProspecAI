"""
WebSocket Routes for Real-Time Collaboration
Implements RF-08: Proposal repository with real-time collaboration
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from typing import Optional

from infrastructure.websocket_manager import websocket_manager, MessageType
from infrastructure.auth import get_current_user, CurrentUser

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/proposals/{proposal_id}")
async def proposal_collaboration(
    websocket: WebSocket,
    proposal_id: str,
    token: Optional[str] = Query(None),
):
    """
    WebSocket endpoint for real-time proposal collaboration.
    
    Connect to collaborate on a proposal in real-time:
    - See other users' cursors and selections
    - Receive live content updates
    - Section-level locking for conflict prevention
    
    Query params:
        - token: JWT access token for authentication
    
    Message types:
        - cursor_move: Update cursor position
        - selection_change: Update text selection
        - content_change: Broadcast content changes
        - lock_request: Request section lock
        - lock_released: Release section lock
    """
    # Validate token (extracted from query since WebSocket headers are limited)
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return
    
    # In production, validate the JWT token here
    # For now, extract user info from token payload
    try:
        from jose import jwt
        # Decode without verification for development
        # In production: use proper validation with JWKS
        payload = jwt.get_unverified_claims(token)
        user_id = payload.get("sub", "anonymous")
        username = payload.get("preferred_username", payload.get("email", "User"))
    except Exception:
        # Fallback for development
        user_id = "dev-user"
        username = "Developer"
    
    try:
        # Connect to room
        await websocket_manager.connect(
            proposal_id=proposal_id,
            user_id=user_id,
            username=username,
            websocket=websocket
        )
        
        # Message handling loop
        while True:
            try:
                data = await websocket.receive_json()
                await websocket_manager.handle_message(proposal_id, user_id, data)
            except WebSocketDisconnect:
                break
            except Exception as e:
                await websocket.send_json({
                    "type": MessageType.ERROR.value,
                    "data": {"message": str(e)}
                })
    
    finally:
        await websocket_manager.disconnect(proposal_id, user_id)


@router.get("/proposals/{proposal_id}/active-users")
async def get_active_users(
    proposal_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get list of users currently editing a proposal.
    Useful for showing collaboration status before joining.
    """
    users = websocket_manager.get_active_users(proposal_id)
    return {
        "proposal_id": proposal_id,
        "active_users": users,
        "count": len(users)
    }


# =============================================================================
# Ingestion Progress WebSocket
# Implements RF-01: Real-time ingestion progress updates
# =============================================================================

# Store active ingestion connections
from typing import Dict, Set
import json
import asyncio

_ingestion_connections: Dict[str, Set[WebSocket]] = {}


@router.websocket("/ingestion/{job_id}")
async def ingestion_progress(
    websocket: WebSocket,
    job_id: str,
    token: Optional[str] = Query(None),
):
    """
    WebSocket endpoint for real-time ingestion job progress.
    
    Connect to receive live updates about an ingestion job:
    - Processing status changes
    - File progress updates
    - PII detection counts
    - Completion/failure notifications
    
    Query params:
        - token: JWT access token for authentication (optional in dev)
    
    Message format (server -> client):
    {
        "type": "progress_update",
        "data": {
            "status": "processing",
            "progress_percent": 45.5,
            "current_file": "data.csv",
            "processed_files": 5,
            "total_files": 10,
            "pii_count": 23,
            "message": "Processing data.csv..."
        }
    }
    """
    # Accept connection
    await websocket.accept()
    
    # Add to job connections
    if job_id not in _ingestion_connections:
        _ingestion_connections[job_id] = set()
    _ingestion_connections[job_id].add(websocket)
    
    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "data": {
                "job_id": job_id,
                "message": "Connected to ingestion progress stream",
            }
        })
        
        # Keep connection alive and handle client messages
        while True:
            try:
                # Wait for client messages (ping/pong, etc.)
                data = await websocket.receive_json()
                
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                    
            except WebSocketDisconnect:
                break
            except Exception:
                # Ignore invalid messages
                pass
                
    finally:
        # Remove from connections
        if job_id in _ingestion_connections:
            _ingestion_connections[job_id].discard(websocket)
            if not _ingestion_connections[job_id]:
                del _ingestion_connections[job_id]


async def broadcast_ingestion_progress(job_id: str, data: dict) -> None:
    """
    Broadcast progress update to all connected clients for a job.
    Called by ManageIngestionUseCase during processing.
    """
    if job_id not in _ingestion_connections:
        return
    
    message = {
        "type": "progress_update",
        "data": data,
    }
    
    disconnected = set()
    
    for websocket in _ingestion_connections[job_id]:
        try:
            await websocket.send_json(message)
        except Exception:
            disconnected.add(websocket)
    
    # Clean up disconnected
    for ws in disconnected:
        _ingestion_connections[job_id].discard(ws)


def get_ingestion_websocket_manager():
    """
    Get a simple interface for broadcasting ingestion progress.
    Used by ManageIngestionUseCase.
    """
    class IngestionWebSocketManager:
        async def broadcast_to_job(self, job_id: str, data: dict) -> None:
            await broadcast_ingestion_progress(job_id, data)
    
    return IngestionWebSocketManager()

