// Dashboard Statistics Component
// Displays key metrics and statistics with modern flat design
// Firjan SENAI Brand Identity
'use client';

import { useTranslations } from 'next-intl';
import { StatCard } from '@/components/features/shared/ui/Card';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import {
  DocumentTextIcon,
  LightBulbIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';

interface Stat {
  name: string;
  value: string;
  change: string;
  changeType: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  href: string;
}

export default function DashboardStats() {
  const t = useTranslations('dashboard');
  const [stats, setStats] = useState<Stat[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const resp = await apiClient.get(`/api/v1/analytics/overview?period=month`);
        const kpis = resp?.kpis || {};

        const transformed: Stat[] = [
          {
            name: t('stats.openFunding'),
            value: String(kpis.active_funding?.value ?? 0),
            change: `${kpis.active_funding?.trend_percentage ?? 0}%`,
            changeType: (kpis.active_funding?.trend_direction as any) || 'neutral',
            icon: <DocumentTextIcon />,
            href: '/funding?status=open',
          },
          {
            name: t('stats.activeOpportunities'),
            value: String(kpis.active_opportunities?.value ?? kpis.total_projects?.value ?? 0),
            change: `${kpis.active_opportunities?.trend_percentage ?? 0}%`,
            changeType: (kpis.active_opportunities?.trend_direction as any) || 'neutral',
            icon: <LightBulbIcon />,
            href: '/opportunities',
          },
          {
            name: t('stats.matchingScore'),
            value: String(kpis.avg_match_score?.value ?? 0),
            change: `${kpis.avg_match_score?.trend_percentage ?? 0}%`,
            changeType: (kpis.avg_match_score?.trend_direction as any) || 'neutral',
            icon: <ChartBarIcon />,
            href: '/opportunities',
          },
          {
            name: t('stats.proposalsInReview'),
            value: String(kpis.proposals_submitted?.value ?? 0),
            change: `${kpis.proposals_submitted?.trend_percentage ?? 0}%`,
            changeType: (kpis.proposals_submitted?.trend_direction as any) || 'neutral',
            icon: <ClipboardDocumentCheckIcon />,
            href: '/proposals?status=in_review',
          },
        ];

        if (mounted) setStats(transformed);
      } catch (e) {
        // keep previous behavior: fall back to small static values if API fails
        setStats([
          { name: t('stats.openFunding'), value: '0', change: '0%', changeType: 'neutral', icon: <DocumentTextIcon />, href: '/funding?status=open' },
          { name: t('stats.activeOpportunities'), value: '0', change: '0%', changeType: 'neutral', icon: <LightBulbIcon />, href: '/opportunities' },
          { name: t('stats.matchingScore'), value: '0', change: '0%', changeType: 'neutral', icon: <ChartBarIcon />, href: '/opportunities' },
          { name: t('stats.proposalsInReview'), value: '0', change: '0%', changeType: 'neutral', icon: <ClipboardDocumentCheckIcon />, href: '/proposals?status=in_review' },
        ]);
      } finally {
        setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [t]);

  if (isLoading) return <div className="animate-pulse grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="h-24 bg-gray-100 rounded" /></div>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {(stats || []).map((stat) => (
        <StatCard
          key={stat.name}
          label={stat.name}
          value={stat.value}
          change={{
            value: stat.change,
            trend: stat.changeType,
          }}
          icon={stat.icon}
          href={stat.href}
        />
      ))}
    </div>
  );
}
