// Single job row for the list view
// Implements RF-01: Ingestão de dados multiorigem
'use client';

import { useTranslations } from 'next-intl';
import {
  PlayIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  IngestionJob,
  STATUS_CONFIG,
  STATUS_CLASS_MAP,
  formatDate,
} from './types';

interface IngestionJobListItemProps {
  job: IngestionJob;
  isSelected: boolean;
  onView: (job: IngestionJob) => void;
  onStart: (jobId: string) => void;
}

export default function IngestionJobListItem({
  job,
  isSelected,
  onView,
  onStart,
}: IngestionJobListItemProps) {
  const t = useTranslations('ingestion');
  const tCommon = useTranslations('common');

  const s = {
    total_files: job.total_files ?? 0,
    total_records: job.total_records ?? 0,
    progress_percentage: job.progress_percentage ?? 0,
    pii_detected_count: job.pii_detected_count ?? 0,
  };
  const statusConfig = STATUS_CONFIG[job.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div
      onClick={() => onView(job)}
      className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer ${
        isSelected ? 'bg-primary-50 dark:bg-primary-900/10' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={STATUS_CLASS_MAP[statusConfig.color as string]?.iconWrapper || 'p-2 rounded-lg bg-gray-100'}>
            <StatusIcon className={`${STATUS_CLASS_MAP[statusConfig.color as string]?.icon || 'w-5 h-5 text-gray-600'} ${['validating', 'processing', 'pii_detection'].includes(job.status) ? 'animate-spin' : ''}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">
              {job.name}
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>{s.total_files} {t('stats.files') || 'arquivos'}</span>
              <span>{s.total_records.toLocaleString()} {t('stats.records') || 'registros'}</span>
              <span>{job.created_at ? formatDate(job.created_at) : '-'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={STATUS_CLASS_MAP[statusConfig.color as string]?.badge || 'px-2.5 py-1 text-xs rounded-full bg-gray-100 text-gray-700'}>
            {String(t(`status.${String(job.status)}`) || job.status || '')}
          </span>

          {job.pii_detected_count > 0 && (
            <span className="px-2.5 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
              <ShieldExclamationIcon className="w-3 h-3" />
              {job.pii_detected_count} {t('piiDetected') || 'PII'}
            </span>
          )}

          <div className="flex items-center gap-1 ml-2">
            {job.status === 'pending' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStart(job.id);
                }}
                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition"
                title={t('startProcessingTitle') || 'Iniciar processamento'}
              >
                <PlayIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {['validating', 'processing', 'pii_detection'].includes(job.status) && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>{job.current_step || tCommon('processing') || 'Processando...'}</span>
            <span>{Math.round(s.progress_percentage)}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-500"
              style={{ width: `${s.progress_percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {job.error_message && (
        <div className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4" />
          {job.error_message}
        </div>
      )}
    </div>
  );
}
