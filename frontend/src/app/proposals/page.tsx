// Proposals List Page
// Implements RF-08: Repositório de Propostas
'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import ConfidenceBadge from '@/components/common/ConfidenceBadge';
import CreateProposalModal from '@/components/proposals/CreateProposalModal';
import ProposalDetailModal from '@/components/proposals/ProposalDetailModal';
import ProposalsBoard from '@/components/proposals/ProposalsBoard';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import PageHeader from '@/components/ui/PageHeader';
import { ViewMode } from '@/components/ui/ViewToggle';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';

interface ProposalFilters {
  search: string;
  status: string;
  opportunity: string;
  funding_source: string;
  version: string;
  dateFrom: string;
  dateTo: string;
}

// No inline mock proposals; page relies on backend API and shows appropriate empty/error states.

export default function ProposalsPage() {
  const t = useTranslations('proposals');
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(urlView === 'board' || urlView === 'list' ? urlView : 'list');
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [filters, setFilters] = useState<ProposalFilters>({
    search: '',
    status: '',
    opportunity: '',
    funding_source: '',
    version: '',
    dateFrom: '',
    dateTo: '',
  });

  const filterFields: FilterField[] = [
    { key: 'search', label: t('filters.search'), type: 'text', placeholder: t('filters.searchPlaceholder') },
    { 
      key: 'status', 
      label: t('filters.status'), 
      type: 'select', 
      options: [
        { value: 'draft', label: t('status.draft') },
        { value: 'in_review', label: t('status.in_review') },
        { value: 'submitted', label: t('status.submitted') },
        { value: 'approved', label: t('status.approved') },
        { value: 'rejected', label: t('status.rejected') },
      ]
    },
    { key: 'opportunity', label: t('filters.opportunity'), type: 'text', placeholder: t('filters.opportunityPlaceholder') },
    { key: 'funding_source', label: t('filters.fundingSource'), type: 'text', placeholder: t('filters.fundingSourcePlaceholder') },
    { 
      key: 'version', 
      label: t('filters.version'), 
      type: 'select',
      options: [
        { value: '1', label: 'v1.0' },
        { value: '2', label: 'v2.0' },
        { value: '3', label: 'v3.0+' },
      ]
    },
    { key: 'dateFrom', label: t('filters.dateFrom'), type: 'date' },
    { key: 'dateTo', label: t('filters.dateTo'), type: 'date' },
  ];

  const { data: proposals = [], isLoading, isError, error } = useQuery<any[]>({
    queryKey: ['proposals', filters.status],
    queryFn: async (): Promise<any[]> => {
      const result: any = await apiClient.listProposals({
        status: filters.status || undefined,
      });
      // Normalize API shapes: backend may return an array or an object with items/data
      if (Array.isArray(result)) return result;
      if (result == null) return [];
      const cand = result.items ?? result.data ?? result.proposals ?? [];
      return Array.isArray(cand) ? cand : [];
    },
  });

  // Client-side filtering for fields not supported by API yet
  const filteredProposals = useMemo(() => {
    return proposals.filter((proposal: any) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const titleMatch = proposal.title?.toLowerCase().includes(searchLower);
        const contentMatch = proposal.content?.toLowerCase().includes(searchLower);
        if (!titleMatch && !contentMatch) return false;
      }
      if (filters.opportunity && !proposal.opportunity_id?.toLowerCase().includes(filters.opportunity.toLowerCase())) {
        return false;
      }
      if (filters.funding_source && !proposal.funding_source?.toLowerCase().includes(filters.funding_source.toLowerCase())) {
        return false;
      }
      if (filters.dateFrom && new Date(proposal.created_at) < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && new Date(proposal.created_at) > new Date(filters.dateTo)) {
        return false;
      }
      return true;
    });
  }, [proposals, filters]);



  const handleProposalClick = (proposal: any) => {
    setSelectedProposal(proposal);
    setIsDetailModalOpen(true);
  };

  const handleProposalDeleted = (id: string) => {
    console.log('Proposal deleted:', id);
    setSelectedProposal(null);
  };

  const handleProposalMove = (proposalId: string, newStatus: string) => {
    // TODO: API call to update proposal status
    console.log(`Moving proposal ${proposalId} to ${newStatus}`);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const approved = filteredProposals.filter((p: any) => p.status === 'approved');
    const totalValue = filteredProposals.reduce((sum: number, p: any) => sum + (p.total_value || 0), 0);
    return {
      total: filteredProposals.length,
      approved: approved.length,
      totalValue,
    };
  }, [filteredProposals]);

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
            {t('newProposal')}
          </button>
        }
      />

      {/* Create Proposal Modal */}
      <CreateProposalModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      {/* Proposal Detail Modal */}
      <ProposalDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedProposal(null);
        }}
        proposal={selectedProposal}
        onDelete={handleProposalDeleted}
      />

      {/* Configurable Statistics Bar */}
      <ConfigurableStatisticsBar
        module="proposals"
        data={filteredProposals}
      />

      {isError && error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{String((error as any)?.message || error)}</p>
        </div>
      )}

      {/* Filters */}
      <FilterPanel
        fields={filterFields}
        values={filters}
        onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({
          search: '',
          status: '',
          opportunity: '',
          funding_source: '',
          version: '',
          dateFrom: '',
          dateTo: '',
        })}
      />

      {/* Content View */}
      {viewMode === 'board' ? (
        <ProposalsBoard
          proposals={filteredProposals}
          onItemClick={handleProposalClick}
          onProposalMove={handleProposalMove}
        />
      ) : (
        /* List View */
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('loading')}</div>
          ) : filteredProposals.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('noResults')}</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProposals.map((proposal: any) => (
                <li
                  key={proposal.id}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                  onClick={() => handleProposalClick(proposal)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <DocumentTextIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {proposal.title}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(proposal.status)}`}
                        >
                          {t(`status.${proposal.status}`)}
                        </span>
                        {proposal.adherence_score && (
                          <ConfidenceBadge score={proposal.adherence_score} />
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">{t('version')}:</span>
                          <p className="font-medium text-gray-900 dark:text-white">v{proposal.current_version}</p>
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
      )}
    </div>
  );
}
