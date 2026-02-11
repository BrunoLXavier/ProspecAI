// List view for ingestion jobs
// Implements RF-01: Ingestão de dados multiorigem
'use client';

import { useTranslations } from 'next-intl';
import {
  ArrowPathIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { IngestionJob } from './types';
import IngestionJobListItem from './IngestionJobListItem';

interface IngestionJobListViewProps {
  jobs: IngestionJob[];
  paginatedJobs: IngestionJob[];
  isLoading: boolean;
  selectedJobId: string | null;
  onViewJob: (job: IngestionJob) => void;
  onStartJob: (jobId: string) => void;
}

export default function IngestionJobListView({
  jobs,
  paginatedJobs,
  isLoading,
  selectedJobId,
  onViewJob,
  onStartJob,
}: IngestionJobListViewProps) {
  const t = useTranslations('ingestion');

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Jobs de Ingestão
          </h2>
          {/* Refresh button removed (jobs auto-refresh or use listing controls) */}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12">
          <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {t('noJobs') || 'Nenhum job de ingestão encontrado'}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {t('createJobPrompt') || 'Crie um novo job para começar'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {paginatedJobs.map((job) => (
            <IngestionJobListItem
              key={job.id}
              job={job}
              isSelected={selectedJobId === job.id}
              onView={onViewJob}
              onStart={onStartJob}
            />
          ))}
        </div>
      )}
    </div>
  );
}
