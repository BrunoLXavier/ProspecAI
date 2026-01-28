/**
 * Analytics Widget Types
 * Shared types for all analytics widgets
 */

export type AnalyticsPeriod = 'week' | 'month' | 'quarter' | 'year';

export interface KPI {
  value: number;
  previous_value: number;
  trend_percentage: number;
  trend_direction: 'up' | 'down' | 'stable';
  label: string;
  unit: string;
}

export interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

export interface TRLData {
  trl: number;
  count: number;
}

export interface TrendData {
  date: string;
  matches: number;
  avg_score: number;
}

export interface AnalyticsWidgetProps {
  period?: AnalyticsPeriod;
  onPeriodChange?: (period: AnalyticsPeriod) => void;
  className?: string;
}
