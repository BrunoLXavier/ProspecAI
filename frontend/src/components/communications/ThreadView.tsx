/**
 * ThreadView Component
 * 
 * Enhanced thread view with:
 * - Real-time message loading
 * - MessageBubble components with human-in-the-loop support
 * - MessageComposer with draft auto-save
 * - Meeting minutes generation
 * - Participant management
 * - Thread metadata display
 * 
 * Implements RF-08: Communications and collaboration
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  DocumentTextIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import MeetingMinutesCard from './MeetingMinutesCard';

// Union type for timeline items (messages + meeting minutes)
interface TimelineItem {
  type: 'message' | 'meeting_minutes';
  id: string;
  created_at: string;
  data: Message | MeetingMinutes;
}

interface Thread {
  id: string;
  subject?: string;
  linked_entity_type?: string;
  linked_entity_id?: string;
  is_auto_created?: boolean;
  auto_created_confirmed?: boolean;
  participant_count?: number;
  created_at?: string;
}

interface Message {
  id: string;
  thread_id: string;
  author: string;
  author_name?: string;
  body: string;
  message_type: 'text' | 'email' | 'meeting_notes' | 'system';
  created_at: string;
  attachments?: any[];
  is_auto_created?: boolean;
  auto_created_confirmed?: boolean;
  email_metadata?: any;
}

interface MeetingMinutes {
  id: string;
  title?: string;
  content?: string;
  status: string;
  generated_at?: string;
  created_at: string;
}

interface Props {
  threadId: string;
  currentUserId?: string;
  currentUserName?: string;
  onThreadUpdate?: (thread: Thread) => void;
  onEdit?: (thread: Thread) => void;
  onDelete?: (threadId: string) => void;
}

export default function ThreadView({ threadId, currentUserId, currentUserName, onThreadUpdate, onEdit, onDelete }: Props) {
  const t = useTranslations('communications');
  
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [meetingMinutes, setMeetingMinutes] = useState<MeetingMinutes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingMinutes, setGeneratingMinutes] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load thread and messages
  const loadData = useCallback(async () => {
    if (!threadId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [threadRes, messagesRes, minutesRes] = await Promise.all([
        apiClient.get(`/api/v1/communications/${threadId}`),
        apiClient.get(`/api/v1/communications/${threadId}/messages`),
        apiClient.get(`/api/v1/communications/${threadId}/minutes`).catch(() => []),
      ]);
      
      setThread(threadRes);
      setMessages(Array.isArray(messagesRes) ? messagesRes : (messagesRes.items || []));
      setMeetingMinutes(Array.isArray(minutesRes) ? minutesRes : []);
    } catch (e: any) {
      setError(e.message || 'Failed to load thread');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleMessageSent = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const handleMessageConfirm = (messageId: string, confirmed: boolean) => {
    setMessages(prev => prev.map(m => 
      m.id === messageId 
        ? { ...m, auto_created_confirmed: confirmed }
        : m
    ));
  };

  const handleConfirmThread = async (confirmed: boolean) => {
    if (!thread) return;
    
    try {
      await apiClient.post(`/api/v1/communications/${threadId}/confirm`, { confirmed });
      const updatedThread = { ...thread, auto_created_confirmed: confirmed };
      setThread(updatedThread);
      onThreadUpdate?.(updatedThread);
    } catch (e) {
      console.error('Failed to confirm thread:', e);
    }
  };

  const handleGenerateMinutes = async () => {
    if (!threadId) return;
    
    setGeneratingMinutes(true);
    try {
      const result = await apiClient.post(`/api/v1/communications/${threadId}/generate-meeting-minutes`, {
        title: `${t('meetingMinutes')} - ${new Date().toLocaleDateString()}`,
      });
      setMeetingMinutes(prev => [...prev, result]);
      // Minutes now appear inline in the timeline, no need to show separate panel
    } catch (e) {
      console.error('Failed to generate minutes:', e);
    } finally {
      setGeneratingMinutes(false);
    }
  };

  const unconfirmedCount = messages.filter(m => m.is_auto_created && !m.auto_created_confirmed).length;

  // Merge messages and meeting minutes into a single timeline sorted by date
  const timelineItems: TimelineItem[] = React.useMemo(() => {
    const items: TimelineItem[] = [];
    
    // Add messages
    messages.forEach(msg => {
      items.push({
        type: 'message',
        id: msg.id,
        created_at: msg.created_at,
        data: msg,
      });
    });
    
    // Add meeting minutes
    meetingMinutes.forEach(mm => {
      items.push({
        type: 'meeting_minutes',
        id: mm.id,
        created_at: mm.created_at,
        data: mm,
      });
    });
    
    // Sort by created_at
    items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    return items;
  }, [messages, meetingMinutes]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <ArrowPathIcon className="w-6 h-6 text-gray-400 animate-spin" />
        <span className="ml-2 text-gray-500">{t('loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-red-500">
        <ExclamationTriangleIcon className="w-8 h-8 mb-2" />
        <span>{error}</span>
        <button onClick={loadData} className="mt-2 text-sm text-primary-600 hover:underline">
          {t('retry') || 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
      {/* Thread header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {thread?.subject || t('untitled')}
            </h3>
            {thread?.linked_entity_type && thread?.linked_entity_id && (
              <a 
                href={`/${thread.linked_entity_type === 'proposal' ? 'proposals' : thread.linked_entity_type === 'client' ? 'crm' : thread.linked_entity_type === 'funding_source' ? 'funding' : thread.linked_entity_type === 'opportunity' ? 'opportunities' : thread.linked_entity_type}/${thread.linked_entity_id}`}
                className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800/50 rounded-full transition-colors"
              >
                <span>📎</span>
                {t(`entityTypes.${thread.linked_entity_type}`) || thread.linked_entity_type}
                <span>→</span>
              </a>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {thread?.participant_count && (
              <div className="flex items-center text-xs text-gray-500">
                <UserGroupIcon className="w-4 h-4 mr-1" />
                {thread.participant_count}
              </div>
            )}
            
            {/* Edit button */}
            {onEdit && thread && (
              <button
                onClick={() => onEdit(thread)}
                className="p-1.5 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
                title={t('editThread') || 'Edit thread'}
              >
                <PencilSquareIcon className="w-4 h-4" />
              </button>
            )}
            
            {/* Delete button */}
            {onDelete && (
              <button
                onClick={() => onDelete(threadId)}
                className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
                title={t('deleteThread') || 'Delete thread'}
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={handleGenerateMinutes}
              disabled={generatingMinutes}
              className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {generatingMinutes ? t('generating') : t('generateMinutes')}
            </button>
          </div>
        </div>
        
        {/* Auto-created thread warning */}
        {thread?.is_auto_created && !thread?.auto_created_confirmed && (
          <div className="mt-2 flex items-center justify-between px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span className="text-sm">{t('threadAutoCreated') || 'This thread was auto-created from an email'}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleConfirmThread(true)}
                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                {t('confirmThread') || 'Confirm'}
              </button>
              <button
                onClick={() => handleConfirmThread(false)}
                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                {t('rejectThread') || 'Reject'}
              </button>
            </div>
          </div>
        )}
        
        {thread?.is_auto_created && thread?.auto_created_confirmed && (
          <div className="mt-2 flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckBadgeIcon className="w-4 h-4" />
            <span className="text-xs">{t('threadConfirmed') || 'Thread confirmed'}</span>
          </div>
        )}
        
        {/* Unconfirmed messages warning */}
        {unconfirmedCount > 0 && (
          <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded text-amber-700 dark:text-amber-400">
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span className="text-xs">
              {t('unconfirmedMessages', { count: unconfirmedCount }) || `${unconfirmedCount} message(s) need confirmation`}
            </span>
          </div>
        )}
      </div>



      {/* Messages and meeting minutes container */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4">
        {timelineItems.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            {t('noMessages') || 'No messages yet'}
          </div>
        ) : (
          <>
            {timelineItems.map((item) => {
              if (item.type === 'meeting_minutes') {
                return (
                  <MeetingMinutesCard
                    key={`minutes-${item.id}`}
                    minutes={item.data as MeetingMinutes}
                  />
                );
              }
              
              const message = item.data as Message;
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwnMessage={message.author === currentUserId}
                  currentUserName={currentUserName}
                  onConfirm={handleMessageConfirm}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message composer */}
      <MessageComposer
        threadId={threadId}
        onMessageSent={handleMessageSent}
      />
    </div>
  );
}
