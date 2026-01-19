/**
 * Calendar Widget
 * Displays upcoming deadlines and events
 * Implements RF-02: Gestão de Fomento (prazos de editais)
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'deadline' | 'meeting' | 'milestone' | 'reminder';
  related_entity?: string;
  related_entity_id?: string;
  priority: 'high' | 'medium' | 'low';
}

interface CalendarData {
  events: CalendarEvent[];
  upcoming_deadlines: number;
}

const eventTypeConfig: Record<string, { bg: string; text: string; label: string }> = {
  deadline: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', label: 'Prazo' },
  meeting: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', label: 'Reunião' },
  milestone: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300', label: 'Marco' },
  reminder: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', label: 'Lembrete' },
};

const priorityColors: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-green-500',
};

export default function CalendarWidget() {
  const t = useTranslations('calendar');
  const [data, setData] = useState<CalendarData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        
        // Call the backend calendar API under the standardized `/api/v1` path
        const response = await apiClient.get<{ events: CalendarEvent[] }>('/api/v1/calendar/events', {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        });

        const events = response.events || [];
        const upcoming_deadlines = events.filter(e => e.type === 'deadline').length;

        setData({ events, upcoming_deadlines });
      } catch (err) {
        console.error('Failed to fetch calendar events:', err);
        setError('Erro ao carregar eventos');
        // No demo data: return empty set on error
        setData({ events: [], upcoming_deadlines: 0 });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentMonth]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays < 0) return `${Math.abs(diffDays)} dias atrás`;
    if (diffDays <= 7) return `Em ${diffDays} dias`;
    return formatDate(dateStr);
  };

  const sortedEvents = useMemo(() => {
    if (!data?.events) return [];
    return [...data.events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data?.events]);

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  if (isLoading) {
    return (
      <div className="card p-6 animate-pulse" data-testid="calendar-widget">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6" data-testid="calendar-widget">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className="w-5 h-5 text-firjan-red" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Próximos Eventos
          </h3>
        </div>
        {(data?.upcoming_deadlines || 0) > 0 && (
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{data?.upcoming_deadlines} prazos</span>
          </div>
        )}
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
        <button
          onClick={goToPreviousMonth}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5 text-gray-500" />
        </button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={goToNextMonth}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronRightIcon className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Events List */}
      <div className="space-y-2">
        {sortedEvents.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Nenhum evento neste período
          </p>
        ) : (
          sortedEvents.map((event) => {
            const typeConfig = eventTypeConfig[event.type] || eventTypeConfig.reminder;
            const eventLink = event.related_entity === 'funding' 
              ? `/funding?id=${event.related_entity_id || event.id}`
              : event.related_entity === 'client'
              ? `/crm?id=${event.related_entity_id || event.id}`
              : event.related_entity === 'opportunity'
              ? `/opportunities?id=${event.related_entity_id || event.id}`
              : null;
            
            const cardContent = (
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {event.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatRelativeDate(event.date)}
                    </span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${typeConfig.bg} ${typeConfig.text}`}>
                  {typeConfig.label}
                </span>
              </div>
            );

            const cardClassName = `block p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 border-l-4 ${priorityColors[event.priority] || priorityColors.low} hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer`;

            return eventLink ? (
              <Link key={event.id} href={eventLink} className={cardClassName}>
                {cardContent}
              </Link>
            ) : (
              <div key={event.id} className={cardClassName}>
                {cardContent}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {error && (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 text-center">
          {error}
        </p>
      )}
    </div>
  );
}
