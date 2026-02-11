// Custom hook for ingestion timeline items mapping
// Implements RF-01: Ingestão de dados multiorigem
'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import { IngestionJob, STATUS_CONFIG } from './types';

export function useIngestionTimelineItems(
  paginatedJobs: IngestionJob[],
  onViewJob: (job: IngestionJob) => void,
): TimelineItem[] {
  const t = useTranslations('ingestion');

  return useMemo(() => {
    const statusToTimelineStatus = (status: IngestionJob['status']): TimelineItem['status'] => {
      switch (status) {
        case 'completed': return 'success';
        case 'failed': return 'error';
        case 'cancelled': return 'error';
        case 'pii_detection': return 'warning';
        case 'validating':
        case 'processing': return 'info';
        case 'pending': return 'pending';
        default: return 'default';
      }
    };

    return paginatedJobs.map((job) => ({
      id: job.id,
      title: job.name,
      description: job.description || `${job.total_files} arquivos, ${job.total_records.toLocaleString()} registros`,
      date: job.created_at,
      status: statusToTimelineStatus(job.status),
      tags: [
        { label: t(`status.${job.status}`) || job.status, color: STATUS_CONFIG[job.status].color },
        ...(job.pii_detected_count > 0 ? [{ label: `${job.pii_detected_count} PII`, color: 'yellow' }] : []),
      ],
      onClick: () => onViewJob(job),
      footer: job.error_message ? (
        <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4" />
          {job.error_message}
        </div>
      ) : undefined,
    }));
  }, [paginatedJobs, t, onViewJob]);
}
