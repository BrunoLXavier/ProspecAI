// Typography Section — font size and font family
// Implements RF-07 (layout configuration per user/tenant)
'use client';

import React from 'react';
import { DocumentTextIcon, CheckIcon } from '@heroicons/react/24/outline';
import { LayoutSectionProps } from './types';

export default function TypographySection({ config, updateConfig, t }: LayoutSectionProps) {
  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-cyan-100 rounded-lg"><DocumentTextIcon className="w-5 h-5 text-cyan-600" /></div>
        <div>
          <h2 className="text-lg font-semibold">{t('layout.typography.title') || 'Typography'}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('layout.typography.description') || 'Defina tamanho e família de fontes.'}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t('layout.typography.fontSize') || 'Font size'}</label>
          <div className="flex gap-3">
            {(['sm','base','lg'] as const).map(sz => (
              <button
                key={sz}
                onClick={() => updateConfig('font_size', sz)}
                className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${config.font_size === sz ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">{String(t(`layout.typography.${sz === 'sm' ? 'small' : sz === 'base' ? 'normal' : 'large'}`) || sz || '')}</span>
                {config.font_size === sz && <CheckIcon className="w-4 h-4 text-primary-500 ml-1" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t('layout.typography.fontFamily') || 'Font family'}</label>
          <div className="flex gap-3">
            {(['sans','serif','mono'] as const).map(f => (
              <button
                key={f}
                onClick={() => updateConfig('font_family', f)}
                className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${config.font_family === f ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">{f === 'sans' ? (t('layout.typography.sansSerif') || 'Sans-serif') : f === 'serif' ? (t('layout.typography.serif') || 'Serif') : (t('layout.typography.monospace') || 'Monospace')}</span>
                {config.font_family === f && <CheckIcon className="w-4 h-4 text-primary-500 ml-1" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
