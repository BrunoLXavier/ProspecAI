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
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';

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
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
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
    const list = (activities || []).map((a, idx) => {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        viewToggle={true}
        viewMode={viewMode}
        onViewChange={(m) => setViewMode(m)}
        listLabel="Time Line View"
        listIcon={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12h4" />
            <circle cx="3" cy="12" r="1.5" fill="currentColor" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 12h4" />
            <circle cx="21" cy="12" r="1.5" fill="currentColor" />
          </svg>
        }
      />

      {/* Configurable Statistics Bar */}
      <ConfigurableStatisticsBar module="proposals" data={safeActivities} />

      {/* Filters */}
      <FilterPanel
        fields={activityFilterFields}
        values={filters as any}
        onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({ entity: 'all', type: 'all' })}
        defaultExpanded={false}
      />

      {/* Activity Area */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('loading')}</div>
        ) : safeActivities.length === 0 ? (
          <div className="p-12 text-center">
            <ClockIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{t('empty')}</p>
          </div>
        ) : (
          <div className="relative p-4">
            {viewMode === 'list' ? (
              <div className="relative">
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {safeActivities.map((activity) => (
                    // defensive: skip any malformed entries
                    !activity ? null : (
                    <li key={activity.id} className="relative p-6 pl-16 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer" onClick={() => setSelectedActivity(activity)}>
                      <div className={`absolute left-6 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${activity.actor.type === 'system' ? 'bg-yellow-400' : 'bg-primary-500'}`} />

                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(activity.type)}`}>
                              {getActionIcon(activity.type)}
                              {t(`types.${activity.type}`)}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500 text-xs">{formatTimeAgo(activity.createdAt)}</span>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-gray-500 dark:text-gray-400">{getEntityIcon(activity.entity)}</span>
                            <a href={`/${activity.entity}/${activity.entityId}`} className="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400">{activity.entityName}</a>
                          </div>

                          <p className="text-sm text-gray-600 dark:text-gray-400">{getActivityDescription(activity)}</p>

                          <div className="flex items-center gap-2 mt-2">
                            {activity.actor.type === 'system' ? <CpuChipIcon className="w-4 h-4 text-yellow-500" /> : <UserIcon className="w-4 h-4 text-gray-400" />}
                            <span className="text-xs text-gray-500 dark:text-gray-400">{activity.actor.name}</span>
                          </div>
                        </div>
                      </div>
                    </li>
                    )
                  ))}
                </ul>
              </div>
            ) : (
              // Board view: group by entity
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from(new Set(safeActivities.map(a => a.entity))).map((entity) => (
                  <div key={entity} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 capitalize">{t(`entities.${entity}`)}</h3>
                    <div className="space-y-3">
                      {safeActivities.filter(a => a.entity === entity).map((a) => (
                        <div key={a.id} onClick={() => setSelectedActivity(a)} className="p-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg cursor-pointer hover:shadow">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(a.type)}`}>{getActionIcon(a.type)}{t(`types.${a.type}`)}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(a.createdAt)}</span>
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{a.entityName}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-800 rounded-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t(`types.${selectedActivity.type}`)}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedActivity.entityName}</p>
              </div>
              <button onClick={() => setSelectedActivity(null)} className="text-gray-600 dark:text-gray-300 p-2 rounded-lg">Fechar</button>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">{getActivityDescription(selectedActivity)}</p>
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">Ator: {selectedActivity.actor.name} — {new Date(selectedActivity.createdAt).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
