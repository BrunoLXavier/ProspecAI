// Loading skeleton for layout settings page
// Implements RF-07 (layout configuration per user/tenant)
'use client';

import React from 'react';
import { RectangleGroupIcon } from '@heroicons/react/24/outline';
import { AvailableNavItem } from './types';

interface LayoutLoadingSkeletonProps {
  t: (key: string) => string;
  availableNavItems: AvailableNavItem[];
}

export default function LayoutLoadingSkeleton({ t, availableNavItems }: LayoutLoadingSkeletonProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('layout.title') || 'Layout'}</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('layout.subtitle') || 'Customize navigation and dashboard'}</p>
      </div>

      <section className="bg-white dark:bg-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg"><RectangleGroupIcon className="w-5 h-5 text-blue-600" /></div>
          <div>
            <h2 className="text-lg font-semibold">{t('layout.navigationItems.title') || 'Itens de Navegação'}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('layout.navigationItems.description') || 'Defina quais itens estarão visíveis no menu.'}</p>
          </div>
        </div>

        <ul className="space-y-2">
          {availableNavItems.map(item => (
            <li key={item.id} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="font-medium flex-1 truncate whitespace-nowrap overflow-hidden text-gray-900 dark:text-white">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-28 flex items-center justify-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white opacity-50 cursor-not-allowed">Ativo</button>
                <button className="w-28 flex items-center justify-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white opacity-50 cursor-not-allowed">Inativo</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
