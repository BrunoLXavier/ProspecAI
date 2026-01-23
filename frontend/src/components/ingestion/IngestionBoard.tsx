// Ingestion Board Component
// Kanban board for Ingestion Jobs by processing status
// Implements RF-01: Ingestão de dados multiorigem - Board View
'use client';

import { useTranslations } from 'next-intl';
import KanbanBoard, { KanbanColumn } from '@/components/ui/KanbanBoard';
import Icon from '@/components/ui/Icon';
import { 
  DocumentTextIcon, 
  ArrowPathIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ShieldExclamationIcon 
} from '@heroicons/react/24/outline';

interface IngestionJob {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'validating' | 'processing' | 'pii_detection' | 'completed' | 'failed' | 'cancelled';
  source_type: string;
  total_files: number;
  processed_files: number;
  total_records: number;
  processed_records: number;
  failed_records: number;
  pii_detected_count: number;
  pii_anonymized_count: number;
  progress_percentage: number;
  current_step?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

interface IngestionBoardProps {
  jobs: IngestionJob[];
  onItemClick?: (job: IngestionJob) => void | Promise<void>;
}

const INGESTION_STATUSES = [
  { key: 'pending', color: 'from-gray-500 to-gray-600' },
  { key: 'validating', color: 'from-blue-500 to-blue-600' },
  { key: 'processing', color: 'from-cyan-500 to-cyan-600' },
  { key: 'pii_detection', color: 'from-yellow-500 to-yellow-600' },
  { key: 'completed', color: 'from-green-500 to-green-600' },
  { key: 'failed', color: 'from-red-500 to-red-600' },
];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  validating: 'Validando',
  processing: 'Processando',
  pii_detection: 'Detectando PII',
  completed: 'Concluído',
  failed: 'Falhou',
  cancelled: 'Cancelado',
};

export default function IngestionBoard({ jobs, onItemClick }: IngestionBoardProps) {
  const t = useTranslations('ingestion');
  const tCommon = useTranslations('common');

  const columns: KanbanColumn<IngestionJob>[] = INGESTION_STATUSES.map(status => ({
    key: status.key,
    label: t(`status.${status.key}`),
    color: status.color,
    items: jobs.filter(j => j.status === status.key),
  }));

  const getStatusIconConfig = (status: string): { icon: React.ReactNode; color: 'secondary' | 'info' | 'warning' | 'success' | 'error'; spin?: boolean } => {
    switch (status) {
      case 'pending': return { icon: <DocumentTextIcon />, color: 'secondary' };
      case 'validating':
      case 'processing': return { icon: <ArrowPathIcon className="animate-spin" />, color: 'info', spin: true };
      case 'pii_detection': return { icon: <ShieldExclamationIcon />, color: 'warning' };
      case 'completed': return { icon: <CheckCircleIcon />, color: 'success' };
      case 'failed': return { icon: <XCircleIcon />, color: 'error' };
      default: return { icon: <DocumentTextIcon />, color: 'secondary' };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderJobItem = (job: IngestionJob) => {
    const iconConfig = getStatusIconConfig(job.status);
    return (
    <div
      onClick={() => onItemClick?.(job)}
      className="block p-3 bg-white dark:bg-slate-800 rounded-lg shadow-soft hover:shadow-elevated transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start gap-2 mb-2">
        <Icon color={iconConfig.color} size="sm" withBackground={false}>
          {iconConfig.icon}
        </Icon>
        <h4 className="font-medium text-sm text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors line-clamp-2 flex-1">
          {job.name}
        </h4>
      </div>
      
      {/* Progress bar for active jobs */}
      {['validating', 'processing', 'pii_detection'].includes(job.status) && (() => {
        const s = {
          progress_percentage: job.progress_percentage ?? 0,
        } as const;
        return (
          <div className="mb-2">
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
              <div 
                className="bg-primary-600 h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${s.progress_percentage}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {s.progress_percentage}%
            </span>
          </div>
        );
      })()}

        <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">
          {(job.total_files ?? 0)} {t('stats.files')}
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          {(job.total_records ?? 0).toLocaleString()} {t('stats.records')}
        </span>
      </div>

      {job.pii_detected_count > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
          <ShieldExclamationIcon className="w-3 h-3" />
          {job.pii_detected_count} {t('piiDetected')}
        </div>
      )}

      <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        {formatDate(job.created_at)}
      </div>
    </div>
    );
  };

  return (
    <KanbanBoard
      columns={columns}
      renderItem={renderJobItem}
      emptyMessage={tCommon('noResults')}
    />
  );
}
