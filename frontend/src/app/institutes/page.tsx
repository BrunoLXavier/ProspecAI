// Institutes Page
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import SafeRender from '@/components/features/shared/ui/SafeRender';
import { ViewMode } from '@/components/features/shared/ui/ViewToggle';
import { PlusIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline';
import InstituteModal from '@/components/features/institutes/components/InstituteModal';
import InstitutesListView from '@/components/features/institutes/components/InstitutesListView';
import InstitutesBoard from '@/components/features/institutes/components/InstitutesBoard';
import Pagination, { usePagination } from '@/components/features/shared/ui/Pagination';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';

export default function InstitutesPage() {
  const t = useTranslations('institutes');
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(
    urlView && ['list', 'board', 'timeline', 'table'].includes(urlView) ? urlView : 'list'
  );
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

  // Timeline items for TimelineView
  const timelineItems: TimelineItem[] = useMemo(() => {
    return filtered.map((inst: any) => ({
      id: inst.id,
      title: inst.name || t('untitled'),
      description: inst.metadata?.city || inst.metadata?.description || '',
      date: inst.created_at || inst.updated_at || new Date().toISOString(),
      status: inst.status === 'active' ? 'success' : inst.status === 'inactive' ? 'warning' : 'default',
      icon: <BuildingLibraryIcon className="w-4 h-4" />,
      tags: inst.metadata?.type ? [{ label: inst.metadata.type, color: 'blue' }] : [],
      onClick: () => { setSelectedInstitute(inst); setModalOpen(true); },
    }));
  }, [filtered, t]);

  // Table columns for TableView
  const tableColumns: TableColumn<any>[] = useMemo(() => [
    {
      key: 'name',
      header: t('columns.name') || 'Name',
      accessor: 'name',
      sortable: true,
      filterable: true,
    },
    {
      key: 'city',
      header: t('columns.city') || 'City',
      accessor: (row: any) => row.metadata?.city || '-',
      sortable: true,
    },
    {
      key: 'state',
      header: t('columns.state') || 'State',
      accessor: (row: any) => row.metadata?.state || '-',
      sortable: true,
      hiddenOnMobile: true,
    },
    {
      key: 'type',
      header: t('columns.type') || 'Type',
      accessor: (row: any) => row.metadata?.type || '-',
      sortable: true,
      hiddenOnMobile: true,
    },
    {
      key: 'created_at',
      header: t('columns.createdAt') || 'Created',
      accessor: (row: any) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '-',
      sortable: true,
      hiddenOnMobile: true,
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
          <button onClick={() => { setSelectedInstitute(null); setModalOpen(true); }} title={t('new')} className="inline-flex items-center justify-center p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">
            <PlusIcon className="w-5 h-5" />
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

      {/* Board View */}
      {viewMode === 'board' && (
        <InstitutesBoard items={filtered} onItemClick={(it) => { setSelectedInstitute(it); setModalOpen(true); }} />
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6">
          <TimelineView
            items={timelineItems}
            size="md"
            showConnectors
            animated
            emptyMessage={t('noItems') || 'No institutes found'}
          />
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden">
          <TableView
            data={filtered}
            columns={tableColumns}
            getRowKey={(row) => row.id}
            onRowClick={(row) => { setSelectedInstitute(row); setModalOpen(true); }}
            paginated
            pageSize={pageSize}
            searchable={false}
            striped
            hoverable
          />
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
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
