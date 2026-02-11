/**
 * ComposerToolbar Component
 *
 * Action buttons row for the message composer:
 * - Attach file
 * - Record microphone
 * - Record camera
 * - Record screen (with browser capability check)
 * - Record system audio (with browser capability check)
 * - Send button
 *
 * Implements RF-08: Communications and collaboration
 */
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  PaperClipIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  PaperAirplaneIcon,
  ComputerDesktopIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';
import { RecordingType } from '@/components/features/communications/types';

interface BrowserCapabilities {
  supportsScreenCapture: boolean;
  supportsSystemAudio: boolean;
}

interface ComposerToolbarProps {
  disabled: boolean;
  isSending: boolean;
  isRecording: boolean;
  recordingType: RecordingType;
  browserCapabilities: BrowserCapabilities;
  canSend: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStartRecording: (type: RecordingType) => void;
  onStopRecording: () => void;
  onSend: () => void;
}

export default function ComposerToolbar({
  disabled,
  isSending,
  isRecording,
  recordingType,
  browserCapabilities,
  canSend,
  fileInputRef,
  onFileSelect,
  onStartRecording,
  onStopRecording,
  onSend,
}: ComposerToolbarProps) {
  const t = useTranslations('communications');

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        {/* Attach file */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={onFileSelect}
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
          onClick={() => isRecording && recordingType === 'microphone' ? onStopRecording() : onStartRecording('microphone')}
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
          onClick={() => isRecording && recordingType === 'camera' ? onStopRecording() : onStartRecording('camera')}
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
          onClick={() => isRecording && recordingType === 'screen' ? onStopRecording() : onStartRecording('screen')}
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
          onClick={() => isRecording && recordingType === 'systemAudio' ? onStopRecording() : onStartRecording('systemAudio')}
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
        onClick={onSend}
        disabled={disabled || isSending || isRecording || !canSend}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        title={t('send') || 'Send message'}
      >
        <PaperAirplaneIcon className="w-5 h-5" />
        <span className="hidden sm:inline">{t('send') || 'Send'}</span>
      </button>
    </div>
  );
}
