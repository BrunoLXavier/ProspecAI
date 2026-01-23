// Institutes Page
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';
import SafeRender from '@/components/ui/SafeRender';
import { ViewMode } from '@/components/ui/ViewToggle';
import { PlusIcon } from '@heroicons/react/24/outline';
import InstituteModal from '@/components/entities/InstituteModal';
import InstitutesListView from '@/components/institutes/InstitutesListView';
import InstitutesBoard from '@/components/institutes/InstitutesBoard';
import Pagination, { usePagination } from '@/components/ui/Pagination';

export default function InstitutesPage() {
  const t = useTranslations('institutes');
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(urlView === 'board' || urlView === 'list' ? urlView : 'board');
  const [filters, setFilters] = useState({ search: '', city: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInstitute, setSelectedInstitute] = useState<any | null>(null);

  // Pagination state
  const { initialPage, initialPageSize } = usePagination(20, true);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filterFields: FilterField[] = [
    { key: 'search', label: t('filters.search'), type: 'text', placeholder: t('filters.searchPlaceholder') },
    { key: 'city', label: t('filters.city') || 'City', type: 'text', placeholder: t('filters.cityPlaceholder') || '' },
  ];

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['institutes', 'page'],
    queryFn: async () => {
      try {
        const resp = await apiClient.get('/api/v1/institutes');
        return resp?.items ?? resp ?? [];
      } catch (e) {
        console.debug('[Institutes] Failed to load institutes', e);
        return [];
      }
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    let res = items;
    if (filters.search) res = res.filter((i: any) => (i.name || '').toLowerCase().includes(filters.search.toLowerCase()));
    if (filters.city) res = res.filter((i: any) => { const m = i.metadata || {}; return (m.city || '').toLowerCase().includes(filters.city.toLowerCase()); });
    return res;
  }, [items, filters.search, filters.city]);

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
          <button onClick={() => { setSelectedInstitute(null); setModalOpen(true); }} className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <PlusIcon className="w-5 h-5 mr-2" />
            {t('new')}
          </button>
        )}
      />

      <SafeRender fallback={<div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-4"><div className="text-sm text-gray-500 dark:text-gray-400">{t('statsUnavailable') || 'Statistics unavailable'}</div></div>}>
        <ConfigurableStatisticsBar module={"institutes" as any} data={filtered} />
      </SafeRender>

      <FilterPanel
        fields={filterFields}
        values={filters}
        onChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
        onReset={() => setFilters({ search: '', city: '' })}
      />

      {viewMode === 'board' ? (
        <InstitutesBoard items={filtered} onItemClick={(it) => { setSelectedInstitute(it); setModalOpen(true); }} />
      ) : (
        <div className="space-y-4">
          <InstitutesListView
            items={paginatedItems}
            isLoading={isLoading}
            onItemClick={(it) => { setSelectedInstitute(it); setModalOpen(true); }}
          />

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
      <InstituteModal isOpen={modalOpen} onClose={() => setModalOpen(false)} institute={selectedInstitute} />
    </div>
  );
}
