// Dashboard Widgets Section — drag/drop reorder, toggle visibility
// Implements RF-07 (layout configuration per user/tenant)
'use client';

import React from 'react';
import { Squares2X2Icon, CheckIcon } from '@heroicons/react/24/outline';
import { LayoutConfig } from '@/contexts/LayoutContext';
import { AvailableWidget, DragPayload } from './types';

interface DashboardWidgetsSectionProps {
  config: LayoutConfig;
  updateConfig: <K extends keyof LayoutConfig>(key: K, value: LayoutConfig[K]) => void;
  t: (key: string) => string;
  widgetsOrder: string[];
  availableWidgets: AvailableWidget[];
  moveWidget: (id: string, direction: 'up' | 'down') => void;
  handleDragStart: (e: React.DragEvent, payload: DragPayload) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDropOnWidgets: (e: React.DragEvent, targetId: string) => void;
}

export default function DashboardWidgetsSection({
  config,
  updateConfig,
  t,
  widgetsOrder,
  availableWidgets,
  moveWidget,
  handleDragStart,
  handleDragOver,
  handleDropOnWidgets,
}: DashboardWidgetsSectionProps) {
  const itemIds = widgetsOrder.length ? widgetsOrder : availableWidgets.map(i => i.id);

  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-green-100 rounded-lg"><Squares2X2Icon className="w-5 h-5 text-green-600" /></div>
        <div>
          <h2 className="text-lg font-semibold">{t('layout.dashboardWidgets.title') || 'Dashboard Widgets'}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('layout.dashboardWidgets.description') || 'Escolha quais widgets aparecem no Dashboard.'}</p>
        </div>
      </div>

      <ul className="space-y-2">
        {itemIds.map((id, idx) => {
          const widget = availableWidgets.find(x => x.id === id) || { id, label: id, size: 'small' };
          const enabled = (config.dashboard_widgets || []).includes(id);
          return (
            <li
              key={id}
              draggable
              onDragStart={(e) => handleDragStart(e, { type: 'widget', id })}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnWidgets(e, id)}
              className="flex items-center justify-between p-2 border rounded cursor-move"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex flex-col">
                  <span className="font-medium truncate">{widget.label}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{widget.size}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-40 justify-end">
                <div className="flex items-center gap-2 w-40">
                  <button
                    onClick={() => moveWidget(id, 'up')}
                    disabled={idx === 0}
                    className={`flex items-center justify-center p-2 rounded-lg border transition-all bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm ${idx === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveWidget(id, 'down')}
                    disabled={idx === (itemIds.length - 1)}
                    className={`flex items-center justify-center p-2 rounded-lg border transition-all bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm ${idx === (itemIds.length - 1) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                </div>

                <div className="flex gap-3 w-52 justify-end">
                  <button
                    onClick={() => {
                      if (!enabled) {
                        try {
                          const currentWidgets = (config.dashboard_widgets || []);
                          const currentOrder = (config.dashboard_widget_order && config.dashboard_widget_order.length) ? config.dashboard_widget_order : widgetsOrder;
                          let nextWidgets = [...currentWidgets];
                          if (!nextWidgets.includes(id)) {
                            if (currentOrder && currentOrder.length) {
                              const idxInOrder = currentOrder.indexOf(id);
                              if (idxInOrder !== -1) {
                                let insertAt = nextWidgets.length;
                                for (let i = idxInOrder - 1; i >= 0; i--) {
                                  const before = currentOrder[i];
                                  const pos = nextWidgets.indexOf(before);
                                  if (pos !== -1) { insertAt = pos + 1; break; }
                                }
                                nextWidgets.splice(insertAt, 0, id);
                              } else {
                                nextWidgets.push(id);
                              }
                            } else {
                              nextWidgets.push(id);
                            }
                            updateConfig('dashboard_widgets', nextWidgets);
                          }
                        } catch (e) {
                          updateConfig('dashboard_widgets', [...(config.dashboard_widgets || []), id]);
                        }
                      }
                    }}
                    className={`w-28 flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${enabled ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                    aria-pressed={enabled}
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Ativo</span>
                    {enabled && <CheckIcon className="w-4 h-4 text-primary-500 ml-1" />}
                  </button>

                  <button
                    onClick={() => {
                      if (enabled) {
                        try {
                          const existingOrder = config.dashboard_widget_order || [];
                          const orderToPersist = (existingOrder && existingOrder.length) ? existingOrder : widgetsOrder;
                          if (!existingOrder || !existingOrder.length) {
                            updateConfig('dashboard_widget_order', orderToPersist);
                          }
                        } catch (e) {
                        }
                        updateConfig('dashboard_widgets', (config.dashboard_widgets || []).filter((w: string) => w !== id));
                      }
                    }}
                    className={`w-28 flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${!enabled ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                    aria-pressed={!enabled}
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Inativo</span>
                    {!enabled && <CheckIcon className="w-4 h-4 text-primary-500 ml-1" />}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
