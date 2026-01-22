/**
 * MessageComposer Component
 * 
 * Rich message composer with:
 * - Draft auto-save (backend + localStorage fallback)
 * - Attachment support (files, audio, video)
 * - Audio recording for meetings
 * - Human-in-the-loop visual indicators
 * 
 * Implements RF-08: Communications and collaboration
 */
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { 
  PaperClipIcon, 
  MicrophoneIcon, 
  StopIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
} from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import { useMutation } from '@tanstack/react-query';

interface Props {
  threadId: string;
  onMessageSent: (message: any) => void;
  disabled?: boolean;
}

interface DraftData {
  body: string;
  attachments: Array<{ name: string; type: string; size: number }>;
  lastUpdated: string;
}

const DRAFT_SAVE_DEBOUNCE_MS = 1500;
const LOCAL_STORAGE_KEY_PREFIX = 'prospecai_draft_';

export default function MessageComposer({ threadId, onMessageSent, disabled = false }: Props) {
  const t = useTranslations('communications');
  
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const draftTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load draft on mount
  useEffect(() => {
    loadDraft();
  }, [threadId]);

  // Auto-save draft on body change
  useEffect(() => {
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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [body]);

  const loadDraft = async () => {
    try {
      // Try backend first
      const res = await apiClient.get(`/api/v1/communications/${threadId}/draft`);
      if (res && res.body) {
        setBody(res.body);
        setDraftStatus('saved');
        return;
      }
    } catch {
      // Fallback to localStorage
      const localDraft = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${threadId}`);
      if (localDraft) {
        try {
          const parsed: DraftData = JSON.parse(localDraft);
          setBody(parsed.body || '');
          setDraftStatus('saved');
        } catch {
          // Ignore parse errors
        }
      }
    }
  };

  const saveDraft = async () => {
    if (!body.trim()) return;
    
    setDraftStatus('saving');
    
    const draftData: DraftData = {
      body,
      attachments: attachments.map(f => ({ name: f.name, type: f.type, size: f.size })),
      lastUpdated: new Date().toISOString(),
    };
    
    // Save to localStorage immediately
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${threadId}`, JSON.stringify(draftData));
    
    try {
      // Try backend save
      await apiClient.put(`/api/v1/communications/${threadId}/draft`, {
        body,
        attachments: draftData.attachments,
      });
      setDraftStatus('saved');
    } catch {
      // localStorage save is enough
      setDraftStatus('saved');
    }
  };

  const clearDraft = async () => {
    localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${threadId}`);
    try {
      await apiClient.delete(`/api/v1/communications/${threadId}/draft`);
    } catch {
      // Ignore errors
    }
  };

  const handleSend = async () => {
    if (!body.trim() && attachments.length === 0) return;
    
    setIsSending(true);
    
    try {
      // Send message
      const message = await apiClient.post(`/api/v1/communications/${threadId}/messages`, {
        body: body.trim(),
        message_type: 'text',
      });
      
      // Upload attachments if any
      if (attachments.length > 0) {
        const formData = new FormData();
        attachments.forEach(f => formData.append('files', f));
        
        try {
          const uploadRes = await apiClient.post(
            `/api/v1/communications/${threadId}/attachments?message_id=${message.id}`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );
          message.attachments = uploadRes.uploaded || [];
        } catch (e) {
          console.error('Attachment upload failed:', e);
        }
      }
      
      // Clear state
      setBody('');
      setAttachments([]);
      await clearDraft();
      
      onMessageSent(message);
    } catch (e) {
      console.error('Failed to send message:', e);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        setAttachments(prev => [...prev, file]);
        
        // Stop tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.error('Failed to start recording:', e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith('image/')) return <PhotoIcon className="w-4 h-4" />;
    if (type.startsWith('video/')) return <FilmIcon className="w-4 h-4" />;
    if (type.startsWith('audio/')) return <MusicalNoteIcon className="w-4 h-4" />;
    return <DocumentIcon className="w-4 h-4" />;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 p-4">
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-slate-700 rounded-lg text-sm"
            >
              {getFileIcon(file)}
              <span className="max-w-[150px] truncate">{file.name}</span>
              <button
                onClick={() => removeAttachment(idx)}
                className="p-0.5 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="mb-3 flex items-center gap-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium">{t('recording') || 'Recording...'}</span>
          <span className="text-sm">{formatRecordingTime(recordingTime)}</span>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('writeMessage') || 'Write a message...'}
            disabled={disabled || isSending}
            rows={1}
            className="w-full px-4 py-2.5 pr-24 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white disabled:opacity-50"
          />
          
          {/* Draft status indicator */}
          <div className="absolute right-3 bottom-2.5 text-xs text-gray-400">
            {draftStatus === 'saving' && (t('saving') || 'Saving...')}
            {draftStatus === 'saved' && body.trim() && (t('draftSaved') || 'Draft saved')}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Attach file */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isSending}
            className="p-2.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50"
            title={t('attach') || 'Attach file'}
          >
            <PaperClipIcon className="w-5 h-5" />
          </button>

          {/* Record audio */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || isSending}
            className={`p-2.5 rounded-lg disabled:opacity-50 ${
              isRecording
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
            title={isRecording ? (t('stopRecording') || 'Stop recording') : (t('startRecording') || 'Record audio')}
          >
            {isRecording ? <StopIcon className="w-5 h-5" /> : <MicrophoneIcon className="w-5 h-5" />}
          </button>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={disabled || isSending || (!body.trim() && attachments.length === 0)}
            className="p-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('send') || 'Send message'}
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Keyboard shortcut hint */}
      <div className="mt-2 text-xs text-gray-400">
        {t('sendHint') || 'Press Enter to send, Shift+Enter for new line'}
      </div>
    </div>
  );
}
