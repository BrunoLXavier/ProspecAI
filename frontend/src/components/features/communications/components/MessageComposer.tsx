/**
 * MessageComposer Component
 * 
 * Rich message composer with:
 * - Draft auto-save (backend + localStorage fallback)
 * - Attachment support (files, audio, video)
 * - Multiple recording modes: microphone, camera, screen, system audio
 * - Transcription report generation from recordings
 * - Human-in-the-loop visual indicators
 * - Media preview before sending
 * - Browser compatibility detection for advanced recording features
 * 
 * Implements RF-08: Communications and collaboration
 * Implements RF-09: Report generation from transcriptions
 */
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { 
  PaperClipIcon, 
  MicrophoneIcon,
  VideoCameraIcon,
  StopIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  PlayIcon,
  DocumentTextIcon,
  SparklesIcon,
  ComputerDesktopIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import { useMutation } from '@tanstack/react-query';
import TranscriptionReportModal from './TranscriptionReportModal';
import RichTextEditor from './RichTextEditor';
import { RecordingType } from '@/types/features/communications';
import { getBrowserCapabilities, getSupportedBrowsers } from '@/utils/browserCompatibility';

interface Props {
  threadId: string;
  onMessageSent: (message: any) => void;
  disabled?: boolean;
  /** Callback to notify parent about unsent attachments state */
  onHasUnsentAttachmentsChange?: (hasUnsent: boolean) => void;
}

interface DraftData {
  body: string;
  attachments: Array<{ name: string; type: string; size: number }>;
  lastUpdated: string;
}

interface AttachmentPreview {
  file: File;
  previewUrl?: string;
  type: 'document' | 'image' | 'audio' | 'video';
  originalBlob?: Blob; // Store original blob for transcription
}

const DRAFT_SAVE_DEBOUNCE_MS = 1500;
const LOCAL_STORAGE_KEY_PREFIX = 'prospecai_draft_';

export default function MessageComposer({ 
  threadId, 
  onMessageSent, 
  disabled = false,
  onHasUnsentAttachmentsChange 
}: Props) {
  const t = useTranslations('communications');
  
  // Browser capabilities for screen/system audio recording
  const [browserCapabilities] = useState(() => getBrowserCapabilities());
  
  const [body, setBody] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<RecordingType>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  // Secondary stream for microphone when doing screen recording
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [showMediaPreview, setShowMediaPreview] = useState<string | null>(null);
  
  // Transcription report modal
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);
  const [transcriptionBlob, setTranscriptionBlob] = useState<Blob | null>(null);
  const [transcriptionMediaType, setTranscriptionMediaType] = useState<'audio' | 'video'>('audio');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const draftTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);


  // Load draft on mount
  useEffect(() => {
    loadDraft();
  }, [threadId]);

  // Notify parent about unsent attachments state
  useEffect(() => {
    onHasUnsentAttachmentsChange?.(attachments.length > 0);
  }, [attachments.length, onHasUnsentAttachmentsChange]);

  // Warn user before leaving if there are unsent attachments (including recordings)
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
      attachments: attachments.map(a => ({ name: a.file.name, type: a.file.type, size: a.file.size })),
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
      // Send message with HTML content
      const message = await apiClient.post(`/api/v1/communications/${threadId}/messages`, {
        body: bodyHtml || body.trim(),
        message_type: 'text',
      });
      
      // Upload attachments if any
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
      
      // Clear state and revoke preview URLs
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

  /**
   * Merges multiple audio tracks into a single MediaStream using AudioContext
   */
  const mergeAudioTracks = (streams: MediaStream[]): MediaStream => {
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const destination = audioContext.createMediaStreamDestination();
    
    streams.forEach(stream => {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(destination);
      }
    });
    
    return destination.stream;
  };

  const startRecording = async (type: RecordingType) => {
    if (!type) return;
    
    try {
      let stream: MediaStream;
      let micStream: MediaStream | null = null;
      let mimeType: string;
      let attachmentType: 'audio' | 'video';
      
      switch (type) {
        case 'microphone':
          // Simple microphone recording
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mimeType = 'audio/webm';
          attachmentType = 'audio';
          break;
          
        case 'camera':
          // Camera with microphone
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: { facingMode: 'user', width: 1280, height: 720 }
          });
          mimeType = 'video/webm';
          attachmentType = 'video';
          break;
          
        case 'screen':
          // Screen capture with system audio + microphone
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true // System audio (only works in Chromium)
          });
          
          // Also capture microphone
          try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setMicrophoneStream(micStream);
            
            // Merge system audio and microphone audio
            const audioStreams = [displayStream];
            if (displayStream.getAudioTracks().length > 0 || micStream.getAudioTracks().length > 0) {
              audioStreams.push(micStream);
            }
            const mergedAudio = mergeAudioTracks(audioStreams);
            
            // Create combined stream with display video + merged audio
            stream = new MediaStream([
              ...displayStream.getVideoTracks(),
              ...mergedAudio.getAudioTracks()
            ]);
          } catch {
            // If microphone fails, use display stream only
            stream = displayStream;
          }
          
          mimeType = 'video/webm';
          attachmentType = 'video';
          break;
          
        case 'systemAudio':
          // System audio only (requires getDisplayMedia with minimal video as workaround)
          const systemStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: 1, height: 1 }, // Minimal video required by browser API
            audio: true
          });
          
          // Extract only audio tracks
          const audioTracks = systemStream.getAudioTracks();
          if (audioTracks.length === 0) {
            throw new Error('No system audio track available');
          }
          
          // Stop video tracks immediately - we only need audio
          systemStream.getVideoTracks().forEach(track => track.stop());
          
          stream = new MediaStream(audioTracks);
          mimeType = 'audio/webm';
          attachmentType = 'audio';
          break;
          
        default:
          return;
      }
      
      setRecordingStream(stream);

      // Show video preview for camera and screen recording
      if ((type === 'camera' || type === 'screen') && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      
      recordingChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordingChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: mimeType });
        const fileName = `${type}-recording-${Date.now()}.webm`;
        const file = new File([blob], fileName, { type: mimeType });
        
        setAttachments(prev => [...prev, {
          file,
          type: attachmentType,
          previewUrl: attachmentType === 'video' ? URL.createObjectURL(blob) : undefined,
          originalBlob: blob, // Store for transcription
        }]);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        if (micStream) {
          micStream.getTracks().forEach(track => track.stop());
        }
        setRecordingStream(null);
        setMicrophoneStream(null);
        
        // Close AudioContext if used
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
      };
      
      // Handle screen share stop by user (clicking "Stop sharing" in browser)
      if (type === 'screen' || type === 'systemAudio') {
        stream.getVideoTracks().forEach(track => {
          track.onended = () => stopRecording();
        });
        stream.getAudioTracks().forEach(track => {
          track.onended = () => stopRecording();
        });
      }
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingType(type);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.error('Failed to start recording:', e);
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    if (recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop());
      setRecordingStream(null);
    }
    
    // Also stop microphone stream if used for screen recording
    if (microphoneStream) {
      microphoneStream.getTracks().forEach(track => track.stop());
      setMicrophoneStream(null);
    }
    
    // Close AudioContext if used
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsRecording(false);
    setRecordingType(null);
      
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  }, [isRecording, recordingStream, microphoneStream]);

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAttachmentIcon = (type: AttachmentPreview['type']) => {
    switch (type) {
      case 'image': return <PhotoIcon className="w-5 h-5" />;
      case 'video': return <FilmIcon className="w-5 h-5" />;
      case 'audio': return <MusicalNoteIcon className="w-5 h-5" />;
      default: return <DocumentIcon className="w-5 h-5" />;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 p-4">
      {/* Video preview for camera and screen recording */}
      {isRecording && (recordingType === 'camera' || recordingType === 'screen') && (
        <div className="mb-4 relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoPreviewRef}
            muted
            className="w-full max-h-48 object-contain"
          />
          <div className="absolute bottom-2 left-2 flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-full text-sm">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            {recordingType === 'camera' 
              ? (t('recordingCamera') || 'Recording camera') 
              : (t('recordingScreen') || 'Recording screen')
            } - {formatRecordingTime(recordingTime)}
          </div>
          <button
            onClick={stopRecording}
            className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
          >
            <StopIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Audio recording indicator (microphone or system audio) */}
      {isRecording && (recordingType === 'microphone' || recordingType === 'systemAudio') && (
        <div className="mb-3 flex items-center justify-between gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="font-medium">
              {recordingType === 'microphone' 
                ? (t('recordingMicrophone') || 'Recording microphone...') 
                : (t('recordingSystemAudio') || 'Recording system audio...')
              }
            </span>
            <span className="font-mono">{formatRecordingTime(recordingTime)}</span>
          </div>
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <StopIcon className="w-4 h-4" />
            {t('stop') || 'Stop'}
          </button>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {attachments.map((attachment, idx) => (
            <div
              key={idx}
              className="relative group bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden"
            >
              {/* Media preview */}
              {attachment.previewUrl && attachment.type === 'image' && (
                <img
                  src={attachment.previewUrl}
                  alt={attachment.file.name}
                  className="w-full h-20 object-cover"
                />
              )}
              {attachment.previewUrl && attachment.type === 'video' && (
                <div className="relative h-20">
                  <video
                    src={attachment.previewUrl}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <PlayIcon className="w-8 h-8 text-white" />
                  </div>
                </div>
              )}
              {!attachment.previewUrl && (
                <div className="h-20 flex items-center justify-center">
                  {getAttachmentIcon(attachment.type)}
                </div>
              )}
              
              {/* Info overlay */}
              <div className="p-2">
                <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                  {attachment.file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(attachment.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              
              {/* Remove button */}
              <button
                onClick={() => removeAttachment(idx)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
              
              {/* Generate report button for audio/video */}
              {(attachment.type === 'audio' || attachment.type === 'video') && attachment.originalBlob && (
                <button
                  onClick={() => {
                    setTranscriptionBlob(attachment.originalBlob!);
                    setTranscriptionMediaType(attachment.type as 'audio' | 'video');
                    setShowTranscriptionModal(true);
                  }}
                  className="absolute bottom-12 left-1 right-1 p-1.5 bg-purple-600 text-white text-xs rounded flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition"
                  title={t('transcription.generateReport')}
                >
                  <SparklesIcon className="w-3 h-3" />
                  {t('transcription.report')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {/* Rich Text Editor */}
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

        {/* Action buttons row */}
        <div className="flex items-center justify-between">
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
            disabled={disabled || isSending || isRecording}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50"
            title={t('attachFile')}
          >
            <PaperClipIcon className="w-5 h-5" />
          </button>

          {/* Record microphone */}
          <button
            onClick={() => isRecording && recordingType === 'microphone' ? stopRecording() : startRecording('microphone')}
            disabled={disabled || isSending || (isRecording && recordingType !== 'microphone')}
            className={`p-2 rounded-lg disabled:opacity-50 ${
              isRecording && recordingType === 'microphone'
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
            title={t('recordMicrophone') || 'Record microphone'}
          >
            <MicrophoneIcon className="w-5 h-5" />
          </button>

          {/* Record camera */}
          <button
            onClick={() => isRecording && recordingType === 'camera' ? stopRecording() : startRecording('camera')}
            disabled={disabled || isSending || (isRecording && recordingType !== 'camera')}
            className={`p-2 rounded-lg disabled:opacity-50 ${
              isRecording && recordingType === 'camera'
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
            title={t('recordCamera') || 'Record camera'}
          >
            <VideoCameraIcon className="w-5 h-5" />
          </button>

          {/* Record screen with audio */}
          <button
            onClick={() => isRecording && recordingType === 'screen' ? stopRecording() : startRecording('screen')}
            disabled={disabled || isSending || (isRecording && recordingType !== 'screen') || !browserCapabilities.supportsScreenCapture}
            className={`p-2 rounded-lg disabled:opacity-50 ${
              isRecording && recordingType === 'screen'
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                : !browserCapabilities.supportsScreenCapture
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
            title={!browserCapabilities.supportsScreenCapture 
              ? (t('screenRecordingNotSupported') || 'Screen recording not supported in this browser')
              : (t('recordScreen') || 'Record screen with audio')
            }
          >
            <ComputerDesktopIcon className="w-5 h-5" />
          </button>

          {/* Record system audio */}
          <button
            onClick={() => isRecording && recordingType === 'systemAudio' ? stopRecording() : startRecording('systemAudio')}
            disabled={disabled || isSending || (isRecording && recordingType !== 'systemAudio') || !browserCapabilities.supportsSystemAudio}
            className={`p-2 rounded-lg disabled:opacity-50 ${
              isRecording && recordingType === 'systemAudio'
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                : !browserCapabilities.supportsSystemAudio
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
            title={!browserCapabilities.supportsSystemAudio 
              ? (t('systemAudioNotSupported') || 'System audio capture available only in Chrome, Edge and Opera')
              : (t('recordSystemAudio') || 'Record computer audio')
            }
          >
            <SpeakerWaveIcon className="w-5 h-5" />
          </button>
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={disabled || isSending || isRecording || (!body.trim() && attachments.length === 0)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title={t('send') || 'Send message'}
          >
            <PaperAirplaneIcon className="w-5 h-5" />
            <span className="hidden sm:inline">{t('send') || 'Send'}</span>
          </button>
        </div>
      </div>

      {/* Keyboard shortcut hint */}
      <div className="text-xs text-gray-400 text-center">
        {t('sendHint') || 'Ctrl+Enter to send'}
      </div>
      
      {/* Transcription Report Modal */}
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
            // Refresh thread to show new message
            onMessageSent({ id: messageId, type: 'report' });
          }}
        />
      )}
    </div>
  );
}
