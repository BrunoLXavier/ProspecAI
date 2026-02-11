/**
 * CommunicationsList Component
 * 
 * Master-detail view for communication threads with:
 * - Thread list with search and filtering
 * - Thread preview with auto-created badges
 * - Selected thread detail view
 * - Create new thread functionality with modal
 * - Email ingestion configuration
 * 
 * Implements RF-08: Communications forum
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  FunnelIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import ThreadView from './ThreadView';
import CreateThreadModal from './CreateThreadModal';
import EmailIngestionConfig from './EmailIngestionConfig';

interface Thread {
  id: string;
  subject?: string;
  preview?: string;
  last_message_at?: string;
  linked_entity_type?: string;
  linked_entity_id?: string;
  is_auto_created?: boolean;
  auto_created_confirmed?: boolean;
  participant_count?: number;
  created_at?: string;
}

interface Participant {
  id: string;
  name: string;
  email?: string;
}

interface Props {
  items?: Thread[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  linkedEntityType?: string;
  linkedEntityId?: string;
  onCreateThread?: () => void;
  currentUserId?: string;
  availableParticipants?: Participant[];
  /** Optional external filters provided by parent (e.g. search text) */
  filters?: Record<string, any>;
  /** When incremented by parent, opens the create modal */
  createTrigger?: number;
  /** Notify parent when a new thread is created */
  onThreadCreated?: (thread: Thread) => void;
}

export default function CommunicationsList({
  items: propItems,
  selectedId: propSelected,
  onSelect: propOnSelect,
  linkedEntityType,
  linkedEntityId,
  onCreateThread,
  currentUserId,
  availableParticipants = [],
  filters,
  createTrigger,
  onThreadCreated,
}: Props) {
  const t = useTranslations('communications');
  
  const [items, setItems] = useState<Thread[] | null>(propItems || null);
  const [selectedId, setSelectedId] = useState<string | null>(propSelected || null);
  // Local inputs (used only if parent did not provide filters)
  const [localSearch, setLocalSearch] = useState('');
  const [localShowAutoCreated, setLocalShowAutoCreated] = useState(true);
  // Use external filters when provided, otherwise fallback to local state
  const searchQuery = filters && filters.search !== undefined ? filters.search : localSearch;
  const showAutoCreated = filters && filters.showAutoCreated !== undefined ? filters.showAutoCreated : localShowAutoCreated;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEmailConfig, setShowEmailConfig] = useState(false);

  // Open create modal when parent increments trigger
  useEffect(() => {
    if (typeof createTrigger === 'number') {
      setShowCreateModal(true);
    }
  }, [createTrigger]);

  // Fetch threads
  const loadThreads = async () => {
    if (propItems) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (linkedEntityType) params.set('linked_entity_type', linkedEntityType);
      if (linkedEntityId) params.set('linked_entity_id', linkedEntityId);
      if (searchQuery) params.set('search', searchQuery);
      params.set('include_auto_unconfirmed', String(showAutoCreated));
      
      const res = await apiClient.get(`/api/v1/communications?${params.toString()}`);
      setItems(res.items || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load threads');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, [propItems, linkedEntityType, linkedEntityId, showAutoCreated]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!propItems) {
        loadThreads();
      }
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [searchQuery, filters?.search, filters?.showAutoCreated]);

  const handleSelect = (id: string) => {
    if (propOnSelect) {
      propOnSelect(id);
    } else {
      setSelectedId(id);
    }
  };

  const handleThreadUpdate = (thread: Thread) => {
    setItems(prev => prev?.map(t => t.id === thread.id ? { ...t, ...thread } : t) || null);
  };

  const handleCreateThread = () => {
    if (onCreateThread) {
      onCreateThread();
    } else {
      setShowCreateModal(true);
    }
  };

  const handleThreadCreated = (thread: Thread) => {
    setItems(prev => prev ? [thread, ...prev] : [thread]);
    setSelectedId(thread.id);
    setShowCreateModal(false);
    if (onThreadCreated) onThreadCreated(thread);
  };

  // Filter items locally if propItems provided
  const filteredItems = useMemo(() => {
    if (!items) return [];
    
    let result = items;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        (t.subject?.toLowerCase().includes(query)) ||
        (t.preview?.toLowerCase().includes(query))
      );
    }
    
    if (!showAutoCreated) {
      result = result.filter(t => !t.is_auto_created || t.auto_created_confirmed);
    }
    
    return result;
  }, [items, searchQuery, showAutoCreated]);

  const unconfirmedCount = items?.filter(t => t.is_auto_created && !t.auto_created_confirmed).length || 0;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const activeId = propSelected ?? selectedId;

  if (!items && loading) {
    return (
      <div className="p-6 flex items-center justify-center text-gray-500">
        <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
        {t('loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-2" />
        <p>{error}</p>
        <button onClick={loadThreads} className="mt-2 text-sm text-primary-600 hover:underline">
          {t('retry') || 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-4">
      {/* Thread list sidebar */}
      <div className="w-80 flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
              {t('threads') || 'Threads'}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCreateThread}
                className="p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                title={t('newThread') || 'New Thread'}
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Search: only show when parent did not provide an external search filter */}
          {!(filters && filters.search !== undefined) && (
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder={t('searchThreads') || 'Search threads...'}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          )}
          
          {/* Filter toggle */}
          {unconfirmedCount > 0 && (
            <div className="mt-2 flex items-center justify-between">
              {/* checkbox only shown if parent didn't provide showAutoCreated filter */}
              {!(filters && filters.showAutoCreated !== undefined) ? (
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localShowAutoCreated}
                    onChange={(e) => setLocalShowAutoCreated(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  {t('showAutoCreated') || 'Show auto-created'}
                </label>
              ) : (
                <div className="text-xs text-gray-600 dark:text-gray-400">{t('showAutoCreated')}</div>
              )}
              <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
                {unconfirmedCount} {t('needsReview') || 'needs review'}
              </span>
            </div>
          )}
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {t('noThreads') || 'No threads found'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredItems.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => handleSelect(thread.id)}
                  className={`p-3 cursor-pointer transition-colors ${
                    activeId === thread.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-600'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-700 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {thread.is_auto_created && !thread.auto_created_confirmed && (
                          <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        )}
                        {thread.is_auto_created && thread.auto_created_confirmed && (
                          <CheckBadgeIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                        <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {thread.subject || t('untitled')}
                        </span>
                      </div>
                      
                      {thread.preview && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {thread.preview}
                        </p>
                      )}
                      
                      {thread.linked_entity_type && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                            {thread.linked_entity_type}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(thread.last_message_at || thread.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Refresh button */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={loadThreads}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh') || 'Refresh'}
          </button>
        </div>
      </div>

      {/* Thread detail view */}
      <div className="flex-1 flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {activeId ? (
          <>
            <ThreadView
              threadId={activeId}
              currentUserId={currentUserId}
              onThreadUpdate={handleThreadUpdate}
            />
            
            {/* Email ingestion config panel (collapsible) */}
            {showEmailConfig && (
              <div className="border-t border-gray-200 dark:border-gray-700">
                <EmailIngestionConfig threadId={activeId} />
              </div>
            )}
            
            {/* Toggle email config button */}
            <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/50">
              <button
                onClick={() => setShowEmailConfig(!showEmailConfig)}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <EnvelopeIcon className="w-4 h-4" />
                {showEmailConfig ? t('hideEmailConfig') || 'Hide Email Settings' : t('emailIngestion') || 'Email Ingestion'}
                <Cog6ToothIcon className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gray-50 dark:bg-slate-900">
            <ChatBubbleLeftRightIcon className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium">{t('selectThread') || 'Select a thread'}</p>
            <p className="text-sm">{t('selectThreadHint') || 'Choose a conversation from the list to view messages'}</p>
          </div>
        )}
      </div>

      {/* Create Thread Modal */}
      <CreateThreadModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleThreadCreated}
        linkedEntity={linkedEntityType && linkedEntityId ? {
          type: linkedEntityType as any,
          id: linkedEntityId,
        } : undefined}
        availableParticipants={availableParticipants}
      />
    </div>
  );
}
