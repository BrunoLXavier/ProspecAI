// Proposals List Page — Standardized via useCrudPage + EntityModal
// Implements RF-08: Repositório de Propostas
'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import { useCrudPage, FetchResult } from '@/hooks/use-crud-page';
import { proposalDefinition, ProposalFormData } from '@/lib/form-registry/definitions/proposal.definition';
import EntityModal from '@/components/features/shared/ui/EntityModal';
import ConfidenceBadge from '@/components/features/shared/ui/ConfidenceBadge';
import ProposalsBoard from '@/components/features/proposals/components/ProposalsBoard';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import Pagination from '@/components/features/shared/ui/Pagination';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Proposal {
  id: string;
  title: string;
  status: string;
  opportunity_id?: string;
  opportunity_title?: string;
  opportunity_name?: string;
  funding_source?: string;
  funding_source_id?: string;
  version: number;
  version_count?: number;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  adherence_score?: number;
  ai_confidence?: number;
  content?: string;
  total_value?: number;
  author?: string;
}

interface ProposalFilters {
  search: string;
  status: string;
  opportunity: string;
  funding_source: string;
  version: string;
  dateFrom: string;
  dateTo: string;
}

const initialFilters: ProposalFilters = {
  search: '',
  status: '',
  opportunity: '',
  funding_source: '',
  version: '',
  dateFrom: '',
  dateTo: '',
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    in_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
};

// ─── Page Component ──────────────────────────────────────────────────────────

export default function ProposalsPage() {
  const t = useTranslations('proposals');
  const tCommon = useTranslations('common');

  const state = useCrudPage<Proposal, ProposalFilters>({
    queryKey: 'proposals',
    definition: proposalDefinition,
    initialFilters,
    defaultPageSize: 20,
    filterFn: (proposal, filters) => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (!proposal.title?.toLowerCase().includes(s) && !proposal.content?.toLowerCase().includes(s)) return false;
      }
      if (filters.opportunity && !proposal.opportunity_id?.toLowerCase().includes(filters.opportunity.toLowerCase())) return false;
      if (filters.funding_source && !proposal.funding_source?.toLowerCase().includes(filters.funding_source.toLowerCase())) return false;
      if (filters.dateFrom && new Date(proposal.created_at) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(proposal.created_at) > new Date(filters.dateTo)) return false;
      return true;
    },
    fetchFn: async () => {
      const res: any = await apiClient.listProposals({});
      const items = Array.isArray(res) ? res
        : (res?.items ?? res?.data ?? res?.proposals ?? []);
      return { items: Array.isArray(items) ? items : [], total: Array.isArray(items) ? items.length : 0 } as FetchResult<Proposal>;
    },
  });

  const filterFields: FilterField[] = [
    { key: 'search', label: t('filters.search'), type: 'text', placeholder: t('filters.searchPlaceholder') },
    {
      key: 'status', label: t('filters.status'), type: 'select',
      options: [
        { value: 'draft', label: t('status.draft') },
        { value: 'in_review', label: t('status.in_review') },
        { value: 'submitted', label: t('status.submitted') },
        { value: 'approved', label: t('status.approved') },
        { value: 'rejected', label: t('status.rejected') },
      ],
    },
    { key: 'opportunity', label: t('filters.opportunity'), type: 'text', placeholder: t('filters.opportunityPlaceholder') },
    { key: 'funding_source', label: t('filters.fundingSource'), type: 'text', placeholder: t('filters.fundingSourcePlaceholder') },
    {
      key: 'version', label: t('filters.version'), type: 'select',
      options: [
        { value: '1', label: 'v1.0' },
        { value: '2', label: 'v2.0' },
        { value: '3', label: 'v3.0+' },
      ],
    },
    { key: 'dateFrom', label: t('filters.dateFrom'), type: 'date' },
    { key: 'dateTo', label: t('filters.dateTo'), type: 'date' },
  ];

  const timelineItems: TimelineItem[] = useMemo(() => {
    return state.data.map((proposal) => ({
      id: proposal.id,
      title: proposal.title,
      description: `${t('opportunity')}: ${proposal.opportunity_title || proposal.opportunity_id || '-'} | ${t('fundingSource')}: ${proposal.funding_source || '-'}`,
      date: proposal.created_at,
      onClick: () => state.openViewModal(proposal),
      status: proposal.status === 'approved' ? 'success' : proposal.status === 'rejected' ? 'error' : proposal.status === 'submitted' ? 'info' : 'default',
      metadata: { version: proposal.version_count || 1, status: proposal.status },
    }));
  }, [state.data, t]);

  const tableColumns: TableColumn<Proposal>[] = useMemo(() => [
    { key: 'title', header: t('title'), accessor: 'title', sortable: true },
    {
      key: 'opportunity', header: t('opportunity'), accessor: 'opportunity_title', sortable: true,
      render: (value, row) => (value as string) || row.opportunity_id || '-',
    },
    {
      key: 'funding_source', header: t('fundingSource'), accessor: 'funding_source', sortable: true,
      render: (value) => (value as string) || '-',
    },
    {
      key: 'status', header: t('statusLabel'), accessor: 'status', sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(value as string)}`}>
          {String(t(`status.${String(value)}`) || value || '')}
        </span>
      ),
    },
    {
      key: 'version', header: t('version.label'), accessor: 'version_count', sortable: true,
      render: (value) => `${value || 1} ${Number(value) === 1 ? t('versionSingular') : t('versionPlural')}`,
    },
    {
      key: 'created_at', header: t('created'), accessor: 'created_at', sortable: true,
      render: (value) => new Date(value as string).toLocaleDateString('pt-BR'),
    },
  ], [t]);

  const handleProposalMove = async (proposalId: string, newStatus: string) => {
    try {
      await apiClient.patch(`/api/v1/proposals/${proposalId}`, { status: newStatus });
      state.refetch();
    } catch (err) {
      console.error('Failed to update proposal status:', err);
      state.refetch();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        viewToggle
        viewMode={state.viewMode}
        onViewChange={state.setViewMode}
        action={
          <button onClick={state.openCreateModal} title={t('newProposal')}
            className="inline-flex items-center justify-center p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition">
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <EntityModal<ProposalFormData>
        definition={proposalDefinition}
        entity={state.isCreateModalOpen ? null : (state.selectedItem as any)}
        mode={state.isCreateModalOpen ? 'create' : 'edit'}
        isOpen={state.isCreateModalOpen || state.isViewModalOpen}
        onClose={state.closeModal}
        onSuccess={() => { state.closeModal(); state.refetch(); }}
        onDeleteSuccess={() => { state.closeModal(); state.refetch(); }}
        icon={<DocumentTextIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
        size="2xl"
        headerExtra={
          state.selectedItem?.adherence_score
            ? <ConfidenceBadge score={state.selectedItem.adherence_score} />
            : undefined
        }
      />

      <ConfigurableStatisticsBar module="proposals" data={state.allData} />

      <FilterPanel
        fields={filterFields}
        values={state.filters}
        onChange={state.setFilter}
        onReset={state.resetFilters}
      />

      {state.viewMode === 'board' && (
        <ProposalsBoard proposals={state.allData} onItemClick={state.openViewModal} onProposalMove={handleProposalMove} />
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
        <TableView<Proposal>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {state.isLoading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">{tCommon('loading')}</div>
            ) : state.data.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">{tCommon('noResults')}</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {state.data.map((proposal) => (
                  <li key={proposal.id} onClick={() => state.openViewModal(proposal)}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <DocumentTextIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{proposal.title}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(proposal.status)}`}>
                            {String(t(`status.${String(proposal.status)}`) || proposal.status || '')}
                          </span>
                          {proposal.adherence_score && <ConfidenceBadge score={proposal.adherence_score} />}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('version.label')}:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {proposal.version_count || 1} {proposal.version_count === 1 ? t('versionSingular') : t('versionPlural')}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('created')}:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {new Date(proposal.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          {proposal.submitted_at && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">{t('submitted')}:</span>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {new Date(proposal.submitted_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          )}
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
