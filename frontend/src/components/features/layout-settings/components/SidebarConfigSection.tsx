// Sidebar Configuration Section — position and width
// Implements RF-07 (layout configuration per user/tenant)
'use client';

import React from 'react';
import { Bars3Icon, CheckIcon } from '@heroicons/react/24/outline';
import { LayoutSectionProps } from './types';

export default function SidebarConfigSection({ config, updateConfig, t }: LayoutSectionProps) {
  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary-100 rounded-lg"><Bars3Icon className="w-5 h-5 text-primary-600" /></div>
        <div>
          <h2 className="text-lg font-semibold">{t('layout.sidebar.title') || 'Sidebar Configuration'}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('layout.sidebar.description') || 'Ajuste a posição e largura da barra lateral.'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Position</label>
              <div className="flex gap-3">
            {(['left','right'] as const).map(pos => (
              <button
                key={pos}
                onClick={() => updateConfig('sidebar_position', pos)}
                className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${config.sidebar_position === pos ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">{pos}</span>
                {config.sidebar_position === pos && <CheckIcon className="w-4 h-4 text-primary-500 ml-1" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Width: {config.sidebar_width}px</label>
          <div className="p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800">
            <input type="range" min={200} max={400} value={config.sidebar_width} onChange={(e) => updateConfig('sidebar_width', parseInt(e.target.value))} className="w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
