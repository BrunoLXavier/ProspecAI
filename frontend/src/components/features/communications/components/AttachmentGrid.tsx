/**
 * AttachmentGrid Component
 *
 * Displays a grid of attachment previews with:
 * - Image thumbnails
 * - Video previews with play overlay
 * - Document/audio icons
 * - Remove button on hover
 * - Generate transcription report button for audio/video with originalBlob
 *
 * Implements RF-08: Communications and collaboration
 * Implements RF-09: Report generation from transcriptions
 */
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  XMarkIcon,
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  PlayIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

export interface AttachmentPreview {
  file: File;
  previewUrl?: string;
  type: 'document' | 'image' | 'audio' | 'video';
  originalBlob?: Blob;
}

interface AttachmentGridProps {
  attachments: AttachmentPreview[];
  onRemoveAttachment: (index: number) => void;
  onGenerateReport: (blob: Blob, mediaType: 'audio' | 'video') => void;
}

function getAttachmentIcon(type: AttachmentPreview['type']) {
  switch (type) {
    case 'image': return <PhotoIcon className="w-5 h-5" />;
    case 'video': return <FilmIcon className="w-5 h-5" />;
    case 'audio': return <MusicalNoteIcon className="w-5 h-5" />;
    default: return <DocumentIcon className="w-5 h-5" />;
  }
}

export default function AttachmentGrid({
  attachments,
  onRemoveAttachment,
  onGenerateReport,
}: AttachmentGridProps) {
  const t = useTranslations('communications');

  if (attachments.length === 0) return null;

  return (
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
            onClick={() => onRemoveAttachment(idx)}
            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>

          {/* Generate report button for audio/video */}
          {(attachment.type === 'audio' || attachment.type === 'video') && attachment.originalBlob && (
            <button
              onClick={() => {
                onGenerateReport(attachment.originalBlob!, attachment.type as 'audio' | 'video');
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
  );
}
