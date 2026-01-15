// Notifications Page
// User notification center
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BellIcon,
  CheckIcon,
  TrashIcon,
  FunnelIcon,
  InboxIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';

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
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications', filter],
    queryFn: async (): Promise<Notification[]> => {
      // Mock data - replace with actual API call
      const data: Notification[] = [
        {
          id: '1',
          type: 'success',
          title: 'Matching encontrado',
          message: 'Novo matching de 92% encontrado para "Projeto Inovação Digital" com edital FINEP 2026.',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          link: '/opportunities/1',
        },
        {
          id: '2',
          type: 'warning',
          title: 'Prazo se aproximando',
          message: 'O edital CNPq Pesquisa Aplicada encerra em 5 dias.',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          link: '/funding/2',
        },
        {
          id: '3',
          type: 'info',
          title: 'Nova atualização do sistema',
          message: 'ProspecAI v2.1 está disponível com melhorias de performance.',
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          link: undefined,
        },
        {
          id: '4',
          type: 'success',
          title: 'Proposta aprovada',
          message: 'A proposta "Automação Industrial 4.0" foi aprovada pelo comitê.',
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
          link: '/proposals/3',
        },
        {
          id: '5',
          type: 'error',
          title: 'Erro de sincronização',
          message: 'Não foi possível sincronizar dados do CRM. Tente novamente.',
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
          link: undefined,
        },
      ];
      return data.filter(n => filter === 'all' || !n.read);
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

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <ExclamationCircleIcon className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XMarkIcon className="w-5 h-5 text-red-500" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTypeBgColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20';
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

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <BellSolidIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('title')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {unreadCount > 0 
                ? t('unreadCount', { count: unreadCount })
                : t('allRead')
              }
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="inline-flex items-center px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition"
          >
            <CheckIcon className="w-4 h-4 mr-2" />
            {t('markAllRead')}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-soft p-4">
        <div className="flex items-center gap-4">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'all'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {t('filter.all')}
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'unread'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {t('filter.unread')}
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-primary-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {t('loading')}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <InboxIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{t('empty')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition ${
                  !notification.read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                }`}
              >
                <div className="flex gap-4">
                  <div className={`p-2 rounded-lg ${getTypeBgColor(notification.type)}`}>
                    {getTypeIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className={`text-sm font-medium ${
                          !notification.read 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {notification.title}
                          {!notification.read && (
                            <span className="ml-2 inline-block w-2 h-2 bg-primary-500 rounded-full" />
                          )}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <button
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                            className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition"
                            title={t('markRead')}
                          >
                            <CheckIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotificationMutation.mutate(notification.id)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition"
                          title={t('delete')}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {notification.link && (
                      <a
                        href={notification.link}
                        className="inline-flex items-center text-sm text-primary-600 dark:text-primary-400 hover:underline mt-2"
                      >
                        {t('viewDetails')} →
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
