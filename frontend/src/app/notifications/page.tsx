// Notifications Page
// User notification center
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckIcon,
  TrashIcon,
  InboxIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';
import apiClient from '@/lib/api-client';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import PageHeader from '@/components/ui/PageHeader';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import TimelineView, { TimelineItem } from '@/components/ui/TimelineView';
import Icon from '@/components/ui/Icon';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export default function NotificationsPage() {
  const t = useTranslations('notifications');
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{ type: string; read: string }>({ type: 'all', read: 'all' });
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  // Pagination state
  const { initialPage, initialPageSize } = usePagination(20, true);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications', filters.type, filters.read],
    queryFn: async (): Promise<Notification[]> => {
      try {
        const resp = await apiClient.get<Notification[]>('/api/v1/notifications');
        const data = resp ?? [];
        return data.filter(n => {
          if (filters.type !== 'all' && n.type !== filters.type) return false;
          if (filters.read === 'unread' && n.read) return false;
          return true;
        });
      } catch (err) {
        console.error('Failed to load notifications', err);
        return [];
      }
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const getTypeIconConfig = (type: Notification['type']): { icon: React.ReactNode; color: 'success' | 'warning' | 'error' | 'info' } => {
    switch (type) {
      case 'success':
        return { icon: <CheckCircleIcon />, color: 'success' };
      case 'warning':
        return { icon: <ExclamationCircleIcon />, color: 'warning' };
      case 'error':
        return { icon: <XMarkIcon />, color: 'error' };
      default:
        return { icon: <InformationCircleIcon />, color: 'info' };
    }
  };

  // Legacy function removed - now using Icon component with getTypeIconConfig

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

  const unreadCount = notifications.filter(n => !n.read).length;

  // Paginate notifications for list view
  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return notifications.slice(start, start + pageSize);
  }, [notifications, currentPage, pageSize]);
  
  // Map notification type to TimelineView status
  const getTimelineStatus = (type: Notification['type'], read: boolean): TimelineItem['status'] => {
    if (!read) return 'pending'; // Unread notifications are pending
    switch (type) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      case 'info': return 'info';
      default: return 'default';
    }
  };
  
  // Transform notifications to TimelineItems
  const timelineItems: TimelineItem[] = useMemo(() => {
    return paginatedNotifications.map((notification) => {
      const iconConfig = getTypeIconConfig(notification.type);
      return {
        id: notification.id,
        title: notification.title,
        description: notification.message,
        date: notification.createdAt,
        status: getTimelineStatus(notification.type, notification.read),
        icon: iconConfig.icon,
        tags: [
          { label: notification.type.toUpperCase(), color: `text-${iconConfig.color}-600 dark:text-${iconConfig.color}-400` },
          !notification.read ? { label: 'UNREAD', color: 'text-primary-600 dark:text-primary-400' } : null,
        ].filter(Boolean) as TimelineItem['tags'],
      };
    });
  }, [paginatedNotifications]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={unreadCount > 0 ? t('unreadCount', { count: unreadCount }) : t('allRead')}
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
        action={
          unreadCount > 0 ? (
            <button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="inline-flex items-center px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition"
            >
              <CheckIcon className="w-4 h-4 mr-2" />
              {t('markAllRead')}
            </button>
          ) : undefined
        }
      />

      {/* Statistics Bar */}
      <ConfigurableStatisticsBar module="proposals" data={notifications || []} />

      {/* Filters */}
      <FilterPanel
        fields={[
          { key: 'type', label: t('filter.type') || 'Type', type: 'select', options: [
            { value: 'all', label: t('filter.all') },
            { value: 'info', label: t('filter.info') || 'Info' },
            { value: 'success', label: t('filter.success') || 'Success' },
            { value: 'warning', label: t('filter.warning') || 'Warning' },
            { value: 'error', label: t('filter.error') || 'Error' },
          ] },
          { key: 'read', label: t('filter.read') || 'Read', type: 'select', options: [
            { value: 'all', label: t('filter.all') },
            { value: 'read', label: t('filter.readed') || 'Read' },
            { value: 'unread', label: t('filter.unread') },
          ] },
        ] as FilterField[]}
        values={filters as any}
        onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({ type: 'all', read: 'all' })}
        defaultExpanded={false}
      />

      {/* Notifications List / Board */}
      {viewMode === 'list' ? (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden p-6">
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
          </div>

          {/* Pagination */}
          {notifications.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={notifications.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              persistInUrl={true}
              showTotal={true}
              showPageSizeSelector={true}
            />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {['success', 'warning', 'info', 'error'].map((type) => (
            <div key={type} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-soft">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 capitalize">{type}</h3>
              <div className="space-y-3">
                {notifications.filter(n => n.type === type).map(n => {
                  const iconConfig = getTypeIconConfig(n.type);
                  return (
                  <div key={n.id} className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-100 dark:border-slate-700">
                    <div className="flex items-start gap-3">
                      <Icon color={iconConfig.color} size="md">
                        {iconConfig.icon}
                      </Icon>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{formatTimeAgo(n.createdAt)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!n.read && <span className="inline-block w-2 h-2 bg-primary-500 rounded-full" />}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{n.message}</p>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
