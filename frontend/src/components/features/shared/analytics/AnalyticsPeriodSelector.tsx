/**
 * Analytics Period Selector Widget
 * Controls the period filter for all analytics widgets via URL query params
 * Implements RF-07: Period selection for Dashboard
 */
'use client';

import { useTranslations } from 'next-intl';
 
import { useQueryClient } from '@tanstack/react-query';
import type { AnalyticsPeriod, AnalyticsWidgetProps } from './types';

interface PeriodSelectorProps extends AnalyticsWidgetProps {
  period: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
}

export default function AnalyticsPeriodSelector({ 
  period, 
  onPeriodChange, 
  className = '' 
}: PeriodSelectorProps) {
  const t = useTranslations('analytics');
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    // Invalidate all analytics queries to trigger refetch
    queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
    queryClient.invalidateQueries({ queryKey: ['analytics-pipeline'] });
    queryClient.invalidateQueries({ queryKey: ['analytics-trl'] });
    queryClient.invalidateQueries({ queryKey: ['analytics-trends'] });
  };

  return (
    <div className={`flex items-center gap-3 ${className}`} data-testid="analytics-period-selector">
      {/* Period Selector */}
      <select
        value={period}
        onChange={(e) => onPeriodChange(e.target.value as AnalyticsPeriod)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
        aria-label={t('period.label')}
      >
        <option value="week">{t('period.week')}</option>
        <option value="month">{t('period.month')}</option>
        <option value="quarter">{t('period.quarter')}</option>
        <option value="year">{t('period.year')}</option>
      </select>

      {/* Refresh control removed (refresh via controls or auto-refresh) */}
    </div>
  );
}
