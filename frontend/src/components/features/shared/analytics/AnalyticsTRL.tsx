/**
 * Analytics TRL Distribution Widget
 * Displays Technology Readiness Level distribution chart
 * Implements RF-07: TRL visualization for Dashboard
 */
'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import type { AnalyticsWidgetProps, TRLData } from './types';

// =============================================================================
// Loading Skeleton
// =============================================================================

function TRLSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 dark:bg-gray-800 dark:border-gray-700 animate-pulse">
      <div className="h-5 w-40 bg-gray-200 rounded mb-4 dark:bg-gray-700" />
      <div className="flex items-end gap-2 h-40">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div 
              className="w-full bg-gray-200 rounded-t dark:bg-gray-700" 
              style={{ height: `${Math.random() * 60 + 20}%` }}
            />
            <div className="w-8 h-3 bg-gray-200 rounded dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function AnalyticsTRL({ className = '' }: AnalyticsWidgetProps) {
  const t = useTranslations('analytics');

  const { data: trlData, isLoading, isError, error } = useQuery({
    queryKey: ['analytics-trl'],
    queryFn: () => apiClient.get('/api/v1/analytics/trl-distribution'),
  });

  if (isLoading) {
    return <TRLSkeleton />;
  }

  const data: TRLData[] = trlData ?? [];

  if (isError || data.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 dark:bg-gray-800 dark:border-gray-700 ${className}`} data-testid="analytics-trl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('trl.title')}</h3>
        <p className="text-gray-500 dark:text-gray-400">{isError ? String((error as any)?.message || 'Failed to load TRL distribution') : t('trl.noData')}</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 dark:bg-gray-800 dark:border-gray-700 ${className}`} data-testid="analytics-trl">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('trl.title')}</h3>
      <div className="flex items-end gap-2 h-40">
        {data.map((item) => (
          <div key={item.trl} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-indigo-500 rounded-t transition-all hover:bg-indigo-600 cursor-pointer"
              style={{ height: `${(item.count / maxCount) * 100}%`, minHeight: item.count > 0 ? '8px' : '2px' }}
              title={`TRL ${item.trl}: ${item.count} ${t('trl.projects')}`}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">TRL {item.trl}</span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
