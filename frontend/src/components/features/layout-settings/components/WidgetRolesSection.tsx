// Widgets per Role Section — admin-only role-based widget visibility
// Implements RF-07 (layout configuration per user/tenant)
'use client';

import React from 'react';
import { ShieldCheckIcon, UserGroupIcon, CheckIcon } from '@heroicons/react/24/outline';
import { LayoutConfig } from '@/contexts/LayoutContext';
import { AvailableWidget, AvailableRole, DragPayload } from './types';

interface WidgetRolesSectionProps {
  config: LayoutConfig;
  updateConfig: <K extends keyof LayoutConfig>(key: K, value: LayoutConfig[K]) => void;
  availableRoles: AvailableRole[];
  availableWidgets: AvailableWidget[];
  handleDragStart: (e: React.DragEvent, payload: DragPayload) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDropOnRoleList: (e: React.DragEvent, roleId: string, listKey: 'nav' | 'widgets') => void;
}

export default function WidgetRolesSection({
  config,
  updateConfig,
  availableRoles,
  availableWidgets,
  handleDragStart,
  handleDragOver,
  handleDropOnRoleList,
}: WidgetRolesSectionProps) {
  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-orange-100 rounded-lg"><ShieldCheckIcon className="w-5 h-5 text-orange-600" /></div>
        <div>
          <h2 className="text-lg font-semibold">Widgets por Perfil de Usuário</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Defina quais widgets estarão disponíveis para cada perfil.</p>
        </div>
      </div>

      <div className="space-y-4">
        {availableRoles.map(role => {
          const roleWidgets = (config.dashboard_widgets_by_role || {})[role.id] || [];
          return (
            <div key={role.id} className="p-3 border rounded">
              <div className="flex items-center gap-2 mb-3"><UserGroupIcon className="w-5 h-5" /><span className="font-medium">{role.label}</span></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {availableWidgets.map(widget => {
                  const enabled = (config.dashboard_widgets || []).includes(widget.id);
                  const hasRole = roleWidgets.includes(widget.id);
                  return (
                    <div
                      key={widget.id}
                      draggable={enabled}
                      onDragStart={(e) => handleDragStart(e, { type: 'role-widget', id: widget.id, role: role.id })}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropOnRoleList(e, role.id, 'widgets')}
                    >
                      <button
                        onClick={() => {
                          const byRole = config.dashboard_widgets_by_role || {};
                          const cur = byRole[role.id] || [];
                          const next = cur.includes(widget.id) ? cur.filter((w: string) => w !== widget.id) : [...cur, widget.id];
                          updateConfig('dashboard_widgets_by_role', { ...byRole, [role.id]: next });
                        }}
                        disabled={!enabled}
                        aria-pressed={hasRole}
                        className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg border transition-all text-sm min-w-0 overflow-hidden ${!enabled ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300' : hasRole ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100'}`}
                      >
                        <span className="truncate text-sm font-medium text-gray-900 dark:text-white">{widget.label}</span>
                        {hasRole ? <CheckIcon className="w-4 h-4 text-primary-500 ml-1" /> : null}
                      </button>
                    </div>
                  );
                })}
                </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
