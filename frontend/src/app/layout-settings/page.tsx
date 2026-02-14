// Layout settings page — thin orchestrator that composes sub-components
// Implements RF-07 (layout configuration per user/tenant)
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useLayout, ALL_WIDGET_IDS } from '@/contexts/LayoutContext';
import { navigationItems as SIDEBAR_NAV_ITEMS } from '@/components/features/shared/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmModal from '@/components/features/shared/ui/ConfirmModal';

import {
  NavigationItemsSection,
  NavigationRolesSection,
  DashboardWidgetsSection,
  WidgetRolesSection,
  SidebarConfigSection,
  UIPreferencesSection,
  ThemeColorsSection,
  BrandingSection,
  TypographySection,
  LayoutLoadingSkeleton,
} from '@/components/features/layout-settings';
import type { DragPayload } from '@/components/features/layout-settings';
import { hexToRgb, contrastRatio } from '@/components/features/layout-settings';

const availableRoles = [
  { id: 'admin', label: 'Administrador' },
  { id: 'manager', label: 'Gerente' },
  { id: 'analyst', label: 'Analista' },
  { id: 'viewer', label: 'Visualizador' },
];

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

  // Derive availableNavItems from canonical sidebar list, using translations
  const availableNavItems = SIDEBAR_NAV_ITEMS.map(i => {
    let label = '';
    try {
      const maybe = tNav(i.name);
      if (maybe && typeof maybe === 'string' && !maybe.startsWith('navigation.')) label = maybe;
    } catch (e) { /* ignore missing translations */ }
    if (!label) {
      label = (i.name && typeof i.name === 'string') ? (i.name.charAt(0).toUpperCase() + i.name.slice(1)) : i.id;
    }
    return { id: i.id, label };
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navOrder, setNavOrder] = useState<string[]>([]);
  const [widgetsOrder, setWidgetsOrder] = useState<string[]>([]);
  const dragData = useRef<{ type?: string; id?: string; role?: string } | null>(null);

  // ── Drag & Drop handlers ──────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, payload: DragPayload) => {
    dragData.current = payload;
    try {
      e.dataTransfer.setData('application/json', JSON.stringify(payload));
      e.dataTransfer.setData('text/plain', JSON.stringify(payload));
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setDragImage(e.currentTarget as Element, 10, 10); } catch (err) { }
    } catch (err) { }
    try { console.debug('[LayoutPage] dragstart', payload); } catch (e) { }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    try { console.debug('[LayoutPage] dragover', (e.currentTarget as Element)?.className || e.target); } catch (err) { }
  };

  const handleDropOnNav = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    let payload = dragData.current;
    if (!payload) {
      try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { payload = null; }
    }
    if (!payload) return;
    if (payload.type === 'nav') {
      const src = payload.id!;
      const dest = targetId;
      const arr = [...(navOrder.length ? navOrder : (config.visible_nav_items || []))];
      const from = arr.indexOf(src);
      const to = arr.indexOf(dest);
      if (from === -1 || to === -1 || from === to) return;
      arr.splice(from, 1);
      arr.splice(to, 0, src);
      setNavOrder(arr);
      updateConfig('nav_order', arr);
    }
  };

  const handleDropOnWidgets = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    let payload = dragData.current;
    if (!payload) {
      try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { payload = null; }
    }
    if (!payload) return;
    try { console.debug('[LayoutPage] drop on widgets', { payload, targetId }); } catch (err) { }
    if (payload.type === 'widget') {
      const src = payload.id!;
      const dest = targetId;
      const arr = [...(widgetsOrder.length ? widgetsOrder : (config.dashboard_widgets || []))];
      const from = arr.indexOf(src);
      const to = arr.indexOf(dest);
      if (from === -1 || to === -1 || from === to) return;
      arr.splice(from, 1);
      arr.splice(to, 0, src);
      setWidgetsOrder(arr);
      updateConfig('dashboard_widget_order', arr);
    }
  };

  const handleDropOnRoleList = (e: React.DragEvent, roleId: string, listKey: 'nav' | 'widgets') => {
    e.preventDefault();
    let payload = dragData.current;
    if (!payload) {
      try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { payload = null; }
    }
    if (!payload) return;
    if (listKey === 'nav' && payload.type === 'role-nav' && payload.role === roleId) {
      const src = payload.id!;
      const byRole = config.visible_nav_items_by_role || {};
      const arr = [...(byRole[roleId] || [])];
      const to = arr.indexOf(src);
      if (to === -1) return;
      updateConfig('visible_nav_items_by_role', { ...byRole, [roleId]: arr });
    }
    if (listKey === 'widgets' && payload.type === 'role-widget' && payload.role === roleId) {
      const src = payload.id!;
      const byRole = config.dashboard_widgets_by_role || {};
      const arr = [...(byRole[roleId] || [])];
      const to = arr.indexOf(src);
      if (to === -1) return;
      updateConfig('dashboard_widgets_by_role', { ...byRole, [roleId]: arr });
    }
  };

  // ── Effects ───────────────────────────────────────────────────────────

  // Refs to ensure initialization effects only run once after the backend
  // config has been loaded. This prevents user-triggered config changes
  // (e.g. moveNavItem, indentNavItem) from re-running the init logic and
  // overwriting the user's pending changes.
  const navInitRef = useRef(false);
  const widgetInitRef = useRef(false);

  useEffect(() => {
    if (!config || isLoading) return;
    if (navInitRef.current) return;
    navInitRef.current = true;
    const savedOrder = (config.nav_order && config.nav_order.length) ? [...config.nav_order] : (config.visible_nav_items && config.visible_nav_items.length ? [...config.visible_nav_items] : []);
    const allAvailable = availableNavItems.map(i => i.id);
    const merged = Array.from(new Set([...(savedOrder || []), ...allAvailable]));
    setNavOrder(merged);
    const visibleNow = config.visible_nav_items || [];
    if (!visibleNow.includes('settings')) {
      updateConfig('visible_nav_items', [...visibleNow, 'settings']);
    }
  }, [config, isLoading]);

  const orderedAvailableNavItems = (navOrder.length ? navOrder : availableNavItems.map(i => i.id))
    .map(id => availableNavItems.find(x => x.id === id))
    .filter(Boolean) as typeof availableNavItems;

  useEffect(() => {
    if (!config || isLoading) return;
    if (widgetInitRef.current) return;
    widgetInitRef.current = true;
    const savedOrder = (config.dashboard_widget_order && config.dashboard_widget_order.length) ? [...config.dashboard_widget_order] : (config.dashboard_widgets && config.dashboard_widgets.length ? [...config.dashboard_widgets] : []);
    const allAvailable = availableWidgets.map(i => i.id);
    const merged = Array.from(new Set([...(savedOrder || []), ...allAvailable]));
    setWidgetsOrder(merged);
  }, [config, isLoading]);

  const isAdmin = !!user?.roles?.includes('admin');

  // ── Save / Reset ──────────────────────────────────────────────────────

  const handleSaveLayout = async () => {
    const issues: string[] = [];

    const checkColor = (colorHex: string | undefined, name: string) => {
      if (!colorHex) return;
      const cAgainstWhite = contrastRatio(colorHex, '#ffffff');
      if (cAgainstWhite < 3 && contrastRatio(colorHex, '#000000') < 3) {
        issues.push(`${name} possui baixo contraste com texto claro e escuro (WCAG < 3).`);
      } else if (cAgainstWhite < 3) {
        issues.push(`${name} pode ter baixo contraste quando usado sobre fundo branco (contraste ${cAgainstWhite.toFixed(2)}).`);
      } else if (contrastRatio(colorHex, '#000000') < 3) {
        issues.push(`${name} pode ter baixo contraste quando usado sobre fundo escuro (contraste ${contrastRatio(colorHex, '#000000').toFixed(2)}).`);
      }
    };

    checkColor(config.primary_color_light || config.primary_color, 'Primária (Claro)');
    checkColor(config.primary_color_dark || config.primary_color, 'Primária (Escuro)');
    checkColor(config.secondary_color_light || config.secondary_color, 'Secundária (Claro)');
    checkColor(config.secondary_color_dark || config.secondary_color, 'Secundária (Escuro)');

    const performSave = async () => {
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

    if (issues.length) {
      const msg = `Atenção: possíveis problemas de contraste foram detectados:\n\n- ${issues.join('\n- ')}\n\nDeseja continuar e salvar mesmo assim?`;
      openConfirm(t('layout.messages.contrastWarningTitle') || 'Problemas de contraste', msg, () => { performSave(); });
      return;
    }

    await performSave();
  };

  const handleResetLayout = async () => {
    openConfirm(t('layout.messages.resetConfirmTitle') || 'Reset layout?', t('layout.messages.resetConfirm') || 'Reset layout?', async () => {
      setSaving(true);
      setError(null);
      try {
        // Allow init effects to re-run after reset so the UI reflects the new defaults
        navInitRef.current = false;
        widgetInitRef.current = false;
        await resetConfig();
      } catch (err: any) {
        setError(err?.message || 'Failed to reset');
      } finally {
        setSaving(false);
      }
    });
  };

  // ── Confirm Modal state ───────────────────────────────────────────────

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmTitle, setConfirmTitle] = React.useState('');
  const [confirmDescription, setConfirmDescription] = React.useState('');
  const [confirmAction, setConfirmAction] = React.useState<() => void>(() => () => {});

  const openConfirm = (title: string, description: string, action: () => void) => {
    setConfirmTitle(title);
    setConfirmDescription(description);
    setConfirmAction(() => () => { action(); setConfirmOpen(false); });
    setConfirmOpen(true);
  };

  // ── Branding confirm helpers ──────────────────────────────────────────

  const removeLogo = () => {
    openConfirm(
      t('layout.branding.removeLogoConfirm') || 'Remover a logo do site?',
      t('layout.branding.removeLogoConfirmDetail') || 'Isto removerá a logo configurada para este site.',
      () => updateConfig('site_logo_url', null)
    );
  };

  const restoreLogoDefault = () => {
    openConfirm(
      t('layout.branding.restoreLogoConfirm') || 'Restaurar logo padrão?',
      t('layout.branding.restoreLogoConfirmDetail') || 'Isto restaurará a logo para o padrão da aplicação.',
      () => updateConfig('site_logo_url', '/apple-icon.svg')
    );
  };

  const removeFavicon = () => {
    openConfirm(
      t('layout.branding.removeFaviconConfirm') || 'Remover o favicon do site?',
      t('layout.branding.removeFaviconConfirmDetail') || 'Isto removerá o favicon configurado. O favicon padrão será usado.',
      () => {
        updateConfig('site_favicon_url', null);
        try {
          const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
          if (link) link.href = '/favicon.svg';
        } catch (e) {}
      }
    );
  };

  const restoreFaviconDefault = () => {
    openConfirm(
      t('layout.branding.restoreFaviconConfirm') || 'Restaurar favicon padrão?',
      t('layout.branding.restoreFaviconConfirmDetail') || 'Isto restaurará o favicon para o padrão da aplicação.',
      () => {
        updateConfig('site_favicon_url', '/favicon.svg');
        try {
          const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
          if (link) link.href = '/favicon.svg';
        } catch (e) {}
      }
    );
  };

  // ── Nav item helpers ──────────────────────────────────────────────────

  const toggleNavItem = (id: string) => {
    if (!config) return;
    if (id === 'settings') return;
    const visible = config.visible_nav_items || [];
    const exists = visible.includes(id);
    if (exists) {
      const newVisible = visible.filter(x => x !== id);
      updateConfig('visible_nav_items', newVisible);
    } else {
      try {
        const orderArr = (config.nav_order && config.nav_order.length) ? config.nav_order : navOrder;
        let insertAt = visible.length;
        if (orderArr && orderArr.length) {
          const indexInOrder = orderArr.indexOf(id);
          if (indexInOrder !== -1) {
            let found = false;
            for (let i = indexInOrder - 1; i >= 0; i--) {
              const before = orderArr[i];
              const pos = visible.indexOf(before);
              if (pos !== -1) { insertAt = pos + 1; found = true; break; }
            }
            if (!found) insertAt = 0;
          }
        }
        const nextVisible = [...visible];
        nextVisible.splice(insertAt, 0, id);
        updateConfig('visible_nav_items', nextVisible);
      } catch (e) {
        updateConfig('visible_nav_items', [...visible, id]);
      }
    }
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
      // Sync to config outside the updater via microtask to avoid
      // side-effects inside React state updater callbacks.
      queueMicrotask(() => updateConfig('nav_order', copy));
      return copy;
    });
  };

  const getNavIndentLevel = (id: string) => {
    if (!config) return 0;
    const parentMap = config.nav_parent_map || {};
    let level = 0;
    let cur = parentMap[id];
    const seen = new Set<string>();
    while (cur) {
      if (seen.has(cur)) break;
      seen.add(cur);
      level += 1;
      cur = parentMap[cur];
    }
    return level;
  };

  const indentNavItem = (id: string) => {
    if (!config) return;
    const arr = navOrder.length ? navOrder : (config.nav_order || []);
    const idx = arr.indexOf(id);
    if (idx <= 0) return;
    const prev = arr[idx - 1];
    const parentMap = { ...(config.nav_parent_map || {}) };
    if (prev === id) return;
    let p: string | null = prev;
    while (p) {
      if (p === id) return;
      p = parentMap[p];
    }
    parentMap[id] = prev;
    updateConfig('nav_parent_map', parentMap as any);
  };

  const outdentNavItem = (id: string) => {
    if (!config) return;
    const parentMap = { ...(config.nav_parent_map || {}) };
    const parent = parentMap[id];
    if (!parent) return;
    parentMap[id] = parentMap[parent] || null;
    updateConfig('nav_parent_map', parentMap as any);
  };

  const moveWidget = (id: string, direction: 'up' | 'down') => {
    setWidgetsOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[swap]] = [copy[swap], copy[idx]];
      // Sync to config outside the updater via microtask to avoid
      // side-effects inside React state updater callbacks.
      queueMicrotask(() => updateConfig('dashboard_widget_order', copy));
      return copy;
    });
  };

  // ── Loading state ─────────────────────────────────────────────────────

  if (isLoading) {
    return <LayoutLoadingSkeleton t={t} availableNavItems={availableNavItems} />;
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('layout.title') || 'Layout'}</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('layout.subtitle') || 'Customize navigation and dashboard'}</p>
        </div>

        <div className="flex gap-2">
          <button onClick={handleResetLayout} disabled={saving} title={t('layout.buttons.reset') || 'Reset'} className="inline-flex items-center justify-center p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition disabled:opacity-50">
            <ArrowPathIcon className="w-5 h-5" />
          </button>
          <button onClick={handleSaveLayout} disabled={saving} title={t('layout.buttons.saveChanges') || 'Save changes'} className="inline-flex items-center justify-center p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50">
            {saving ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <CheckIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Navigation Items */}
      <NavigationItemsSection
        config={config}
        updateConfig={updateConfig}
        t={t}
        navOrder={navOrder}
        availableNavItems={availableNavItems}
        getNavIndentLevel={getNavIndentLevel}
        moveNavItem={moveNavItem}
        indentNavItem={indentNavItem}
        outdentNavItem={outdentNavItem}
        toggleNavItem={toggleNavItem}
        handleDragStart={handleDragStart}
        handleDragOver={handleDragOver}
        handleDropOnNav={handleDropOnNav}
      />

      {/* Navigation Items per Role (Admin) */}
      {isAdmin && (
        <NavigationRolesSection
          config={config}
          updateConfig={updateConfig}
          availableRoles={availableRoles}
          orderedAvailableNavItems={orderedAvailableNavItems}
          toggleNavItemForRole={toggleNavItemForRole}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleDropOnRoleList={handleDropOnRoleList}
        />
      )}

      {/* Dashboard Widgets */}
      <DashboardWidgetsSection
        config={config}
        updateConfig={updateConfig}
        t={t}
        widgetsOrder={widgetsOrder}
        availableWidgets={availableWidgets}
        moveWidget={moveWidget}
        handleDragStart={handleDragStart}
        handleDragOver={handleDragOver}
        handleDropOnWidgets={handleDropOnWidgets}
      />

      {/* Widgets per Role (Admin) */}
      {isAdmin && (
        <WidgetRolesSection
          config={config}
          updateConfig={updateConfig}
          availableRoles={availableRoles}
          availableWidgets={availableWidgets}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleDropOnRoleList={handleDropOnRoleList}
        />
      )}

      {/* Sidebar Configuration */}
      <SidebarConfigSection config={config} updateConfig={updateConfig} t={t} />

      {/* UI Preferences */}
      <UIPreferencesSection config={config} updateConfig={updateConfig} t={t} />

      {/* Theme & Colors */}
      <ThemeColorsSection config={config} updateConfig={updateConfig} t={t} />

      {/* Branding */}
      <BrandingSection
        config={config}
        updateConfig={updateConfig}
        t={t}
        removeLogo={removeLogo}
        restoreLogoDefault={restoreLogoDefault}
        removeFavicon={removeFavicon}
        restoreFaviconDefault={restoreFaviconDefault}
      />

      {/* Typography */}
      <TypographySection config={config} updateConfig={updateConfig} t={t} />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmOpen}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={t('common.confirm') || 'Confirm'}
        cancelLabel={t('common.cancel') || 'Cancel'}
        onConfirm={() => { try { confirmAction(); } catch (e) { setConfirmOpen(false); } }}
        onCancel={() => setConfirmOpen(false)}
      />

      {error && <div className="text-red-600">{error}</div>}
    </div>
  );
}
