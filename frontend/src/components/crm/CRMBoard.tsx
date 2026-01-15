// CRM Board Component
// Kanban board for CRM Clients by maturity level with DnD support
// Implements RF-04: CRM Inteligente - Board View
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import KanbanBoard, { KanbanColumn } from '@/components/ui/KanbanBoard';
import ConfidenceBadge from '@/components/common/ConfidenceBadge';

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

interface CRMBoardProps {
  clients: Client[];
  onItemClick?: (client: Client) => void;
  onClientMove?: (clientId: string, newMaturityLevel: string) => void;
}

const MATURITY_LEVELS = [
  { key: 'startup', color: 'from-blue-500 to-blue-600' },
  { key: 'growth', color: 'from-green-500 to-green-600' },
  { key: 'mature', color: 'from-purple-500 to-purple-600' },
];

export default function CRMBoard({ clients, onItemClick, onClientMove }: CRMBoardProps) {
  const t = useTranslations('crm');
  const [localClients, setLocalClients] = useState(clients);

  // Update local state when props change
  if (JSON.stringify(clients) !== JSON.stringify(localClients)) {
    setLocalClients(clients);
  }

  const columns: KanbanColumn<Client>[] = MATURITY_LEVELS.map(level => ({
    key: level.key,
    label: t(`maturity.${level.key}`),
    color: level.color,
    items: localClients.filter(c => c.maturityLevel === level.key),
  }));

  const handleDragEnd = (clientId: string, fromColumn: string, toColumn: string) => {
    // Update local state for immediate feedback
    setLocalClients(prev => prev.map(client => 
      client.id === clientId 
        ? { ...client, maturityLevel: toColumn }
        : client
    ));
    
    // Call external handler if provided
    onClientMove?.(clientId, toColumn);
  };

  const renderClientItem = (client: Client) => (
    <div
      onClick={() => onItemClick?.(client)}
      className="block p-3 bg-white dark:bg-slate-800 rounded-lg shadow-soft hover:shadow-elevated transition-all duration-200 cursor-pointer group"
    >
      <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1 group-hover:text-primary-500 transition-colors line-clamp-2">
        {client.name}
      </h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        {client.cnpj}
      </p>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {client.segment}
        </span>
        {client.aiEnrichedData && client.aiConfidenceScore && (
          <ConfidenceBadge score={client.aiConfidenceScore} size="xs" />
        )}
      </div>
      <div className="text-xs font-medium text-primary-600 dark:text-primary-400">
          {new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: 'BRL',
            notation: 'compact',
          }).format(client.annualRevenue)}
          <span className="text-gray-400 dark:text-gray-500 font-normal"> {t('perYear')}</span>
      </div>
    </div>
  );

  return (
    <KanbanBoard
      columns={columns}
      renderItem={renderClientItem}
      emptyMessage={t('noClients')}
      enableDragDrop={!!onClientMove}
      onDragEnd={handleDragEnd}
    />
  );
}
