// Custom hook for ingestion filter fields configuration
// Implements RF-01: Ingestão de dados multiorigem
'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { FilterField } from '@/components/features/shared/ui/FilterPanel';

export function useIngestionFilterFields(): FilterField[] {
  const t = useTranslations('ingestion');

  return useMemo(() => [
    {
      key: 'search',
      label: t('search') || 'Search',
      type: 'text',
      placeholder: 'Search jobs...',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'pending', label: 'Pending' },
        { value: 'validating', label: 'Validating' },
        { value: 'processing', label: 'Processing' },
        { value: 'pii_detection', label: 'PII Detection' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' },
      ],
    },
    {
      key: 'source_type',
      label: 'Source Type',
      type: 'select',
      options: [
        { value: 'all', label: 'All Types' },
        { value: 'csv', label: 'CSV' },
        { value: 'xlsx', label: 'Excel (XLSX)' },
        { value: 'json', label: 'JSON' },
        { value: 'xml', label: 'XML' },
      ],
    },
    {
      key: 'dateFrom',
      label: 'From Date',
      type: 'date',
    },
    {
      key: 'dateTo',
      label: 'To Date',
      type: 'date',
    },
  ], [t]);
}
