/**
 * Analytics Pipeline Funnel Widget
 * Displays opportunity pipeline stages with counts and values
 * Implements RF-07: Pipeline visualization for Dashboard
 */
'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import type { AnalyticsWidgetProps, PipelineStage } from './types';

// =============================================================================
// Loading Skeleton
// =============================================================================

function PipelineSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 dark:bg-gray-800 dark:border-gray-700 animate-pulse">
      <div className="h-5 w-32 bg-gray-200 rounded mb-4 dark:bg-gray-700" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-24 h-4 bg-gray-200 rounded dark:bg-gray-700" />
            <div className="flex-1 h-8 bg-gray-100 rounded-lg dark:bg-gray-600" />
            <div className="w-20 h-4 bg-gray-200 rounded dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function AnalyticsPipeline({ className = '' }: AnalyticsWidgetProps) {
  const t = useTranslations('analytics');

  const { data: pipeline, isLoading, isError, error } = useQuery({
    queryKey: ['analytics-pipeline'],
    queryFn: () => apiClient.get('/api/v1/analytics/pipeline'),
  });

  const stageLabels: Record<string, string> = {
    intelligence: t('pipeline.stages.intelligence'),
    qualification: t('pipeline.stages.qualification'),
    proposal: t('pipeline.stages.proposal'),
    negotiation: t('pipeline.stages.negotiation'),
    won: t('pipeline.stages.won'),
    lost: t('pipeline.stages.lost'),
  };

  const stageColors: Record<string, string> = {
    intelligence: 'bg-blue-500',
    qualification: 'bg-cyan-500',
    proposal: 'bg-yellow-500',
    negotiation: 'bg-orange-500',
    won: 'bg-green-500',
    lost: 'bg-red-400',
  };

  if (isLoading) {
    return <PipelineSkeleton />;
  }

  const data: PipelineStage[] = pipeline ?? [];

  if (isError || data.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 dark:bg-gray-800 dark:border-gray-700 ${className}`} data-testid="analytics-pipeline">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('pipeline.title')}</h3>
        <p className="text-gray-500 dark:text-gray-400">{isError ? String((error as any)?.message || 'Failed to load pipeline data') : t('pipeline.noData')}</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 dark:bg-gray-800 dark:border-gray-700 ${className}`} data-testid="analytics-pipeline">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('pipeline.title')}</h3>
      <div className="space-y-3">
        {data.map((stage) => (
          <div key={stage.stage} className="flex items-center gap-3">
            <div className="w-24 text-sm text-gray-600 dark:text-gray-400 truncate">
              {stageLabels[stage.stage] || stage.stage}
            </div>
            <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden dark:bg-gray-700">
              <div
                className={`h-full ${stageColors[stage.stage] || 'bg-gray-400'} flex items-center justify-end pr-2 transition-all`}
                style={{ width: `${(stage.count / maxCount) * 100}%` }}
              >
                <span className="text-xs text-white font-medium">{stage.count}</span>
              </div>
            </div>
            <div className="w-24 text-right text-sm text-gray-500 dark:text-gray-400">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                notation: 'compact',
              }).format(stage.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
