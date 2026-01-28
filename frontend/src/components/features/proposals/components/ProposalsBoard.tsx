// Proposals Board Component
// Kanban board for Proposals by status with DnD support
// Implements RF-08: Repositório de Propostas - Board View
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import KanbanBoard, { KanbanColumn } from '@/components/features/shared/ui/KanbanBoard';
import ConfidenceBadge from '@/components/features/shared/common/ConfidenceBadge';

interface Proposal {
  id: string;
  title: string;
  opportunity_id?: string;
  opportunity_name?: string;
  funding_source?: string;
  status: string;
  version: number;
  total_value?: number;
  ai_confidence?: number;
  created_at: string;
  updated_at: string;
  author?: string;
}

interface ProposalsBoardProps {
  proposals: Proposal[];
  onItemClick?: (proposal: Proposal) => void;
  onProposalMove?: (proposalId: string, newStatus: string) => void;
}

const PROPOSAL_STATUSES = [
  { key: 'draft', color: 'from-gray-500 to-gray-600' },
  { key: 'in_review', color: 'from-yellow-500 to-yellow-600' },
  { key: 'submitted', color: 'from-blue-500 to-blue-600' },
  { key: 'approved', color: 'from-green-500 to-green-600' },
  { key: 'rejected', color: 'from-red-500 to-red-600' },
];

export default function ProposalsBoard({ proposals, onItemClick, onProposalMove }: ProposalsBoardProps) {
  const t = useTranslations('proposals');
  // Ensure proposals is always an array to avoid runtime .map / .filter errors
  const safeProposals = Array.isArray(proposals) ? proposals : [];
  const [localProposals, setLocalProposals] = useState<Proposal[]>(safeProposals);

  // Update local state when props change
  if (JSON.stringify(safeProposals) !== JSON.stringify(localProposals)) {
    setLocalProposals(safeProposals);
  }

  const columns: KanbanColumn<Proposal>[] = PROPOSAL_STATUSES.map(status => ({
    key: status.key,
    label: t(`status.${status.key}`),
    color: status.color,
    items: localProposals.filter(p => p.status === status.key),
  }));

  const handleDragEnd = (proposalId: string, fromColumn: string, toColumn: string) => {
    // Update local state for immediate feedback
    setLocalProposals(prev => prev.map(proposal => 
      proposal.id === proposalId 
        ? { ...proposal, status: toColumn }
        : proposal
    ));
    
    // Call external handler if provided
    onProposalMove?.(proposalId, toColumn);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const renderProposalItem = (proposal: Proposal) => (
    <div
      onClick={() => onItemClick?.(proposal)}
      className="block p-3 bg-white dark:bg-slate-800 rounded-lg shadow-soft hover:shadow-elevated transition-all duration-200 cursor-pointer group"
    >
      <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1 group-hover:text-primary-500 transition-colors line-clamp-2">
        {proposal.title}
      </h4>
      {proposal.funding_source && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {proposal.funding_source}
        </p>
      )}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          v{proposal.version}.0
        </span>
        {proposal.ai_confidence && (
          <ConfidenceBadge score={proposal.ai_confidence} size="xs" />
        )}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">
          {formatDate(proposal.updated_at)}
        </span>
        {proposal.total_value && (
          <span className="font-medium text-primary-600 dark:text-primary-400">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              notation: 'compact',
            }).format(proposal.total_value)}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <KanbanBoard
      columns={columns}
      renderItem={renderProposalItem}
      emptyMessage={t('noProposals')}
      enableDragDrop={!!onProposalMove}
      onDragEnd={handleDragEnd}
    />
  );
}
