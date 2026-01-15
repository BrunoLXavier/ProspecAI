// Funding Board Component
// Kanban board for Funding Sources by status
// Implements RF-02: Gestão de Fontes de Fomento - Board View
'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import KanbanBoard, { KanbanColumn } from '@/components/ui/KanbanBoard';
import ConfidenceBadge from '@/components/common/ConfidenceBadge';

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

interface FundingBoardProps {
  fundingSources: FundingSource[];
  onItemClick?: (funding: FundingSource) => void;
}

const FUNDING_STATUSES = [
  { key: 'open', color: 'from-green-500 to-green-600' },
  { key: 'suspended', color: 'from-yellow-500 to-yellow-600' },
  { key: 'closed', color: 'from-gray-500 to-gray-600' },
];

export default function FundingBoard({ fundingSources, onItemClick }: FundingBoardProps) {
  const t = useTranslations('funding');

  const columns: KanbanColumn<FundingSource>[] = FUNDING_STATUSES.map(status => ({
    key: status.key,
    label: t(`status.${status.key}`),
    color: status.color,
    items: fundingSources.filter(f => f.status === status.key),
  }));

  const daysUntilDeadline = (dateString: string) => {
    const deadline = new Date(dateString);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderFundingItem = (funding: FundingSource) => (
    <div
      onClick={() => onItemClick?.(funding)}
      className="block p-3 bg-white dark:bg-slate-800 rounded-lg shadow-soft hover:shadow-elevated transition-all duration-200 cursor-pointer group"
    >
      <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-2 group-hover:text-primary-500 transition-colors line-clamp-2">
        {funding.name}
      </h4>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t(`types.${funding.instrumentType}`) || funding.instrumentType}
        </span>
        {funding.aiConfidenceScore && (
          <ConfidenceBadge score={funding.aiConfidenceScore} size="xs" />
        )}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">
          TRL {funding.trlMin}-{funding.trlMax}
        </span>
            <span className="font-medium text-primary-600 dark:text-primary-400">
              {new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: 'BRL',
                notation: 'compact',
              }).format(funding.totalAmount)}
            </span>
      </div>
      {funding.status === 'open' && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {daysUntilDeadline(funding.submissionEnd)} {t('daysLeft')}
        </div>
      )}
    </div>
  );

  return (
    <KanbanBoard
      columns={columns}
      renderItem={renderFundingItem}
      emptyMessage={t('noFunding')}
    />
  );
}
