// Opportunities List Page
// Implements RF-05: Pipeline de Oportunidades
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import OpportunityPipeline from '@/components/features/dashboard/components/OpportunityPipeline';
import { PlusIcon } from '@heroicons/react/24/outline';
import OpportunityModal from '@/components/features/opportunities/components/OpportunityModal';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
import ConfidenceBadge from '@/components/features/shared/ui/ConfidenceBadge';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import Pagination, { usePagination } from '@/components/features/shared/ui/Pagination';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import { ViewMode } from '@/components/features/shared/ui/ViewToggle';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';

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

interface FilterValues {
  search: string;
  stage: string;
  status: string;
  minValue: string;
  maxValue: string;
  dateFrom: string;
  dateTo: string;
  instituteId: string;
}

const initialFilters: FilterValues = {
  search: '',
  stage: 'all',
  status: 'all',
  minValue: '',
  maxValue: '',
  dateFrom: '',
  dateTo: '',
  instituteId: 'all',
};

export default function OpportunitiesPage() {
  const t = useTranslations('opportunities');
  const tCommon = useTranslations('common');
  const tInstitutes = useTranslations('institutes');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { selectedInstitutes } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(
    urlView && ['list', 'board', 'timeline', 'table'].includes(urlView) ? urlView : 'list'
  );
  const [filters, setFilters] = useState<FilterValues>(initialFilters);

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

  // Handle ?id= or ?highlight= query param to open detail modal
  const opportunityIdParam = searchParams.get('id') || searchParams.get('highlight');

  useEffect(() => {
    if (opportunityIdParam) {
      // Create a minimal opportunity object with the ID to open the modal
      setSelectedOpportunity({ id: opportunityIdParam } as Opportunity);
      setIsDetailModalOpen(true);
      // Clear the param from URL if it was highlight
      if (searchParams.get('highlight')) {
        router.replace('/opportunities', { scroll: false });
      }
    }
  }, [opportunityIdParam, searchParams, router]);

  const handleOpportunityClick = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setIsDetailModalOpen(true);
    // Update URL with id param
    router.push(`/opportunities?id=${opportunity.id}`, { scroll: false });
  };

  const handleOpportunityDeleted = (id: string) => {
    console.log('Opportunity deleted:', id);
    setSelectedOpportunity(null);
  };

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
      placeholder: t('searchPlaceholder') || 'Search opportunities...',
    },
    {
      key: 'stage',
      label: t('stage') || 'Stage',
      type: 'select',
      options: [
        { value: 'all', label: t('filters.allStages') || 'All Stages' },
        { value: 'intelligence', label: t('stages.intelligence') || 'Intelligence' },
        { value: 'approach', label: t('stages.approach') || 'Approach' },
        { value: 'proposal', label: t('stages.proposal') || 'Proposal' },
        { value: 'negotiation', label: t('stages.negotiation') || 'Negotiation' },
        { value: 'won', label: t('stages.won') || 'Won' },
        { value: 'lost', label: t('stages.lost') || 'Lost' },
      ],
    },
    {
      key: 'status',
      label: t('status') || 'Status',
      type: 'select',
      options: [
        { value: 'all', label: t('filters.allStatuses') || 'All Statuses' },
        { value: 'active', label: t('statuses.active') || 'Active' },
        { value: 'pending', label: t('statuses.pending') || 'Pending' },
        { value: 'completed', label: t('statuses.completed') || 'Completed' },
      ],
    },
    {
      key: 'valueRange',
      label: t('estimatedValue') || 'Estimated Value',
      type: 'range',
      minKey: 'minValue',
      maxKey: 'maxValue',
      inputType: 'number',
    },
    {
      key: 'dateFrom',
      label: t('dateFrom') || 'From Date',
      type: 'date',
    },
    {
      key: 'dateTo',
      label: t('dateTo') || 'To Date',
      type: 'date',
    },
  ], [t, tCommon, tInstitutes, availableInstitutes]);

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const { data: stats } = useQuery({
    queryKey: ['pipelineStats'],
    queryFn: () => apiClient.getPipelineStats()
  });

  const { data: opportunities = [], isLoading } = useQuery<Opportunity[]>({
    queryKey: ['opportunities', filters],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (filters.instituteId && filters.instituteId !== 'all') params.institute_id = filters.instituteId;
      if (filters.stage && filters.stage !== 'all') params.stage = filters.stage;
      if (filters.minValue) params.min_value = Number(filters.minValue);
      if (filters.maxValue) params.max_value = Number(filters.maxValue);
      if (filters.dateFrom) params.created_after = filters.dateFrom;
      if (filters.dateTo) params.created_before = filters.dateTo;
      if (filters.search) params.search = filters.search;

      const res = await apiClient.listOpportunities(params);
      // Defensive normalization: ensure we always return an array
      if (Array.isArray(res)) return res;
      if (res == null) return [];
      return Array.isArray((res as any).items)
        ? (res as any).items
        : Array.isArray((res as any).data)
        ? (res as any).data
        : Array.isArray((res as any).opportunities)
        ? (res as any).opportunities
        : [];
    }
  });

  // Paginate opportunities for list view
  const paginatedOpportunities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return opportunities.slice(start, start + pageSize);
  }, [opportunities, currentPage, pageSize]);

  // Transform opportunities to timeline items
  const timelineItems: TimelineItem[] = useMemo(() => {
    return paginatedOpportunities.map((opp) => ({
      id: opp.id,
      title: opp.title,
      description: `${opp.client_name} | ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(opp.estimated_value)}`,
      date: opp.deadline || new Date().toISOString(),
      onClick: () => handleOpportunityClick(opp),
      status: opp.stage === 'won' ? 'success' : opp.stage === 'lost' ? 'error' : opp.stage === 'negotiation' ? 'warning' : 'info',
      metadata: { stage: opp.stage, probability: opp.probability },
    }));
  }, [paginatedOpportunities]);

  // Table columns for TableView
  const tableColumns: TableColumn<Opportunity>[] = useMemo(() => [
    { key: 'title', header: t('opportunity'), accessor: 'title', sortable: true },
    { key: 'client_name', header: t('client'), accessor: 'client_name', sortable: true },
    { 
      key: 'stage', 
      header: t('stage'), 
      accessor: 'stage', 
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStageColor(value as string)}`}>
          {String(t(`stages.${String(value)}`) || value || '')}
        </span>
      ),
    },
    { 
      key: 'estimated_value', 
      header: t('estimatedValue'), 
      accessor: 'estimated_value', 
      sortable: true,
      render: (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value as number),
    },
    { 
      key: 'probability', 
      header: t('probability'), 
      accessor: 'probability', 
      sortable: true,
      render: (value) => `${value}%`,
    },
    { 
      key: 'deadline', 
      header: t('deadline'), 
      accessor: 'deadline', 
      sortable: true,
      render: (value) => value ? new Date(value as string).toLocaleDateString('pt-BR') : '-',
    },
    { key: 'owner', header: t('owner'), accessor: 'owner', sortable: true },
  ], [t]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Calculate statistics from opportunities data
  const calculatedStats = useMemo(() => {
    const total = opportunities.length;
    const totalValue = opportunities.reduce((sum, opp) => sum + opp.estimated_value, 0);
    const won = opportunities.filter(o => o.stage === 'won').length;
    const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;
    return {
      total_opportunities: total,
      total_estimated_value: totalValue,
      conversion_rates: { overall: conversionRate },
    };
  }, [opportunities]);

  // Use API stats if available, otherwise use calculated stats
  const displayStats = stats || calculatedStats;

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
            title={t('newOpportunity')}
            className="inline-flex items-center justify-center p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      {/* Create/Edit Opportunity Modal */}
      <OpportunityModal 
        isOpen={isModalOpen || isDetailModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setIsDetailModalOpen(false);
          setSelectedOpportunity(null);
          // Clear URL param when closing modal
          router.push('/opportunities', { scroll: false });
        }}
        opportunity={selectedOpportunity}
        onDelete={handleOpportunityDeleted}
      />

      {/* Configurable Statistics Bar */}
      <ConfigurableStatisticsBar
        module="opportunities"
        data={opportunities}
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
        /* Pipeline Kanban */
        <OpportunityPipeline />
      )}

      {viewMode === 'timeline' && (
        <div className="space-y-4">
          <TimelineView
            items={timelineItems}
            showConnectors={true}
            animated={true}
          />
          {opportunities.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={opportunities.length}
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
        <TableView<Opportunity>
          data={opportunities}
          columns={tableColumns}
          getRowKey={(row) => row.id}
          onRowClick={handleOpportunityClick}
          loading={isLoading}
          emptyMessage={tCommon('noResults')}
          searchable={false}
          paginated={true}
          pageSize={pageSize}
          currentPage={currentPage}
          totalItems={opportunities.length}
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
            ) : opportunities.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">{tCommon('noResults')}</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedOpportunities.map((opp) => (
                  <li
                    key={opp.id}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer"
                    onClick={() => handleOpportunityClick(opp)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {opp.title}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStageColor(opp.stage)}`}>
                            {opp.stage ? t(`stages.${opp.stage}`) : (opp.stage ?? '—')}
                          </span>
                          <ConfidenceBadge score={opp.probability / 100} />
                        </div>

                        <div className="grid grid-cols-4 gap-4 text-sm mt-3">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('client') || 'Client'}:</span>
                            <p className="font-medium text-gray-900 dark:text-white">{opp.client_name}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('estimatedValue') || 'Value'}:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(opp.estimated_value)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('deadline') || 'Deadline'}:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {opp.deadline ? new Date(opp.deadline).toLocaleDateString('pt-BR') : '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('owner') || 'Owner'}:</span>
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

          {/* Pagination */}
          {opportunities.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={opportunities.length}
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
