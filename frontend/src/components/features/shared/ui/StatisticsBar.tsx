// Statistics Bar Component
// Horizontal statistics display bar - distinct from card/board view
// Reusable across all pages
'use client';

import { ReactNode } from 'react';

export interface StatItem {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  subValue?: string;
}

interface StatisticsBarProps {
  stats: StatItem[];
  className?: string;
}

const colorClasses = {
  default: {
    value: 'text-gray-900 dark:text-white',
    icon: 'text-gray-500 dark:text-gray-400',
  },
  primary: {
    value: 'text-primary-600 dark:text-primary-400',
    icon: 'text-primary-500 dark:text-primary-400',
  },
  success: {
    value: 'text-green-600 dark:text-green-400',
    icon: 'text-green-500 dark:text-green-400',
  },
  warning: {
    value: 'text-yellow-600 dark:text-yellow-400',
    icon: 'text-yellow-500 dark:text-yellow-400',
  },
  danger: {
    value: 'text-red-600 dark:text-red-400',
    icon: 'text-red-500 dark:text-red-400',
  },
  info: {
    value: 'text-blue-600 dark:text-blue-400',
    icon: 'text-blue-500 dark:text-blue-400',
  },
};

export default function StatisticsBar({ stats, className = '' }: StatisticsBarProps) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-soft ${className}`}>
      <div className="flex flex-wrap items-center divide-x divide-gray-200 dark:divide-gray-700">
        {stats.map((stat, index) => {
          const colors = colorClasses[stat.color || 'default'];
          
          return (
            <div 
              key={index} 
              className="flex-1 min-w-[140px] px-6 py-4 first:pl-6 last:pr-6"
            >
              <div className="flex items-center gap-3">
                {stat.icon && (
                  <div className={`flex-shrink-0 ${colors.icon}`}>
                    {stat.icon}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
                    {stat.label}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-2xl font-bold ${colors.value}`}>
                      {typeof stat.value === 'number' ? stat.value.toLocaleString('pt-BR') : stat.value}
                    </p>
                    {stat.subValue && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {stat.subValue}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
