/**
 * Analytics Export Widget
 * Provides export buttons for analytics data in JSON/CSV formats
 * Implements RF-07: Data export for Dashboard
 */
'use client';

import { useTranslations } from 'next-intl';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import type { AnalyticsPeriod, AnalyticsWidgetProps } from './types';

interface ExportProps extends AnalyticsWidgetProps {
  period: AnalyticsPeriod;
}

export default function AnalyticsExport({ period, className = '' }: ExportProps) {
  const t = useTranslations('analytics');

  const handleExport = (format: 'json' | 'csv') => {
    window.open(`/api/v1/analytics/export?format=${format}&period=${period}`, '_blank');
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 dark:bg-gray-800 dark:border-gray-700 ${className}`} data-testid="analytics-export">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('export.title')}</h3>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleExport('json')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          {t('export.json')}
        </button>
        <button
          onClick={() => handleExport('csv')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          {t('export.csv')}
        </button>
      </div>
    </div>
  );
}
