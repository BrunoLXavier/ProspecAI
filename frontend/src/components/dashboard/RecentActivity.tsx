// Recent Activity Component
// Shows recent system activities and audit trail
// Firjan SENAI Brand Identity with modern flat design
'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, CardHeader } from '@/components/ui/Card';
import {
  DocumentPlusIcon,
  SparklesIcon,
  PaperAirplaneIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';

interface Activity {
  id: string;
  type: string;
  description: string;
  user: string;
  timestamp: string;
  href?: string;
}

const activityIcons: Record<string, { icon: React.ElementType; colors: string }> = {
  funding_created: { icon: DocumentPlusIcon, colors: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  matching_executed: { icon: SparklesIcon, colors: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
  proposal_submitted: { icon: PaperAirplaneIcon, colors: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
  client_created: { icon: UserPlusIcon, colors: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
};

export default function RecentActivity() {
  const t = useTranslations('dashboard');

  // Mock data - would come from audit log API
  const activities: Activity[] = [
    {
      id: '1',
      type: 'funding_created',
      description: 'Novo edital FINEP Inovação criado',
      user: 'João Silva',
      timestamp: '2026-01-10T10:30:00Z',
      href: '/funding',
    },
    {
      id: '2',
      type: 'matching_executed',
      description: 'Matching executado para Projeto X',
      user: 'Sistema IA',
      timestamp: '2026-01-10T09:15:00Z',
      href: '/portfolio',
    },
    {
      id: '3',
      type: 'proposal_submitted',
      description: 'Proposta enviada para Edital CNPq',
      user: 'Maria Santos',
      timestamp: '2026-01-10T08:00:00Z',
      href: '/proposals',
    },
    {
      id: '4',
      type: 'client_created',
      description: 'Novo cliente Empresa ABC cadastrado',
      user: 'Carlos Oliveira',
      timestamp: '2026-01-09T16:45:00Z',
      href: '/crm',
    },
  ];

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffHours >= 24) {
      return `${Math.floor(diffHours / 24)} dias atrás`;
    } else if (diffHours > 0) {
      return `${diffHours} horas atrás`;
    } else {
      return `${diffMins} minutos atrás`;
    }
  };

  const ActivityItem = ({ activity }: { activity: Activity }) => {
    const { icon: Icon, colors } = activityIcons[activity.type] || { icon: DocumentPlusIcon, colors: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
    
    const content = (
      <>
        {/* Icon */}
        <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${colors}`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors">
            {activity.description}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            por {activity.user}
          </p>
        </div>

        {/* Timestamp */}
        <div className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
          {formatTimeAgo(activity.timestamp)}
        </div>
      </>
    );

    if (activity.href) {
      return (
        <Link
          href={activity.href}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors group cursor-pointer"
        >
          {content}
        </Link>
      );
    }

    return (
      <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors group">
        {content}
      </div>
    );
  };

  return (
    <Card padding="lg" hover="subtle">
      <CardHeader 
        title={t('recentActivity')}
        className="mb-4"
      />

      <div className="space-y-1">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>

      {/* View All Link */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
        <Link
          href="/activity"
          className="text-sm font-medium text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          Ver toda a atividade →
        </Link>
      </div>
    </Card>
  );
}
