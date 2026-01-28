"use client";

import React, { ReactNode } from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';

/** Icon color variant type for standardized theming */
type IconColorVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'purple' | 'cyan' | 'orange' | 'pink' | 'indigo' | 'teal';

// Icon color variants matching Icon component pattern
const iconColorClasses: Record<IconColorVariant, string> = {
  primary: 'bg-primary-50 dark:bg-primary-900/20 text-primary-500',
  secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  success: 'bg-green-50 dark:bg-green-900/20 text-green-500',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-500',
  error: 'bg-red-50 dark:bg-red-900/20 text-red-500',
  info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-500',
  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-500',
  cyan: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-500',
  orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-500',
  pink: 'bg-pink-50 dark:bg-pink-900/20 text-pink-500',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500',
  teal: 'bg-teal-50 dark:bg-teal-900/20 text-teal-500',
};

type StatCardProps = {
  title: string;
  value: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  /** @deprecated Use iconColor instead for standardized theming */
  color?: string;
  /** Icon color variant for standardized theming (overrides color) */
  iconColor?: IconColorVariant;
  className?: string;
};

export default function StatCard({
  title,
  value,
  icon: IconComponent,
  color,
  iconColor,
  className = '',
}: StatCardProps) {
  // Prefer iconColor if provided, otherwise fall back to legacy color prop
  const iconClasses = iconColor 
    ? iconColorClasses[iconColor] 
    : color || iconColorClasses.info;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 ${className}`}>
      <div className="flex items-center gap-3">
        {IconComponent ? (
          <div className={`p-2 rounded-lg ${iconClasses}`}>
            <IconComponent className="h-5 w-5" />
          </div>
        ) : null}
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
