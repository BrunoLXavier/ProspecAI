/**
 * MessageComposer Component
 * 
 * Rich message composer orchestrator. Rendering is delegated to:
 * - RecordingPreview: live recording indicators (video/audio)
 * - AttachmentGrid: attachment thumbnails and actions
 * - ComposerToolbar: action buttons row
 * 
 * Recording logic lives in useMediaRecorder hook.
 * Draft persistence lives in useDraftManager hook.
 * 
 * Implements RF-08: Communications and collaboration
 * Implements RF-09: Report generation from transcriptions
 */
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';
import TranscriptionReportModal from './TranscriptionReportModal';
import RichTextEditor from './RichTextEditor';
import RecordingPreview from './RecordingPreview';
import AttachmentGrid, { type AttachmentPreview } from './AttachmentGrid';
import ComposerToolbar from './ComposerToolbar';
import useMediaRecorder from './useMediaRecorder';
import useDraftManager from './useDraftManager';
import { getBrowserCapabilities } from '@/utils/browser-compatibility';

interface Props {
  threadId: string;
  onMessageSent: (message: any) => void;
  disabled?: boolean;
  /** Callback to notify parent about unsent attachments state */
  onHasUnsentAttachmentsChange?: (hasUnsent: boolean) => void;
}

export default function MessageComposer({ 
  threadId, 
  onMessageSent, 
  disabled = false,
  onHasUnsentAttachmentsChange 
}: Props) {
  const t = useTranslations('communications');
  
  const [browserCapabilities] = useState(() => getBrowserCapabilities());
  
  const [body, setBody] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [isSending, setIsSending] = useState(false);
  
  // Transcription report modal
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);
  const [transcriptionBlob, setTranscriptionBlob] = useState<Blob | null>(null);
  const [transcriptionMediaType, setTranscriptionMediaType] = useState<'audio' | 'video'>('audio');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Draft persistence
  const { draftStatus, initialBody, clearDraft } = useDraftManager({
    threadId,
    body,
    attachments,
  });

  // Load initial body from draft
  useEffect(() => {
    if (initialBody) {
      setBody(initialBody);
    }
  }, [initialBody]);

  // Media recording
  const {
    isRecording,
    recordingType,
    recordingTime,
    startRecording,
    stopRecording,
    formatRecordingTime,
  } = useMediaRecorder({
    videoPreviewRef,
    onRecordingComplete: (attachment) => {
      setAttachments(prev => [...prev, attachment]);
    },
  });

  // Notify parent about unsent attachments state
  useEffect(() => {
    onHasUnsentAttachmentsChange?.(attachments.length > 0);
  }, [attachments.length, onHasUnsentAttachmentsChange]);

  // Warn user before leaving if there are unsent attachments
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (attachments.length > 0) {
        e.preventDefault();
        e.returnValue = t('unsentAttachmentsWarning') || 'You have unsent recordings/attachments. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [attachments.length, t]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [body]);

  const handleSend = async () => {
    if (!body.trim() && attachments.length === 0) return;
    
    setIsSending(true);
    
    try {
      const message = await apiClient.post(`/api/v1/communications/${threadId}/messages`, {
        body: bodyHtml || body.trim(),
        message_type: 'text',
      });
      
      if (attachments.length > 0) {
        const formData = new FormData();
        attachments.forEach(a => formData.append('files', a.file));
        
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
      
      attachments.forEach(a => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
      setBody('');
      setBodyHtml('');
      setAttachments([]);
      await clearDraft();
      
      onMessageSent(message);
    } catch (e) {
      console.error('Failed to send message:', e);
    } finally {
      setIsSending(false);
    }
  };

  const getFileType = (file: File): AttachmentPreview['type'] => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newAttachments: AttachmentPreview[] = files.map(file => {
      const type = getFileType(file);
      return {
        file,
        previewUrl: type === 'image' || type === 'video' ? URL.createObjectURL(file) : undefined,
        type,
      };
    });
    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const attachment = prev[index];
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleGenerateReport = (blob: Blob, mediaType: 'audio' | 'video') => {
    setTranscriptionBlob(blob);
    setTranscriptionMediaType(mediaType);
    setShowTranscriptionModal(true);
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 p-4">
      <RecordingPreview
        isRecording={isRecording}
        recordingType={recordingType}
        recordingTime={recordingTime}
        videoPreviewRef={videoPreviewRef}
        onStopRecording={stopRecording}
        formatRecordingTime={formatRecordingTime}
      />

      <AttachmentGrid
        attachments={attachments}
        onRemoveAttachment={removeAttachment}
        onGenerateReport={handleGenerateReport}
      />

      <div className="flex flex-col gap-3">
        <div className="relative">
          <RichTextEditor
            value={bodyHtml}
            onChange={(html, plainText) => {
              setBodyHtml(html);
              setBody(plainText);
            }}
            placeholder={t('writeMessage') || 'Write a message...'}
            disabled={disabled || isSending || isRecording}
            minHeight="80px"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          
          {/* Draft status indicator */}
          <div className="absolute right-3 top-1.5 text-xs text-gray-400 z-10">
            {draftStatus === 'saving' && (t('saving') || 'Saving...')}
            {draftStatus === 'saved' && body.trim() && (t('draftSaved') || 'Draft saved')}
          </div>
        </div>

        <ComposerToolbar
          disabled={disabled}
          isSending={isSending}
          isRecording={isRecording}
          recordingType={recordingType}
          browserCapabilities={browserCapabilities}
          canSend={!!(body.trim() || attachments.length > 0)}
          fileInputRef={fileInputRef}
          onFileSelect={handleFileSelect}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onSend={handleSend}
        />
      </div>

      <div className="text-xs text-gray-400 text-center">
        {t('sendHint') || 'Ctrl+Enter to send'}
      </div>
      
      {showTranscriptionModal && transcriptionBlob && (
        <TranscriptionReportModal
          isOpen={showTranscriptionModal}
          onClose={() => {
            setShowTranscriptionModal(false);
            setTranscriptionBlob(null);
          }}
          threadId={threadId}
          mediaBlob={transcriptionBlob}
          mediaType={transcriptionMediaType}
          onReportGenerated={(reportUrl, messageId) => {
            onMessageSent({ id: messageId, type: 'report' });
          }}
        />
      )}
    </div>
  );
}
