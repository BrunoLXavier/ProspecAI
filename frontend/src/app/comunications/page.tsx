/**
 * Communications Page
 * 
 * Full-featured communications hub with:
 * - Forum-style thread list with master-detail view
 * - Real-time messaging with attachments
 * - Audio recording for meetings
 * - Meeting minutes generation
 * - Human-in-the-loop confirmation for auto-created content
 * - Draft auto-save (backend + localStorage fallback)
 * 
 * Implements RF-08: Communications and collaboration
 */
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';
import { ViewMode } from '@/components/ui/ViewToggle';
import { PlusIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import CommunicationModal from '@/components/entities/CommunicationModal';
import CommunicationsList from '@/components/communications/CommunicationsList';
import apiClient from '@/lib/api-client';

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

export default function CommunicationsPage() {
  const t = useTranslations('communications');
  const searchParams = useSearchParams();
  
  // View mode from URL or default
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(
    urlView === 'board' || urlView === 'list' ? urlView : 'list'
  );
  
  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    linkedEntityType: '',
    showAutoCreated: true,
  });
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  
  // Selected thread for detail view
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Get current user ID from localStorage or API
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    // Try to get user ID from stored auth
    const storedUser = localStorage.getItem('prospecai_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUserId(user.id);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Fetch threads
  const { data: threadsData, isLoading, refetch } = useQuery({
    queryKey: ['communications', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.linkedEntityType) params.set('linked_entity_type', filters.linkedEntityType);
      params.set('include_auto_unconfirmed', String(filters.showAutoCreated));
      
      const res = await apiClient.get(`/api/v1/communications?${params.toString()}`);
      return res;
    },
  });

  const threads: Thread[] = useMemo(() => {
    return threadsData?.items || [];
  }, [threadsData]);

  // Statistics are rendered by the shared component used elsewhere

  // Filter fields
  const filterFields: FilterField[] = [
    {
      key: 'search',
      label: t('filters.search') || 'Search',
      type: 'text',
      placeholder: t('filters.searchPlaceholder') || 'Search threads...',
    },
    {
      key: 'linkedEntityType',
      label: t('filters.linkedEntityType') || 'Linked To',
      type: 'select',
      options: [
        { value: '', label: t('filters.all') || 'All' },
        { value: 'proposal', label: t('filters.proposal') || 'Proposal' },
        { value: 'client', label: t('filters.client') || 'Client' },
        { value: 'funding_source', label: t('filters.fundingSource') || 'Funding Source' },
        { value: 'opportunity', label: t('filters.opportunity') || 'Opportunity' },
      ],
    },
  ];

  const handleCreateThread = () => {
    setSelectedThread(null);
    setModalOpen(true);
  };

  const handleEditThread = (thread: Thread) => {
    setSelectedThread(thread);
    setModalOpen(true);
  };

  const handleSelectThread = (id: string) => {
    setActiveThreadId(id);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedThread(null);
    refetch();
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Page Header */}
      <PageHeader
        title={t('title') || 'Communications'}
        subtitle={t('subtitle') || 'Manage client and proposal communications'}
        viewToggle
        viewMode={viewMode}
        onViewChange={setViewMode}
        action={
          <button
            onClick={handleCreateThread}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            {t('newThread') || 'New Thread'}
          </button>
        }
      />

      {/* Statistics Bar (standard shared component) */}
      <ConfigurableStatisticsBar module="communications" data={threads} className="mb-2" />

      {/* Filters */}
      <FilterPanel
        fields={filterFields}
        values={filters}
        onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({ search: '', linkedEntityType: '', showAutoCreated: true })}
      />

      {/* Show auto-created toggle */}
      <div className="flex items-center gap-2 px-1">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showAutoCreated}
            onChange={(e) => setFilters(prev => ({ ...prev, showAutoCreated: e.target.checked }))}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          {t('showUnconfirmedAutoCreated') || 'Show unconfirmed auto-created threads'}
        </label>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-500">{t('loading') || 'Loading...'}</div>
          </div>
        ) : viewMode === 'board' ? (
          // Board/Kanban view - group by linked entity type
          <div className="h-full overflow-x-auto">
            <div className="flex gap-4 h-full pb-4">
              {['proposal', 'client', 'opportunity', 'other'].map((entityType) => {
                const typeThreads = threads.filter(t => 
                  entityType === 'other' 
                    ? !t.linked_entity_type || !['proposal', 'client', 'opportunity'].includes(t.linked_entity_type)
                    : t.linked_entity_type === entityType
                );
                
                return (
                  <div
                    key={entityType}
                    className="w-80 flex-shrink-0 bg-gray-100 dark:bg-slate-900 rounded-lg p-3 flex flex-col"
                  >
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-between">
                      <span>{t(`entityTypes.${entityType}`) || entityType}</span>
                      <span className="text-xs bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                        {typeThreads.length}
                      </span>
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto space-y-2">
                      {typeThreads.map((thread) => (
                        <div
                          key={thread.id}
                          onClick={() => handleSelectThread(thread.id)}
                          className={`p-3 bg-white dark:bg-slate-800 rounded-lg cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
                            thread.is_auto_created && !thread.auto_created_confirmed
                              ? 'border-amber-400'
                              : thread.is_auto_created && thread.auto_created_confirmed
                              ? 'border-green-400'
                              : 'border-transparent'
                          }`}
                        >
                          <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {thread.subject || t('untitled')}
                          </div>
                          {thread.preview && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {thread.preview}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {thread.participant_count || 0} {t('participants') || 'participants'}
                            </span>
                            {thread.is_auto_created && !thread.auto_created_confirmed && (
                              <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // List/Master-Detail view
          <CommunicationsList
            items={threads}
            selectedId={activeThreadId}
            onSelect={handleSelectThread}
            onCreateThread={handleCreateThread}
            currentUserId={currentUserId}
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      <CommunicationModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        comm={selectedThread}
      />
    </div>
  );
}
