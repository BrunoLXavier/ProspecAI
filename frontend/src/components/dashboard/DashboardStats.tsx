// Dashboard Statistics Component
// Displays key metrics and statistics with modern flat design
// Firjan SENAI Brand Identity
'use client';

import { useTranslations } from 'next-intl';
import { StatCard } from '@/components/ui/Card';
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

  // Mock data - would come from API
  const stats: Stat[] = [
    {
      name: t('stats.openFunding'),
      value: '24',
      change: '+12%',
      changeType: 'up',
      icon: <DocumentTextIcon />,
      href: '/funding?status=open',
    },
    {
      name: t('stats.activeOpportunities'),
      value: '47',
      change: '+8%',
      changeType: 'up',
      icon: <LightBulbIcon />,
      href: '/opportunities',
    },
    {
      name: t('stats.matchingScore'),
      value: '82.5',
      change: '-2%',
      changeType: 'down',
      icon: <ChartBarIcon />,
      href: '/opportunities',
    },
    {
      name: t('stats.proposalsInReview'),
      value: '12',
      change: '+4',
      changeType: 'up',
      icon: <ClipboardDocumentCheckIcon />,
      href: '/proposals?status=in_review',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
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
