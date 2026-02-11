// Custom hook for ingestion table columns configuration
// Implements RF-01: Ingestão de dados multiorigem
'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircleIcon,
  XCircleIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import { TableColumn } from '@/components/features/shared/ui/TableView';
import {
  IngestionJob,
  STATUS_CONFIG,
  STATUS_CLASS_MAP,
  formatDate,
} from './types';

export function useIngestionTableColumns(): TableColumn<IngestionJob>[] {
  const t = useTranslations('ingestion');

  return useMemo(() => [
    {
      key: 'name',
      header: t('jobName') || 'Nome',
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div>
          <span className="font-medium text-gray-900 dark:text-white">{value as string}</span>
          {row.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value) => {
        const statusConfig = STATUS_CONFIG[value as IngestionJob['status']];
        return (
          <span className={STATUS_CLASS_MAP[statusConfig.color as string]?.badge || 'px-2.5 py-1 text-xs rounded-full bg-gray-100 text-gray-700'}>
            {String(t(`status.${String(value)}`) || value || '')}
          </span>
        );
      },
    },
    {
      key: 'source_type',
      header: t('sourceType') || 'Tipo',
      accessor: 'source_type',
      sortable: true,
      hiddenOnMobile: true,
    },
    {
      key: 'total_files',
      header: t('stats.files') || 'Arquivos',
      accessor: 'total_files',
      sortable: true,
      align: 'center',
      hiddenOnMobile: true,
    },
    {
      key: 'total_records',
      header: t('stats.records') || 'Registros',
      accessor: (row) => row.total_records.toLocaleString(),
      sortable: true,
      align: 'center',
    },
    {
      key: 'pii_detected_count',
      header: 'PII',
      accessor: 'pii_detected_count',
      sortable: true,
      align: 'center',
      render: (value) => {
        const count = value as number;
        if (count === 0) return <span className="text-gray-400">-</span>;
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 flex items-center gap-1 justify-center">
            <ShieldExclamationIcon className="w-3 h-3" />
            {count}
          </span>
        );
      },
    },
    {
      key: 'progress_percentage',
      header: t('progress') || 'Progresso',
      accessor: 'progress_percentage',
      sortable: true,
      align: 'center',
      hiddenOnMobile: true,
      render: (value, row) => {
        const pct = value as number;
        if (row.status === 'completed') return <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />;
        if (row.status === 'failed') return <XCircleIcon className="w-5 h-5 text-red-500 mx-auto" />;
        return (
          <div className="w-full max-w-[80px] mx-auto">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary-600" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-gray-500">{Math.round(pct)}%</span>
          </div>
        );
      },
    },
    {
      key: 'created_at',
      header: t('createdAt') || 'Criado em',
      accessor: (row) => row.created_at ? formatDate(row.created_at) : '-',
      sortable: true,
      hiddenOnMobile: true,
    },
  ], [t]);
}
