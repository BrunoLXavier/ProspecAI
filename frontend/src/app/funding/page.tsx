// Funding Sources Page — Standardized via useCrudPage + EntityModal
// Implements RF-02: Gestão de Fontes de Fomento
'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { PlusIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useCrudPage, FetchResult } from '@/hooks/use-crud-page';
import { fundingDefinition, FundingFormData } from '@/lib/form-registry/definitions/funding.definition';
import EntityModal from '@/components/features/shared/ui/EntityModal';
import ConfidenceBadge from '@/components/features/shared/ui/ConfidenceBadge';
import FundingBoard from '@/components/features/funding/components/FundingBoard';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import Pagination from '@/components/features/shared/ui/Pagination';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FundingSource {
  id: string;
  name: string;
  sourceName?: string;
  instrumentType: string;
  category?: string;
  status: string;
  totalAmount: number;
  trlMin: number;
  trlMax: number;
  submissionEnd: string;
  deadline?: string;
  aiConfidenceScore?: number;
  description?: string;
  url?: string;
  focusAreas?: string[];
}

interface FundingFilters {
  status: string;
  instrumentType: string;
  search: string;
  trlMin: string;
  trlMax: string;
  deadlineFrom: string;
  deadlineTo: string;
  minAmount: string;
  maxAmount: string;
}

const initialFilters: FundingFilters = {
  status: 'all',
  instrumentType: 'all',
  search: '',
  trlMin: '',
  trlMax: '',
  deadlineFrom: '',
  deadlineTo: '',
  minAmount: '',
  maxAmount: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    open: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    suspended: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
};

const daysUntilDeadline = (dateString: string) => {
  const diff = new Date(dateString).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// ─── Page Component ──────────────────────────────────────────────────────────

export default function FundingPage() {
  const t = useTranslations('funding');
  const tCommon = useTranslations('common');
  const { selectedInstitutes } = useAuth();

  // ── Single hook for ALL CRUD state ──────────────────────────────────────
  const state = useCrudPage<FundingSource, FundingFilters>({
    queryKey: 'funding',
    definition: fundingDefinition,
    initialFilters,
    defaultPageSize: 20,
    fetchFn: async ({ filters }) => {
      const params: Record<string, any> = {};
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.instrumentType && filters.instrumentType !== 'all') params.instrument_type = filters.instrumentType;
      if (filters.deadlineFrom) params.deadline_after = filters.deadlineFrom;
      if (filters.deadlineTo) params.deadline_before = filters.deadlineTo;
      if (filters.minAmount) params.min_amount = Number(filters.minAmount);
      if (filters.maxAmount) params.max_amount = Number(filters.maxAmount);
      if (filters.trlMin) params.trl_min = Number(filters.trlMin);
      if (filters.trlMax) params.trl_max = Number(filters.trlMax);

      const res = await apiClient.listFundingSources(params);
      const items = Array.isArray(res) ? res : (res.items ?? []);
      return { items, total: items.length } as FetchResult<FundingSource>;
    },
  });

  // ── Filter fields config (reuses existing FilterPanel) ──────────────────
  const filterFields: FilterField[] = useMemo(() => [
    { key: 'search', label: tCommon('search'), type: 'text', placeholder: t('searchPlaceholder') },
    {
      key: 'status', label: t('statusLabel'), type: 'select',
      options: [
        { value: 'all', label: t('filters.allStatus') },
        { value: 'open', label: t('filters.open') },
        { value: 'closed', label: t('filters.closed') },
        { value: 'suspended', label: t('filters.suspended') },
      ],
    },
    {
      key: 'instrumentType', label: t('type'), type: 'select',
      options: [
        { value: 'all', label: t('filters.allTypes') },
        { value: 'grant', label: t('types.grant') },
        { value: 'subsidy', label: t('types.subsidy') },
        { value: 'credit', label: t('types.credit') },
        { value: 'equity', label: t('types.equity') },
      ],
    },
    { key: 'trlRange', label: t('trl'), type: 'range', minKey: 'trlMin', maxKey: 'trlMax', placeholder: '1-9' },
    { key: 'deadlineRange', label: t('deadline'), type: 'range', minKey: 'deadlineFrom', maxKey: 'deadlineTo', placeholder: tCommon('dateFormat'), inputType: 'date' },
    { key: 'amountRange', label: t('amount'), type: 'range', minKey: 'minAmount', maxKey: 'maxAmount', placeholder: 'R$ 0,00' },
  ], [t, tCommon]);

  // ── Timeline items ──────────────────────────────────────────────────────
  const timelineItems: TimelineItem[] = useMemo(() => {
    return state.data.map((funding) => ({
      id: funding.id,
      title: funding.name || funding.sourceName || '',
      description: `${String(t('instrumentType'))}: ${String(t(`types.${funding.instrumentType}`) || funding.instrumentType || '')} | ${String(t('amount'))}: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(funding.totalAmount)}`,
      date: funding.submissionEnd || funding.deadline || '',
      status: funding.status === 'open' ? 'success' : funding.status === 'closed' ? 'default' : 'warning',
      metadata: { trlMin: funding.trlMin, trlMax: funding.trlMax },
      onClick: () => state.openViewModal(funding),
    }));
  }, [state.data, t]);

  // ── Table columns ───────────────────────────────────────────────────────
  const tableColumns: TableColumn<FundingSource>[] = useMemo(() => [
    { key: 'name', header: t('sourceName'), accessor: 'name', sortable: true },
    { key: 'instrumentType', header: t('instrumentType'), accessor: 'instrumentType', sortable: true, render: (value) => String(t(`types.${String(value)}`) || value || '') },
    {
      key: 'status', header: t('statusLabel'), accessor: 'status', sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(value as string)}`}>
          {String(t(`status.${String(value)}`) || value || '')}
        </span>
      ),
    },
    {
      key: 'totalAmount', header: t('amount'), accessor: 'totalAmount', sortable: true,
      render: (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(value as number),
    },
    { key: 'trlRange', header: t('trl'), accessor: (row) => `TRL ${row.trlMin}-${row.trlMax}`, sortable: false },
    {
      key: 'submissionEnd', header: t('deadline'), accessor: 'submissionEnd', sortable: true,
      render: (value) => {
        const days = daysUntilDeadline(value as string);
        return (
          <span className={days <= 7 ? 'text-red-600 dark:text-red-400 font-semibold' : days <= 30 ? 'text-yellow-600 dark:text-yellow-400' : ''}>
            {new Date(value as string).toLocaleDateString('pt-BR')} ({days} {t('days')})
          </span>
        );
      },
    },
  ], [t]);

  // ── Prepare entity for EntityModal (map camelCase → snake_case fields) ──
  const modalEntity = useMemo(() => {
    if (!state.selectedItem) return null;
    const f = state.selectedItem;
    return {
      id: f.id,
      source_name: f.sourceName || f.name || '',
      category: f.category || f.instrumentType || '',
      status: f.status,
      deadline: f.deadline || f.submissionEnd || '',
      total_amount: f.totalAmount || 0,
      trl_min: f.trlMin || 1,
      trl_max: f.trlMax || 9,
      focus_areas: f.focusAreas || [],
      description: f.description || '',
      url: f.url || '',
    };
  }, [state.selectedItem]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        viewToggle={true}
        viewMode={state.viewMode}
        onViewChange={state.setViewMode}
        action={
          <button
            onClick={state.openCreateModal}
            title={t('newFunding')}
            className="inline-flex items-center justify-center p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      {/* ── EntityModal (single modal for create + edit + view) ──────── */}
      <EntityModal<FundingFormData>
        definition={fundingDefinition}
        entity={state.isCreateModalOpen ? null : modalEntity}
        mode={state.isCreateModalOpen ? 'create' : 'edit'}
        isOpen={state.isCreateModalOpen || state.isViewModalOpen}
        onClose={state.closeModal}
        onSuccess={() => { state.closeModal(); state.refetch(); }}
        onDeleteSuccess={() => { state.closeModal(); state.refetch(); }}
        icon={<CurrencyDollarIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
        size="2xl"
        headerExtra={
          state.selectedItem?.aiConfidenceScore ? (
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500">{t('instrumentType')}:</span>
              <ConfidenceBadge score={state.selectedItem.aiConfidenceScore} />
            </div>
          ) : undefined
        }
      />

      {/* Configurable Statistics Bar */}
      <ConfigurableStatisticsBar module="funding" data={state.allData} />

      {/* Institute hint */}
      {selectedInstitutes && selectedInstitutes.length === 0 && (
        <div className="rounded-md bg-blue-50 border border-blue-100 p-4">
          <p className="text-sm text-blue-700">{t('noInstituteSelectedHint')}</p>
        </div>
      )}

      {/* Advanced Filters */}
      <FilterPanel
        fields={filterFields}
        values={state.filters}
        onChange={state.setFilter}
        onReset={state.resetFilters}
        defaultExpanded={false}
      />

      {/* ── View Renderers ─────────────────────────────────────────── */}
      {state.viewMode === 'board' && (
        <FundingBoard fundingSources={state.allData} onItemClick={state.openViewModal} />
      )}

      {state.viewMode === 'timeline' && (
        <div className="space-y-4">
          <TimelineView items={timelineItems} showConnectors animated />
          {state.totalItems > 0 && (
            <Pagination
              currentPage={state.currentPage}
              totalItems={state.totalItems}
              pageSize={state.pageSize}
              onPageChange={state.setCurrentPage}
              onPageSizeChange={state.setPageSize}
              persistInUrl showTotal showPageSizeSelector
            />
          )}
        </div>
      )}

      {state.viewMode === 'table' && (
        <TableView<FundingSource>
          data={state.data}
          columns={tableColumns}
          getRowKey={(row) => row.id}
          onRowClick={state.openViewModal}
          loading={state.isLoading}
          emptyMessage={tCommon('noResults')}
          searchable={false}
          paginated
          pageSize={state.pageSize}
          currentPage={state.currentPage}
          totalItems={state.totalItems}
          onPageChange={state.setCurrentPage}
          onPageSizeChange={state.setPageSize}
          striped hoverable
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
                {state.data.map((funding) => (
                  <li
                    key={funding.id}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer"
                    onClick={() => state.openViewModal(funding)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {funding.name || funding.sourceName}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(funding.status)}`}>
                            {String(t(`status.${funding.status}`) || funding.status)}
                          </span>
                          {funding.aiConfidenceScore && <ConfidenceBadge score={funding.aiConfidenceScore} />}
                        </div>
                        <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('type')}:</span>
                            <p className="font-medium text-gray-900 dark:text-white">{t(`types.${funding.instrumentType}`)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('amount')}:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(funding.totalAmount)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('trl')}:</span>
                            <p className="font-medium text-gray-900 dark:text-white">{funding.trlMin} - {funding.trlMax}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('deadline')}:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {daysUntilDeadline(funding.submissionEnd || funding.deadline || '')} {t('days')}
                            </p>
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
            <Pagination
              currentPage={state.currentPage}
              totalItems={state.totalItems}
              pageSize={state.pageSize}
              onPageChange={state.setCurrentPage}
              onPageSizeChange={state.setPageSize}
              persistInUrl showTotal showPageSizeSelector
            />
          )}
        </div>
      )}
    </div>
  );
}
