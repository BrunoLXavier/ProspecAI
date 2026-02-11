// Timeline view wrapper for ingestion jobs
// Implements RF-01: Ingestão de dados multiorigem
'use client';

import { useTranslations } from 'next-intl';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';

interface IngestionTimelineViewProps {
  items: TimelineItem[];
  isLoading: boolean;
}

export default function IngestionTimelineView({
  items,
  isLoading,
}: IngestionTimelineViewProps) {
  const t = useTranslations('ingestion');

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Jobs de Ingestão - Timeline
      </h2>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : (
        <TimelineView
          items={items}
          emptyMessage={t('noJobs') || 'Nenhum job de ingestão encontrado'}
          loading={isLoading}
        />
      )}
    </div>
  );
}
