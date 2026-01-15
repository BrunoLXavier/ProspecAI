// PII Analysis Board Component
// Kanban board for PII Detections by anonymization status
// Implements RF-01: LGPD Agent - Board View
'use client';

import { useTranslations } from 'next-intl';
import KanbanBoard, { KanbanColumn } from '@/components/ui/KanbanBoard';
import { 
  ClockIcon,
  CheckCircleIcon, 
  XCircleIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

interface PIIEntity {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: number;
  suggested_strategy: string;
}

interface PIIDetection {
  id: string;
  source_id?: string;
  source_type: string;
  entities: PIIEntity[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  anonymization_status: 'pending_review' | 'approved' | 'rejected' | 'anonymized' | 'anonymization_failed';
  anonymization_strategy?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
}

interface PIIAnalysisBoardProps {
  detections: PIIDetection[];
  onItemClick?: (detection: PIIDetection) => void;
}

const PII_STATUSES = [
  { key: 'pending_review', color: 'from-yellow-500 to-yellow-600' },
  { key: 'approved', color: 'from-blue-500 to-blue-600' },
  { key: 'anonymized', color: 'from-green-500 to-green-600' },
  { key: 'rejected', color: 'from-gray-500 to-gray-600' },
  { key: 'anonymization_failed', color: 'from-red-500 to-red-600' },
];

const STATUS_LABELS: Record<string, string> = {
  pending_review: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  anonymized: 'Anonimizado',
  anonymization_failed: 'Falhou',
};

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
};

const PII_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  phone: 'Telefone',
  name: 'Nome',
  address: 'Endereço',
  rg: 'RG',
  credit_card: 'Cartão',
  bank_account: 'Conta',
  ip_address: 'IP',
  date_of_birth: 'Nascimento',
  other: 'Outro',
};

export default function PIIAnalysisBoard({ detections, onItemClick }: PIIAnalysisBoardProps) {
  const columns: KanbanColumn<PIIDetection>[] = PII_STATUSES.map(status => ({
    key: status.key,
    label: STATUS_LABELS[status.key] || status.key,
    color: status.color,
    items: detections.filter(d => d.anonymization_status === status.key),
  }));

  const getStatusIcon = (status: string) => {
    const iconClass = 'w-4 h-4';
    switch (status) {
      case 'pending_review': return <ClockIcon className={iconClass} />;
      case 'approved': return <CheckCircleIcon className={iconClass} />;
      case 'anonymized': return <ShieldCheckIcon className={iconClass} />;
      case 'rejected': return <XCircleIcon className={iconClass} />;
      case 'failed': return <ExclamationTriangleIcon className={iconClass} />;
      default: return <ClockIcon className={iconClass} />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderDetectionItem = (detection: PIIDetection) => {
    const riskColors = RISK_COLORS[detection.risk_level] || RISK_COLORS.low;
    
    return (
      <div
        onClick={() => onItemClick?.(detection)}
        className="block p-3 bg-white dark:bg-slate-800 rounded-lg shadow-soft hover:shadow-elevated transition-all duration-200 cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${riskColors.bg} ${riskColors.text}`}>
            {detection.risk_level.toUpperCase()}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {detection.source_type.replace('_', ' ')}
          </span>
        </div>

        {/* PII Types */}
        <div className="flex flex-wrap gap-1 mb-2">
          {detection.entities.slice(0, 3).map((entity, idx) => (
            <span 
              key={idx}
              className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded"
            >
              {PII_TYPE_LABELS[entity.type] || entity.type}
            </span>
          ))}
          {detection.entities.length > 3 && (
            <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded">
              +{detection.entities.length - 3}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            {detection.entities.length} entidade(s)
          </span>
          <span className="text-gray-400 dark:text-gray-500">
            {formatDate(detection.created_at)}
          </span>
        </div>

        {detection.reviewed_by && (
          <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Revisado por: {detection.reviewed_by}
          </div>
        )}
      </div>
    );
  };

  return (
    <KanbanBoard
      columns={columns}
      renderItem={renderDetectionItem}
      emptyMessage="Nenhuma detecção"
    />
  );
}
