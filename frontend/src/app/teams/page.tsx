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
import { PlusIcon } from '@heroicons/react/24/outline';
import TeamModal from '@/components/entities/TeamModal';
import TeamsBoard from '@/components/teams/TeamsBoard';
import Pagination, { usePagination } from '@/components/ui/Pagination';

export default function TeamsPage() {
  const t = useTranslations('teams');
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(urlView === 'board' || urlView === 'list' ? urlView : 'list');
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

      {viewMode === 'board' ? (
        <TeamsBoard items={filtered} onItemClick={(it) => { setSelectedTeam(it); setModalOpen(true); }} />
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('noResults')}</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedItems.map((it: any, idx: number) => (
                  <li key={it.id || idx} className="px-6 py-4 flex items-center justify-between">
                    <button onClick={() => { setSelectedTeam(it); setModalOpen(true); }} className="text-left">{it.name || 'Team'}</button>
                    <div className="text-xs text-gray-400">{it.member_ids ? it.member_ids.length : ''}</div>
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
