// Layout settings page — cleaned and minimalized
'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bars3Icon, RectangleGroupIcon, UserGroupIcon, CheckIcon, ArrowPathIcon, Squares2X2Icon, ShieldCheckIcon, ArrowsPointingOutIcon, PaintBrushIcon, PhotoIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useLayout, ALL_WIDGET_IDS, DEFAULT_CONFIG } from '@/contexts/LayoutContext';
import { useAuth } from '@/contexts/AuthContext';

const availableRoles = [
  { id: 'admin', label: 'Administrador' },
  { id: 'manager', label: 'Gerente' },
  { id: 'analyst', label: 'Analista' },
  { id: 'viewer', label: 'Visualizador' },
];

const availableNavItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'funding', label: 'Fomento' },
  { id: 'portfolio', label: 'Portfólio' },
  { id: 'crm', label: 'CRM' },
  { id: 'opportunities', label: 'Oportunidades' },
  { id: 'proposals', label: 'Propostas' },
  { id: 'reports', label: 'Relatórios' },
  { id: 'activity', label: 'Atividade' },
  { id: 'ingestion', label: 'Ingestão' },
  { id: 'piiAnalysis', label: 'PII' },
  { id: 'settings', label: 'Configurações' },
];

// Build available widgets from the canonical registry in LayoutContext
const widgetLabelMap: Record<string, { label: string; size: 'small' | 'medium' | 'large' }> = {
  pipeline: { label: 'Pipeline', size: 'medium' },
  opportunities: { label: 'Oportunidades', size: 'medium' },
  metrics: { label: 'Métricas', size: 'large' },
  activity: { label: 'Atividade', size: 'small' },
  matching: { label: 'Matching', size: 'medium' },
  calendar: { label: 'Calendário', size: 'small' },
  recentActivity: { label: 'Atividade Recente', size: 'small' },
  fundingSummary: { label: 'Resumo de Fomento', size: 'large' },
};

const availableWidgets = ALL_WIDGET_IDS.map(id => ({
  id,
  label: widgetLabelMap[id]?.label || id,
  size: widgetLabelMap[id]?.size || 'small',
}));

export default function LayoutPage() {
  const t = useTranslations('settings');
  const tNav = useTranslations('navigation');
  const { config, updateConfig, saveConfig, resetConfig, isLoading } = useLayout();
  const { user } = useAuth();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navOrder, setNavOrder] = useState<string[]>([]);
  const [widgetsOrder, setWidgetsOrder] = useState<string[]>([]);

  useEffect(() => {
    if (!config) return;
    // Build a nav order that preserves any saved order but always includes
    // all available nav items so options like 'dashboard' don't disappear.
    const savedOrder = (config.nav_order && config.nav_order.length) ? [...config.nav_order] : (config.visible_nav_items && config.visible_nav_items.length ? [...config.visible_nav_items] : []);
    const allAvailable = availableNavItems.map(i => i.id);
    const merged = Array.from(new Set([...(savedOrder || []), ...allAvailable]));
    setNavOrder(merged);
    // Ensure 'settings' is always present in visible items (cannot be disabled)
    const visibleNow = config.visible_nav_items || [];
    if (!visibleNow.includes('settings')) {
      updateConfig('visible_nav_items', [...visibleNow, 'settings']);
    }
  }, [config]);

  useEffect(() => {
    if (!config) return;
    const savedOrder = (config.dashboard_widget_order && config.dashboard_widget_order.length) ? [...config.dashboard_widget_order] : (config.dashboard_widgets && config.dashboard_widgets.length ? [...config.dashboard_widgets] : []);
    const allAvailable = availableWidgets.map(i => i.id);
    const merged = Array.from(new Set([...(savedOrder || []), ...allAvailable]));
    setWidgetsOrder(merged);
  }, [config]);

  const isAdmin = !!user?.roles?.includes('admin');

  const handleSaveLayout = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveConfig();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleResetLayout = async () => {
    if (!confirm(t('layout.messages.resetConfirm') || 'Reset layout?')) return;
    setSaving(true);
    setError(null);
    try {
      await resetConfig();
    } catch (err: any) {
      setError(err?.message || 'Failed to reset');
    } finally {
      setSaving(false);
    }
  };

  const toggleNavItem = (id: string) => {
    if (!config) return;
    // 'settings' cannot be toggled off
    if (id === 'settings') return;
    const visible = config.visible_nav_items || [];
    const exists = visible.includes(id);
    const newVisible = exists ? visible.filter(x => x !== id) : [...visible, id];
    // Only update visible items; do not alter nav order when toggling visibility.
    updateConfig('visible_nav_items', newVisible);
  };

  const toggleNavItemForRole = (role: string, itemId: string) => {
    const byRole = config.visible_nav_items_by_role || {};
    const current = byRole[role] || [];
    const has = current.includes(itemId);
    const next = has ? current.filter(x => x !== itemId) : [...current, itemId];
    updateConfig('visible_nav_items_by_role', { ...byRole, [role]: next });
  };

  const moveNavItem = (id: string, direction: 'up' | 'down') => {
    setNavOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[swap]] = [copy[swap], copy[idx]];
      updateConfig('nav_order', copy);
      return copy;
    });
  };

  const moveWidget = (id: string, direction: 'up' | 'down') => {
    setWidgetsOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[swap]] = [copy[swap], copy[idx]];
      updateConfig('dashboard_widget_order', copy);
      return copy;
    });
  };

  if (isLoading) return <div className="p-8 text-center">Loading layout configuration...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('layout.title') || 'Layout'}</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('layout.subtitle') || 'Customize navigation and dashboard'}</p>
        </div>

        <div className="flex gap-2">
          <button onClick={handleResetLayout} disabled={saving} className="px-3 py-2 border rounded"> 
            <ArrowPathIcon className="w-4 h-4 inline-block mr-1" /> {t('layout.buttons.reset') || 'Reset'}
          </button>
          <button onClick={handleSaveLayout} disabled={saving} className="px-3 py-2 bg-primary-600 text-white rounded">
            {saving ? 'Saving...' : saved ? 'Saved' : (t('layout.buttons.saveChanges') || 'Save changes')}
          </button>
        </div>
      </div>

      {/* Navigation Items */}
      <section className="bg-white dark:bg-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg"><RectangleGroupIcon className="w-5 h-5 text-blue-600" /></div>
          <div>
            <h2 className="text-lg font-semibold">{t('layout.navigationItems.title') || 'Itens de Navegação'}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('layout.navigationItems.description') || 'Defina quais itens estarão visíveis no menu.'}</p>
          </div>
        </div>

        <ul className="space-y-2">
          {(navOrder.length ? navOrder : availableNavItems.map(i => i.id)).map((id, idx) => {
            const item = availableNavItems.find(x => x.id === id) || { id, label: id };
            const visible = (config.visible_nav_items || []).includes(id);
            return (
              <li key={id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium truncate">{tNav(item.id) || item.label}</span>
                </div>

                <div className="flex items-center gap-2 w-40 justify-end">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveNavItem(id, 'up')}
                      disabled={idx === 0}
                      className="px-2 py-1 border rounded w-9 h-7 flex items-center justify-center"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveNavItem(id, 'down')}
                      disabled={idx === (navOrder.length ? navOrder.length - 1 : availableNavItems.length - 1)}
                      className="px-2 py-1 border rounded w-9 h-7 flex items-center justify-center"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                  </div>

                  <button
                    onClick={() => toggleNavItem(id)}
                    disabled={id === 'settings'}
                    title={id === 'settings' ? 'Este item é sempre visível' : undefined}
                    className={`px-3 py-1 rounded ${visible ? 'bg-green-50 dark:bg-green-800 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200' : 'bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-800 dark:text-gray-200'} ${id === 'settings' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-disabled={id === 'settings'}
                  >
                    {visible ? 'Visível' : 'Oculto'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Navigation Items per Role (Admin) */}
      {isAdmin && (
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
                    {availableNavItems.map(item => {
                      const globallyVisible = (config.visible_nav_items || []).includes(item.id);
                      const hasAccess = roleNav.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleNavItemForRole(role.id, item.id)}
                          disabled={!globallyVisible}
                          aria-pressed={hasAccess}
                          title={!globallyVisible ? 'Ative o item globalmente primeiro' : hasAccess ? 'Remover acesso' : 'Conceder acesso'}
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded text-sm text-left min-w-0 overflow-hidden truncate ${!globallyVisible ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-300' : hasAccess ? 'bg-green-50 dark:bg-green-800 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-gray-100'}`}
                        >
                          <span className="truncate">{tNav(item.id) || item.label}</span>
                          {hasAccess ? <CheckIcon className="w-4 h-4 text-green-600 inline-block" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {/* Dashboard Widgets */}
      <section className="bg-white dark:bg-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg"><Squares2X2Icon className="w-5 h-5 text-green-600" /></div>
          <div>
            <h2 className="text-lg font-semibold">{t('layout.dashboardWidgets.title') || 'Dashboard Widgets'}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('layout.dashboardWidgets.description') || 'Escolha quais widgets aparecem no Dashboard.'}</p>
          </div>
        </div>

        <ul className="space-y-2">
          {(widgetsOrder.length ? widgetsOrder : availableWidgets.map(i => i.id)).map((id, idx) => {
            const widget = availableWidgets.find(x => x.id === id) || { id, label: id, size: 'small' };
            const enabled = (config.dashboard_widgets || []).includes(id);
            return (
              <li key={id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex flex-col">
                    <span className="font-medium truncate">{widget.label}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{widget.size}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-40 justify-end">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveWidget(id, 'up')}
                      disabled={idx === 0}
                      className="px-2 py-1 border rounded w-9 h-7 flex items-center justify-center"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveWidget(id, 'down')}
                      disabled={idx === (widgetsOrder.length ? widgetsOrder.length - 1 : availableWidgets.length - 1)}
                      className="px-2 py-1 border rounded w-9 h-7 flex items-center justify-center"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                  </div>

                  <button
                    onClick={() => updateConfig('dashboard_widgets', enabled ? (config.dashboard_widgets || []).filter((w: string) => w !== id) : [...(config.dashboard_widgets || []), id])}
                    className={`px-3 py-1 rounded ${enabled ? 'bg-green-50 dark:bg-green-800 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200' : 'bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-800 dark:text-gray-200'}`}
                  >
                    {enabled ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Widgets por Perfil de Usuário (Admin) - simplified restored version */}
      {isAdmin && (
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
                        <button
                          key={widget.id}
                          onClick={() => {
                            const byRole = config.dashboard_widgets_by_role || {};
                            const cur = byRole[role.id] || [];
                            const next = cur.includes(widget.id) ? cur.filter((w: string) => w !== widget.id) : [...cur, widget.id];
                            updateConfig('dashboard_widgets_by_role', { ...byRole, [role.id]: next });
                          }}
                          disabled={!enabled}
                          aria-pressed={hasRole}
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded text-sm min-w-0 overflow-hidden truncate ${!enabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-300' : hasRole ? 'bg-green-50 dark:bg-green-800 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-gray-100'}`}
                        >
                          <span className="truncate">{widget.label}</span>
                          {hasRole ? <CheckIcon className="w-4 h-4 text-green-600 inline-block" /> : null}
                        </button>
                      );
                    })}
                    </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sidebar Configuration */}
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
                  className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all ${config.sidebar_position === pos ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                >
                  <span className="font-medium text-gray-900 dark:text-white">{pos}</span>
                  {config.sidebar_position === pos && <CheckIcon className="w-4 h-4 text-primary-500 ml-auto" />}
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

      {/* UI Preferences */}
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

      {/* Theme & Colors */}
      <section className="bg-white dark:bg-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-pink-100 rounded-lg"><PaintBrushIcon className="w-5 h-5 text-pink-600" /></div>
          <div>
            <h2 className="text-lg font-semibold">{t('layout.themeColors.title') || 'Theme & Colors'}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('layout.themeColors.description') || 'Personalize cores e modo.'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t('layout.themeColors.colorMode') || 'Color mode'}</label>
            <div className="flex gap-3">
              {(['light','dark'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => updateConfig('color_mode', m)}
                  className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all ${config.color_mode === m ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                >
                  <span className="font-medium text-gray-900 dark:text-white">{t(`layout.themeColors.${m}`) || m}</span>
                  {config.color_mode === m && <CheckIcon className="w-4 h-4 text-primary-500 ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t('layout.themeColors.primaryColor') || 'Primary color'}</label>
            <div className="p-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 inline-block">
              <input type="color" value={config.primary_color} onChange={(e) => updateConfig('primary_color', e.target.value)} className="w-12 h-8 p-0 border-0 bg-transparent" />
            </div>

            <div className="mt-3">
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t('layout.themeColors.secondaryColor') || 'Secondary color'}</label>
              <div className="p-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 inline-block">
                <input type="color" value={config.secondary_color || '#ffffff'} onChange={(e) => updateConfig('secondary_color', e.target.value)} className="w-12 h-8 p-0 border-0 bg-transparent" />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t('layout.themeColors.appearance') || 'Appearance'}</label>
              <select
                value={config.appearance || 'default'}
                onChange={(e) => updateConfig('appearance', e.target.value as 'default' | 'highContrast' | 'system')}
                className="w-full border-2 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="default">{t('layout.themeColors.appearanceOptions.default') || 'Default'}</option>
                <option value="highContrast">{t('layout.themeColors.appearanceOptions.highContrast') || 'High contrast'}</option>
                <option value="system">{t('layout.themeColors.appearanceOptions.system') || 'System'}</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Branding */}
      <section className="bg-white dark:bg-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-100 rounded-lg"><PhotoIcon className="w-5 h-5 text-orange-600" /></div>
          <div>
            <h2 className="text-lg font-semibold">{t('layout.branding.title') || 'Branding'}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('layout.branding.description') || 'Configurações de marca.'}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">{t('layout.branding.siteName') || 'Site name'}</label>
            <input
              placeholder={DEFAULT_CONFIG.site_name}
              className="w-full border rounded px-2 py-1 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-gray-100"
              value={config.site_name ?? ''}
              onChange={(e) => updateConfig('site_name', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">{t('layout.branding.siteLogoUrl') || 'Logo URL'}</label>
            <input
              placeholder={t('layout.branding.leaveEmptyForDefault') || 'Leave empty to use default'}
              className="w-full border rounded px-2 py-1 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-gray-100"
              value={config.site_logo_url ?? ''}
              onChange={(e) => updateConfig('site_logo_url', e.target.value || null)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">{t('layout.branding.siteFaviconUrl') || 'Favicon URL'}</label>
            <input
              placeholder={t('layout.branding.leaveEmptyForDefault') || 'Leave empty to use default'}
              className="w-full border rounded px-2 py-1 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-gray-100"
              value={config.site_favicon_url ?? ''}
              onChange={(e) => updateConfig('site_favicon_url', e.target.value || null)}
            />
          </div>
        </div>
      </section>

      {/* Typography */}
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
                  className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all ${config.font_size === sz ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                >
                  <span className="font-medium text-gray-900 dark:text-white">{t(`layout.typography.${sz === 'sm' ? 'small' : sz === 'base' ? 'normal' : 'large'}`) || sz}</span>
                  {config.font_size === sz && <CheckIcon className="w-4 h-4 text-primary-500 ml-auto" />}
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
                  className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all ${config.font_family === f ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                >
                  <span className="font-medium text-gray-900 dark:text-white">{f === 'sans' ? (t('layout.typography.sansSerif') || 'Sans-serif') : f === 'serif' ? (t('layout.typography.serif') || 'Serif') : (t('layout.typography.monospace') || 'Monospace')}</span>
                  {config.font_family === f && <CheckIcon className="w-4 h-4 text-primary-500 ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {error && <div className="text-red-600">{error}</div>}
    </div>
  );
}
