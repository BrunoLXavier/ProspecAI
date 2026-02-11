// Table view wrapper for ingestion jobs
// Implements RF-01: Ingestão de dados multiorigem
'use client';

import { useTranslations } from 'next-intl';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';
import { IngestionJob } from './types';

interface IngestionTableViewProps {
  jobs: IngestionJob[];
  columns: TableColumn<IngestionJob>[];
  isLoading: boolean;
  onRowClick: (job: IngestionJob) => void;
}

export default function IngestionTableView({
  jobs,
  columns,
  isLoading,
  onRowClick,
}: IngestionTableViewProps) {
  const t = useTranslations('ingestion');

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Jobs de Ingestão - Tabela
        </h2>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : (
        <TableView
          data={jobs}
          columns={columns}
          getRowKey={(row) => (row as any).id}
          onRowClick={onRowClick}
          emptyMessage={t('noJobs') || 'Nenhum job de ingestão encontrado'}
          striped
          hoverable
        />
      )}
    </div>
  );
}
