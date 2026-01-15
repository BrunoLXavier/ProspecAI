"""
WebSocket Manager for Real-Time Collaboration
Implements RF-08: Real-time proposal collaboration
"""
import asyncio
import json
from typing import Dict, Set, Optional, Any
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum

from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel


class MessageType(str, Enum):
    """WebSocket message types"""
    # Connection events
    JOIN = "join"
    LEAVE = "leave"
    PRESENCE = "presence"
    
    # Editing events
    CURSOR_MOVE = "cursor_move"
    SELECTION_CHANGE = "selection_change"
    CONTENT_CHANGE = "content_change"
    
    # Collaboration events
    LOCK_REQUEST = "lock_request"
    LOCK_GRANTED = "lock_granted"
    LOCK_RELEASED = "lock_released"
    LOCK_DENIED = "lock_denied"
    
    # Notifications
    COMMENT_ADDED = "comment_added"
    STATUS_CHANGED = "status_changed"
    ERROR = "error"


@dataclass
class UserPresence:
    """Represents a connected user's presence"""
    user_id: str
    username: str
    color: str  # Assigned cursor color
    cursor_position: Optional[Dict[str, int]] = None
    selection: Optional[Dict[str, Any]] = None
    last_active: datetime = None
    
    def __post_init__(self):
        if self.last_active is None:
            self.last_active = datetime.now()


class DocumentLock:
    """Manages section-level locking for collaborative editing"""
    def __init__(self):
        self.locks: Dict[str, str] = {}  # section_id -> user_id
        self.lock_timeout = 60  # seconds
        self.lock_times: Dict[str, datetime] = {}
    
    def acquire(self, section_id: str, user_id: str) -> bool:
        """Attempt to acquire lock on a section"""
        current_holder = self.locks.get(section_id)
        
        if current_holder is None:
            self.locks[section_id] = user_id
            self.lock_times[section_id] = datetime.now()
            return True
        
        if current_holder == user_id:
            self.lock_times[section_id] = datetime.now()
            return True
        
        # Check if lock has expired
        lock_time = self.lock_times.get(section_id)
        if lock_time and (datetime.now() - lock_time).total_seconds() > self.lock_timeout:
            self.locks[section_id] = user_id
            self.lock_times[section_id] = datetime.now()
            return True
        
        return False
    
    def release(self, section_id: str, user_id: str) -> bool:
        """Release lock on a section"""
        if self.locks.get(section_id) == user_id:
            del self.locks[section_id]
            del self.lock_times[section_id]
            return True
        return False
    
    def release_all(self, user_id: str):
        """Release all locks held by a user"""
        sections_to_release = [
            section_id for section_id, holder in self.locks.items()
            if holder == user_id
        ]
        for section_id in sections_to_release:
            del self.locks[section_id]
            if section_id in self.lock_times:
                del self.lock_times[section_id]


class ProposalRoom:
    """Manages a single proposal's collaboration room"""
    
    # Predefined colors for user cursors
    CURSOR_COLORS = [
        "#3B82F6",  # Blue
        "#EF4444",  # Red
        "#10B981",  # Green
        "#F59E0B",  # Yellow
        "#8B5CF6",  # Purple
        "#EC4899",  # Pink
        "#06B6D4",  # Cyan
        "#F97316",  # Orange
    ]
    
    def __init__(self, proposal_id: str):
        self.proposal_id = proposal_id
        self.connections: Dict[str, WebSocket] = {}  # user_id -> websocket
        self.presence: Dict[str, UserPresence] = {}
        self.document_lock = DocumentLock()
        self.color_index = 0
    
    def _assign_color(self) -> str:
        """Assign a unique cursor color to a user"""
        color = self.CURSOR_COLORS[self.color_index % len(self.CURSOR_COLORS)]
        self.color_index += 1
        return color
    
    async def connect(self, user_id: str, username: str, websocket: WebSocket):
        """Add a user to the room"""
        await websocket.accept()
        
        self.connections[user_id] = websocket
        self.presence[user_id] = UserPresence(
            user_id=user_id,
            username=username,
            color=self._assign_color()
        )
        
        # Notify others about new user
        await self.broadcast(
            MessageType.JOIN,
            {
                "user_id": user_id,
                "username": username,
                "color": self.presence[user_id].color
            },
            exclude=user_id
        )
        
        # Send current presence to new user
        await self.send_to_user(
            user_id,
            MessageType.PRESENCE,
            {
                "users": [
                    {
                        "user_id": p.user_id,
                        "username": p.username,
                        "color": p.color,
                        "cursor_position": p.cursor_position,
                        "selection": p.selection
                    }
                    for p in self.presence.values()
                ]
            }
        )
    
    async def disconnect(self, user_id: str):
        """Remove a user from the room"""
        if user_id in self.connections:
            del self.connections[user_id]
        
        if user_id in self.presence:
            del self.presence[user_id]
        
        # Release all locks held by this user
        self.document_lock.release_all(user_id)
        
        # Notify others
        await self.broadcast(
            MessageType.LEAVE,
            {"user_id": user_id}
        )
    
    async def send_to_user(self, user_id: str, message_type: MessageType, data: dict):
        """Send message to specific user"""
        if user_id in self.connections:
            try:
                await self.connections[user_id].send_json({
                    "type": message_type.value,
                    "data": data,
                    "timestamp": datetime.now().isoformat()
                })
            except Exception:
                await self.disconnect(user_id)
    
    async def broadcast(self, message_type: MessageType, data: dict, exclude: str = None):
        """Broadcast message to all users in room"""
        message = {
            "type": message_type.value,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        
        disconnected = []
        for user_id, websocket in self.connections.items():
            if user_id == exclude:
                continue
            try:
                await websocket.send_json(message)
            except Exception:
                disconnected.append(user_id)
        
        # Clean up disconnected users
        for user_id in disconnected:
            await self.disconnect(user_id)
    
    async def handle_message(self, user_id: str, message: dict):
        """Handle incoming WebSocket message"""
        msg_type = message.get("type")
        data = message.get("data", {})
        
        if msg_type == MessageType.CURSOR_MOVE.value:
            if user_id in self.presence:
                self.presence[user_id].cursor_position = data.get("position")
                self.presence[user_id].last_active = datetime.now()
            await self.broadcast(
                MessageType.CURSOR_MOVE,
                {"user_id": user_id, "position": data.get("position")},
                exclude=user_id
            )
        
        elif msg_type == MessageType.SELECTION_CHANGE.value:
            if user_id in self.presence:
                self.presence[user_id].selection = data.get("selection")
            await self.broadcast(
                MessageType.SELECTION_CHANGE,
                {"user_id": user_id, "selection": data.get("selection")},
                exclude=user_id
            )
        
        elif msg_type == MessageType.CONTENT_CHANGE.value:
            # Broadcast content changes (for operational transformation)
            await self.broadcast(
                MessageType.CONTENT_CHANGE,
                {
                    "user_id": user_id,
                    "changes": data.get("changes"),
                    "version": data.get("version")
                },
                exclude=user_id
            )
        
        elif msg_type == MessageType.LOCK_REQUEST.value:
            section_id = data.get("section_id")
            if self.document_lock.acquire(section_id, user_id):
                await self.send_to_user(
                    user_id,
                    MessageType.LOCK_GRANTED,
                    {"section_id": section_id}
                )
                await self.broadcast(
                    MessageType.LOCK_GRANTED,
                    {"section_id": section_id, "user_id": user_id},
                    exclude=user_id
                )
            else:
                holder = self.document_lock.locks.get(section_id)
                await self.send_to_user(
                    user_id,
                    MessageType.LOCK_DENIED,
                    {"section_id": section_id, "held_by": holder}
                )
        
        elif msg_type == MessageType.LOCK_RELEASED.value:
            section_id = data.get("section_id")
            if self.document_lock.release(section_id, user_id):
                await self.broadcast(
                    MessageType.LOCK_RELEASED,
                    {"section_id": section_id, "user_id": user_id}
                )
    
    def is_empty(self) -> bool:
        """Check if room has no connections"""
        return len(self.connections) == 0


class WebSocketManager:
    """Global manager for all WebSocket connections"""
    
    def __init__(self):
        self.rooms: Dict[str, ProposalRoom] = {}
    
    def get_or_create_room(self, proposal_id: str) -> ProposalRoom:
        """Get existing room or create new one"""
        if proposal_id not in self.rooms:
            self.rooms[proposal_id] = ProposalRoom(proposal_id)
        return self.rooms[proposal_id]
    
    async def connect(
        self,
        proposal_id: str,
        user_id: str,
        username: str,
        websocket: WebSocket
    ):
        """Connect user to proposal room"""
        room = self.get_or_create_room(proposal_id)
        await room.connect(user_id, username, websocket)
    
    async def disconnect(self, proposal_id: str, user_id: str):
        """Disconnect user from room"""
        if proposal_id in self.rooms:
            room = self.rooms[proposal_id]
            await room.disconnect(user_id)
            
            # Clean up empty rooms
            if room.is_empty():
                del self.rooms[proposal_id]
    
    async def handle_message(self, proposal_id: str, user_id: str, message: dict):
        """Route message to appropriate room"""
        if proposal_id in self.rooms:
            await self.rooms[proposal_id].handle_message(user_id, message)
    
    def get_active_users(self, proposal_id: str) -> list:
        """Get list of active users in a room"""
        if proposal_id in self.rooms:
            return [
                {
                    "user_id": p.user_id,
                    "username": p.username,
                    "color": p.color
                }
                for p in self.rooms[proposal_id].presence.values()
            ]
        return []


# Global singleton instance
websocket_manager = WebSocketManager()
