/**
 * MessageBubble Component
 * 
 * Displays a single message with:
 * - Author info and timestamp
 * - Message body with proper formatting
 * - Attachments preview with media player for audio/video
 * - Human-in-the-loop confirmation badge for auto-created messages
 * - Email metadata display for ingested emails
 * 
 * Implements RF-08: Communications with human-in-the-loop
 */
'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  UserCircleIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import MediaPlayer from './MediaPlayer';
import apiClient from '@/lib/api-client';

interface Attachment {
  id?: string;
  filename: string;
  url?: string;
  content_type?: string;
  size?: number;
}

interface EmailMetadata {
  from_address?: string;
  to_addresses?: string[];
  cc_addresses?: string[];
  subject?: string;
  received_at?: string;
  message_id?: string;
}

interface Message {
  id: string;
  thread_id: string;
  author: string;
  author_name?: string;
  body: string;
  message_type: 'text' | 'email' | 'meeting_notes' | 'system';
  created_at: string;
  attachments?: Attachment[];
  is_auto_created?: boolean;
  auto_created_confirmed?: boolean;
  email_metadata?: EmailMetadata;
}

interface Props {
  message: Message;
  isOwnMessage?: boolean;
  currentUserName?: string;
  onConfirm?: (messageId: string, confirmed: boolean) => void;
}

export default function MessageBubble({ message, isOwnMessage = false, currentUserName, onConfirm }: Props) {
  const t = useTranslations('communications');
  const [showEmailDetails, setShowEmailDetails] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Generate download URL for attachments using the proxy endpoint
  const getDownloadUrl = (attachment: Attachment) => {
    if (!attachment.id) {
      // Fallback to direct URL if no ID (shouldn't happen for saved attachments)
      return attachment.url || '#';
    }
    // Use the backend proxy endpoint that handles MinIO internally
    return `/api/v1/communications/${message.thread_id}/attachments/${attachment.id}/download`;
  };

  // Handle authenticated download
  const handleDownload = async (e: React.MouseEvent, attachment: Attachment) => {
    e.preventDefault();
    if (!attachment.id || downloadingId) return;
    
    setDownloadingId(attachment.id);
    try {
      const response = await apiClient.get(
        `/api/v1/communications/${message.thread_id}/attachments/${attachment.id}/download`,
        { responseType: 'blob' }
      );
      
      // Create download link
      const blob = new Blob([response.data], { 
        type: attachment.content_type || 'application/octet-stream' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getAttachmentIcon = (contentType?: string) => {
    if (!contentType) return <DocumentIcon className="w-5 h-5" />;
    if (contentType.startsWith('image/')) return <PhotoIcon className="w-5 h-5" />;
    if (contentType.startsWith('video/')) return <FilmIcon className="w-5 h-5" />;
    if (contentType.startsWith('audio/')) return <MusicalNoteIcon className="w-5 h-5" />;
    return <DocumentIcon className="w-5 h-5" />;
  };

  const handleConfirm = async (confirmed: boolean) => {
    setIsConfirming(true);
    try {
      await apiClient.post(`/api/v1/communications/${message.thread_id}/messages/${message.id}/confirm`, {
        confirmed,
      });
      onConfirm?.(message.id, confirmed);
    } catch (e) {
      console.error('Failed to confirm message:', e);
    } finally {
      setIsConfirming(false);
    }
  };

  const renderMessageTypeIcon = () => {
    switch (message.message_type) {
      case 'email':
        return <EnvelopeIcon className="w-4 h-4 text-blue-500" />;
      case 'meeting_notes':
        return <DocumentIcon className="w-4 h-4 text-purple-500" />;
      case 'system':
        return <CheckCircleIcon className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const needsConfirmation = message.is_auto_created && !message.auto_created_confirmed;

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[75%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
        {/* Author and timestamp header */}
        <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          {!isOwnMessage && (
            <UserCircleIcon className="w-5 h-5 text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isOwnMessage 
              ? (currentUserName || t('you'))
              : (message.author_name || (message.author && !message.author.includes('-') ? message.author : t('unknown')))}
          </span>
          {renderMessageTypeIcon()}
          <span className="text-xs text-gray-400">
            {formatDate(message.created_at)}
          </span>
        </div>

        {/* Message bubble */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isOwnMessage
              ? 'bg-gray-700 dark:bg-gray-600 text-white rounded-br-md'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-bl-md'
          } ${needsConfirmation ? 'border-2 border-amber-400' : ''}`}
        >
          {/* Human-in-the-loop warning badge */}
          {needsConfirmation && (
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-amber-400/30">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
              <span className={`text-xs font-medium ${isOwnMessage ? 'text-amber-200' : 'text-amber-600 dark:text-amber-400'}`}>
                {t('autoCreatedNeedsConfirmation') || 'Auto-created - Needs confirmation'}
              </span>
            </div>
          )}

          {/* Confirmed badge */}
          {message.is_auto_created && message.auto_created_confirmed && (
            <div className="flex items-center gap-1 mb-2">
              <CheckBadgeIcon className="w-4 h-4 text-green-500" />
              <span className={`text-xs ${isOwnMessage ? 'text-green-200' : 'text-green-600 dark:text-green-400'}`}>
                {t('autoCreatedConfirmed') || 'Auto-created (Confirmed)'}
              </span>
            </div>
          )}

          {/* Email metadata */}
          {message.message_type === 'email' && message.email_metadata && (
            <div className={`mb-3 pb-3 border-b ${isOwnMessage ? 'border-primary-500' : 'border-gray-200 dark:border-gray-600'}`}>
              <button
                onClick={() => setShowEmailDetails(!showEmailDetails)}
                className="flex items-center gap-1 text-xs font-medium"
              >
                <EnvelopeIcon className="w-4 h-4" />
                {message.email_metadata.subject || t('noSubject')}
                {showEmailDetails ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
              </button>
              
              {showEmailDetails && (
                <div className={`mt-2 text-xs space-y-1 ${isOwnMessage ? 'text-primary-200' : 'text-gray-500 dark:text-gray-400'}`}>
                  <div><strong>{t('from')}:</strong> {message.email_metadata.from_address}</div>
                  <div><strong>{t('to')}:</strong> {message.email_metadata.to_addresses?.join(', ')}</div>
                  {message.email_metadata.cc_addresses && message.email_metadata.cc_addresses.length > 0 && (
                    <div><strong>{t('cc')}:</strong> {message.email_metadata.cc_addresses.join(', ')}</div>
                  )}
                  {message.email_metadata.received_at && (
                    <div><strong>{t('received')}:</strong> {formatDate(message.email_metadata.received_at)}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Message body - renders HTML for rich text */}
          <div 
            className={`prose prose-sm max-w-none break-words
              prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
              prose-a:underline
              prose-strong:font-bold prose-em:italic
              prose-code:px-1 prose-code:rounded
              ${isOwnMessage 
                ? 'text-white prose-headings:text-white prose-p:text-white prose-li:text-white prose-a:text-blue-200 prose-strong:text-white prose-code:bg-white/20' 
                : 'dark:prose-invert prose-a:text-inherit prose-code:bg-black/10 dark:prose-code:bg-white/10'}`}
            dangerouslySetInnerHTML={{ __html: message.body }}
          />

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200/20 space-y-2">
              {message.attachments.map((att, idx) => {
                const contentType = att.content_type || '';
                const isAudio = contentType.startsWith('audio/');
                const isVideo = contentType.startsWith('video/');
                const isImage = contentType.startsWith('image/');

                // Render media player for audio/video
                if ((isAudio || isVideo) && att.url) {
                  return (
                    <div key={att.id || idx} className="mt-2">
                      <MediaPlayer
                        src={getDownloadUrl(att)}
                        type={isVideo ? 'video' : 'audio'}
                        filename={att.filename}
                      />
                    </div>
                  );
                }

                // Render image preview
                if (isImage && att.url) {
                  return (
                    <a
                      key={att.id || idx}
                      href={getDownloadUrl(att)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={getDownloadUrl(att)}
                        alt={att.filename}
                        className="max-w-full max-h-64 rounded-lg object-contain"
                      />
                      <span className="text-xs opacity-70 mt-1 block">{att.filename}</span>
                    </a>
                  );
                }

                // Default file download link
                return (
                  <button
                    key={att.id || idx}
                    onClick={(e) => handleDownload(e, att)}
                    disabled={downloadingId === att.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer ${
                      isOwnMessage
                        ? 'bg-blue-500 hover:bg-blue-400'
                        : 'bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500'
                    } ${downloadingId === att.id ? 'opacity-50' : ''}`}
                  >
                    {getAttachmentIcon(att.content_type)}
                    <span className="flex-1 text-sm truncate">{att.filename}</span>
                    {att.size && (
                      <span className="text-xs opacity-70">{formatFileSize(att.size)}</span>
                    )}
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Confirmation actions for auto-created messages */}
        {needsConfirmation && (
          <div className={`flex gap-2 mt-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <button
              onClick={() => handleConfirm(true)}
              disabled={isConfirming}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50"
            >
              {t('confirm') || 'Confirm'}
            </button>
            <button
              onClick={() => handleConfirm(false)}
              disabled={isConfirming}
              className="px-3 py-1 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
            >
              {t('reject') || 'Reject'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
