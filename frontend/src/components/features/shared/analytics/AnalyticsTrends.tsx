/**
 * Analytics Matching Trends Widget
 * Displays matching trends over time with tooltips
 * Implements RF-07: Trend visualization for Dashboard
 */
'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import type { AnalyticsWidgetProps, TrendData } from './types';

// =============================================================================
// Loading Skeleton
// =============================================================================

function TrendsSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 dark:bg-gray-800 dark:border-gray-700 animate-pulse">
      <div className="h-5 w-36 bg-gray-200 rounded mb-4 dark:bg-gray-700" />
      <div className="flex items-end gap-1 h-32">
        {[...Array(30)].map((_, i) => (
          <div 
            key={i} 
            className="flex-1 bg-gray-200 rounded-t dark:bg-gray-700" 
            style={{ height: `${Math.random() * 80 + 10}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <div className="w-16 h-3 bg-gray-200 rounded dark:bg-gray-700" />
        <div className="w-16 h-3 bg-gray-200 rounded dark:bg-gray-700" />
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function AnalyticsTrends({ className = '' }: AnalyticsWidgetProps) {
  const t = useTranslations('analytics');

  const { data: trends, isLoading } = useQuery({
    queryKey: ['analytics-trends'],
    queryFn: () => apiClient.get('/api/v1/analytics/matching-trends?days=30'),
  });

  if (isLoading) {
    return <TrendsSkeleton />;
  }

  const data: TrendData[] = trends || [];

  if (!data?.length) {
    return (
      <div className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 dark:bg-gray-800 dark:border-gray-700 ${className}`} data-testid="analytics-trends">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('trends.title')}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('trends.noData')}</p>
      </div>
    );
  }

  const maxMatches = Math.max(...data.map(d => d.matches), 1);

  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 dark:bg-gray-800 dark:border-gray-700 ${className}`} data-testid="analytics-trends">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('trends.title')}</h3>
      <div className="flex items-end gap-1 h-32">
        {data.slice(-30).map((item, idx) => (
          <div
            key={idx}
            className="flex-1 bg-emerald-500 rounded-t hover:bg-emerald-600 transition-all cursor-pointer group relative"
            style={{ height: `${(item.matches / maxMatches) * 100}%`, minHeight: '4px' }}
            title={`${item.date}: ${item.matches} ${t('trends.matches')} (${item.avg_score}% avg)`}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {item.matches} {t('trends.matches')}
              <br />
              {t('trends.score')}: {item.avg_score}%
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-2">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
