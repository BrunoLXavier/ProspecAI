// Layout settings page — cleaned and minimalized
'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bars3Icon, RectangleGroupIcon, UserGroupIcon, CheckIcon, ArrowPathIcon, Squares2X2Icon, ShieldCheckIcon, ArrowsPointingOutIcon, PaintBrushIcon, PhotoIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useLayout, ALL_WIDGET_IDS } from '@/contexts/LayoutContext';
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

  if (isLoading) return <div className="p-8 text-center">Loading layout configuration...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg"><Bars3Icon className="w-6 h-6 text-primary-600" /></div>
          <div>
            <h1 className="text-xl font-semibold">{t('layout.title') || 'Layout'}</h1>
            <p className="text-sm text-gray-500">{t('layout.subtitle') || 'Customize navigation and dashboard'}</p>
          </div>
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
      <section className="bg-white rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg"><RectangleGroupIcon className="w-5 h-5 text-blue-600" /></div>
          <div>
            <h2 className="text-lg font-semibold">{t('layout.navigationItems.title') || 'Itens de Navegação'}</h2>
            <p className="text-sm text-gray-500">{t('layout.navigationItems.description') || 'Defina quais itens estarão visíveis no menu.'}</p>
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
                    className={`px-3 py-1 rounded ${visible ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border'} ${id === 'settings' ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        <section className="bg-white rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg"><UserGroupIcon className="w-5 h-5 text-blue-600" /></div>
            <div>
              <h2 className="text-lg font-semibold">Itens de Navegação por Perfil de Usuário</h2>
              <p className="text-sm text-gray-500">Defina quais itens estarão disponíveis por perfil.</p>
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
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded text-sm text-left min-w-0 overflow-hidden truncate ${!globallyVisible ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200' : hasAccess ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
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
      <section className="bg-white rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg"><Squares2X2Icon className="w-5 h-5 text-green-600" /></div>
          <div>
            <h2 className="text-lg font-semibold">{t('layout.dashboardWidgets.title') || 'Dashboard Widgets'}</h2>
            <p className="text-sm text-gray-500">{t('layout.dashboardWidgets.description') || 'Escolha quais widgets aparecem no Dashboard.'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {availableWidgets.map(widget => {
            const isEnabled = (config.dashboard_widgets || []).includes(widget.id);
            return (
              <button
                key={widget.id}
                onClick={() => updateConfig('dashboard_widgets', isEnabled ? (config.dashboard_widgets || []).filter((w: string) => w !== widget.id) : [...(config.dashboard_widgets || []), widget.id])}
                className={`flex flex-col items-start p-3 rounded-lg border-2 transition-all ${isEnabled ? 'border-primary-500 bg-primary-50' : 'border-gray-200 opacity-60'}`}
              >
                <span className="text-sm font-medium">{widget.label}</span>
                <span className="text-xs text-gray-500">{widget.size}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Widgets por Perfil de Usuário (Admin) - simplified restored version */}
      {isAdmin && (
        <section className="bg-white rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg"><ShieldCheckIcon className="w-5 h-5 text-orange-600" /></div>
            <div>
              <h2 className="text-lg font-semibold">Widgets por Perfil de Usuário</h2>
              <p className="text-sm text-gray-500">Defina quais widgets estarão disponíveis para cada perfil.</p>
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
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded text-sm min-w-0 overflow-hidden truncate ${!enabled ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200' : hasRole ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
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
      <section className="bg-white rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 rounded-lg"><Bars3Icon className="w-5 h-5 text-primary-600" /></div>
          <div>
            <h2 className="text-lg font-semibold">{t('layout.sidebar.title') || 'Sidebar Configuration'}</h2>
            <p className="text-sm text-gray-500">{t('layout.sidebar.description') || 'Ajuste a posição e largura da barra lateral.'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Position</label>
            <div className="flex gap-2">
              {(['left','right'] as const).map(pos => (
                <button key={pos} onClick={() => updateConfig('sidebar_position', pos)} className={`px-3 py-2 border rounded ${config.sidebar_position === pos ? 'bg-primary-50 border-primary-500' : ''}`}>{pos}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Width: {config.sidebar_width}px</label>
            <input type="range" min={200} max={400} value={config.sidebar_width} onChange={(e) => updateConfig('sidebar_width', parseInt(e.target.value))} className="w-full" />
          </div>
        </div>
      </section>

      {/* UI Preferences */}
      <section className="bg-white rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg"><ArrowsPointingOutIcon className="w-5 h-5 text-purple-600" /></div>
          <div>
            <h2 className="text-lg font-semibold">{t('layout.uiPreferences.title') || 'UI Preferences'}</h2>
            <p className="text-sm text-gray-500">{t('layout.uiPreferences.description') || 'Preferências de exibição para a aplicação.'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Default page size</label>
            <select value={config.default_page_size} onChange={(e) => updateConfig('default_page_size', parseInt(e.target.value))} className="w-full border rounded px-2 py-1">
              {[10,20,25,50,100].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Toggles</label>
            <div className="space-y-2">
              {[
                { key: 'dense_tables', label: t('layout.uiPreferences.denseTables') || 'Dense tables' },
                { key: 'animations_enabled', label: t('layout.uiPreferences.enableAnimations') || 'Animations' },
                { key: 'compact_mode', label: t('layout.uiPreferences.compactMode') || 'Compact mode' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span>{label}</span>
                  <button onClick={() => (updateConfig as any)(key, !(config as any)[key])} className={`px-3 py-1 rounded ${(config as any)[key] ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>{(config as any)[key] ? 'On' : 'Off'}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Theme & Colors */}
      <section className="bg-white rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-pink-100 rounded-lg"><PaintBrushIcon className="w-5 h-5 text-pink-600" /></div>
          <div>
            <h2 className="text-lg font-semibold">{t('layout.themeColors.title') || 'Theme & Colors'}</h2>
            <p className="text-sm text-gray-500">{t('layout.themeColors.description') || 'Personalize cores e modo.'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Color mode</label>
            <div className="flex gap-2">
              {(['light','dark'] as const).map(m => <button key={m} onClick={() => (updateConfig as any)('color_mode', m)} className={`px-3 py-2 border rounded ${(config as any).color_mode === m ? 'bg-primary-50' : ''}`}>{m}</button>)}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Primary color</label>
            <input type="color" value={config.primary_color} onChange={(e) => updateConfig('primary_color', e.target.value)} />
          </div>
        </div>
      </section>

      {/* Branding */}
      <section className="bg-white rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-100 rounded-lg"><PhotoIcon className="w-5 h-5 text-orange-600" /></div>
          <div>
            <h2 className="text-lg font-semibold">{t('layout.branding.title') || 'Branding'}</h2>
            <p className="text-sm text-gray-500">{t('layout.branding.description') || 'Configurações de marca.'}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Site name</label>
            <input className="w-full border rounded px-2 py-1" value={config.site_name || ''} onChange={(e) => updateConfig('site_name', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Logo URL</label>
            <input className="w-full border rounded px-2 py-1" value={config.site_logo_url || ''} onChange={(e) => updateConfig('site_logo_url', e.target.value || null)} />
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="bg-white rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-cyan-100 rounded-lg"><DocumentTextIcon className="w-5 h-5 text-cyan-600" /></div>
          <div>
            <h2 className="text-lg font-semibold">{t('layout.typography.title') || 'Typography'}</h2>
            <p className="text-sm text-gray-500">{t('layout.typography.description') || 'Defina tamanho e família de fontes.'}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {(['sm','base','lg'] as const).map(sz => (
            <button key={sz} onClick={() => updateConfig('font_size', sz)} className={`px-3 py-2 border rounded ${config.font_size === sz ? 'bg-primary-50' : ''}`}>{sz}</button>
          ))}
        </div>
      </section>

      {error && <div className="text-red-600">{error}</div>}
    </div>
  );
}
