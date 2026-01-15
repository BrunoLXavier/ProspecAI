"use client";

import React, { ReactNode } from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';

type StatCardProps = {
  title: string;
  value: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
  className?: string;
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  color = 'bg-blue-100 text-blue-700',
  className = '',
}: StatCardProps) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 ${className}`}>
      <div className="flex items-center gap-3">
        {Icon ? (
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
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
