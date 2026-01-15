// CRM Clients Page
// Implements RF-04: CRM Inteligente
'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';
import ConfidenceBadge from '@/components/common/ConfidenceBadge';
import CreateClientModal from '@/components/crm/CreateClientModal';
import ViewEditClientModal from '@/components/crm/ViewEditClientModal';
import CRMBoard from '@/components/crm/CRMBoard';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import PageHeader from '@/components/ui/PageHeader';
import { ViewMode } from '@/components/ui/ViewToggle';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';

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
}

const initialFilters: FilterValues = {
  search: '',
  segment: 'all',
  maturityLevel: 'all',
  minRevenue: '',
  maxRevenue: '',
  aiEnriched: false,
};

export default function CRMClientsPage() {
  const t = useTranslations('crm');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(urlView === 'board' || urlView === 'list' ? urlView : 'list');
  const [filters, setFilters] = useState<FilterValues>(initialFilters);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
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
  ], [t, tCommon]);

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients', filters],
    queryFn: async () => {
      // TODO: Replace with actual API call using filters
      return [
        {
          id: '1',
          name: 'Empresa Inovadora Ltda',
          cnpj: '12.345.678/0001-90',
          segment: 'Tecnologia',
          annualRevenue: 15000000,
          maturityLevel: 'growth',
          aiEnrichedData: true,
          aiConfidenceScore: 0.88,
        },
        {
          id: '2',
          name: 'Indústria Sustentável S.A.',
          cnpj: '98.765.432/0001-10',
          segment: 'Manufatura',
          annualRevenue: 30000000,
          maturityLevel: 'mature',
          aiEnrichedData: true,
          aiConfidenceScore: 0.95,
        },
      ];
    }
  });

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
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            {t('newClient')}
          </button>
        }
      />

      {/* Create Client Modal */}
      <CreateClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* View/Edit Client Modal */}
      <ViewEditClientModal 
        isOpen={isViewModalOpen} 
        onClose={() => {
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
      {viewMode === 'board' ? (
        <CRMBoard 
          clients={clients}
          onItemClick={handleClientClick}
          onClientMove={handleClientMove}
        />
      ) : (
        /* List View */
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">{tCommon('loading')}</div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">{tCommon('noResults')}</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {clients.map((client) => (
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
                          {t(`maturity.${client.maturityLevel}`)}
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
                            }).format(client.annualRevenue)}
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
