// Institutes Page — Standardized via useCrudPage + EntityModal
// Implements RF-03: Institutional Portfolio Management
'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { PlusIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import { useCrudPage, FetchResult } from '@/hooks/use-crud-page';
import { instituteDefinition, InstituteFormData } from '@/lib/form-registry/definitions/institute.definition';
import EntityModal from '@/components/features/shared/ui/EntityModal';
import InstitutesBoard from '@/components/features/institutes/components/InstitutesBoard';
import InstitutesListView from '@/components/features/institutes/components/InstitutesListView';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import SafeRender from '@/components/features/shared/ui/SafeRender';
import Pagination from '@/components/features/shared/ui/Pagination';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Institute {
  id: string;
  name: string;
  metadata?: {
    city?: string;
    state?: string;
    type?: string;
    description?: string;
  };
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface InstituteFilters {
  search: string;
  city: string;
}

const initialFilters: InstituteFilters = { search: '', city: '' };

// ─── Page Component ──────────────────────────────────────────────────────────

export default function InstitutesPage() {
  const t = useTranslations('institutes');
  const tCommon = useTranslations('common');

  const state = useCrudPage<Institute, InstituteFilters>({
    queryKey: 'institutes',
    definition: instituteDefinition,
    initialFilters,
    defaultPageSize: 20,
    filterFn: (item, filters) => {
      if (filters.search && !(item.name || '').toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.city && !(item.metadata?.city || '').toLowerCase().includes(filters.city.toLowerCase())) return false;
      return true;
    },
    fetchFn: async () => {
      try {
        const resp = await apiClient.get('/api/v1/institutes');
        const items = resp?.items ?? resp ?? [];
        return { items, total: items.length } as FetchResult<Institute>;
      } catch (e) {
        console.debug('[Institutes] Failed to load institutes', e);
        return { items: [], total: 0 };
      }
    },
  });

  const filterFields: FilterField[] = useMemo(() => [
    { key: 'search', label: t('filters.search'), type: 'text', placeholder: t('filters.searchPlaceholder') },
    { key: 'city', label: t('filters.city') || 'City', type: 'text', placeholder: t('filters.cityPlaceholder') || '' },
  ], [t]);

  const timelineItems: TimelineItem[] = useMemo(() => {
    return state.data.map((inst) => ({
      id: inst.id,
      title: inst.name || t('untitled'),
      description: inst.metadata?.city || inst.metadata?.description || '',
      date: inst.created_at || inst.updated_at || new Date().toISOString(),
      status: inst.status === 'active' ? 'success' : inst.status === 'inactive' ? 'warning' : 'default',
      icon: <BuildingLibraryIcon className="w-4 h-4" />,
      tags: inst.metadata?.type ? [{ label: inst.metadata.type, color: 'blue' }] : [],
      onClick: () => state.openViewModal(inst),
    }));
  }, [state.data, t]);

  const tableColumns: TableColumn<Institute>[] = useMemo(() => [
    { key: 'name', header: t('columns.name') || 'Name', accessor: 'name', sortable: true },
    { key: 'city', header: t('columns.city') || 'City', accessor: (row) => row.metadata?.city || '-', sortable: true },
    { key: 'state', header: t('columns.state') || 'State', accessor: (row) => row.metadata?.state || '-', sortable: true, hiddenOnMobile: true },
    { key: 'type', header: t('columns.type') || 'Type', accessor: (row) => row.metadata?.type || '-', sortable: true, hiddenOnMobile: true },
    { key: 'created_at', header: t('columns.createdAt') || 'Created', accessor: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '-', sortable: true, hiddenOnMobile: true },
  ], [t]);

  const modalEntity = useMemo(() => {
    if (!state.selectedItem) return null;
    const inst = state.selectedItem as any;
    return {
      id: inst.id,
      nome: inst.name || inst.nome || '',
      nome_fantasia: inst.nome_fantasia || '',
      isi_sigla: inst.isi_sigla || inst.sigla || '',
      cnpj: inst.cnpj || '',
      descricao: inst.metadata?.description || inst.descricao || '',
      status: inst.status || 'active',
      status_operacional: inst.status_operacional || '',
      endereco_rua: inst.metadata?.address || inst.endereco_rua || '',
      endereco_numero: inst.endereco_numero || '',
      endereco_complemento: inst.endereco_complemento || '',
      endereco_bairro: inst.endereco_bairro || '',
      endereco_cep: inst.endereco_cep || '',
      endereco_cidade: inst.metadata?.city || inst.endereco_cidade || '',
      endereco_uf: inst.metadata?.state || inst.endereco_uf || '',
      area_predial_m2: inst.area_predial_m2 || 0,
      phone: inst.phone || '',
      website: inst.website || '',
      logo_url: inst.logo_url || '',
      maturidade_gestao: inst.maturidade_gestao || '',
      maturidade_base_tecnologica: inst.maturidade_base_tecnologica || '',
      maturidade_produtos_servicos: inst.maturidade_produtos_servicos || '',
      maturidade_cooperacao: inst.maturidade_cooperacao || '',
      credenciamento_cati: inst.credenciamento_cati || false,
      credenciamento_ed: inst.credenciamento_ed || false,
    };
  }, [state.selectedItem]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        viewToggle
        viewMode={state.viewMode}
        onViewChange={state.setViewMode}
        action={
          <button onClick={state.openCreateModal} title={t('new')} className="inline-flex items-center justify-center p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <EntityModal<InstituteFormData>
        definition={instituteDefinition}
        entity={state.isCreateModalOpen ? null : modalEntity}
        mode={state.isCreateModalOpen ? 'create' : 'edit'}
        isOpen={state.isCreateModalOpen || state.isViewModalOpen}
        onClose={state.closeModal}
        onSuccess={() => { state.closeModal(); state.refetch(); }}
        onDeleteSuccess={() => { state.closeModal(); state.refetch(); }}
        icon={<BuildingLibraryIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
        size="2xl"
      />

      <SafeRender fallback={<div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-4"><div className="text-sm text-gray-500 dark:text-gray-400">{t('statsUnavailable') || 'Statistics unavailable'}</div></div>}>
        <ConfigurableStatisticsBar module="institutes" data={state.allData} />
      </SafeRender>

      <FilterPanel fields={filterFields} values={state.filters} onChange={state.setFilter} onReset={state.resetFilters} />

      {state.viewMode === 'board' && (
        <InstitutesBoard items={state.allData} onItemClick={state.openViewModal} />
      )}

      {state.viewMode === 'timeline' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6">
          <TimelineView items={timelineItems} size="md" showConnectors animated emptyMessage={t('noResults') || 'No institutes found'} />
        </div>
      )}

      {state.viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden">
          <TableView data={state.data} columns={tableColumns} getRowKey={(row) => row.id} onRowClick={state.openViewModal} loading={state.isLoading} emptyMessage={tCommon('noResults')} paginated pageSize={state.pageSize} currentPage={state.currentPage} totalItems={state.totalItems} onPageChange={state.setCurrentPage} onPageSizeChange={state.setPageSize} striped hoverable />
        </div>
      )}

      {state.viewMode === 'list' && (
        <div className="space-y-4">
          <InstitutesListView items={state.data} isLoading={state.isLoading} onItemClick={state.openViewModal} />
          {state.totalItems > 0 && (
            <Pagination currentPage={state.currentPage} totalItems={state.totalItems} pageSize={state.pageSize} onPageChange={state.setCurrentPage} onPageSizeChange={state.setPageSize} persistInUrl showTotal showPageSizeSelector />
          )}
        </div>
      )}
    </div>
  );
}
