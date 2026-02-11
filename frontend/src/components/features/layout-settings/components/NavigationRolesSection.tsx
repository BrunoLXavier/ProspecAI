// Navigation Items per Role Section — admin-only role-based nav visibility
// Implements RF-07 (layout configuration per user/tenant)
'use client';

import React from 'react';
import { UserGroupIcon, CheckIcon } from '@heroicons/react/24/outline';
import { LayoutConfig } from '@/contexts/LayoutContext';
import { AvailableNavItem, AvailableRole, DragPayload } from './types';

interface NavigationRolesSectionProps {
  config: LayoutConfig;
  updateConfig: <K extends keyof LayoutConfig>(key: K, value: LayoutConfig[K]) => void;
  availableRoles: AvailableRole[];
  orderedAvailableNavItems: AvailableNavItem[];
  toggleNavItemForRole: (role: string, itemId: string) => void;
  handleDragStart: (e: React.DragEvent, payload: DragPayload) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDropOnRoleList: (e: React.DragEvent, roleId: string, listKey: 'nav' | 'widgets') => void;
}

export default function NavigationRolesSection({
  config,
  availableRoles,
  orderedAvailableNavItems,
  toggleNavItemForRole,
  handleDragStart,
  handleDragOver,
  handleDropOnRoleList,
}: NavigationRolesSectionProps) {
  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg"><UserGroupIcon className="w-5 h-5 text-blue-600" /></div>
        <div>
          <h2 className="text-lg font-semibold">Itens de Navegação por Perfil de Usuário</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Defina quais itens estarão disponíveis por perfil.</p>
        </div>
      </div>

      <div className="space-y-4">
        {availableRoles.map(role => {
          const roleNav = (config.visible_nav_items_by_role || {})[role.id] || [];
          return (
            <div key={role.id} className="p-3 border rounded">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><UserGroupIcon className="w-5 h-5" /><span className="font-medium">{role.label}</span></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {orderedAvailableNavItems.map(item => {
                  const globallyVisible = (config.visible_nav_items || []).includes(item.id);
                  const hasAccess = roleNav.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        draggable={globallyVisible}
                        onDragStart={(e) => handleDragStart(e, { type: 'role-nav', id: item.id, role: role.id })}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnRoleList(e, role.id, 'nav')}
                      >
                        <button
                          onClick={() => toggleNavItemForRole(role.id, item.id)}
                          disabled={!globallyVisible}
                          aria-pressed={hasAccess}
                          title={!globallyVisible ? 'Ative o item globalmente primeiro' : hasAccess ? 'Remover acesso' : 'Conceder acesso'}
                          className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg border transition-all text-sm min-w-0 overflow-hidden ${!globallyVisible ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300' : hasAccess ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100'}`}
                        >
                          <span className="truncate text-sm font-medium text-gray-900 dark:text-white">{item.label}</span>
                          {hasAccess ? <CheckIcon className="w-4 h-4 text-primary-500 ml-1" /> : null}
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
