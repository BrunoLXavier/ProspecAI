// Recent Activity Component
// Shows recent system activities and audit trail
// Firjan SENAI Brand Identity with modern flat design
'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, CardHeader } from '@/components/ui/Card';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
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

  // Fetch recent activities from backend: combine recent opportunities and proposals
  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [oppsResp, propsResp] = await Promise.all([
        apiClient.listOpportunities({ skip: 0, limit: 10 }),
        apiClient.listProposals({ skip: 0, limit: 10 }),
      ]);

      const opps = Array.isArray(oppsResp) ? oppsResp : (oppsResp.data || []);
      const props = Array.isArray(propsResp) ? propsResp : (propsResp.data || []);

      const mappedOpps: Activity[] = opps.map((o: any) => ({
        id: String(o.id),
        type: 'matching_executed',
        description: o.title || o.name || 'Oportunidade atualizada',
        user: o.updated_by_name || o.created_by_name || 'Usuário',
        timestamp: o.created_at || new Date().toISOString(),
        href: `/opportunities?id=${o.id}`,
      }));

      const mappedProps: Activity[] = props.map((p: any) => ({
        id: String(p.id),
        type: 'proposal_submitted',
        description: p.title || 'Proposta',
        user: p.created_by_name || 'Usuário',
        timestamp: p.created_at || new Date().toISOString(),
        href: `/proposals?id=${p.id}`,
      }));

      // Merge and sort by timestamp desc
      const merged = [...mappedOpps, ...mappedProps].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return merged.slice(0, 10);
    }
  });

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
