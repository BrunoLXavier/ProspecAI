/**
 * RecordingPreview Component
 *
 * Displays live recording indicators for video (camera/screen)
 * and audio (microphone/system audio) recording modes.
 *
 * Implements RF-08: Communications and collaboration
 */
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { StopIcon } from '@heroicons/react/24/outline';
import { RecordingType } from '@/components/features/communications/types';

interface RecordingPreviewProps {
  isRecording: boolean;
  recordingType: RecordingType;
  recordingTime: number;
  videoPreviewRef: React.RefObject<HTMLVideoElement>;
  onStopRecording: () => void;
  formatRecordingTime: (seconds: number) => string;
}

export default function RecordingPreview({
  isRecording,
  recordingType,
  recordingTime,
  videoPreviewRef,
  onStopRecording,
  formatRecordingTime,
}: RecordingPreviewProps) {
  const t = useTranslations('communications');

  if (!isRecording) return null;

  // Video preview for camera and screen recording
  if (recordingType === 'camera' || recordingType === 'screen') {
    return (
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
          onClick={onStopRecording}
          className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
        >
          <StopIcon className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Audio recording indicator (microphone or system audio)
  if (recordingType === 'microphone' || recordingType === 'systemAudio') {
    return (
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
          onClick={onStopRecording}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <StopIcon className="w-4 h-4" />
          {t('stop') || 'Stop'}
        </button>
      </div>
    );
  }

  return null;
}
