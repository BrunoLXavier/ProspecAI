/**
 * useProposalCollaboration Hook
 * Real-time collaboration for proposal editing
 * Implements RF-08: WebSocket-based collaboration
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getStoredAccessToken } from '@/contexts/AuthContext';

// =============================================================================
// Types
// =============================================================================

interface UserPresence {
  user_id: string;
  username: string;
  color: string;
  cursor_position?: { line: number; column: number };
  selection?: { start: number; end: number };
}

interface ContentChange {
  user_id: string;
  changes: any[];
  version: number;
}

interface LockInfo {
  section_id: string;
  user_id?: string;
}

type MessageType =
  | 'join'
  | 'leave'
  | 'presence'
  | 'cursor_move'
  | 'selection_change'
  | 'content_change'
  | 'lock_request'
  | 'lock_granted'
  | 'lock_released'
  | 'lock_denied'
  | 'comment_added'
  | 'status_changed'
  | 'error';

interface WebSocketMessage {
  type: MessageType;
  data: any;
  timestamp: string;
}

interface CollaborationState {
  isConnected: boolean;
  activeUsers: UserPresence[];
  lockedSections: Map<string, string>; // section_id -> user_id
  error: string | null;
}

// =============================================================================
// Hook
// =============================================================================

export function useProposalCollaboration(proposalId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const [state, setState] = useState<CollaborationState>({
    isConnected: false,
    activeUsers: [],
    lockedSections: new Map(),
    error: null,
  });

  // Event handlers
  const onUserJoin = useRef<((user: UserPresence) => void) | null>(null);
  const onUserLeave = useRef<((userId: string) => void) | null>(null);
  const onCursorMove = useRef<((userId: string, position: any) => void) | null>(null);
  const onContentChange = useRef<((change: ContentChange) => void) | null>(null);
  const onLockChange = useRef<((lock: LockInfo, granted: boolean) => void) | null>(null);

  // =============================================================================
  // Connection Management
  // =============================================================================

  const connect = useCallback(() => {
    if (!proposalId) return;

    const token = getStoredAccessToken();
    if (!token) {
      setState(prev => ({ ...prev, error: 'Not authenticated' }));
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const url = `${wsUrl}/ws/proposals/${proposalId}?token=${token}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected to proposal room:', proposalId);
        reconnectAttempts.current = 0;
        setState(prev => ({ ...prev, isConnected: true, error: null }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (e) {
          console.error('[WS] Failed to parse message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        setState(prev => ({ ...prev, error: 'Connection error' }));
      };

      ws.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code, event.reason);
        setState(prev => ({ ...prev, isConnected: false }));

        // Attempt reconnection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('[WS] Failed to connect:', error);
      setState(prev => ({ ...prev, error: 'Failed to connect' }));
    }
  }, [proposalId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    setState(prev => ({ ...prev, isConnected: false, activeUsers: [] }));
  }, []);

  // =============================================================================
  // Message Handling
  // =============================================================================

  const handleMessage = useCallback((message: WebSocketMessage) => {
    const { type, data } = message;

    switch (type) {
      case 'join':
        setState(prev => ({
          ...prev,
          activeUsers: [...prev.activeUsers, data as UserPresence],
        }));
        onUserJoin.current?.(data);
        break;

      case 'leave':
        setState(prev => ({
          ...prev,
          activeUsers: prev.activeUsers.filter(u => u.user_id !== data.user_id),
        }));
        onUserLeave.current?.(data.user_id);
        break;

      case 'presence':
        setState(prev => ({
          ...prev,
          activeUsers: data.users || [],
        }));
        break;

      case 'cursor_move':
        setState(prev => ({
          ...prev,
          activeUsers: prev.activeUsers.map(u =>
            u.user_id === data.user_id
              ? { ...u, cursor_position: data.position }
              : u
          ),
        }));
        onCursorMove.current?.(data.user_id, data.position);
        break;

      case 'selection_change':
        setState(prev => ({
          ...prev,
          activeUsers: prev.activeUsers.map(u =>
            u.user_id === data.user_id
              ? { ...u, selection: data.selection }
              : u
          ),
        }));
        break;

      case 'content_change':
        onContentChange.current?.(data);
        break;

      case 'lock_granted':
        setState(prev => {
          const newLocks = new Map(prev.lockedSections);
          newLocks.set(data.section_id, data.user_id);
          return { ...prev, lockedSections: newLocks };
        });
        onLockChange.current?.(data, true);
        break;

      case 'lock_released':
        setState(prev => {
          const newLocks = new Map(prev.lockedSections);
          newLocks.delete(data.section_id);
          return { ...prev, lockedSections: newLocks };
        });
        onLockChange.current?.(data, false);
        break;

      case 'lock_denied':
        onLockChange.current?.(data, false);
        break;

      case 'error':
        setState(prev => ({ ...prev, error: data.message }));
        break;
    }
  }, []);

  // =============================================================================
  // Sending Messages
  // =============================================================================

  const send = useCallback((type: MessageType, data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    }
  }, []);

  const sendCursorPosition = useCallback((position: { line: number; column: number }) => {
    send('cursor_move', { position });
  }, [send]);

  const sendSelection = useCallback((selection: { start: number; end: number }) => {
    send('selection_change', { selection });
  }, [send]);

  const sendContentChange = useCallback((changes: any[], version: number) => {
    send('content_change', { changes, version });
  }, [send]);

  const requestLock = useCallback((sectionId: string) => {
    send('lock_request', { section_id: sectionId });
  }, [send]);

  const releaseLock = useCallback((sectionId: string) => {
    send('lock_released', { section_id: sectionId });
  }, [send]);

  // =============================================================================
  // Lifecycle
  // =============================================================================

  useEffect(() => {
    if (proposalId) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [proposalId, connect, disconnect]);

  // =============================================================================
  // Return API
  // =============================================================================

  return {
    // State
    isConnected: state.isConnected,
    activeUsers: state.activeUsers,
    lockedSections: state.lockedSections,
    error: state.error,

    // Actions
    sendCursorPosition,
    sendSelection,
    sendContentChange,
    requestLock,
    releaseLock,
    reconnect: connect,
    disconnect,

    // Event Subscriptions
    setOnUserJoin: (fn: (user: UserPresence) => void) => { onUserJoin.current = fn; },
    setOnUserLeave: (fn: (userId: string) => void) => { onUserLeave.current = fn; },
    setOnCursorMove: (fn: (userId: string, position: any) => void) => { onCursorMove.current = fn; },
    setOnContentChange: (fn: (change: ContentChange) => void) => { onContentChange.current = fn; },
    setOnLockChange: (fn: (lock: LockInfo, granted: boolean) => void) => { onLockChange.current = fn; },
  };
}
