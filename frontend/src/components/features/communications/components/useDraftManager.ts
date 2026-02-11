/**
 * useDraftManager Hook
 *
 * Manages message draft persistence:
 * - Auto-save with debounce to backend + localStorage fallback
 * - Load on mount from backend with localStorage fallback
 * - Clear on send
 *
 * Implements RF-08: Communications and collaboration
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';

interface DraftData {
  body: string;
  attachments: Array<{ name: string; type: string; size: number }>;
  lastUpdated: string;
}

const DRAFT_SAVE_DEBOUNCE_MS = 1500;
const LOCAL_STORAGE_KEY_PREFIX = 'prospecai_draft_';

interface UseDraftManagerOptions {
  threadId: string;
  body: string;
  attachments: Array<{ file: File }>;
}

export default function useDraftManager({
  threadId,
  body,
  attachments,
}: UseDraftManagerOptions) {
  const [draftStatus, setDraftStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [initialBody, setInitialBody] = useState('');
  const draftTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);

  // Load draft on mount / threadId change
  useEffect(() => {
    hasLoadedRef.current = false;
    loadDraft();
  }, [threadId]);

  // Auto-save draft on body change
  useEffect(() => {
    // Skip auto-save for the initial load
    if (!hasLoadedRef.current) return;

    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current);
    }

    if (body.trim().length > 0) {
      setDraftStatus('unsaved');
      draftTimeoutRef.current = setTimeout(() => {
        saveDraft();
      }, DRAFT_SAVE_DEBOUNCE_MS);
    }

    return () => {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
    };
  }, [body]);

  const loadDraft = async () => {
    try {
      const res = await apiClient.get(`/api/v1/communications/${threadId}/draft`);
      if (res && res.body) {
        setInitialBody(res.body);
        setDraftStatus('saved');
        hasLoadedRef.current = true;
        return;
      }
    } catch {
      const localDraft = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${threadId}`);
      if (localDraft) {
        try {
          const parsed: DraftData = JSON.parse(localDraft);
          setInitialBody(parsed.body || '');
          setDraftStatus('saved');
        } catch {
          // Ignore parse errors
        }
      }
    }
    hasLoadedRef.current = true;
  };

  const saveDraft = async () => {
    if (!body.trim()) return;

    setDraftStatus('saving');

    const draftData: DraftData = {
      body,
      attachments: attachments.map(a => ({ name: a.file.name, type: (a.file as File).type, size: a.file.size })),
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${threadId}`, JSON.stringify(draftData));

    try {
      await apiClient.put(`/api/v1/communications/${threadId}/draft`, {
        body,
        attachments: draftData.attachments,
      });
      setDraftStatus('saved');
    } catch {
      setDraftStatus('saved');
    }
  };

  const clearDraft = useCallback(async () => {
    localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${threadId}`);
    try {
      await apiClient.delete(`/api/v1/communications/${threadId}/draft`);
    } catch {
      // Ignore errors
    }
  }, [threadId]);

  return {
    draftStatus,
    initialBody,
    clearDraft,
  };
}
