// Opportunities List Page — Standardized via useCrudPage + EntityModal
// Implements RF-05: Pipeline de Oportunidades
'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useCrudPage, FetchResult } from '@/hooks/use-crud-page';
import { opportunityDefinition, OpportunityFormData } from '@/lib/form-registry/definitions/opportunity.definition';
import EntityModal from '@/components/features/shared/ui/EntityModal';
import ConfidenceBadge from '@/components/features/shared/ui/ConfidenceBadge';
import OpportunityPipeline from '@/components/features/dashboard/components/OpportunityPipeline';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import Pagination from '@/components/features/shared/ui/Pagination';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Opportunity {
  id: string;
  title: string;
  client_name: string;
  stage: string;
  status: string;
  estimated_value: number;
  probability: number;
  deadline: string;
  owner: string;
}

interface OppFilters {
  search: string;
  stage: string;
  status: string;
  minValue: string;
  maxValue: string;
  dateFrom: string;
  dateTo: string;
  instituteId: string;
}

const initialFilters: OppFilters = {
  search: '',
  stage: 'all',
  status: 'all',
  minValue: '',
  maxValue: '',
  dateFrom: '',
  dateTo: '',
  instituteId: 'all',
};

const getStageColor = (stage: string) => {
  const colors: Record<string, string> = {
    intelligence: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    approach: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    proposal: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    negotiation: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    won: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    lost: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };
  return colors[stage] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
};

// ─── Page Component ──────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  const t = useTranslations('opportunities');
  const tCommon = useTranslations('common');
  const tInstitutes = useTranslations('institutes');
  const { selectedInstitutes } = useAuth();

  // Load institutes for filter dropdown
  const { data: institutes = [] } = useQuery<any[]>({
    queryKey: ['institutes', 'filter'],
    queryFn: async () => {
      try {
        const resp = await apiClient.get('/api/v1/institutes');
        return resp?.items ?? resp ?? [];
      } catch { return []; }
    },
    staleTime: 60_000,
  });

  const availableInstitutes = useMemo(() => {
    if (!selectedInstitutes.length) return institutes;
    return institutes.filter((ins: any) => selectedInstitutes.includes(ins.id));
  }, [institutes, selectedInstitutes]);

  const state = useCrudPage<Opportunity, OppFilters>({
    queryKey: 'opportunities',
    definition: opportunityDefinition,
    initialFilters,
    defaultPageSize: 20,
    instituteScoped: true,
    selectedInstitutes,
    fetchFn: async ({ filters }) => {
      const params: Record<string, any> = {};
      if (filters.instituteId && filters.instituteId !== 'all') params.institute_id = filters.instituteId;
      if (filters.stage && filters.stage !== 'all') params.stage = filters.stage;
      if (filters.minValue) params.min_value = Number(filters.minValue);
      if (filters.maxValue) params.max_value = Number(filters.maxValue);
      if (filters.dateFrom) params.created_after = filters.dateFrom;
      if (filters.dateTo) params.created_before = filters.dateTo;
      if (filters.search) params.search = filters.search;

      const res = await apiClient.listOpportunities(params);
      const items = Array.isArray(res) ? res
        : (res as any)?.items ?? (res as any)?.data ?? (res as any)?.opportunities ?? [];
      return { items: Array.isArray(items) ? items : [], total: Array.isArray(items) ? items.length : 0 } as FetchResult<Opportunity>;
    },
  });

  const filterFields: FilterField[] = useMemo(() => [
    {
      key: 'instituteId', label: tInstitutes('title'), type: 'select',
      options: [
        { value: 'all', label: tInstitutes('selectAll') },
        ...availableInstitutes.map((ins: any) => ({
          value: ins.id, label: ins.nome || ins.name || ins.title || 'Instituto',
        })),
      ],
    },
    { key: 'search', label: tCommon('search'), type: 'text', placeholder: t('searchPlaceholder') || 'Search opportunities...' },
    {
      key: 'stage', label: t('stage'), type: 'select',
      options: [
        { value: 'all', label: t('filters.allStages') },
        { value: 'intelligence', label: t('stages.intelligence') },
        { value: 'approach', label: t('stages.approach') },
        { value: 'proposal', label: t('stages.proposal') },
        { value: 'negotiation', label: t('stages.negotiation') },
        { value: 'won', label: t('stages.won') },
        { value: 'lost', label: t('stages.lost') },
      ],
    },
    {
      key: 'status', label: t('status'), type: 'select',
      options: [
        { value: 'all', label: t('filters.allStatuses') },
        { value: 'active', label: t('statuses.active') },
        { value: 'pending', label: t('statuses.pending') },
        { value: 'completed', label: t('statuses.completed') },
      ],
    },
    { key: 'valueRange', label: t('estimatedValue'), type: 'range', minKey: 'minValue', maxKey: 'maxValue', inputType: 'number' },
    { key: 'dateFrom', label: t('dateFrom'), type: 'date' },
    { key: 'dateTo', label: t('dateTo'), type: 'date' },
  ], [t, tCommon, tInstitutes, availableInstitutes]);

  const timelineItems: TimelineItem[] = useMemo(() => {
    return state.data.map((opp) => ({
      id: opp.id,
      title: opp.title,
      description: `${opp.client_name} | ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(opp.estimated_value)}`,
      date: opp.deadline || new Date().toISOString(),
      onClick: () => state.openViewModal(opp),
      status: opp.stage === 'won' ? 'success' : opp.stage === 'lost' ? 'error' : opp.stage === 'negotiation' ? 'warning' : 'info',
      metadata: { stage: opp.stage, probability: opp.probability },
    }));
  }, [state.data]);

  const tableColumns: TableColumn<Opportunity>[] = useMemo(() => [
    { key: 'title', header: t('opportunity'), accessor: 'title', sortable: true },
    { key: 'client_name', header: t('client'), accessor: 'client_name', sortable: true },
    {
      key: 'stage', header: t('stage'), accessor: 'stage', sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStageColor(value as string)}`}>
          {String(t(`stages.${String(value)}`) || value || '')}
        </span>
      ),
    },
    {
      key: 'estimated_value', header: t('estimatedValue'), accessor: 'estimated_value', sortable: true,
      render: (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value as number),
    },
    {
      key: 'probability', header: t('probability'), accessor: 'probability', sortable: true,
      render: (value) => `${value}%`,
    },
    {
      key: 'deadline', header: t('deadline'), accessor: 'deadline', sortable: true,
      render: (value) => value ? new Date(value as string).toLocaleDateString('pt-BR') : '-',
    },
    { key: 'owner', header: t('owner'), accessor: 'owner', sortable: true },
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
          <button onClick={state.openCreateModal} title={t('newOpportunity')}
            className="inline-flex items-center justify-center p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition">
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <EntityModal<OpportunityFormData>
        definition={opportunityDefinition}
        entity={state.isCreateModalOpen ? null : (state.selectedItem as any)}
        mode={state.isCreateModalOpen ? 'create' : 'edit'}
        isOpen={state.isCreateModalOpen || state.isViewModalOpen}
        onClose={state.closeModal}
        onSuccess={() => { state.closeModal(); state.refetch(); }}
        onDeleteSuccess={() => { state.closeModal(); state.refetch(); }}
        icon={<RocketLaunchIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
        size="2xl"
        headerExtra={
          state.selectedItem?.probability
            ? <ConfidenceBadge score={state.selectedItem.probability / 100} />
            : undefined
        }
      />

      <ConfigurableStatisticsBar module="opportunities" data={state.allData} />

      <FilterPanel
        fields={filterFields}
        values={state.filters}
        onChange={state.setFilter}
        onReset={state.resetFilters}
        defaultExpanded={false}
      />

      {state.viewMode === 'board' && <OpportunityPipeline />}

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
        <TableView<Opportunity>
          data={state.allData} columns={tableColumns} getRowKey={(r) => r.id}
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
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">{tCommon('noResults')}</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {state.data.map((opp) => (
                  <li key={opp.id} onClick={() => state.openViewModal(opp)}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{opp.title}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStageColor(opp.stage)}`}>
                            {opp.stage ? t(`stages.${opp.stage}`) : '—'}
                          </span>
                          <ConfidenceBadge score={opp.probability / 100} />
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm mt-3">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('client')}:</span>
                            <p className="font-medium text-gray-900 dark:text-white">{opp.client_name}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('estimatedValue')}:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(opp.estimated_value)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('deadline')}:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {opp.deadline ? new Date(opp.deadline).toLocaleDateString('pt-BR') : '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('owner')}:</span>
                            <p className="font-medium text-gray-900 dark:text-white">{opp.owner}</p>
                          </div>
                        </div>
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
