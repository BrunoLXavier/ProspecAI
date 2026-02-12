// Infrastructure Page — Standardized via useCrudPage + EntityModal
'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { PlusIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useCrudPage, FetchResult } from '@/hooks/use-crud-page';
import { infrastructureDefinition, InfrastructureFormData } from '@/lib/form-registry/definitions/infrastructure.definition';
import EntityModal from '@/components/features/shared/ui/EntityModal';
import InfrastructureBoard from '@/components/features/infrastructure/components/InfrastructureBoard';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import Pagination from '@/components/features/shared/ui/Pagination';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Infrastructure {
  id: string;
  name: string;
  tipo: string;
  status: string;
  descricao: string;
  endereco: string;
  area_m2: number;
  capacidade_atendimentos: number;
  institute_id?: string;
  institute_name?: string;
  maturidade_gestao: number;
  maturidade_base_tecnologica: number;
}

interface InfraFilters {
  search: string;
}

const initialFilters: InfraFilters = { search: '' };

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    available: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    booked: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    maintenance: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
};

// ─── Page Component ──────────────────────────────────────────────────────────

export default function InfrastructurePage() {
  const t = useTranslations('infrastructure');
  const tCommon = useTranslations('common');
  const { selectedInstitutes } = useAuth();

  const state = useCrudPage<Infrastructure, InfraFilters>({
    queryKey: 'infrastructure',
    definition: infrastructureDefinition,
    initialFilters,
    defaultPageSize: 20,
    instituteScoped: true,
    selectedInstitutes,
    filterFn: (item, filters) => {
      if (!filters.search) return true;
      const s = filters.search.toLowerCase();
      return (
        item.name?.toLowerCase().includes(s) ||
        item.tipo?.toLowerCase().includes(s) ||
        item.descricao?.toLowerCase().includes(s) ||
        item.endereco?.toLowerCase().includes(s)
      );
    },
    searchKey: 'search',
    fetchFn: async () => {
      const res = await apiClient.get('/api/v1/infrastructure');
      const items = Array.isArray(res) ? res : ((res as any).items ?? []);
      return { items, total: items.length } as FetchResult<Infrastructure>;
    },
  });

  const filterFields: FilterField[] = [
    { key: 'search', label: t('filters.search'), type: 'text', placeholder: t('filters.searchPlaceholder') },
  ];

  const timelineItems: TimelineItem[] = useMemo(() => {
    return state.data.map((r) => ({
      id: r.id,
      title: r.name || t('untitled'),
      description: `${r.tipo || ''} — ${r.endereco || ''}`,
      date: '',
      status: r.status === 'available' ? 'success' : r.status === 'maintenance' ? 'error' : 'warning',
      onClick: () => state.openViewModal(r),
    }));
  }, [state.data, t]);

  const tableColumns: TableColumn<Infrastructure>[] = useMemo(() => [
    { key: 'name', header: t('name'), accessor: 'name', sortable: true },
    { key: 'tipo', header: t('type'), accessor: 'tipo', sortable: true },
    {
      key: 'status', header: t('status'), accessor: 'status', sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(value as string)}`}>
          {String(t(value as string) || value)}
        </span>
      ),
    },
    { key: 'area_m2', header: t('areaM2'), accessor: 'area_m2', sortable: true },
    { key: 'capacidade_atendimentos', header: t('units'), accessor: 'capacidade_atendimentos', sortable: true },
  ], [t]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        viewToggle
        viewMode={state.viewMode}
        onViewChange={state.setViewMode}
        action={
          <button onClick={state.openCreateModal} title={t('newInfrastructure')}
            className="inline-flex items-center justify-center p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition">
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <EntityModal<InfrastructureFormData>
        definition={infrastructureDefinition}
        entity={state.isCreateModalOpen ? null : (state.selectedItem as any)}
        mode={state.isCreateModalOpen ? 'create' : 'edit'}
        isOpen={state.isCreateModalOpen || state.isViewModalOpen}
        onClose={state.closeModal}
        onSuccess={() => { state.closeModal(); state.refetch(); }}
        onDeleteSuccess={() => { state.closeModal(); state.refetch(); }}
        icon={<BuildingOffice2Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
        size="2xl"
      />

      <ConfigurableStatisticsBar module="infrastructure" data={state.allData} />

      <FilterPanel
        fields={filterFields}
        values={state.filters}
        onChange={state.setFilter}
        onReset={state.resetFilters}
        defaultExpanded={false}
      />

      {state.viewMode === 'board' && (
        <InfrastructureBoard items={state.allData as any[]} onItemClick={state.openViewModal as any} />
      )}

      {state.viewMode === 'timeline' && (
        <div className="space-y-4">
          <TimelineView items={timelineItems} showConnectors animated />
          {state.totalItems > 0 && (
            <Pagination currentPage={state.currentPage} totalItems={state.totalItems} pageSize={state.pageSize}
              onPageChange={state.setCurrentPage} onPageSizeChange={state.setPageSize} persistInUrl showTotal showPageSizeSelector />
          )}
        </div>
      )}

      {state.viewMode === 'table' && (
        <TableView<Infrastructure>
          data={state.data} columns={tableColumns} getRowKey={(r) => r.id}
          onRowClick={state.openViewModal} loading={state.isLoading}
          emptyMessage={tCommon('noResults')} searchable={false}
          paginated pageSize={state.pageSize} currentPage={state.currentPage}
          totalItems={state.totalItems} onPageChange={state.setCurrentPage}
          onPageSizeChange={state.setPageSize} striped hoverable
        />
      )}

      {state.viewMode === 'list' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            {state.isLoading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">{tCommon('loading')}</div>
            ) : state.data.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('noResults')}</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {state.data.map((r) => (
                  <li key={r.id} onClick={() => state.openViewModal(r)}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{r.name || t('untitled')}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(r.status)}`}>
                            {String(t(r.status) || r.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {r.tipo} — {r.endereco || ''}
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                        {r.area_m2 ? `${r.area_m2} m²` : ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {state.totalItems > 0 && (
            <Pagination currentPage={state.currentPage} totalItems={state.totalItems} pageSize={state.pageSize}
              onPageChange={state.setCurrentPage} onPageSizeChange={state.setPageSize} persistInUrl showTotal showPageSizeSelector />
          )}
        </div>
      )}
    </div>
  );
}
