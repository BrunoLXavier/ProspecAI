/**
 * Communications Module Types
 * 
 * Shared types for communications components including recording functionality.
 * Implements RF-08: Communications and collaboration
 */

// ─── Thread ──────────────────────────────────────────────────────────────────

/**
 * Canonical Thread interface shared by all communications views.
 * Previously duplicated in CommunicationsList, Board, Table, Timeline.
 */
export interface Thread {
  id: string;
  subject?: string;
  preview?: string;
  last_message_at?: string;
  created_at?: string;
  linked_entity_type?: string | null;
  linked_entity_id?: string | null;
  is_auto_created?: boolean;
  auto_created_confirmed?: boolean;
  participant_count?: number;
}

/**
 * Participant in a communication thread
 */
export interface Participant {
  id: string;
  name: string;
  email?: string;
}

/**
 * Common filter parameters for communications views.
 * All views should accept these to stay in sync with the page‑level FilterPanel.
 */
export interface CommunicationsFilters {
  search?: string;
  showAutoCreated?: boolean;
}

// ─── Recording ───────────────────────────────────────────────────────────────

/**
 * Recording types available in the message composer
 * - microphone: Audio recording from microphone only
 * - camera: Video recording with camera and microphone
 * - screen: Screen capture with system audio and microphone
 * - systemAudio: System audio only (no microphone)
 */
export type RecordingType = 'microphone' | 'camera' | 'screen' | 'systemAudio' | null;

/**
 * Media type for transcription and attachments
 */
export type MediaType = 'audio' | 'video';

/**
 * Attachment preview for the message composer
 */
export interface AttachmentPreview {
  file: File;
  previewUrl?: string;
  type: 'document' | 'image' | 'audio' | 'video';
  originalBlob?: Blob; // Store original blob for transcription
}

/**
 * Draft data stored in backend and localStorage
 */
export interface DraftData {
  body: string;
  attachments: Array<{ name: string; type: string; size: number }>;
  lastUpdated: string;
}
