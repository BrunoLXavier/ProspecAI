// CRM Clients Page — Standardized via useCrudPage + EntityModal
// Implements RF-04: CRM Inteligente
'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useCrudPage, FetchResult } from '@/hooks/use-crud-page';
import { clientDefinition, ClientFormData } from '@/lib/form-registry/definitions/client.definition';
import EntityModal from '@/components/features/shared/ui/EntityModal';
import ConfidenceBadge from '@/components/features/shared/ui/ConfidenceBadge';
import CRMBoard from '@/components/features/crm/components/CRMBoard';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import Pagination from '@/components/features/shared/ui/Pagination';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string;
  cnpj: string;
  segment: string;
  annualRevenue: number;
  maturityLevel: string;
  aiEnrichedData: boolean;
  aiConfidenceScore?: number;
  institute_id?: string;
}

interface CrmFilters {
  search: string;
  segment: string;
  maturityLevel: string;
  minRevenue: string;
  maxRevenue: string;
  aiEnriched: boolean;
  instituteId: string;
}

const initialFilters: CrmFilters = {
  search: '',
  segment: 'all',
  maturityLevel: 'all',
  minRevenue: '',
  maxRevenue: '',
  aiEnriched: false,
  instituteId: 'all',
};

const getMaturityColor = (level: string) => {
  const colors: Record<string, string> = {
    startup: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    growth: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    mature: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  };
  return colors[level] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
};

// ─── Page Component ──────────────────────────────────────────────────────────

export default function CRMClientsPage() {
  const t = useTranslations('crm');
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

  const state = useCrudPage<Client, CrmFilters>({
    queryKey: 'clients',
    definition: clientDefinition,
    initialFilters,
    defaultPageSize: 20,
    instituteScoped: true,
    selectedInstitutes,
    fetchFn: async ({ filters }) => {
      const params: Record<string, any> = {};
      if (filters.instituteId && filters.instituteId !== 'all') params.institute_id = filters.instituteId;
      if (filters.segment && filters.segment !== 'all') params.segment = filters.segment;
      if (filters.maturityLevel && filters.maturityLevel !== 'all') params.maturity_level = filters.maturityLevel;
      if (filters.minRevenue) params.min_revenue = Number(filters.minRevenue);
      if (filters.maxRevenue) params.max_revenue = Number(filters.maxRevenue);
      if (filters.aiEnriched) params.has_ai_enrichment = true;

      const res = await apiClient.listClients(params);
      const items = (Array.isArray(res) ? res : (res.items ?? [])).map((c: any) => ({
        id: c.id,
        name: c.name || c.nome || '',
        cnpj: c.cnpj || '',
        segment: c.segment || c.segmento || '',
        annualRevenue: c.annual_revenue ?? c.annualRevenue ?? 0,
        maturityLevel: c.maturity_level ?? c.maturityLevel ?? 'startup',
        aiEnrichedData: c.ai_enriched_data ?? c.aiEnrichedData ?? false,
        aiConfidenceScore: c.ai_confidence_score ?? c.aiConfidenceScore,
        institute_id: c.institute_id,
      }));
      return { items, total: items.length } as FetchResult<Client>;
    },
  });

  // Map camelCase page data → snake_case definition fields for EntityModal
  const modalEntity = useMemo(() => {
    if (!state.selectedItem) return null;
    const c = state.selectedItem;
    return {
      ...c,
      name: c.name,
      cnpj: c.cnpj,
      segment: c.segment,
      annual_revenue: c.annualRevenue,
      maturity_level: c.maturityLevel,
    };
  }, [state.selectedItem]);

  const filterFields: FilterField[] = useMemo(() => [
    {
      key: 'instituteId',
      label: tInstitutes('title'),
      type: 'select',
      options: [
        { value: 'all', label: tInstitutes('selectAll') },
        ...availableInstitutes.map((ins: any) => ({
          value: ins.id,
          label: ins.nome || ins.name || ins.title || 'Instituto',
        })),
      ],
    },
    { key: 'search', label: tCommon('search'), type: 'text', placeholder: t('searchPlaceholder') },
    {
      key: 'segment', label: t('segment'), type: 'select',
      options: [
        { value: 'all', label: t('filters.allSegments') },
        { value: 'technology', label: t('segments.technology') },
        { value: 'manufacturing', label: t('segments.manufacturing') },
        { value: 'services', label: t('segments.services') },
        { value: 'agribusiness', label: t('segments.agribusiness') },
      ],
    },
    {
      key: 'maturityLevel', label: t('maturityLabel'), type: 'select',
      options: [
        { value: 'all', label: t('filters.allMaturity') },
        { value: 'startup', label: t('maturity.startup') },
        { value: 'growth', label: t('maturity.growth') },
        { value: 'mature', label: t('maturity.mature') },
      ],
    },
    { key: 'revenueRange', label: t('revenue'), type: 'range', minKey: 'minRevenue', maxKey: 'maxRevenue' },
    { key: 'aiEnriched', label: t('aiEnriched'), type: 'checkbox', placeholder: t('onlyAiEnriched') },
  ], [t, tCommon, tInstitutes, availableInstitutes]);

  const timelineItems: TimelineItem[] = useMemo(() => {
    return state.data.map((client) => ({
      id: client.id,
      title: client.name,
      description: `${t('segment')}: ${client.segment} | ${t('revenue')}: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(client.annualRevenue || 0)}`,
      date: new Date().toISOString(),
      status: client.maturityLevel === 'mature' ? 'success' : client.maturityLevel === 'growth' ? 'info' : 'warning',
      metadata: { maturityLevel: client.maturityLevel, aiEnriched: client.aiEnrichedData },
      onClick: () => state.openViewModal(client),
    }));
  }, [state.data, t]);

  const tableColumns: TableColumn<Client>[] = useMemo(() => [
    { key: 'name', header: t('clientName'), accessor: 'name', sortable: true },
    { key: 'cnpj', header: t('cnpj'), accessor: 'cnpj', sortable: true },
    { key: 'segment', header: t('segment'), accessor: 'segment', sortable: true },
    {
      key: 'annualRevenue', header: t('revenue'), accessor: 'annualRevenue', sortable: true,
      render: (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format((value as number) || 0),
    },
    {
      key: 'maturityLevel', header: t('maturityLabel'), accessor: 'maturityLevel', sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMaturityColor(value as string)}`}>
          {String(t(`maturity.${String(value)}`) || value || '')}
        </span>
      ),
    },
    {
      key: 'aiEnrichedData', header: t('aiEnriched'), accessor: 'aiEnrichedData', sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${value ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
          {value ? tCommon('yes') : tCommon('no')}
        </span>
      ),
    },
  ], [t, tCommon]);

  const handleClientMove = async (clientId: string, newMaturityLevel: string) => {
    try {
      await apiClient.patch(`/api/v1/crm/${clientId}`, { maturity_level: newMaturityLevel });
      state.refetch();
    } catch (err) {
      console.error('Failed to update client maturity:', err);
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
          <button onClick={state.openCreateModal} title={t('newClient')}
            className="inline-flex items-center justify-center p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition">
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <EntityModal<ClientFormData>
        definition={clientDefinition}
        entity={state.isCreateModalOpen ? null : (modalEntity as any)}
        mode={state.isCreateModalOpen ? 'create' : 'edit'}
        isOpen={state.isCreateModalOpen || state.isViewModalOpen}
        onClose={state.closeModal}
        onSuccess={() => { state.closeModal(); state.refetch(); }}
        onDeleteSuccess={() => { state.closeModal(); state.refetch(); }}
        icon={<UserGroupIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
        size="2xl"
        headerExtra={
          state.selectedItem?.aiEnrichedData && state.selectedItem?.aiConfidenceScore
            ? <ConfidenceBadge score={state.selectedItem.aiConfidenceScore} />
            : undefined
        }
      />

      <ConfigurableStatisticsBar module="crm" data={state.allData} />

      <FilterPanel
        fields={filterFields}
        values={state.filters}
        onChange={state.setFilter}
        onReset={state.resetFilters}
        defaultExpanded={false}
      />

      {state.viewMode === 'board' && (
        <CRMBoard clients={state.allData} onItemClick={state.openViewModal} onClientMove={handleClientMove} />
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
        <TableView<Client>
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
                {state.data.map((client) => (
                  <li key={client.id} onClick={() => state.openViewModal(client)}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{client.name}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMaturityColor(client.maturityLevel)}`}>
                            {String(t(`maturity.${String(client.maturityLevel)}`) || client.maturityLevel || '')}
                          </span>
                          {client.aiEnrichedData && client.aiConfidenceScore && (
                            <ConfidenceBadge score={client.aiConfidenceScore} />
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('cnpj')}:</span>
                            <p className="font-medium text-gray-900 dark:text-white">{client.cnpj}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('segment')}:</span>
                            <p className="font-medium text-gray-900 dark:text-white">{client.segment}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('revenue')}:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(client.annualRevenue || 0)}
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
            <Pagination currentPage={state.currentPage} totalItems={state.totalItems} pageSize={state.pageSize}
              onPageChange={state.setCurrentPage} onPageSizeChange={state.setPageSize} persistInUrl showTotal showPageSizeSelector />
          )}
        </div>
      )}
    </div>
  );
}
