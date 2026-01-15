// Opportunities List Page
// Implements RF-05: Pipeline de Oportunidades
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import OpportunityPipeline from '@/components/dashboard/OpportunityPipeline';
import { PlusIcon, Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';
import CreateOpportunityModal from '@/components/opportunities/CreateOpportunityModal';
import OpportunityDetailModal from '@/components/opportunities/OpportunityDetailModal';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import ConfidenceBadge from '@/components/common/ConfidenceBadge';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';

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
}

const initialFilters: FilterValues = {
  search: '',
  stage: 'all',
  status: 'all',
  minValue: '',
  maxValue: '',
  dateFrom: '',
  dateTo: '',
};

export default function OpportunitiesPage() {
  const t = useTranslations('opportunities');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('list');
  const [filters, setFilters] = useState<FilterValues>(initialFilters);

  // Handle ?id= query param to open detail modal
  const opportunityIdParam = searchParams.get('id');

  useEffect(() => {
    if (opportunityIdParam) {
      // Create a minimal opportunity object with the ID to open the modal
      setSelectedOpportunity({ id: opportunityIdParam } as Opportunity);
      setIsDetailModalOpen(true);
    }
  }, [opportunityIdParam]);

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
  ], [t, tCommon]);

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
      // TODO: Replace with actual API call using filters
      return [
        {
          id: '1',
          title: 'Projeto de Inovação - Indústria 4.0',
          client_name: 'Empresa Inovadora Ltda',
          stage: 'proposal',
          status: 'active',
          estimated_value: 500000,
          probability: 75,
          deadline: '2026-03-15',
          owner: 'João Silva',
        },
        {
          id: '2',
          title: 'P&D em Energia Renovável',
          client_name: 'Energia Verde S.A.',
          stage: 'negotiation',
          status: 'active',
          estimated_value: 1200000,
          probability: 85,
          deadline: '2026-04-20',
          owner: 'Maria Santos',
        },
      ];
    }
  });

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('board')}
              className={`p-2 ${viewMode === 'board' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600'}`}
              title="Board View"
            >
              <Squares2X2Icon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600'}`}
              title="List View"
            >
              <ListBulletIcon className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            {t('newOpportunity')}
          </button>
        </div>
      </div>

      {/* Create Opportunity Modal */}
      <CreateOpportunityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Opportunity Detail Modal */}
      <OpportunityDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
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
      {viewMode === 'board' ? (
        /* Pipeline Kanban */
        <OpportunityPipeline />
      ) : (
        /* List View */
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">{tCommon('loading')}</div>
          ) : opportunities.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">{tCommon('noResults')}</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {opportunities.map((opp) => (
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
                          {t(`stages.${opp.stage}`) || opp.stage}
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
                            {new Date(opp.deadline).toLocaleDateString('pt-BR')}
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
      )}
    </div>
  );
}
