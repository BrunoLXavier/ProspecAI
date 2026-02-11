// CRM Clients Page
// Implements RF-04: CRM Inteligente
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import ConfidenceBadge from '@/components/features/shared/ui/ConfidenceBadge';
import ClientModal from '@/components/features/crm/components/ClientModal';
import CRMBoard from '@/components/features/crm/components/CRMBoard';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import { ViewMode } from '@/components/features/shared/ui/ViewToggle';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import Pagination, { usePagination } from '@/components/features/shared/ui/Pagination';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';

interface Client {
  id: string;
  name: string;
  cnpj: string;
  segment: string;
  annualRevenue: number;
  maturityLevel: string;
  aiEnrichedData: boolean;
  aiConfidenceScore?: number;
}

interface FilterValues {
  search: string;
  segment: string;
  maturityLevel: string;
  minRevenue: string;
  maxRevenue: string;
  aiEnriched: boolean;
  instituteId: string;
}

const initialFilters: FilterValues = {
  search: '',
  segment: 'all',
  maturityLevel: 'all',
  minRevenue: '',
  maxRevenue: '',
  aiEnriched: false,
  instituteId: 'all',
};

export default function CRMClientsPage() {
  const t = useTranslations('crm');
  const tCommon = useTranslations('common');
  const tInstitutes = useTranslations('institutes');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { selectedInstitutes } = useAuth();
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(
    urlView && ['list', 'board', 'timeline', 'table'].includes(urlView) ? urlView : 'list'
  );
  const [filters, setFilters] = useState<FilterValues>(initialFilters);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [highlightProcessed, setHighlightProcessed] = useState(false);

  // Pagination state
  const { initialPage, initialPageSize } = usePagination(20, true);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Load institutes for filter dropdown
  const { data: institutes = [] } = useQuery<any[]>({
    queryKey: ['institutes', 'filter'],
    queryFn: async () => {
      try {
        const resp = await apiClient.get('/api/v1/institutes');
        return resp?.items ?? resp ?? [];
      } catch (e) {
        return [];
      }
    },
    staleTime: 60_000,
  });

  // Filter institutes to only show selected ones from header
  const availableInstitutes = useMemo(() => {
    if (!selectedInstitutes.length) return institutes;
    return institutes.filter((ins: any) => selectedInstitutes.includes(ins.id));
  }, [institutes, selectedInstitutes]);

  // Define filter fields configuration
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
    {
      key: 'search',
      label: tCommon('search'),
      type: 'text',
      placeholder: t('searchPlaceholder'),
    },
    {
      key: 'segment',
      label: t('segment'),
      type: 'select',
      options: [
        { value: 'all', label: t('filters.allSegments') },
        { value: 'technology', label: t('segments.technology') },
        { value: 'manufacturing', label: t('segments.manufacturing') },
        { value: 'services', label: t('segments.services') },
        { value: 'agribusiness', label: t('segments.agribusiness') },
      ],
    },
    {
      key: 'maturityLevel',
      label: t('maturityLabel'),
      type: 'select',
      options: [
        { value: 'all', label: t('filters.allMaturity') },
        { value: 'startup', label: t('maturity.startup') },
        { value: 'growth', label: t('maturity.growth') },
        { value: 'mature', label: t('maturity.mature') },
      ],
    },
    {
      key: 'revenueRange',
      label: t('revenue'),
      type: 'range',
      minKey: 'minRevenue',
      maxKey: 'maxRevenue',
    },
    {
      key: 'aiEnriched',
      label: t('aiEnriched'),
      type: 'checkbox',
      placeholder: t('onlyAiEnriched'),
    },
  ], [t, tCommon, tInstitutes, availableInstitutes]);

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients', filters],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (filters.instituteId && filters.instituteId !== 'all') params.institute_id = filters.instituteId;
      if (filters.segment && filters.segment !== 'all') params.segment = filters.segment;
      if (filters.maturityLevel && filters.maturityLevel !== 'all') params.maturity_level = filters.maturityLevel;
      if (filters.minRevenue) params.min_revenue = Number(filters.minRevenue);
      if (filters.maxRevenue) params.max_revenue = Number(filters.maxRevenue);
      if (filters.aiEnriched) params.has_ai_enrichment = true;

      const res = await apiClient.listClients(params);
      const items = Array.isArray(res) ? res : (res.items ?? []);
      // Map snake_case API fields to camelCase interface
      return items.map((c: any) => ({
        id: c.id,
        name: c.name || c.nome || '',
        cnpj: c.cnpj || '',
        segment: c.segment || c.segmento || '',
        annualRevenue: c.annual_revenue ?? c.annualRevenue ?? 0,
        maturityLevel: c.maturity_level ?? c.maturityLevel ?? 'startup',
        aiEnrichedData: c.ai_enriched_data ?? c.aiEnrichedData ?? false,
        aiConfidenceScore: c.ai_confidence_score ?? c.aiConfidenceScore,
      }));
    }
  });

  // Handle highlight param to auto-open client modal
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId && clients.length > 0 && !highlightProcessed) {
      const clientToHighlight = clients.find(c => c.id === highlightId);
      if (clientToHighlight) {
        setSelectedClient(clientToHighlight);
        setIsViewModalOpen(true);
        setHighlightProcessed(true);
        // Clear the highlight param from URL
        router.replace('/crm', { scroll: false });
      }
    }
  }, [searchParams, clients, highlightProcessed, router]);

  // Paginate clients for list view
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return clients.slice(start, start + pageSize);
  }, [clients, currentPage, pageSize]);

  // Transform clients to timeline items
  const timelineItems: TimelineItem[] = useMemo(() => {
    return paginatedClients.map((client) => ({
      id: client.id,
      title: client.name,
      description: `${t('segment')}: ${client.segment} | ${t('revenue')}: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(client.annualRevenue || 0)}`,
      date: new Date().toISOString(),
      status: client.maturityLevel === 'mature' ? 'success' : client.maturityLevel === 'growth' ? 'info' : 'warning',
      metadata: { maturityLevel: client.maturityLevel, aiEnriched: client.aiEnrichedData },
      onClick: () => handleClientClick(client),
    }));
  }, [paginatedClients, t]);

  // Table columns for TableView
  const tableColumns: TableColumn<Client>[] = useMemo(() => [
    { key: 'name', header: t('clientName'), accessor: 'name', sortable: true },
    { key: 'cnpj', header: t('cnpj'), accessor: 'cnpj', sortable: true },
    { key: 'segment', header: t('segment'), accessor: 'segment', sortable: true },
    { 
      key: 'annualRevenue', 
      header: t('revenue'), 
      accessor: 'annualRevenue', 
      sortable: true,
      render: (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format((value as number) || 0),
    },
    { 
      key: 'maturityLevel', 
      header: t('maturityLabel'), 
      accessor: 'maturityLevel', 
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMaturityColor(value as string)}`}>
          {String(t(`maturity.${String(value)}`) || value || '')}
        </span>
      ),
    },
    { 
      key: 'aiEnrichedData', 
      header: t('aiEnriched'), 
      accessor: 'aiEnrichedData', 
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${value ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
          {value ? tCommon('yes') : tCommon('no')}
        </span>
      ),
    },
  ], [t, tCommon]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const getMaturityColor = (level: string) => {
    const colors: Record<string, string> = {
      startup: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      growth: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      mature: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    };
    return colors[level] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setIsViewModalOpen(true);
  };

  const handleClientMove = (clientId: string, newMaturityLevel: string) => {
    // TODO: API call to update client maturity level
    console.log(`Moving client ${clientId} to ${newMaturityLevel}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        viewToggle={true}
        viewMode={viewMode}
        onViewChange={setViewMode}
        action={
          <button 
            onClick={() => setIsModalOpen(true)}
            title={t('newClient')}
            className="inline-flex items-center justify-center p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      {/* Create/Edit Client Modal */}
      <ClientModal 
        isOpen={isModalOpen || isViewModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setIsViewModalOpen(false);
          setSelectedClient(null);
        }}
        client={selectedClient}
      />

      {/* Configurable Statistics Bar */}
      <ConfigurableStatisticsBar
        module="crm"
        data={clients}
      />

      {/* Advanced Filters */}
      <FilterPanel
        fields={filterFields}
        values={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        defaultExpanded={false}
      />

      {/* Content View */}
      {viewMode === 'board' && (
        <CRMBoard 
          clients={clients}
          onItemClick={handleClientClick}
          onClientMove={handleClientMove}
        />
      )}

      {viewMode === 'timeline' && (
        <div className="space-y-4">
          <TimelineView
            items={timelineItems}
            showConnectors={true}
            animated={true}
          />
          {clients.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={clients.length}
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

      {viewMode === 'table' && (
        <TableView<Client>
          data={clients}
          columns={tableColumns}
          getRowKey={(row) => row.id}
          onRowClick={handleClientClick}
          loading={isLoading}
          emptyMessage={tCommon('noResults')}
          searchable={false}
          paginated={true}
          pageSize={pageSize}
          currentPage={currentPage}
          totalItems={clients.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          striped={true}
          hoverable={true}
        />
      )}

      {viewMode === 'list' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">{tCommon('loading')}</div>
            ) : clients.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">{tCommon('noResults')}</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedClients.map((client) => (
                  <li
                    key={client.id}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer"
                    onClick={() => handleClientClick(client)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {client.name}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getMaturityColor(client.maturityLevel)}`}
                          >
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
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                notation: 'compact',
                              }).format(client.annualRevenue || 0)}
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

          {/* Pagination */}
          {clients.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={clients.length}
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
    </div>
  );
}
