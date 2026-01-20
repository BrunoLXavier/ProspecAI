/**
 * Analytics KPIs Widget
 * Displays key performance indicators with trend indicators
 * Implements RF-07: KPI visualization for Dashboard
 */
'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  CurrencyDollarIcon,
  FolderIcon,
  DocumentTextIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import type { AnalyticsWidgetProps, KPI } from './types';

// =============================================================================
// KPI Card Component
// =============================================================================

function KPICard({ kpi, icon: Icon }: { kpi: KPI; icon: React.ElementType }) {
  const formatValue = (value: number, unit: string) => {
    if (unit === 'R$') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        notation: 'compact',
      }).format(value);
    }
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString('pt-BR');
  };

  const TrendIcon = 
    kpi.trend_direction === 'up' ? ArrowTrendingUpIcon :
    kpi.trend_direction === 'down' ? ArrowTrendingDownIcon : MinusIcon;

  const trendColor = 
    kpi.trend_direction === 'up' ? 'text-green-600 dark:text-green-400' :
    kpi.trend_direction === 'down' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400';

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex-shrink-0 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
          <div className="w-6 h-6 text-primary-500">
            <Icon className="h-6 w-6" />
          </div>
        </div>
        <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
          <TrendIcon className="h-4 w-4" />
          <span>{Math.abs(kpi.trend_percentage).toFixed(1)}%</span>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xl font-bold text-gray-900 dark:text-white">
          {formatValue(kpi.value, kpi.unit)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{kpi.label}</p>
      </div>
    </div>
  );
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 animate-pulse dark:bg-gray-800 dark:border-gray-700">
          <div className="h-9 w-9 bg-gray-200 rounded-lg dark:bg-gray-700" />
          <div className="h-6 w-16 bg-gray-200 rounded mt-3 dark:bg-gray-700" />
          <div className="h-3 w-24 bg-gray-100 rounded mt-2 dark:bg-gray-600" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function AnalyticsKPIs({ period = 'month', className = '' }: AnalyticsWidgetProps) {
  const t = useTranslations('analytics');

  const { data: overview, isLoading } = useQuery({
    queryKey: ['analytics-overview', period],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/analytics/overview?period=${period}`);
      return response;
    },
  });

  if (isLoading) {
    return <KPISkeleton />;
  }

  const kpis = overview?.kpis || {};

  const defaultKPI = (label: string): KPI => ({
    value: 0,
    previous_value: 0,
    trend_percentage: 0,
    trend_direction: 'stable',
    label,
    unit: '',
  });

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 ${className}`} data-testid="analytics-kpis">
      <KPICard 
        kpi={kpis.total_clients || defaultKPI(t('kpis.totalClients'))} 
        icon={UsersIcon}
      />
      <KPICard 
        kpi={kpis.total_projects || defaultKPI(t('kpis.totalProjects'))} 
        icon={FolderIcon}
      />
      <KPICard 
        kpi={kpis.active_opportunities || kpis.pipeline_value || defaultKPI(t('kpis.activeOpportunities'))} 
        icon={CurrencyDollarIcon}
      />
      {kpis.active_funding && (
        <KPICard kpi={kpis.active_funding} icon={DocumentTextIcon} />
      )}
      {kpis.conversion_rate && (
        <KPICard kpi={kpis.conversion_rate} icon={ChartBarIcon} />
      )}
      {kpis.proposals_submitted && (
        <KPICard kpi={kpis.proposals_submitted} icon={DocumentTextIcon} />
      )}
      {kpis.avg_match_score && (
        <KPICard kpi={kpis.avg_match_score} icon={ChartBarIcon} />
      )}
    </div>
  );
}
