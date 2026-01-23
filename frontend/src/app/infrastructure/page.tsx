// Infrastructure Page
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';
import { ViewMode } from '@/components/ui/ViewToggle';
import { PlusIcon } from '@heroicons/react/24/outline';
import InfrastructureModal from '@/components/entities/InfrastructureModal';
import InfrastructureBoard from '@/components/infrastructure/InfrastructureBoard';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import TimelineView, { TimelineItem } from '@/components/ui/TimelineView';
import TableView, { TableColumn } from '@/components/ui/TableView';

export default function InfrastructurePage() {
  const t = useTranslations('infrastructure');
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(
    urlView && ['list', 'board', 'timeline', 'table'].includes(urlView) ? urlView : 'list'
  );
  const [filters, setFilters] = useState({ search: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any | null>(null);

  // Pagination state
  const { initialPage, initialPageSize } = usePagination(20, true);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filterFields: FilterField[] = [
    { key: 'search', label: t('filters.search'), type: 'text', placeholder: t('filters.searchPlaceholder') },
  ];

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['infrastructure', 'page'],
    queryFn: async () => {
      try {
        const resp = await apiClient.get('/api/v1/infrastructures');
        return resp?.items ?? resp ?? [];
      } catch (e) {
        console.debug('[Infrastructure] Failed to load resources', e);
        return [];
      }
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!filters.search) return items;
    return items.filter((r: any) => (r.name || '').toLowerCase().includes(filters.search.toLowerCase()));
  }, [items, filters.search]);

  // Paginate filtered items for list view
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Transform items to timeline items
  const timelineItems: TimelineItem[] = useMemo(() => {
    return paginatedItems.map((r: any) => ({
      id: r.id,
      title: r.name || 'Unnamed Resource',
      description: r.description || r.location || r.type || '',
      date: r.created_at || r.updated_at || new Date().toISOString(),
      status: r.status === 'available' ? 'success' : r.status === 'maintenance' ? 'warning' : r.status === 'unavailable' ? 'error' : 'default',
      tags: r.type ? [{ label: r.type }] : undefined,
      onClick: () => { setSelectedResource(r); setModalOpen(true); },
    }));
  }, [paginatedItems]);

  // Table columns for TableView
  const tableColumns: TableColumn<any>[] = useMemo(() => [
    { key: 'name', header: t('name'), accessor: 'name', sortable: true },
    { key: 'type', header: t('type'), accessor: 'type', sortable: true },
    { key: 'location', header: t('location'), accessor: 'location', sortable: true },
    { 
      key: 'capacity', 
      header: t('capacity'), 
      accessor: (row: any) => row.capacity?.area_m2 ? `${row.capacity.area_m2} m²` : (row.capacity?.units ? `${row.capacity.units} units` : '-'),
    },
    { key: 'description', header: t('description'), accessor: 'description', hiddenOnMobile: true },
  ], [t]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const { selectedInstitutes = [], user } = useAuth();
  const canCreateResource = (user?.roles || []).includes('admin') || (selectedInstitutes && selectedInstitutes.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        viewToggle
        viewMode={viewMode}
        onViewChange={setViewMode}
        action={(
          canCreateResource ? (
            <button onClick={() => { setSelectedResource(null); setModalOpen(true); }} className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              <PlusIcon className="w-5 h-5 mr-2" />
              {t('newResource')}
            </button>
          ) : null
        )}
      />

      <ConfigurableStatisticsBar module={"infrastructure" as any} data={filtered} />

      <FilterPanel
        fields={filterFields}
        values={filters}
        onChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
        onReset={() => setFilters({ search: '' })}
      />

      {/* Board View */}
      {viewMode === 'board' && (
        <InfrastructureBoard items={filtered} onItemClick={(r) => { setSelectedResource(r); setModalOpen(true); }} />
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="space-y-4">
          <TimelineView
            items={timelineItems}
            showConnectors={true}
            animated={true}
          />
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

      {/* Table View */}
      {viewMode === 'table' && (
        <TableView<any>
          data={filtered}
          columns={tableColumns}
          getRowKey={(row) => row.id}
          onRowClick={(row) => { setSelectedResource(row); setModalOpen(true); }}
          loading={isLoading}
          emptyMessage={t('noResults')}
          searchable={false}
          paginated={true}
          pageSize={pageSize}
          currentPage={currentPage}
          totalItems={filtered.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          striped={true}
          hoverable={true}
        />
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('noResults')}</div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {paginatedItems.map((r: any) => (
                  <li key={r.id} className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{r.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{r.location || r.type || ''}</p>
                        <p className="text-xs text-gray-400 mt-2">{r.description || ''}</p>
                      </div>
                      <div className="text-xs text-gray-400">
                        {r.capacity?.area_m2 ? `${r.capacity.area_m2} m²` : (r.capacity?.units ? `${r.capacity.units} units` : '')}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      {(
                        (user?.roles || []).includes('admin') ||
                        selectedInstitutes.includes(String(r.institute_id))
                      ) && (
                        <a href={`/infrastructure/${r.id}/booking`} className="text-sm text-primary-600 hover:underline">Book</a>
                      )}
                      <button onClick={() => { setSelectedResource(r); setModalOpen(true); }} className="ml-auto text-sm text-gray-500">Details</button>
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
      <InfrastructureModal isOpen={modalOpen} onClose={() => setModalOpen(false)} resource={selectedResource} />
    </div>
  );
}
