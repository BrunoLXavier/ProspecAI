// ProspecAI Dashboard - Main Page
// Implements RF-07: Analytics e Assistente
// Firjan SENAI Brand Identity with modern flat design
'use client';

import { Suspense, lazy, useCallback, useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useLayout } from '@/contexts/LayoutContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import type { AnalyticsPeriod } from '@/components/features/shared/analytics/types';
import DraggableWidgetGrid from '@/components/features/dashboard/components/DraggableWidgetGrid';

// Existing Dashboard components
import DashboardStats from '@/components/features/dashboard/components/DashboardStats';
import OpportunityPipeline from '@/components/features/dashboard/components/OpportunityPipeline';
import RecentActivity from '@/components/features/dashboard/components/RecentActivity';

// Lazy-loaded Dashboard widgets
const OpportunitiesWidget = lazy(() => import('@/components/features/dashboard/components/OpportunitiesWidget'));
const MatchingScoreWidget = lazy(() => import('@/components/features/dashboard/components/MatchingScoreWidget'));
const CalendarWidget = lazy(() => import('@/components/features/dashboard/components/CalendarWidget'));

// Lazy-loaded Analytics widgets for performance
const AnalyticsKPIs = lazy(() => import('@/components/features/shared/analytics/AnalyticsKPIs'));
const AnalyticsPipeline = lazy(() => import('@/components/features/shared/analytics/AnalyticsPipeline'));
const AnalyticsTRL = lazy(() => import('@/components/features/shared/analytics/AnalyticsTRL'));
const AnalyticsTrends = lazy(() => import('@/components/features/shared/analytics/AnalyticsTrends'));
const AnalyticsPeriodSelector = lazy(() => import('@/components/features/shared/analytics/AnalyticsPeriodSelector'));
const AnalyticsExport = lazy(() => import('@/components/features/shared/analytics/AnalyticsExport'));

// =============================================================================
// Loading Skeletons
// =============================================================================

function WidgetSkeleton({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const heights = { small: 'h-24', medium: 'h-48', large: 'h-64' };
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 animate-pulse dark:bg-gray-800 dark:border-gray-700 ${heights[size]}`} />
  );
}

// =============================================================================
// Widget Registry
// =============================================================================

interface WidgetConfig {
  id: string;
  label: string;
  component: React.ComponentType<any>;
  size: 'small' | 'medium' | 'large' | 'full';
  needsPeriod?: boolean;
}

const WIDGET_REGISTRY: Record<string, WidgetConfig> = {
  // Original Dashboard widgets
  'pipeline': { id: 'pipeline', label: 'Pipeline de Oportunidades', component: OpportunityPipeline, size: 'large' },
  'opportunities': { id: 'opportunities', label: 'Oportunidades', component: OpportunitiesWidget, size: 'medium' },
  'metrics': { id: 'metrics', label: 'Métricas do Dashboard', component: DashboardStats, size: 'full' },
  'activity': { id: 'activity', label: 'Atividades Recentes', component: RecentActivity, size: 'medium' },
  'matching': { id: 'matching', label: 'Matching Score', component: MatchingScoreWidget, size: 'medium' },
  'calendar': { id: 'calendar', label: 'Calendário', component: CalendarWidget, size: 'medium' },
  // Analytics widgets
  'analytics-kpis': { id: 'analytics-kpis', label: 'KPIs Analytics', component: AnalyticsKPIs, size: 'full', needsPeriod: true },
  'analytics-pipeline': { id: 'analytics-pipeline', label: 'Funil de Pipeline', component: AnalyticsPipeline, size: 'medium' },
  'analytics-trl': { id: 'analytics-trl', label: 'Distribuição TRL', component: AnalyticsTRL, size: 'medium' },
  'analytics-trends': { id: 'analytics-trends', label: 'Tendências de Matching', component: AnalyticsTrends, size: 'large' },
  'analytics-export': { id: 'analytics-export', label: 'Exportar Analytics', component: AnalyticsExport, size: 'small', needsPeriod: true },
};

// =============================================================================
// Main Component
// =============================================================================

export default function Dashboard() {
  const t = useTranslations('dashboard');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { config, updateConfig, saveConfig, reloadConfig } = useLayout();
  const { user } = useAuth();
  
  // Edit mode state for drag and drop
  const [isEditMode, setIsEditMode] = useState(false);
  // Pending edits while in edit mode (not persisted until user finishes)
  const [pendingWidgets, setPendingWidgets] = useState<string[] | null>(null);
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);

  // Client-side only: last update timestamp
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  useEffect(() => {
    setLastUpdate(new Date().toLocaleString('pt-BR'));
  }, []);

  // Read period from URL query params (default to 'month')
  const period = (searchParams.get('period') as AnalyticsPeriod) || 'month';

  // Update period in URL
  const handlePeriodChange = useCallback((newPeriod: AnalyticsPeriod) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', newPeriod);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  // Get user's primary role (first role or 'user' as fallback)
  // Do NOT default to 'admin' for unauthenticated users — use 'user' as safe fallback
  const userRole = user?.roles?.[0] || 'user';

  // Get widgets available for user's role (admin-configured)
  const availableWidgetsForRole = useMemo(() => {
    // Debug log
    console.log('[Dashboard] User:', user?.username, 'Role:', userRole, 'Enabled widgets:', config.dashboard_widgets);
    
    // If no role restrictions or user is admin, show all enabled widgets
    if (userRole === 'admin' || !config.dashboard_widgets_by_role) {
      return config.dashboard_widgets || [];
    }
    
    const roleWidgets = config.dashboard_widgets_by_role[userRole];
    
    // If role has 'all' permission, return all enabled widgets
    if (roleWidgets?.includes('all')) {
      return config.dashboard_widgets || [];
    }
    
    // Filter enabled widgets by role permissions
    return (config.dashboard_widgets || []).filter(w => roleWidgets?.includes(w));
  }, [config.dashboard_widgets, config.dashboard_widgets_by_role, userRole, user?.username]);

  // Get widget order (user's custom order or default)
  const widgetOrder = (isEditMode && pendingOrder && pendingOrder.length > 0)
    ? pendingOrder
    : (config.dashboard_widget_order && config.dashboard_widget_order.length > 0 ? config.dashboard_widget_order : availableWidgetsForRole);

  // Handle order change from drag and drop
  const handleOrderChange = useCallback(async (newOrder: string[]) => {
    if (isEditMode) {
      setPendingOrder(newOrder);
      return;
    }
    updateConfig('dashboard_widget_order', newOrder);
    // Auto-save after reordering when not in edit mode
    try {
      await saveConfig();
    } catch (e) {
      console.warn('Failed to save widget order:', e);
    }
  }, [isEditMode, updateConfig, saveConfig]);

  // Allow toggling widget visibility directly from the dashboard
  // When in edit mode, changes are applied to pending state and only saved when finishing edit mode
  const handleToggleWidget = useCallback(async (id: string, enable: boolean) => {
    if (isEditMode) {
      setPendingWidgets(prev => {
        const cur = Array.isArray(prev) ? prev : (config.dashboard_widgets || []);
        if (enable) {
          if (!cur.includes(id)) return [...cur, id];
          return cur;
        }
        return cur.filter(w => w !== id);
      });
      return;
    }

    if (!config) return;
    const current = config.dashboard_widgets || [];
    let next: string[] = [];
    if (enable) {
      if (!current.includes(id)) next = [...current, id]; else next = current;
    } else {
      next = current.filter(w => w !== id);
    }
    updateConfig('dashboard_widgets', next);
    try {
      await saveConfig();
    } catch (e) {
      console.warn('Failed to save widget visibility change:', e);
    }
  }, [isEditMode, config, updateConfig, saveConfig]);

  // Toggle edit mode. When entering edit mode, initialize pending state. When finishing
  // edit mode (toggling off), commit pending changes to backend in a single save.
  const handleToggleEditMode = useCallback(() => {
    setIsEditMode(prev => {
      const next = !prev;
      if (next) {
        // entering edit mode: initialize pending state from current config
        setPendingWidgets([...((config.dashboard_widgets) || [])]);
        setPendingOrder((config.dashboard_widget_order && config.dashboard_widget_order.length) ? [...config.dashboard_widget_order] : [...(config.dashboard_widgets || [])]);
      } else {
        // leaving edit mode: commit pending changes
        (async () => {
          try {
            const toSaveWidgets = Array.isArray(pendingWidgets) ? pendingWidgets : (config.dashboard_widgets || []);
            const toSaveOrder = Array.isArray(pendingOrder) ? pendingOrder : (config.dashboard_widget_order && config.dashboard_widget_order.length ? config.dashboard_widget_order : (config.dashboard_widgets || []));
            // Build a minimal payload based on current config but with updated widget values
            const payload = {
              ...config,
              dashboard_widgets: toSaveWidgets,
              dashboard_widget_order: toSaveOrder,
            } as any;

            // If we have a user id, include it in the query so backend can persist per-user
            const userId = user?.id;
            const query = userId ? `?user_id=${userId}` : '';

            // Persist directly using apiClient to avoid a race between updateConfig (setState)
            // and saveConfig (which reads the `config` state). After successful PUT,
            // update local state via updateConfig so React reflects the saved values.
            // eslint-disable-next-line no-console
            console.debug('[Dashboard] Persisting layout directly', { toSaveWidgets, toSaveOrder });
            await apiClient.put(`/api/v1/layout${query}`, payload);

            // Reload authoritative config from backend so provider state matches persisted values
            try {
              await reloadConfig();
            } catch (e) {
              // Fallback: update local keys if reload fails
              updateConfig('dashboard_widgets', toSaveWidgets);
              updateConfig('dashboard_widget_order', toSaveOrder);
            }
            setLastUpdate(new Date().toLocaleString('pt-BR'));
          } catch (e) {
            console.warn('Failed to persist pending dashboard edits', e);
          } finally {
            setPendingWidgets(null);
            setPendingOrder(null);
          }
        })();
      }
      return next;
    });
  }, [config, pendingWidgets, pendingOrder, updateConfig, saveConfig]);

  // Check if analytics widgets are enabled to show period selector
  const hasAnalyticsWidgets = availableWidgetsForRole.some(w => w.startsWith('analytics-'));

  // Build widget configs for DraggableWidgetGrid (based on pending state while editing)
  const effectiveEnabledWidgets = isEditMode ? (Array.isArray(pendingWidgets) ? pendingWidgets : (config.dashboard_widgets || [])) : (config.dashboard_widgets || []);
  const effectiveAvailableForRole = (() => {
    // compute availableWidgetsForRole but based on effectiveEnabledWidgets
    if (userRole === 'admin' || !config.dashboard_widgets_by_role) {
      return effectiveEnabledWidgets;
    }
    const roleWidgets = config.dashboard_widgets_by_role[userRole];
    if (roleWidgets?.includes('all')) return effectiveEnabledWidgets;
    return effectiveEnabledWidgets.filter(w => roleWidgets?.includes(w));
  })();

  const widgetConfigs = useMemo(() => {
    return effectiveAvailableForRole
      .filter(id => WIDGET_REGISTRY[id])
      .map(id => ({
        id,
        label: WIDGET_REGISTRY[id].label,
        size: WIDGET_REGISTRY[id].size,
      }));
  }, [effectiveAvailableForRole]);

  // Compute disabled widgets that are allowed for the role but currently not enabled
  const disabledWidgetsForRole = useMemo(() => {
    try {
      // Role-allowed set
      let roleAllowed: string[] = [];
      if (userRole === 'admin' || !config.dashboard_widgets_by_role) {
        roleAllowed = Object.keys(WIDGET_REGISTRY);
      } else {
        roleAllowed = config.dashboard_widgets_by_role?.[userRole] || [];
      }
      if (roleAllowed.includes('all')) roleAllowed = Object.keys(WIDGET_REGISTRY);
      const enabled = isEditMode ? (Array.isArray(pendingWidgets) ? pendingWidgets : (config.dashboard_widgets || [])) : (config.dashboard_widgets || []);
      // return allowed but not enabled
      return roleAllowed.filter(id => WIDGET_REGISTRY[id] && !enabled.includes(id));
    } catch (e) {
      return [];
    }
  }, [config.dashboard_widgets_by_role, config.dashboard_widgets, userRole, isEditMode, pendingWidgets]);

  // Render a single widget with Suspense
  const renderWidget = useCallback((widgetId: string, isDragging?: boolean) => {
    const widgetConfig = WIDGET_REGISTRY[widgetId];
    if (!widgetConfig) return null;

    const Component = widgetConfig.component;
    const props = widgetConfig.needsPeriod ? { period, onPeriodChange: handlePeriodChange } : {};

    return (
      <Suspense fallback={<WidgetSkeleton size={widgetConfig.size === 'full' ? 'medium' : widgetConfig.size} />}>
        <Component {...props} />
      </Suspense>
    );
  }, [period, handlePeriodChange]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Visão geral das suas oportunidades e métricas
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Period Selector (only if analytics widgets are enabled) */}
          {hasAnalyticsWidgets && (
            <Suspense fallback={<div className="w-32 h-10 bg-gray-100 rounded animate-pulse" />}>
              <AnalyticsPeriodSelector period={period} onPeriodChange={handlePeriodChange} />
            </Suspense>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <CalendarDaysIcon className="w-4 h-4" />
            <span>{t('lastUpdate')}: {lastUpdate ? lastUpdate : '...'}</span>
          </div>
        </div>
      </div>

      {/* Draggable Widget Grid */}
      <DraggableWidgetGrid
        widgets={widgetConfigs}
        widgetOrder={widgetOrder}
        onOrderChange={handleOrderChange}
        onToggleWidget={handleToggleWidget}
        disabledWidgets={disabledWidgetsForRole}
        renderWidget={renderWidget}
        isEditMode={isEditMode}
        onToggleEditMode={handleToggleEditMode}
      />
    </div>
  );
}

