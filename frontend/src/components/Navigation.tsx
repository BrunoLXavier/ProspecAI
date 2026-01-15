// Navigation Component
// Main sidebar navigation for the application
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  HomeIcon,
  CurrencyDollarIcon,
  BriefcaseIcon,
  UserGroupIcon,
  ChartBarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'dashboard', href: '/', icon: HomeIcon },
  { name: 'funding', href: '/funding', icon: CurrencyDollarIcon },
  { name: 'portfolio', href: '/portfolio', icon: BriefcaseIcon },
  { name: 'crm', href: '/crm', icon: UserGroupIcon },
  { name: 'opportunities', href: '/opportunities', icon: ChartBarIcon },
  { name: 'proposals', href: '/proposals', icon: DocumentTextIcon },
  { name: 'feedbackManagement', href: '/admin/feedback', icon: DocumentTextIcon }, // Feedback Management (Admin)
  { name: 'reports', href: '/reports', icon: ChartBarIcon }, // Implements RF-09
  { name: 'activity', href: '/activity', icon: UserGroupIcon }, // Implements RF-09
  { name: 'settings', href: '/settings', icon: Cog6ToothIcon },
];

export default function Navigation() {
  const pathname = usePathname();
  const t = useTranslations('navigation');

  return (
    <div className="flex flex-col w-64 bg-primary-900 text-white">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 bg-primary-800">
        <h1 className="text-2xl font-bold">ProspecAI</h1>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center px-4 py-3 rounded-lg transition-colors
                ${
                  isActive
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-100 hover:bg-primary-800 hover:text-white'
                }
              `}
            >
              <Icon className="w-6 h-6 mr-3" />
              <span className="font-medium">{t(item.name)}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-primary-800">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary-700 flex items-center justify-center">
            <span className="text-sm font-bold">AD</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">Admin User</p>
            <p className="text-xs text-primary-300">admin@prospecai.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
