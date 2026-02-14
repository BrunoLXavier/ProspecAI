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
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import apiClient from '@/lib/api-client';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import Pagination, { usePagination } from '@/components/features/shared/ui/Pagination';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';
import Icon from '@/components/features/shared/ui/Icon';
import { ViewMode } from '@/components/features/shared/ui/ViewToggle';

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
  const [viewMode, setViewMode] = useState<ViewMode>('list');

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
    onError: (error: any) => {
      console.error('Failed to mark notification as read:', error);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: any) => {
      console.error('Failed to mark all notifications as read:', error);
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return id;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['notifications'] });
    },
    onError: (error: any) => {
      console.error('Failed to delete notification:', error);
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

  const unreadCount = notifications.filter((n: Notification) => !n.read).length;

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
    return paginatedNotifications.map((notification: Notification) => {
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
        onClick: () => markAsReadMutation.mutate(notification.id),
      };
    });
  }, [paginatedNotifications, markAsReadMutation]);

  // Table columns for TableView
  const tableColumns: TableColumn<Notification>[] = useMemo(() => [
    {
      key: 'title',
      header: t('table.title') || 'Title',
      accessor: 'title',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {!row.read && <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />}
          <span className={`font-medium ${!row.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
            {row.title}
          </span>
        </div>
      ),
    },
    {
      key: 'type',
      header: t('table.type') || 'Type',
      accessor: 'type',
      sortable: true,
      render: (_, row) => {
        const iconConfig = getTypeIconConfig(row.type);
        return (
          <div className="flex items-center gap-2">
            <Icon color={iconConfig.color} size="sm">
              {iconConfig.icon}
            </Icon>
            <span className="capitalize text-sm">{row.type}</span>
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      header: t('table.date') || 'Date',
      accessor: 'createdAt',
      sortable: true,
      render: (_, row) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatTimeAgo(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'read',
      header: t('table.status') || 'Status',
      accessor: 'read',
      sortable: true,
      render: (_, row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.read 
            ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' 
            : 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
        }`}>
          {row.read ? (t('status.read') || 'Read') : (t('status.unread') || 'Unread')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      accessor: (row) => row.id,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {!row.read && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                markAsReadMutation.mutate(row.id);
              }}
              className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition"
              title={t('markAsRead') || 'Mark as read'}
            >
              <CheckIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteNotificationMutation.mutate(row.id);
            }}
            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
            title={t('delete') || 'Delete'}
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ], [t, markAsReadMutation, deleteNotificationMutation]);

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
        onViewChange={(m) => setViewMode(m as ViewMode)}
        action={
          unreadCount > 0 ? (
            <button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              title={t('markAllRead')}
              className="inline-flex items-center justify-center p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50"
            >
              <CheckIcon className="w-5 h-5" />
            </button>
          ) : undefined
        }
      />

      {/* Statistics Bar */}
      <ConfigurableStatisticsBar module="notifications" data={notifications || []} />

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

      {/* Notifications Views */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* ListView - Card-based layout */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft border border-gray-200 dark:border-slate-700 overflow-hidden p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-soft animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                    </div>
                  </div>
                </div>
              ))
            ) : paginatedNotifications.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                  <InboxIcon className="w-6 h-6" />
                </div>
                <p>{t('empty')}</p>
              </div>
            ) : (
              paginatedNotifications.map((n: Notification) => {
                const iconConfig = getTypeIconConfig(n.type);
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markAsReadMutation.mutate(n.id)}
                    className={`bg-white dark:bg-slate-800 rounded-xl p-4 shadow-soft border-l-4 cursor-pointer hover:shadow-md transition-shadow ${
                      n.type === 'success' ? 'border-l-green-500' :
                      n.type === 'warning' ? 'border-l-yellow-500' :
                      n.type === 'error' ? 'border-l-red-500' :
                      'border-l-blue-500'
                    } ${!n.read ? 'ring-2 ring-primary-200 dark:ring-primary-800' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon color={iconConfig.color} size="lg">
                        {iconConfig.icon}
                      </Icon>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${!n.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                              {n.title}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {formatTimeAgo(n.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!n.read && <span className="w-2 h-2 bg-primary-500 rounded-full" />}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotificationMutation.mutate(n.id);
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{n.message}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                            n.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            n.type === 'warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            n.type === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {n.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
      )}

      {viewMode === 'board' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {['success', 'warning', 'info', 'error'].map((type) => {
            const filteredNotifications = notifications.filter((n: Notification) => n.type === type);
            return (
              <div key={type} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-soft">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">{type}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                    {filteredNotifications.length}
                  </span>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredNotifications.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">{t('empty')}</p>
                  ) : (
                    filteredNotifications.map((n: Notification) => {
                      const iconConfig = getTypeIconConfig(n.type);
                      return (
                        <div
                          key={n.id}
                          onClick={() => !n.read && markAsReadMutation.mutate(n.id)}
                          className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-100 dark:border-slate-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition"
                        >
                          <div className="flex items-start gap-3">
                            <Icon color={iconConfig.color} size="md">
                              {iconConfig.icon}
                            </Icon>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{n.title}</p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500">{formatTimeAgo(n.createdAt)}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {!n.read && <span className="inline-block w-2 h-2 bg-primary-500 rounded-full" />}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{n.message}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'timeline' && (
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
      )}

      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden">
          <TableView<Notification>
            data={paginatedNotifications}
            columns={tableColumns}
            getRowKey={(row) => row.id}
            onRowClick={(row) => !row.read && markAsReadMutation.mutate(row.id)}
            loading={isLoading}
            emptyMessage={t('empty')}
            striped={true}
            hoverable={true}
            paginated={false}
          />
          
          {/* Pagination */}
          {notifications.length > 0 && (
            <div className="p-4 border-t border-gray-200 dark:border-slate-700">
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
