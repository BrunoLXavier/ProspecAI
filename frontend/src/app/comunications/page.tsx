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
import Pagination, { usePagination } from '@/components/ui/Pagination';
import TimelineView, { TimelineItem } from '@/components/ui/TimelineView';
import TableView, { TableColumn } from '@/components/ui/TableView';
import { PlusIcon, ExclamationTriangleIcon, ChatBubbleLeftRightIcon, EnvelopeIcon, PhoneIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
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
  type?: 'chat' | 'email' | 'call' | 'meeting';
  status?: 'active' | 'archived' | 'pending';
}

export default function CommunicationsPage() {
  const t = useTranslations('communications');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  
  // View mode from URL or default
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(
    urlView && ['list', 'board', 'timeline', 'table'].includes(urlView) ? urlView : 'list'
  );
  
  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    linkedEntityType: '',
    showAutoCreated: true,
  });
  
  // Pagination state
  const { initialPage, initialPageSize } = usePagination(20, true);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

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

  // Paginate threads for list view
  const paginatedThreads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return threads.slice(start, start + pageSize);
  }, [threads, currentPage, pageSize]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Helper to get type icon
  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'email': return <EnvelopeIcon className="w-5 h-5" />;
      case 'call': return <PhoneIcon className="w-5 h-5" />;
      case 'meeting': return <VideoCameraIcon className="w-5 h-5" />;
      default: return <ChatBubbleLeftRightIcon className="w-5 h-5" />;
    }
  };

  // Helper to get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'archived': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  // Helper to format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Timeline items for TimelineView
  const timelineItems: TimelineItem[] = useMemo(() => {
    return paginatedThreads.map((thread) => ({
      id: thread.id,
      title: thread.subject || t('untitled') || 'Untitled',
      description: thread.preview,
      date: thread.last_message_at || thread.created_at || new Date().toISOString(),
      status: thread.is_auto_created && !thread.auto_created_confirmed ? 'warning' : 
              thread.status === 'archived' ? 'default' : 
              thread.status === 'pending' ? 'pending' : 'success',
      icon: getTypeIcon(thread.type),
      tags: [
        ...(thread.linked_entity_type ? [{ label: t(`entityTypes.${thread.linked_entity_type}`) || thread.linked_entity_type }] : []),
        ...(thread.is_auto_created ? [{ label: t('autoCreated') || 'Auto', color: 'amber' }] : []),
      ],
      onClick: () => handleSelectThread(thread.id),
    }));
  }, [paginatedThreads, t]);

  // Table columns for TableView
  const tableColumns: TableColumn<Thread>[] = useMemo(() => [
    {
      key: 'subject',
      header: t('columns.subject') || 'Subject',
      accessor: 'subject',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          {getTypeIcon(row.type)}
          <span className="font-medium text-gray-900 dark:text-white">
            {(value as string) || t('untitled') || 'Untitled'}
          </span>
          {row.is_auto_created && !row.auto_created_confirmed && (
            <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: t('columns.type') || 'Type',
      accessor: (row) => row.type || 'chat',
      sortable: true,
      render: (value) => (
        <span className="capitalize">{String(t(`types.${String(value)}`) || value || '')}</span>
      ),
    },
    {
      key: 'date',
      header: t('columns.date') || 'Date',
      accessor: (row) => row.last_message_at || row.created_at || '',
      sortable: true,
      render: (value) => formatDate(value as string),
    },
    {
      key: 'status',
      header: t('columns.status') || 'Status',
      accessor: (row) => row.status || 'active',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(value as string)}`}>
          {String(t(`status.${String(value)}`) || value || '')}
        </span>
      ),
    },
    {
      key: 'linked_entity',
      header: t('columns.linkedTo') || 'Linked To',
      accessor: (row) => row.linked_entity_type || '',
      render: (value) => value ? (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {String(t(`entityTypes.${String(value)}`) || value || '')}
        </span>
      ) : '-',
    },
    {
      key: 'participants',
      header: t('columns.participants') || 'Participants',
      accessor: 'participant_count',
      align: 'center',
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {String(value ?? 0)}
        </span>
      ),
    },
  ], [t]);

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
                const typeThreads = threads.filter(thread => 
                  entityType === 'other' 
                    ? !thread.linked_entity_type || !['proposal', 'client', 'opportunity'].includes(thread.linked_entity_type)
                    : thread.linked_entity_type === entityType
                );
                
                return (
                  <div
                    key={entityType}
                    className="w-80 flex-shrink-0 bg-gray-100 dark:bg-slate-900 rounded-lg p-3 flex flex-col"
                  >
                      <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-between">
                      <span>{String(t(`entityTypes.${String(entityType)}`) || entityType || '')}</span>
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
                          <div className="flex items-center gap-2 mb-1">
                            {getTypeIcon(thread.type)}
                            <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {thread.subject || t('untitled')}
                            </span>
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
        ) : viewMode === 'timeline' ? (
          // Timeline view
          <div className="space-y-4">
            <TimelineView
              items={timelineItems}
              showConnectors={true}
              animated={true}
              size="md"
              loading={isLoading}
              emptyMessage={tCommon('noResults') || 'No communications found'}
            />
            {threads.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={threads.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                persistInUrl={true}
                showTotal={true}
                showPageSizeSelector={true}
              />
            )}
          </div>
        ) : viewMode === 'table' ? (
          // Table view
          <TableView<Thread>
            data={threads}
            columns={tableColumns}
            getRowKey={(row) => row.id}
            onRowClick={(row) => handleSelectThread(row.id)}
            loading={isLoading}
            emptyMessage={tCommon('noResults') || 'No communications found'}
            searchable={false}
            paginated={true}
            pageSize={pageSize}
            currentPage={currentPage}
            totalItems={threads.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            striped={true}
            hoverable={true}
          />
        ) : (
          // List view - card-based layout
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
              {threads.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  {tCommon('noResults') || 'No communications found'}
                </div>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedThreads.map((thread) => (
                    <li
                      key={thread.id}
                      className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer"
                      onClick={() => handleSelectThread(thread.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
                              {getTypeIcon(thread.type)}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {thread.subject || t('untitled') || 'Untitled'}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                {thread.preview}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center gap-4 text-sm">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(thread.status)}`}>
                              {String(t(`status.${String(thread.status || 'active')}`) || thread.status || 'Active')}
                            </span>
                            {thread.linked_entity_type && (
                              <span className="text-gray-500 dark:text-gray-400">
                                {String(t(`entityTypes.${String(thread.linked_entity_type)}`) || thread.linked_entity_type || '')}
                              </span>
                            )}
                            <span className="text-gray-400 dark:text-gray-500">
                              {thread.participant_count || 0} {t('participants') || 'participants'}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500">
                              {formatDate(thread.last_message_at || thread.created_at)}
                            </span>
                            {thread.is_auto_created && !thread.auto_created_confirmed && (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <ExclamationTriangleIcon className="w-4 h-4" />
                                {t('autoCreated') || 'Auto-created'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Pagination */}
            {threads.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={threads.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                persistInUrl={true}
                showTotal={true}
                showPageSizeSelector={true}
              />
            )}
          </div>
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
