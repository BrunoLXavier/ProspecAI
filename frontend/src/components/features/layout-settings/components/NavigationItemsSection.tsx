// Navigation Items Section — drag/drop reorder, indent, toggle visibility
// Implements RF-07 (layout configuration per user/tenant)
'use client';

import React from 'react';
import { RectangleGroupIcon, CheckIcon } from '@heroicons/react/24/outline';
import { LayoutConfig } from '@/contexts/LayoutContext';
import { AvailableNavItem, DragPayload } from './types';

interface NavigationItemsSectionProps {
  config: LayoutConfig;
  updateConfig: <K extends keyof LayoutConfig>(key: K, value: LayoutConfig[K]) => void;
  t: (key: string) => string;
  navOrder: string[];
  availableNavItems: AvailableNavItem[];
  getNavIndentLevel: (id: string) => number;
  moveNavItem: (id: string, direction: 'up' | 'down') => void;
  indentNavItem: (id: string) => void;
  outdentNavItem: (id: string) => void;
  toggleNavItem: (id: string) => void;
  handleDragStart: (e: React.DragEvent, payload: DragPayload) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDropOnNav: (e: React.DragEvent, targetId: string) => void;
}

export default function NavigationItemsSection({
  config,
  t,
  navOrder,
  availableNavItems,
  getNavIndentLevel,
  moveNavItem,
  indentNavItem,
  outdentNavItem,
  toggleNavItem,
  handleDragStart,
  handleDragOver,
  handleDropOnNav,
}: NavigationItemsSectionProps) {
  const itemIds = navOrder.length ? navOrder : availableNavItems.map(i => i.id);

  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg"><RectangleGroupIcon className="w-5 h-5 text-blue-600" /></div>
        <div>
          <h2 className="text-lg font-semibold">{t('layout.navigationItems.title') || 'Itens de Navegação'}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('layout.navigationItems.description') || 'Defina quais itens estarão visíveis no menu.'}</p>
        </div>
      </div>

      <ul className="space-y-2">
        {itemIds.map((id, idx) => {
          const item = availableNavItems.find(x => x.id === id) || { id, label: id };
          const visible = (config.visible_nav_items || []).includes(id);
          return (
            <li
              key={id}
              draggable
              onDragStart={(e) => handleDragStart(e, { type: 'nav', id })}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnNav(e, id)}
              className="flex items-center justify-between p-2 border rounded cursor-move"
            >
              <div className="flex items-center gap-3 flex-1">
                <span data-label={item.label} title={item.label} className="data-label-visible font-medium flex-1 truncate whitespace-nowrap overflow-hidden text-gray-900 dark:text-white" style={{ paddingLeft: `${getNavIndentLevel(id) * 12}px` }}>{item.label}</span>
              </div>

              <div className="flex items-center gap-2 w-full flex-wrap md:flex-nowrap">
                <div className="flex-1 min-w-0" />

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => moveNavItem(id, 'up')}
                      disabled={idx === 0}
                      className={`flex items-center justify-center p-2 rounded-lg border transition-all bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm ${idx === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveNavItem(id, 'down')}
                      disabled={idx === (itemIds.length - 1)}
                      className={`flex items-center justify-center p-2 rounded-lg border transition-all bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm ${idx === (itemIds.length - 1) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => outdentNavItem(id)}
                      disabled={!config?.nav_parent_map || !(config.nav_parent_map[id])}
                      className={`p-2 rounded-lg border transition-all bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm ${!config?.nav_parent_map || !(config.nav_parent_map[id]) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label="Outdent"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => indentNavItem(id)}
                      disabled={idx === 0}
                      className={`p-2 rounded-lg border transition-all bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm ${idx === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label="Indent"
                    >
                      →
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { if (!visible) toggleNavItem(id); }}
                      className={`w-28 flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${visible ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                      aria-pressed={visible}
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Ativo</span>
                      {visible && <CheckIcon className="w-4 h-4 text-primary-500 ml-1" />}
                    </button>

                    <button
                      onClick={() => { if (visible && id !== 'settings') toggleNavItem(id); }}
                      disabled={id === 'settings'}
                      className={`w-28 flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${!visible ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'} ${id === 'settings' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-disabled={id === 'settings'}
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Inativo</span>
                      {!visible && <CheckIcon className="w-4 h-4 text-primary-500 ml-1" />}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
