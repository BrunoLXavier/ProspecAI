/**
 * CollaboratorPresence Component
 * Shows active collaborators in real-time
 * Implements RF-08: Collaboration visibility
 */
'use client';

import { useState } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/solid';

interface Collaborator {
  user_id: string;
  username: string;
  color: string;
  cursor_position?: { line: number; column: number };
}

interface CollaboratorPresenceProps {
  collaborators: Collaborator[];
  maxVisible?: number;
}

export default function CollaboratorPresence({
  collaborators,
  maxVisible = 4,
}: CollaboratorPresenceProps) {
  const [showAll, setShowAll] = useState(false);

  if (!collaborators?.length) return null;

  const visibleCollaborators = showAll
    ? collaborators
    : collaborators.slice(0, maxVisible);
  const hiddenCount = collaborators.length - maxVisible;

  return (
    <div className="flex items-center">
      {/* Avatar Stack */}
      <div className="flex -space-x-2">
        {visibleCollaborators.map((collab) => (
          <div
            key={collab.user_id}
            className="relative group"
            title={collab.username}
          >
            {/* Avatar Circle */}
            <div
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium shadow-sm"
              style={{ backgroundColor: collab.color }}
            >
              {collab.username.charAt(0).toUpperCase()}
            </div>

            {/* Online indicator */}
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white"
              style={{ backgroundColor: '#10B981' }}
            />

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {collab.username}
              {collab.cursor_position && (
                <span className="text-gray-400 ml-1">
                  linha {collab.cursor_position.line}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Hidden count badge */}
        {hiddenCount > 0 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-xs font-medium hover:bg-gray-300 transition-colors"
          >
            +{hiddenCount}
          </button>
        )}
      </div>

      {/* Label */}
      <span className="ml-3 text-sm text-gray-600">
        {collaborators.length} {collaborators.length === 1 ? 'pessoa' : 'pessoas'} editando
      </span>

      {/* Collapse button */}
      {showAll && hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(false)}
          className="ml-2 text-xs text-blue-600 hover:underline"
        >
          Mostrar menos
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Cursor Overlay Component for Editor
// =============================================================================

interface RemoteCursor {
  user_id: string;
  username: string;
  color: string;
  position: { line: number; column: number };
}

interface RemoteCursorsOverlayProps {
  cursors: RemoteCursor[];
  lineHeight?: number;
  charWidth?: number;
}

export function RemoteCursorsOverlay({
  cursors,
  lineHeight = 20,
  charWidth = 8,
}: RemoteCursorsOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {cursors.map((cursor) => (
        <div
          key={cursor.user_id}
          className="absolute transition-all duration-100"
          style={{
            top: (cursor.position.line - 1) * lineHeight,
            left: cursor.position.column * charWidth,
          }}
        >
          {/* Cursor line */}
          <div
            className="w-0.5 h-5 animate-pulse"
            style={{ backgroundColor: cursor.color }}
          />

          {/* Username label */}
          <div
            className="absolute top-0 left-1 px-1.5 py-0.5 text-white text-xs rounded whitespace-nowrap"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.username}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Selection Highlight Component
// =============================================================================

interface RemoteSelection {
  user_id: string;
  color: string;
  start: { line: number; column: number };
  end: { line: number; column: number };
}

interface RemoteSelectionsOverlayProps {
  selections: RemoteSelection[];
  lineHeight?: number;
  charWidth?: number;
}

export function RemoteSelectionsOverlay({
  selections,
  lineHeight = 20,
  charWidth = 8,
}: RemoteSelectionsOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {selections.map((sel) => {
        // Simple single-line selection rendering
        const width = (sel.end.column - sel.start.column) * charWidth;
        const height = (sel.end.line - sel.start.line + 1) * lineHeight;

        return (
          <div
            key={sel.user_id}
            className="absolute opacity-20"
            style={{
              backgroundColor: sel.color,
              top: (sel.start.line - 1) * lineHeight,
              left: sel.start.column * charWidth,
              width: Math.max(width, charWidth),
              height: lineHeight,
            }}
          />
        );
      })}
    </div>
  );
}
