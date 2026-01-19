// Layout settings page — cleaned and minimalized
'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  // Drag & drop state
  const dragData = useRef<{ type?: string; id?: string; role?: string } | null>(null);

  const handleDragStart = (e: React.DragEvent, payload: { type: string; id: string; role?: string }) => {
    dragData.current = payload;
    try { e.dataTransfer.setData('text/plain', JSON.stringify(payload)); } catch (err) { /* ignore */ }
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
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
    // role-nav and widgets handled elsewhere
  };

  const handleDropOnWidgets = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    let payload = dragData.current;
    if (!payload) {
      try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { payload = null; }
    }
    if (!payload) return;
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
      // If dropped onto another item we won't have target id; just ignore
      // For simplicity, moves will cycle to end if not present
      if (to === -1) return;
      // No-op for now
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
    // Validate color contrast and warn user if combinations may reduce accessibility
    const issues: string[] = [];
    const hexToRgb = (hex: string) => {
      if (!hex) return null;
      const h = hex.replace('#', '');
      const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
      const bigint = parseInt(full, 16);
      return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
    };

    const luminance = (r: number, g: number, b: number) => {
      const srgb = [r / 255, g / 255, b / 255].map((v) => {
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    };

    const contrastRatio = (hex1: string, hex2: string) => {
      const a = hexToRgb(hex1);
      const b = hexToRgb(hex2);
      if (!a || !b) return 21;
      const L1 = luminance(a.r, a.g, a.b);
      const L2 = luminance(b.r, b.g, b.b);
      const bright = Math.max(L1, L2);
      const dark = Math.min(L1, L2);
      return (bright + 0.05) / (dark + 0.05);
    };

    // Check both light and dark variants against white and dark text backgrounds
    const checkColor = (colorHex: string | undefined, name: string) => {
      if (!colorHex) return;
      const cAgainstWhite = contrastRatio(colorHex, '#ffffff');
      const cAgainstBlack = contrastRatio(colorHex, '#000000');
      if (cAgainstWhite < 3 && cAgainstBlack < 3) {
        issues.push(`${name} possui baixo contraste com texto claro e escuro (WCAG < 3).`);
      } else if (cAgainstWhite < 3) {
        issues.push(`${name} pode ter baixo contraste quando usado sobre fundo branco (contraste ${cAgainstWhite.toFixed(2)}).`);
      } else if (cAgainstBlack < 3) {
        issues.push(`${name} pode ter baixo contraste quando usado sobre fundo escuro (contraste ${cAgainstBlack.toFixed(2)}).`);
      }
    };

    // Validate configured tokens (light and dark variants)
    checkColor(config.primary_color_light || config.primary_color, 'Primária (Claro)');
    checkColor(config.primary_color_dark || config.primary_color, 'Primária (Escuro)');
    checkColor(config.secondary_color_light || config.secondary_color, 'Secundária (Claro)');
    checkColor(config.secondary_color_dark || config.secondary_color, 'Secundária (Escuro)');

    if (issues.length) {
      const msg = `Atenção: possíveis problemas de contraste foram detectados:\n\n- ${issues.join('\n- ')}\n\nDeseja continuar e salvar mesmo assim?`;
      if (!confirm(msg)) return;
    }

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

  // Color helpers (hex/HSL conversions + WCAG contrast utils)
  const hexToRgb = (hex: string) => {
    if (!hex) return null;
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const bigint = parseInt(full, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  };

  const hslToRgb = (h: number, s: number, l: number) => {
    s /= 100; l /= 100; h /= 360;
    if (s === 0) {
      const v = Math.round(l * 255);
      return { r: v, g: v, b: v };
    }
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = hue2rgb(p, q, h + 1/3);
    const g = hue2rgb(p, q, h);
    const b = hue2rgb(p, q, h - 1/3);
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  };

  const rotateHue = (hex: string, deg: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    let h = (hsl.h + deg) % 360; if (h < 0) h += 360;
    const rgb2 = hslToRgb(h, hsl.s, hsl.l);
    return rgbToHex(rgb2.r, rgb2.g, rgb2.b);
  };

  const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

  const adjustLightness = (hex: string, delta: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const l = clamp(hsl.l + delta, 0, 100);
    const rgb2 = hslToRgb(hsl.h, hsl.s, l);
    return rgbToHex(rgb2.r, rgb2.g, rgb2.b);
  };

  const luminance = (r: number, g: number, b: number) => {
    const srgb = [r / 255, g / 255, b / 255].map((v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  };

  const contrastRatio = (hex1: string, hex2: string) => {
    const a = hexToRgb(hex1); const b = hexToRgb(hex2);
    if (!a || !b) return 21;
    const L1 = luminance(a.r, a.g, a.b); const L2 = luminance(b.r, b.g, b.b);
    const bright = Math.max(L1, L2); const dark = Math.min(L1, L2);
    return (bright + 0.05) / (dark + 0.05);
  };

  const pickTextColorForBackground = (bgHex: string, minContrast = 4.5) => {
    if (!bgHex) return '#000000';
    const cWhite = contrastRatio(bgHex, '#ffffff');
    if (cWhite >= minContrast) return '#ffffff';
    const cBlack = contrastRatio(bgHex, '#000000');
    if (cBlack >= minContrast) return '#000000';
    // Try to nudge background lighter/darker until we can use one of them
    let attempts = 0; let test = bgHex;
    while (attempts < 8) {
      test = adjustLightness(test, attempts % 2 === 0 ? 6 : -6);
      if (contrastRatio(test, '#ffffff') >= minContrast) return '#ffffff';
      if (contrastRatio(test, '#000000') >= minContrast) return '#000000';
      attempts++;
    }
    return cWhite > cBlack ? '#ffffff' : '#000000';
  };

  // Auto-fill derived tokens for light/dark modes using WCAG-aware heuristics
  const autoFillLight = (primaryHex?: string) => {
    if (!primaryHex) return;
    const primary = primaryHex;
    const secondary = rotateHue(primary, 150);
    const sidebar = adjustLightness(primary, -8);
    const chatBtn = secondary;
    const feedbackBtn = rotateHue(primary, 200);
    const body = '#111827';
    const heading = '#0f172a';
    const muted = adjustLightness(body, 40);
    updateConfig('primary_color_light', primary);
    updateConfig('secondary_color_light', secondary);
    updateConfig('sidebar_color', sidebar);
    updateConfig('chat_button_color', chatBtn);
    updateConfig('feedback_button_color', feedbackBtn);
    updateConfig('body_text_light', body);
    updateConfig('heading_text_light', heading);
    updateConfig('muted_text_light', muted);
    // modal variants: choose text that contrasts with modal bg
    const modalBg = '#ffffff';
    updateConfig('bg_light', modalBg);
    updateConfig('modal_bg_light', modalBg);
    updateConfig('border_light', adjustLightness(modalBg, -8));
    updateConfig('modal_border_light', adjustLightness(modalBg, -8));
  };

  const autoFillDark = (primaryHex?: string) => {
    if (!primaryHex) return;
    const primary = primaryHex;
    const secondary = rotateHue(primary, 150);
    const sidebarDark = adjustLightness(primary, -20);
    const chatBtnDark = secondary;
    const feedbackBtnDark = rotateHue(primary, 200);
    const bodyDark = '#e6eef8';
    const headingDark = '#ffffff';
    const mutedDark = adjustLightness(bodyDark, -30);
    updateConfig('primary_color_dark', primary);
    updateConfig('secondary_color_dark', secondary);
    updateConfig('sidebar_color_dark', sidebarDark);
    updateConfig('chat_button_color_dark', chatBtnDark);
    updateConfig('feedback_button_color_dark', feedbackBtnDark);
    updateConfig('body_text_dark', bodyDark);
    updateConfig('heading_text_dark', headingDark);
    updateConfig('muted_text_dark', mutedDark);
    const modalBg = '#0f172a';
    updateConfig('bg_dark', modalBg);
    updateConfig('modal_bg_dark', modalBg);
    updateConfig('border_dark', adjustLightness(modalBg, 8));
    updateConfig('modal_border_dark', adjustLightness(modalBg, 8));
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
      {/* (Merged) Theme & Colors - primary block will include modal color controls */}

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
              <li
                key={id}
                draggable
                onDragStart={(e) => handleDragStart(e, { type: 'nav', id })}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnNav(e, id)}
                className="flex items-center justify-between p-2 border rounded cursor-move"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium truncate">{tNav(item.id) || item.label}</span>
                </div>

                <div className="flex items-center gap-2 w-52 justify-end">
                  <div className="flex items-center gap-2 w-40">
                    <button
                      onClick={() => moveNavItem(id, 'up')}
                      disabled={idx === 0}
                      className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-lg font-medium ${idx === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label="Move up"
                    >
                      <span className="leading-none">↑</span>
                    </button>
                    <button
                      onClick={() => moveNavItem(id, 'down')}
                      disabled={idx === (navOrder.length ? navOrder.length - 1 : availableNavItems.length - 1)}
                      className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-lg font-medium ${idx === (navOrder.length ? navOrder.length - 1 : availableNavItems.length - 1) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label="Move down"
                    >
                      <span className="leading-none">↓</span>
                    </button>
                  </div>

                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => { if (!visible) toggleNavItem(id); }}
                      className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all ${visible ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                      aria-pressed={visible}
                    >
                      <span className="font-medium text-gray-900 dark:text-white">Visível</span>
                      {visible && <CheckIcon className="w-4 h-4 text-primary-500 ml-auto" />}
                    </button>

                    <button
                      onClick={() => { if (visible && id !== 'settings') toggleNavItem(id); }}
                      disabled={id === 'settings'}
                      className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all ${!visible ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'} ${id === 'settings' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-disabled={id === 'settings'}
                    >
                      <span className="font-medium text-gray-900 dark:text-white">Oculto</span>
                      {!visible && <CheckIcon className="w-4 h-4 text-primary-500 ml-auto" />}
                    </button>
                  </div>
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
                              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 text-sm min-w-0 overflow-hidden truncate transition-all ${!globallyVisible ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300' : hasAccess ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100'}`}
                            >
                              <span className="truncate">{tNav(item.id) || item.label}</span>
                              {hasAccess ? <CheckIcon className="w-4 h-4 text-primary-500 inline-block ml-2" /> : null}
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
                      className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-lg font-medium ${idx === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label="Move up"
                    >
                      <span className="leading-none">↑</span>
                    </button>
                    <button
                      onClick={() => moveWidget(id, 'down')}
                      disabled={idx === (widgetsOrder.length ? widgetsOrder.length - 1 : availableWidgets.length - 1)}
                      className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-lg font-medium ${idx === (widgetsOrder.length ? widgetsOrder.length - 1 : availableWidgets.length - 1) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label="Move down"
                    >
                      <span className="leading-none">↓</span>
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
                                  // insert id preserving original order where possible
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
                      className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all ${enabled ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                      aria-pressed={enabled}
                    >
                      <span className="font-medium text-gray-900 dark:text-white">Ativo</span>
                      {enabled && <CheckIcon className="w-4 h-4 text-primary-500 ml-auto" />}
                    </button>

                    <button
                      onClick={() => {
                        if (enabled) {
                          try {
                            // Ensure we persist a widget order so disabling doesn't lose position
                            const existingOrder = config.dashboard_widget_order || [];
                            const orderToPersist = (existingOrder && existingOrder.length) ? existingOrder : widgetsOrder;
                            if (!existingOrder || !existingOrder.length) {
                              updateConfig('dashboard_widget_order', orderToPersist);
                            }
                          } catch (e) {
                            // ignore
                          }
                          updateConfig('dashboard_widgets', (config.dashboard_widgets || []).filter((w: string) => w !== id));
                        }
                      }}
                      className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all ${!enabled ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                    >
                      <span className="font-medium text-gray-900 dark:text-white">Inativo</span>
                      {!enabled && <CheckIcon className="w-4 h-4 text-primary-500 ml-auto" />}
                    </button>
                  </div>
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
                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 text-sm min-w-0 overflow-hidden truncate transition-all ${!enabled ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300' : hasRole ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100'}`}
                          >
                            <span className="truncate">{widget.label}</span>
                            {hasRole ? <CheckIcon className="w-4 h-4 text-primary-500 inline-block ml-2" /> : null}
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

        <div className="mt-4">
          <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Sidebar text (Light)</label>
          <input type="color" value={(config as any).sidebar_text_light || ''} onChange={(e) => updateConfig('sidebar_text_light' as any, e.target.value)} className="w-16 h-10 p-1 rounded border" />
          <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300 mt-3">Sidebar text (Dark)</label>
          <input type="color" value={(config as any).sidebar_text_dark || ''} onChange={(e) => updateConfig('sidebar_text_dark' as any, e.target.value)} className="w-16 h-10 p-1 rounded border" />
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
          {/* Light mode column */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('layout.theme.lightTitle') || 'Claro'}</h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t('layout.theme.primary') || 'Primary color'}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.primary_color_light || config.primary_color} onChange={(e) => updateConfig('primary_color_light', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                  <button type="button" onClick={() => autoFillLight(config.primary_color_light || config.primary_color)} className="px-3 py-2 border rounded text-sm">Auto Cor</button>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t('layout.theme.secondary') || 'Secondary color'}</label>
                <input type="color" value={config.secondary_color_light || config.secondary_color} onChange={(e) => updateConfig('secondary_color_light', e.target.value)} className="w-16 h-10 p-1 rounded border" />
              </div>

              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Sidebar background</label>
                <input type="color" value={config.sidebar_color || config.secondary_color_light || config.secondary_color} onChange={(e) => updateConfig('sidebar_color', e.target.value)} className="w-16 h-10 p-1 rounded border" />
              </div>

              <div className="border-t pt-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cores da fonte (Claro)</h4>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Body text</label>
                    <input type="color" value={config.body_text_light || ''} onChange={(e) => updateConfig('body_text_light', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Heading text</label>
                    <input type="color" value={config.heading_text_light || ''} onChange={(e) => updateConfig('heading_text_light', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Muted text</label>
                    <input type="color" value={config.muted_text_light || ''} onChange={(e) => updateConfig('muted_text_light', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Botões Flutuantes (Claro)</h4>
                <div className="flex gap-3">
                  <div>
                    <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Chat (Claro)</label>
                    <input type="color" value={config.chat_button_color || ''} onChange={(e) => updateConfig('chat_button_color', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Feedback (Claro)</label>
                    <input type="color" value={config.feedback_button_color || ''} onChange={(e) => updateConfig('feedback_button_color', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fundo e Borda (Sistema & Modal)</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Fundo</label>
                    <input type="color" value={config.bg_light || config.modal_bg_light} onChange={(e) => { updateConfig('bg_light', e.target.value); updateConfig('modal_bg_light', e.target.value); }} className="w-16 h-10 p-1 rounded border" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Borda</label>
                    <input type="color" value={config.border_light || config.modal_border_light} onChange={(e) => { updateConfig('border_light', e.target.value); updateConfig('modal_border_light', e.target.value); }} className="w-16 h-10 p-1 rounded border" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dark mode column */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('layout.theme.darkTitle') || 'Escuro'}</h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t('layout.theme.primary') || 'Primary color'}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.primary_color_dark || config.primary_color} onChange={(e) => updateConfig('primary_color_dark', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                  <button type="button" onClick={() => autoFillDark(config.primary_color_dark || config.primary_color)} className="px-3 py-2 border rounded text-sm">Auto Cor</button>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t('layout.theme.secondary') || 'Secondary color'}</label>
                <input type="color" value={config.secondary_color_dark || config.secondary_color} onChange={(e) => updateConfig('secondary_color_dark', e.target.value)} className="w-16 h-10 p-1 rounded border" />
              </div>

              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Sidebar background (Escuro)</label>
                <input type="color" value={config.sidebar_color_dark || config.secondary_color_dark || config.secondary_color} onChange={(e) => updateConfig('sidebar_color_dark', e.target.value)} className="w-16 h-10 p-1 rounded border" />
              </div>

              <div className="border-t pt-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cores da fonte (Escuro)</h4>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Body text</label>
                    <input type="color" value={config.body_text_dark || ''} onChange={(e) => updateConfig('body_text_dark', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Heading text</label>
                    <input type="color" value={config.heading_text_dark || ''} onChange={(e) => updateConfig('heading_text_dark', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Muted text</label>
                    <input type="color" value={config.muted_text_dark || ''} onChange={(e) => updateConfig('muted_text_dark', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Botões Flutuantes (Escuro)</h4>
                <div className="flex gap-3">
                  <div>
                    <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Chat (Escuro)</label>
                    <input type="color" value={config.chat_button_color_dark || config.chat_button_color || ''} onChange={(e) => updateConfig('chat_button_color_dark', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Feedback (Escuro)</label>
                    <input type="color" value={config.feedback_button_color_dark || config.feedback_button_color || ''} onChange={(e) => updateConfig('feedback_button_color_dark', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Fundo e Borda (Sistema & Modal)</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Fundo</label>
                    <input type="color" value={config.bg_dark || config.modal_bg_dark} onChange={(e) => { updateConfig('bg_dark', e.target.value); updateConfig('modal_bg_dark', e.target.value); }} className="w-16 h-10 p-1 rounded border" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Borda</label>
                    <input type="color" value={config.border_dark || config.modal_border_dark} onChange={(e) => { updateConfig('border_dark', e.target.value); updateConfig('modal_border_dark', e.target.value); }} className="w-16 h-10 p-1 rounded border" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr className="my-4" />

        <div className="space-y-4">
          <div>
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

          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t('layout.theme.modalOverlay') || 'Overlay opacity'}</label>
            <input type="range" min="0" max="100" value={Math.round((config.modal_overlay_opacity ?? 0.4) * 100)} onChange={(e) => updateConfig('modal_overlay_opacity', parseInt(e.target.value) / 100)} className="w-full" />
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t('layout.theme.modalElevation') || 'Elevation'}</label>
            <select value={config.modal_elevation} onChange={(e) => updateConfig('modal_elevation', e.target.value as any)} className="w-full border-2 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
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
