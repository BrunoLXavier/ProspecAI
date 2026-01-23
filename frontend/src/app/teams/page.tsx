// Teams Page
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';
import { ViewMode } from '@/components/ui/ViewToggle';
import TimelineView, { TimelineItem } from '@/components/ui/TimelineView';
import TableView, { TableColumn } from '@/components/ui/TableView';
import { PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import TeamModal from '@/components/entities/TeamModal';
import TeamsBoard from '@/components/teams/TeamsBoard';
import Pagination, { usePagination } from '@/components/ui/Pagination';

export default function TeamsPage() {
  const t = useTranslations('teams');
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(
    urlView && ['list', 'board', 'timeline', 'table'].includes(urlView) ? urlView : 'list'
  );
  const [filters, setFilters] = useState({ search: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

  // Pagination state
  const { initialPage, initialPageSize } = usePagination(20, true);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filterFields: FilterField[] = [
    { key: 'search', label: t('filters.search'), type: 'text', placeholder: t('filters.searchPlaceholder') },
  ];

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['teams', 'page'],
    queryFn: async () => {
      try {
        const resp = await apiClient.get('/api/v1/teams');
        return resp?.items ?? resp ?? [];
      } catch (e) {
        console.debug('[Teams] Failed to load teams', e);
        return [];
      }
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!filters.search) return items;
    return items.filter((i: any) => (i.name || '').toLowerCase().includes(filters.search.toLowerCase()));
  }, [items, filters.search]);

  // Paginate filtered items for list view
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Timeline items for TimelineView
  const timelineItems: TimelineItem[] = useMemo(() => {
    return filtered.map((item: any) => ({
      id: item.id,
      title: item.name || 'Team',
      description: item.description || t('noDescription'),
      date: item.created_at || item.updated_at || new Date().toISOString(),
      status: 'info' as const,
      icon: <UserGroupIcon className="w-4 h-4" />,
      tags: item.member_ids?.length ? [{ label: `${item.member_ids.length} ${t('members')}`, color: 'blue' }] : [],
      onClick: () => { setSelectedTeam(item); setModalOpen(true); },
    }));
  }, [filtered, t]);

  // Table columns for TableView
  const tableColumns: TableColumn<any>[] = useMemo(() => [
    {
      key: 'name',
      header: t('table.name'),
      accessor: 'name',
      sortable: true,
      render: (value: unknown) => (
        <span className="font-medium text-gray-900 dark:text-white">{String(value || 'Team')}</span>
      ),
    },
    {
      key: 'description',
      header: t('table.description'),
      accessor: 'description',
      sortable: false,
      hiddenOnMobile: true,
      render: (value: unknown) => (
        <span className="text-gray-500 dark:text-gray-400 truncate max-w-xs block">
          {String(value || t('noDescription'))}
        </span>
      ),
    },
    {
      key: 'members',
      header: t('table.members'),
      accessor: (row: any) => row.member_ids?.length || 0,
      sortable: true,
      align: 'center' as const,
      render: (value: unknown, row: any) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          {row.member_ids?.length || 0} {t('members')}
        </span>
      ),
    },
  ], [t]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        viewToggle
        viewMode={viewMode}
        onViewChange={setViewMode}
        action={(
          <button onClick={() => { setSelectedTeam(null); setModalOpen(true); }} className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <PlusIcon className="w-5 h-5 mr-2" />
            {t('new')}
          </button>
        )}
      />

      <ConfigurableStatisticsBar module={"teams" as any} data={filtered} />

      <FilterPanel
        fields={filterFields}
        values={filters}
        onChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
        onReset={() => setFilters({ search: '' })}
      />

      {/* Board View */}
      {viewMode === 'board' && (
        <TeamsBoard items={filtered} onItemClick={(it) => { setSelectedTeam(it); setModalOpen(true); }} />
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('noResults')}</div>
          ) : (
            <TimelineView items={timelineItems} size="md" showConnectors animated />
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
          ) : (
            <TableView
              data={filtered}
              columns={tableColumns}
              getRowKey={(row: any) => row.id}
              onRowClick={(row: any) => { setSelectedTeam(row); setModalOpen(true); }}
              paginated
              pageSize={pageSize}
              searchable={false}
            />
          )}
        </div>
      )}

      {/* List View (default) */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('noResults')}</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedItems.map((it: any, idx: number) => (
                  <li 
                    key={it.id || idx} 
                    onClick={() => { setSelectedTeam(it); setModalOpen(true); }}
                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <span className="text-primary-600 dark:text-primary-400 font-semibold">
                            {(it.name || 'T').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{it.name || 'Team'}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {it.description || t('noDescription') || 'No description'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {it.member_ids && it.member_ids.length > 0 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {it.member_ids.length} {t('members') || 'members'}
                          </span>
                        )}
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filtered.length}
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
      <TeamModal isOpen={modalOpen} onClose={() => setModalOpen(false)} team={selectedTeam} />
    </div>
  );
}
