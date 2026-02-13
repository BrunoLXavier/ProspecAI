// Activity Page
// Recent activity feed and audit log
'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  ClockIcon,
  FunnelIcon,
  DocumentPlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowRightIcon,
  UserIcon,
  CpuChipIcon,
  DocumentTextIcon,
  BriefcaseIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import StatCard from '@/components/features/shared/ui/StatCard';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import Pagination, { usePagination } from '@/components/features/shared/ui/Pagination';
import Icon from '@/components/features/shared/ui/Icon';
import { BaseModal, ModalFooter } from '@/components/features/shared/ui';

interface Activity {
  id: string;
  type: 'create' | 'update' | 'delete' | 'transition' | 'match' | 'submit';
  entity: 'funding' | 'project' | 'client' | 'opportunity' | 'proposal';
  entityId: string;
  entityName: string;
  actor: {
    id: string;
    name: string;
    type: 'user' | 'system';
  };
  metadata?: Record<string, any>;
  createdAt: string;
}

export default function ActivityPage() {
  const t = useTranslations('activity');
  const [filters, setFilters] = useState<{ entity: string; type: string }>({ entity: 'all', type: 'all' });
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'timeline' | 'table'>('list');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  
  // Pagination state
  const { initialPage, initialPageSize } = usePagination(20, true);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ['activities', filters.entity, filters.type],
    queryFn: async () => {
      // Fetch recent activity from backend (tenant-aware)
      try {
        const resp = await (await import('@/lib/api-client')).apiClient.get<Activity[]>('/api/v1/activity/recent');
        const list = Array.isArray(resp)
          ? resp
          : (Array.isArray((resp as any)?.activities) ? (resp as any).activities : []);
        // apply client-side filters if backend doesn't support them yet
        return list.filter((a: Activity | null | undefined) => {
          // guard against malformed items
          if (!a || typeof a !== 'object') return false;
          if (filters.entity !== 'all' && a.entity !== filters.entity) return false;
          if (filters.type !== 'all' && a.type !== filters.type) return false;
          return true;
        });
      } catch (e) {
        console.error('Failed to fetch activity feed:', e);
        return [];
      }
    },
  });

  const activityFilterFields: FilterField[] = [
    { key: 'entity', label: t('filters.entity') || 'Entidade', type: 'select', options: [
      { value: 'all', label: t('filters.allEntities') || 'Todas' },
      { value: 'funding', label: t('entities.funding') },
      { value: 'project', label: t('entities.project') },
      { value: 'client', label: t('entities.client') },
      { value: 'opportunity', label: t('entities.opportunity') },
      { value: 'proposal', label: t('entities.proposal') },
    ] },
    { key: 'type', label: t('filters.type') || 'Ação', type: 'select', options: [
      { value: 'all', label: t('filters.allActions') || 'Todas' },
      { value: 'create', label: t('types.create') },
      { value: 'update', label: t('types.update') },
      { value: 'delete', label: t('types.delete') },
      { value: 'transition', label: t('types.transition') },
      { value: 'match', label: t('types.match') },
      { value: 'submit', label: t('types.submit') },
    ] },
  ];

  const getEntityIcon = (entity: Activity['entity']) => {
    switch (entity) {
      case 'funding':
        return <CurrencyDollarIcon className="w-5 h-5" />;
      case 'project':
        return <BriefcaseIcon className="w-5 h-5" />;
      case 'client':
        return <UserGroupIcon className="w-5 h-5" />;
      case 'opportunity':
        return <DocumentTextIcon className="w-5 h-5" />;
      case 'proposal':
        return <DocumentTextIcon className="w-5 h-5" />;
    }
  };

  const getActionIcon = (type: Activity['type']) => {
    switch (type) {
      case 'create':
        return <DocumentPlusIcon className="w-4 h-4 text-green-500" />;
      case 'update':
        return <PencilSquareIcon className="w-4 h-4 text-blue-500" />;
      case 'delete':
        return <TrashIcon className="w-4 h-4 text-red-500" />;
      case 'transition':
        return <ArrowRightIcon className="w-4 h-4 text-purple-500" />;
      case 'match':
        return <CpuChipIcon className="w-4 h-4 text-yellow-500" />;
      case 'submit':
        return <DocumentPlusIcon className="w-4 h-4 text-primary-500" />;
    }
  };

  const getActionColor = (type: Activity['type']) => {
    switch (type) {
      case 'create':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'update':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'delete':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'transition':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'match':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      case 'submit':
        return 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300';
    }
  };

  const formatTimeAgo = (dateString?: string | null) => {
    if (!dateString) return t('time.unknown') || '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return t('time.unknown') || '—';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  };

  // Normalize and filter incoming activities to avoid runtime errors
  const safeActivities = useMemo(() => {
    const list = (activities || []).map((a: Activity, idx: number) => {
      if (!a || typeof a !== 'object') {
        // eslint-disable-next-line no-console
        console.warn('ActivityPage: skipping invalid activity at index', idx, a);
        return null;
      }

      if (!('type' in a) || !a.type) {
        // eslint-disable-next-line no-console
        console.warn('ActivityPage: activity missing type, skipping', a);
        return null;
      }

      if (!a.actor || typeof a.actor !== 'object') {
        // provide a safe default actor
        // eslint-disable-next-line no-console
        console.warn('ActivityPage: activity missing actor, injecting default', a.id);
        (a as any).actor = { id: 'system', name: 'Sistema', type: 'system' };
      }

      return a as Activity;
    }).filter(Boolean) as Activity[];

    return list;
  }, [activities]);
  
  // Paginated activities
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return safeActivities.slice(start, start + pageSize);
  }, [safeActivities, currentPage, pageSize]);

  const stats = useMemo(() => {
    const total = safeActivities.length;
    const system = safeActivities.filter(a => a.actor && a.actor.type === 'system').length;
    const user = total - system;
    const matches = safeActivities.filter(a => a.type === 'match').length;
    return { total, system, user, matches };
  }, [safeActivities]);

  const getActivityDescription = (activity: Activity) => {
    switch (activity.type) {
      case 'create':
        return t('actions.created', { entity: t(`entities.${activity.entity}`) });
      case 'update':
        if (activity.metadata?.field) {
          return t('actions.updated', { 
            field: activity.metadata.field,
            oldValue: activity.metadata.oldValue,
            newValue: activity.metadata.newValue,
          });
        }
        return t('actions.updatedGeneric');
      case 'delete':
        return t('actions.deleted', { entity: t(`entities.${activity.entity}`) });
      case 'transition':
        return t('actions.transitioned', {
          from: activity.metadata?.from,
          to: activity.metadata?.to,
        });
      case 'match':
        return t('actions.matched', {
          score: activity.metadata?.score,
          funding: activity.metadata?.fundingSource,
        });
      case 'submit':
        return t('actions.submitted');
    }
  };

  // Map activity type to TimelineView status
  const getTimelineStatus = (type: Activity['type']): TimelineItem['status'] => {
    switch (type) {
      case 'create': return 'success';
      case 'update': return 'info';
      case 'delete': return 'error';
      case 'transition': return 'pending';
      case 'match': return 'warning';
      case 'submit': return 'success';
      default: return 'default';
    }
  };

  // Transform activities to TimelineItems (using paginated)
  const timelineItems: TimelineItem[] = useMemo(() => {
    return paginatedActivities.map((activity) => ({
      id: activity.id,
      title: activity.entityName,
      description: getActivityDescription(activity),
      date: activity.createdAt,
      status: getTimelineStatus(activity.type),
      icon: getActionIcon(activity.type),
      tags: [
        { label: t(`types.${activity.type}`), color: getActionColor(activity.type) },
        { label: t(`entities.${activity.entity}`) },
      ],
      author: {
        name: activity.actor.name,
      },
      onClick: () => setSelectedActivity(activity),
    }));
  }, [paginatedActivities, t]);
  
  // Handle filter change with pagination reset
  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        viewToggle={true}
        viewMode={viewMode}
        onViewChange={(m) => { if (m === 'list' || m === 'board' || m === 'timeline' || m === 'table') setViewMode(m); }}
        availableModes={['list', 'board', 'timeline', 'table']}
        viewLabels={{ list: 'List View', board: 'Board View', timeline: 'Timeline View', table: 'Table View' }}
      />

      {/* Configurable Statistics Bar */}
      <ConfigurableStatisticsBar module="proposals" data={safeActivities} />

      {/* Filters */}
      <FilterPanel
        fields={activityFilterFields}
        values={filters as any}
        onChange={handleFilterChange}
        onReset={() => { setFilters({ entity: 'all', type: 'all' }); setCurrentPage(1); }}
        defaultExpanded={false}
      />

      {/* Activity Area */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden p-6">
        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <TimelineView
            items={timelineItems}
            size="md"
            showConnectors={true}
            animated={true}
            loading={isLoading}
            loadingCount={5}
            emptyMessage={t('empty')}
            formatDate={(date) => formatTimeAgo(String(date))}
          />
        )}

        {/* List View - Card-based layout */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-100 dark:bg-slate-700 rounded-lg h-24" />
                ))}
              </div>
            ) : paginatedActivities.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('empty')}</p>
            ) : (
              paginatedActivities.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => setSelectedActivity(activity)}
                  className="p-4 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 p-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                      {getEntityIcon(activity.entity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {activity.entityName}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(activity.type)}`}>
                          {getActionIcon(activity.type)}
                          {String(t(`types.${String(activity.type)}`) || '')}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {getActivityDescription(activity)}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          {activity.actor.type === 'system' ? (
                            <CpuChipIcon className="w-3 h-3" />
                          ) : (
                            <UserIcon className="w-3 h-3" />
                          )}
                          {activity.actor.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {formatTimeAgo(activity.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Board View - Grouped by action type */}
        {viewMode === 'board' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(['create', 'update', 'delete', 'transition', 'match', 'submit'] as const).map((actionType) => {
              const groupedActivities = safeActivities.filter(a => a.type === actionType);
              if (groupedActivities.length === 0) return null;
              return (
                <div key={actionType} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {getActionIcon(actionType)}
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
                      {String(t(`types.${String(actionType)}`) || '')}
                    </h3>
                    <span className="ml-auto text-xs bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                      {groupedActivities.length}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {groupedActivities.slice(0, 10).map((a) => (
                      <div
                        key={a.id}
                        onClick={() => setSelectedActivity(a)}
                        className="p-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg cursor-pointer hover:shadow"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {getEntityIcon(a.entity)}
                          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {String(t(`entities.${String(a.entity)}`) || '')}
                          </span>
                          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                            {formatTimeAgo(a.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                          {a.entityName}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          {a.actor.type === 'system' ? <CpuChipIcon className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                          {a.actor.name}
                        </p>
                      </div>
                    ))}
                    {groupedActivities.length > 10 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                        +{groupedActivities.length - 10} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-100 dark:bg-slate-700 rounded h-12" />
                ))}
              </div>
            ) : paginatedActivities.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('empty')}</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('table.action') || 'Action'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('table.user') || 'User'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('table.entity') || 'Entity'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('table.timestamp') || 'Timestamp'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-600">
                  {paginatedActivities.map((activity) => (
                    <tr
                      key={activity.id}
                      onClick={() => setSelectedActivity(activity)}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getActionColor(activity.type)}`}>
                          {getActionIcon(activity.type)}
                          {t(`types.${activity.type}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {activity.actor.type === 'system' ? (
                            <CpuChipIcon className="w-4 h-4 text-gray-400" />
                          ) : (
                            <UserIcon className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="text-sm text-gray-900 dark:text-white">
                            {activity.actor.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getEntityIcon(activity.entity)}
                          <div>
                            <p className="text-sm text-gray-900 dark:text-white truncate max-w-xs">
                              {activity.entityName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {t(`entities.${activity.entity}`)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {new Date(activity.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(activity.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
      
      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={safeActivities.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        persistInUrl={true}
      />

      {/* Detail Modal - standardized */}
      {selectedActivity && (
        <BaseModal
          isOpen={!!selectedActivity}
          onClose={() => setSelectedActivity(null)}
          title={String(t(`types.${String(selectedActivity.type)}`) || '')}
          subtitle={selectedActivity.entityName}
          size="3xl"
          showCloseButton={true}
          footer={<ModalFooter onCancel={() => setSelectedActivity(null)} />}
        >
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{getActivityDescription(selectedActivity)}</p>
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">Ator: {selectedActivity.actor.name} — {new Date(selectedActivity.createdAt).toLocaleString()}</div>
          </div>
        </BaseModal>
      )}
    </div>
  );
}
