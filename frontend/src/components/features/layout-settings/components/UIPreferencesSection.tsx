// UI Preferences Section — page size, toggles
// Implements RF-07 (layout configuration per user/tenant)
'use client';

import React from 'react';
import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import { LayoutSectionProps } from './types';

export default function UIPreferencesSection({ config, updateConfig, t }: LayoutSectionProps) {
  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-100 rounded-lg"><ArrowsPointingOutIcon className="w-5 h-5 text-purple-600" /></div>
        <div>
          <h2 className="text-lg font-semibold">{t('layout.uiPreferences.title') || 'UI Preferences'}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('layout.uiPreferences.description') || 'Preferências de exibição para a aplicação.'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Default page size</label>
          <select
            value={config.default_page_size}
            onChange={(e) => updateConfig('default_page_size', parseInt(e.target.value))}
            className="w-full border-2 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
          >
            {[10,20,25,50,100].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Toggles</label>
          <div className="space-y-2">
            {[
              { key: 'dense_tables', label: t('layout.uiPreferences.denseTables') || 'Dense tables' },
              { key: 'animations_enabled', label: t('layout.uiPreferences.enableAnimations') || 'Animations' },
              { key: 'compact_mode', label: t('layout.uiPreferences.compactMode') || 'Compact mode' },
              { key: 'ai_chat_enabled', label: 'Chat com Agente de IA' },
              { key: 'feedback_button_enabled', label: 'Botão de Feedback' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-gray-700 dark:text-gray-300">{label}</span>
                <button
                  onClick={() => (updateConfig as any)(key as any, !(config as any)[key])}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(config as any)[key] ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(config as any)[key] ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
