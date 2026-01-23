// Funding Sources Page
// Implements RF-02: Gestão de Fontes de Fomento
'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import ConfidenceBadge from '@/components/common/ConfidenceBadge';
import FundingModal from '@/components/funding/FundingModal';
import FundingBoard from '@/components/funding/FundingBoard';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import PageHeader from '@/components/ui/PageHeader';
import { ViewMode } from '@/components/ui/ViewToggle';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';

interface FundingSource {
  id: string;
  name: string;
  instrumentType: string;
  status: string;
  totalAmount: number;
  trlMin: number;
  trlMax: number;
  submissionEnd: string;
  aiConfidenceScore?: number;
}

interface FilterValues {
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

const initialFilters: FilterValues = {
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

export default function FundingPage() {
  const t = useTranslations('funding');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(urlView === 'board' || urlView === 'list' ? urlView : 'list');
  const [filters, setFilters] = useState<FilterValues>(initialFilters);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFunding, setSelectedFunding] = useState<FundingSource | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Define filter fields configuration
  const filterFields: FilterField[] = useMemo(() => [
    {
      key: 'search',
      label: tCommon('search'),
      type: 'text',
      placeholder: t('searchPlaceholder'),
    },
    {
      key: 'status',
      label: t('statusLabel'),
      type: 'select',
      options: [
        { value: 'all', label: t('filters.allStatus') },
        { value: 'open', label: t('filters.open') },
        { value: 'closed', label: t('filters.closed') },
        { value: 'suspended', label: t('filters.suspended') },
      ],
    },
    {
      key: 'instrumentType',
      label: t('type'),
      type: 'select',
      options: [
        { value: 'all', label: t('filters.allTypes') },
        { value: 'grant', label: t('types.grant') },
        { value: 'subsidy', label: t('types.subsidy') },
        { value: 'credit', label: t('types.credit') },
        { value: 'equity', label: t('types.equity') },
      ],
    },
    {
      key: 'trlRange',
      label: t('trl'),
      type: 'range',
      minKey: 'trlMin',
      maxKey: 'trlMax',
      placeholder: '1-9',
    },
    {
      key: 'deadlineRange',
      label: t('deadline'),
      type: 'range',
      minKey: 'deadlineFrom',
      maxKey: 'deadlineTo',
      placeholder: tCommon('dateFormat'),
      inputType: 'date',
    },
    {
      key: 'amountRange',
      label: t('amount'),
      type: 'range',
      minKey: 'minAmount',
      maxKey: 'maxAmount',
      placeholder: 'R$ 0,00',
    },
  ], [t, tCommon]);

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const { data: fundingSources = [], isLoading } = useQuery<FundingSource[]>({
    queryKey: ['funding', filters],
    queryFn: async () => {
      // Build params mapping from UI filters
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
      // Backend returns a paginated response `{ items: [...], total, ... }` or an array.
      if (Array.isArray(res)) return res;
      return res.items ?? [];
    }
  });

  const { selectedInstitutes } = useAuth();

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      suspended: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const daysUntilDeadline = (dateString: string) => {
    const deadline = new Date(dateString);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleFundingClick = (funding: FundingSource) => {
    setSelectedFunding(funding);
    setIsViewModalOpen(true);
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
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            {t('newFunding')}
          </button>
        }
      />

      {/* Create/Edit Funding Modal */}
      <FundingModal 
        isOpen={isModalOpen || isViewModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setIsViewModalOpen(false);
          setSelectedFunding(null);
        }}
        funding={selectedFunding}
      />

      {/* Configurable Statistics Bar */}
      <ConfigurableStatisticsBar
        module="funding"
        data={fundingSources}
      />

      {/* Institute selection hint */}
      {selectedInstitutes && selectedInstitutes.length === 0 && (
        <div className="rounded-md bg-blue-50 border border-blue-100 p-4">
          <p className="text-sm text-blue-700">
            {t('noInstituteSelectedHint') || 'No institute selected — results may be global. Use the institute selector in the header to filter.'}
          </p>
        </div>
      )}

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
        <FundingBoard 
          fundingSources={fundingSources} 
          onItemClick={handleFundingClick}
        />
      ) : (
        /* List View */
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {tCommon('loading')}
            </div>
          ) : fundingSources.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {tCommon('noResults')}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {fundingSources.map((funding) => (
                <li
                  key={funding.id}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer"
                  onClick={() => handleFundingClick(funding)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {funding.name}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(funding.status)}`}
                        >
                          {t(`status.${funding.status}`)}
                        </span>
                        {funding.aiConfidenceScore && (
                          <ConfidenceBadge score={funding.aiConfidenceScore} />
                        )}
                      </div>

                      <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">{t('type')}:</span>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {t(`types.${funding.instrumentType}`)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">{t('amount')}:</span>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(funding.totalAmount)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">{t('trl')}:</span>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {funding.trlMin} - {funding.trlMax}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">{t('deadline')}:</span>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {daysUntilDeadline(funding.submissionEnd)} dias
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
      )}
    </div>
  );
}
