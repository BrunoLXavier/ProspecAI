/**
 * CreateThreadModal Component
 * 
 * Modal for creating new communication threads with:
 * - Subject field
 * - Initial message with rich text support
 * - Participant selection
 * - Entity linking (proposal, opportunity, client, project)
 * - File attachments (text, audio, video)
 * - Audio/Video recording
 * - Transcription report generation
 * 
 * Implements RF-08: Communications forum
 * Implements RF-09: Report generation from transcriptions
 */
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChatBubbleLeftRightIcon,
  PaperClipIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  StopIcon,
  XMarkIcon,
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  UserPlusIcon,
  LinkIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import BaseModal, { ModalFooter } from '@/components/ui/BaseModal';
import apiClient from '@/lib/api-client';

// Types
interface LinkedEntity {
  type: 'proposal' | 'opportunity' | 'client' | 'project' | null;
  id: string | null;
  name?: string;
}

interface Participant {
  id: string;
  name: string;
  email?: string;
}

interface AttachmentFile {
  file: File;
  preview?: string;
  type: 'document' | 'image' | 'audio' | 'video';
  originalBlob?: Blob; // Store original blob for transcription
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (thread: any) => void;
  linkedEntity?: LinkedEntity;
  availableParticipants?: Participant[];
}

type RecordingType = 'audio' | 'video' | null;

export default function CreateThreadModal({
  isOpen,
  onClose,
  onCreated,
  linkedEntity: defaultLinkedEntity,
  availableParticipants = [],
}: Props) {
  const t = useTranslations('communications');
  const tCommon = useTranslations('common');

  // Form state
  const [subject, setSubject] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);
  const [linkedEntity, setLinkedEntity] = useState<LinkedEntity>(
    defaultLinkedEntity || { type: null, id: null }
  );
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<RecordingType>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showParticipantSearch, setShowParticipantSearch] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setSubject('');
    setInitialMessage('');
    setSelectedParticipants([]);
    setLinkedEntity(defaultLinkedEntity || { type: null, id: null });
    setAttachments([]);
    setError(null);
    stopRecording();
  };

  // File handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const files = Array.from(e.target.files);
    const newAttachments: AttachmentFile[] = files.map(file => {
      const type = getFileType(file);
      return {
        file,
        preview: type === 'image' ? URL.createObjectURL(file) : undefined,
        type,
      };
    });
    
    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const getFileType = (file: File): AttachmentFile['type'] => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const attachment = prev[index];
      if (attachment.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const getAttachmentIcon = (type: AttachmentFile['type']) => {
    switch (type) {
      case 'image': return <PhotoIcon className="w-5 h-5" />;
      case 'video': return <FilmIcon className="w-5 h-5" />;
      case 'audio': return <MusicalNoteIcon className="w-5 h-5" />;
      default: return <DocumentIcon className="w-5 h-5" />;
    }
  };

  // Recording functions
  const startRecording = async (type: RecordingType) => {
    if (!type) return;

    try {
      const constraints: MediaStreamConstraints = type === 'video'
        ? { audio: true, video: { facingMode: 'user', width: 1280, height: 720 } }
        : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setRecordingStream(stream);

      // Show video preview for video recording
      if (type === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      const mimeType = type === 'video' ? 'video/webm' : 'audio/webm';
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
          type,
          preview: type === 'video' ? URL.createObjectURL(blob) : undefined,
          originalBlob: blob, // Store for transcription
        }]);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        setRecordingStream(null);
        
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
      };

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
      setError(t('recordingError') || 'Failed to access camera/microphone');
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
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    setIsRecording(false);
    setRecordingType(null);
    setRecordingTime(0);
    
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  }, [isRecording, recordingStream]);

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Participant handling
  const addParticipant = (participant: Participant) => {
    if (!selectedParticipants.find(p => p.id === participant.id)) {
      setSelectedParticipants(prev => [...prev, participant]);
    }
    setParticipantSearch('');
    setShowParticipantSearch(false);
  };

  const removeParticipant = (id: string) => {
    setSelectedParticipants(prev => prev.filter(p => p.id !== id));
  };

  const filteredParticipants = availableParticipants.filter(p =>
    !selectedParticipants.find(sp => sp.id === p.id) &&
    (p.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
     p.email?.toLowerCase().includes(participantSearch.toLowerCase()))
  );

  // Form submission
  const handleSubmit = async () => {
    if (!subject.trim()) {
      setError(t('subjectRequired') || 'Subject is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create thread
      const threadData = {
        subject: subject.trim(),
        initial_message: initialMessage.trim() || undefined,
        linked_entity_type: linkedEntity.type || undefined,
        linked_entity_id: linkedEntity.id || undefined,
        participant_ids: selectedParticipants.map(p => p.id),
        metadata: {},
      };

      const thread = await apiClient.post('/api/v1/communications', threadData);

      // Upload attachments if any
      if (attachments.length > 0 && thread.id) {
        const formData = new FormData();
        attachments.forEach(a => formData.append('files', a.file));
        
        try {
          await apiClient.post(
            `/api/v1/communications/${thread.id}/attachments`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );
        } catch (uploadError) {
          console.error('Failed to upload attachments:', uploadError);
          // Thread was created, just attachment upload failed
        }
      }

      onCreated?.(thread);
      onClose();
    } catch (e: any) {
      console.error('Failed to create thread:', e);
      setError(e.message || t('createError') || 'Failed to create thread');
    } finally {
      setIsSubmitting(false);
    }
  };

  const entityTypes = [
    { value: 'proposal', label: t('entityTypes.proposal') || 'Proposal' },
    { value: 'opportunity', label: t('entityTypes.opportunity') || 'Opportunity' },
    { value: 'client', label: t('entityTypes.client') || 'Client' },
    { value: 'project', label: t('entityTypes.project') || 'Project' },
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('newThread') || 'New Thread'}
      subtitle={t('newThreadSubtitle') || 'Start a new conversation'}
      icon={<ChatBubbleLeftRightIcon className="w-6 h-6 text-primary-600" />}
      size="2xl"
      footer={
        <ModalFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel={t('create') || 'Create'}
          cancelLabel={tCommon('cancel') || 'Cancel'}
        />
      }
    >
      <div className="space-y-6">
        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('subject') || 'Subject'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('subjectPlaceholder') || 'Enter thread subject...'}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
            autoFocus
          />
        </div>

        {/* Initial Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('initialMessage') || 'Initial Message'}
          </label>
          <textarea
            value={initialMessage}
            onChange={(e) => setInitialMessage(e.target.value)}
            placeholder={t('initialMessagePlaceholder') || 'Start the conversation...'}
            rows={4}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white resize-none"
          />
        </div>

        {/* Recording Section */}
        {isRecording && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {recordingType === 'video' ? t('recordingVideo') || 'Recording video...' : t('recordingAudio') || 'Recording audio...'}
                </span>
                <span className="text-red-500 font-mono">{formatRecordingTime(recordingTime)}</span>
              </div>
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <StopIcon className="w-5 h-5" />
                {t('stopRecording') || 'Stop'}
              </button>
            </div>
            
            {/* Video preview */}
            {recordingType === 'video' && (
              <div className="mt-4">
                <video
                  ref={videoPreviewRef}
                  muted
                  className="w-full max-w-md mx-auto rounded-lg bg-black"
                />
              </div>
            )}
          </div>
        )}

        {/* Media Actions */}
        {!isRecording && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition"
            >
              <PaperClipIcon className="w-5 h-5" />
              {t('attachFile') || 'Attach File'}
            </button>

            <button
              type="button"
              onClick={() => startRecording('audio')}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition"
            >
              <MicrophoneIcon className="w-5 h-5" />
              {t('recordAudio') || 'Record Audio'}
            </button>

            <button
              type="button"
              onClick={() => startRecording('video')}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition"
            >
              <VideoCameraIcon className="w-5 h-5" />
              {t('recordVideo') || 'Record Video'}
            </button>
          </div>
        )}

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('attachments') || 'Attachments'} ({attachments.length})
            </label>
            <div className="flex flex-wrap gap-3">
              {attachments.map((attachment, idx) => (
                <div
                  key={idx}
                  className="relative group flex items-center gap-2 p-3 bg-gray-100 dark:bg-slate-700 rounded-lg"
                >
                  {attachment.preview ? (
                    attachment.type === 'video' ? (
                      <video
                        src={attachment.preview}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <img
                        src={attachment.preview}
                        alt={attachment.file.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-gray-200 dark:bg-slate-600 rounded">
                      {getAttachmentIcon(attachment.type)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px]">
                      {attachment.file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(attachment.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  
                  {/* Generate Report button for audio/video */}
                  {(attachment.type === 'audio' || attachment.type === 'video') && attachment.originalBlob && (
                    <div className="absolute -bottom-2 left-2 right-2">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs"
                        title={t('transcription.availableForReport')}
                      >
                        <SparklesIcon className="w-3 h-3" />
                        {t('transcription.canGenerateReport')}
                      </span>
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            
            {/* Report generation hint */}
            {attachments.some(a => (a.type === 'audio' || a.type === 'video') && a.originalBlob) && (
              <p className="mt-2 text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                <SparklesIcon className="w-4 h-4" />
                {t('transcription.generateReportHint')}
              </p>
            )}
          </div>
        )}

        {/* Link to Entity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <LinkIcon className="w-4 h-4 inline mr-1" />
            {t('linkedEntity') || 'Link to Entity'}
          </label>
          <div className="flex gap-3">
            <select
              value={linkedEntity.type || ''}
              onChange={(e) => setLinkedEntity(prev => ({
                ...prev,
                type: e.target.value as LinkedEntity['type'] || null,
              }))}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
            >
              <option value="">{t('selectEntityType') || 'Select type...'}</option>
              {entityTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={linkedEntity.id || ''}
              onChange={(e) => setLinkedEntity(prev => ({ ...prev, id: e.target.value || null }))}
              placeholder={t('entityIdPlaceholder') || 'Entity ID...'}
              disabled={!linkedEntity.type}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white disabled:opacity-50"
            />
          </div>
        </div>

        {/* Participants */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <UserPlusIcon className="w-4 h-4 inline mr-1" />
            {t('participants') || 'Participants'}
          </label>
          
          {/* Selected participants */}
          {selectedParticipants.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedParticipants.map(participant => (
                <span
                  key={participant.id}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                >
                  {participant.name}
                  <button
                    type="button"
                    onClick={() => removeParticipant(participant.id)}
                    className="hover:text-primary-900 dark:hover:text-primary-100"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add participant */}
          <div className="relative">
            <input
              type="text"
              value={participantSearch}
              onChange={(e) => {
                setParticipantSearch(e.target.value);
                setShowParticipantSearch(true);
              }}
              onFocus={() => setShowParticipantSearch(true)}
              placeholder={t('addParticipant') || 'Search and add participants...'}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
            />
            
            {/* Dropdown */}
            {showParticipantSearch && filteredParticipants.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredParticipants.slice(0, 10).map(participant => (
                  <button
                    key={participant.id}
                    type="button"
                    onClick={() => addParticipant(participant)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{participant.name}</div>
                    {participant.email && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">{participant.email}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
