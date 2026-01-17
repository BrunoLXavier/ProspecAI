/**
 * Layout Context
 * Manages layout configuration with hybrid backend + localStorage persistence
 * Implements RF-07 (layout configuration per user/tenant)
 */
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { getStoredUser } from '@/contexts/AuthContext';

// =============================================================================
// Types
// =============================================================================

// Widget configuration with role-based access
export interface WidgetRoleConfig {
  [role: string]: string[]; // e.g., { admin: ['all'], user: ['metrics', 'pipeline'], viewer: ['metrics'] }
}

export interface LayoutConfig {
  id?: string;
  user_id?: string | null;
  tenant_id?: string | null;
  // Sidebar settings
  sidebar_position: 'left' | 'right';
  sidebar_collapsed: boolean;
  sidebar_width: number;
  // Navigation
  visible_nav_items: string[];
  // Role-based navigation visibility
  visible_nav_items_by_role?: WidgetRoleConfig;
  nav_order: string[];
  // Dashboard - Admin controls available widgets per role
  dashboard_widgets: string[]; // User's enabled widgets (filtered by role)
  dashboard_widget_order: string[]; // User's custom order (drag and drop)
  dashboard_widgets_by_role: WidgetRoleConfig; // Admin: which widgets available per role
  dashboard_layout: string;
  // UI Preferences
  default_page_size: number;
  dense_tables: boolean;
  animations_enabled: boolean;
  compact_mode: boolean;
  // Appearance preset (theme appearance options)
  appearance?: 'default' | 'highContrast' | 'system';
  // Theme mode
  color_mode?: 'light' | 'dark';
  // Feature toggles
  ai_chat_enabled?: boolean;
  feedback_button_enabled?: boolean;
  // Branding (new fields)
  site_name: string;
  site_logo_url: string | null;
  site_favicon_url: string | null;
  // Typography
  font_size: 'sm' | 'base' | 'lg';
  font_family: 'sans' | 'serif' | 'mono';
  // Colors
  primary_color: string;
  secondary_color: string;
  primary_color_light?: string;
  primary_color_dark?: string;
  secondary_color_light?: string;
  secondary_color_dark?: string;
  modal_bg_light?: string;
  modal_bg_dark?: string;
  modal_text_light?: string;
  modal_text_dark?: string;
  modal_border_light?: string;
  modal_border_dark?: string;
  modal_overlay_opacity?: number;
  modal_elevation?: 'low' | 'medium' | 'high';
}

interface LayoutContextType {
  config: LayoutConfig;
  isLoading: boolean;
  error: string | null;
  updateConfig: <K extends keyof LayoutConfig>(key: K, value: LayoutConfig[K]) => void;
  saveConfig: () => Promise<void>;
  resetConfig: () => Promise<void>;
  reloadConfig: () => Promise<void>;
}

// =============================================================================
// Constants
// =============================================================================

// All available widget IDs
export const ALL_WIDGET_IDS = [
  'pipeline', 'opportunities', 'metrics', 'activity', 'matching', 'calendar',
  // Analytics widgets (registered in the dashboard registry)
  'analytics-kpis', 'analytics-pipeline', 'analytics-trl', 'analytics-trends', 'analytics-export',
];

export const DEFAULT_CONFIG: LayoutConfig = {
  sidebar_position: 'left',
  sidebar_collapsed: false,
  sidebar_width: 260,
  visible_nav_items: [
    'dashboard', 'funding', 'portfolio', 'crm', 'opportunities',
    'proposals', 'feedbackManagement', 'ingestion', 'piiAnalysis', 'reports', 'activity', 'settings'
  ],
  nav_order: [],
  dashboard_widgets: [
    'pipeline', 'opportunities', 'metrics', 'activity', 'matching', 'calendar',
    'analytics-kpis', 'analytics-pipeline', 'analytics-trl', 'analytics-trends', 'analytics-export',
  ],
  dashboard_widget_order: [], // Empty means use dashboard_widgets order
  dashboard_widgets_by_role: {
    admin: ALL_WIDGET_IDS, // Admin has access to all widgets
    manager: ['pipeline', 'opportunities', 'metrics', 'activity', 'matching'],
    user: ['pipeline', 'metrics', 'activity'],
    viewer: ['metrics', 'activity'],
  },
  // Default per-role navigation visibility
  visible_nav_items_by_role: {
    admin: [
      'dashboard', 'funding', 'portfolio', 'crm', 'opportunities',
      'proposals', 'reports', 'activity', 'ingestion', 'piiAnalysis', 'settings'
    ],
    manager: ['dashboard', 'funding', 'portfolio', 'crm', 'opportunities', 'proposals', 'reports', 'activity'],
    user: ['dashboard', 'opportunities', 'proposals', 'activity'],
    viewer: ['dashboard', 'activity'],
  },
  dashboard_layout: 'default',
  default_page_size: 20,
  dense_tables: false,
  animations_enabled: true,
  compact_mode: false,
  color_mode: 'light',
  appearance: 'default',
  ai_chat_enabled: true,
  feedback_button_enabled: true,
  site_name: 'ProspecAI',
  site_logo_url: null,
  site_favicon_url: null,
  font_size: 'base',
  font_family: 'sans',
  primary_color: '#E30613',
  secondary_color: '#003366',
  primary_color_light: '#E30613',
  primary_color_dark: '#E30613',
  secondary_color_light: '#003366',
  secondary_color_dark: '#003366',
  modal_bg_light: '#ffffff',
  modal_bg_dark: '#1e293b',
  modal_text_light: '#0f172a',
  modal_text_dark: '#f8fafc',
  modal_border_light: '#e2e8f0',
  modal_border_dark: '#334155',
  modal_overlay_opacity: 0.4,
  modal_elevation: 'medium',
};

// =============================================================================
// Context
// =============================================================================

const LayoutContext = createContext<LayoutContextType | null>(null);

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within LayoutProvider');
  }
  return context;
};

// =============================================================================
// Provider
// =============================================================================

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<LayoutConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load config from backend only
  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const user = getStoredUser();
      const path = user?.id ? `/api/v1/layout?user_id=${user.id}` : '/api/v1/layout';
      const response = await apiClient.get<{ config: LayoutConfig }>(path);
      const backendConfig = { ...DEFAULT_CONFIG, ...response.config };
      setConfig(backendConfig);
    } catch (backendErr) {
      // If backend fails, use default config
      console.warn('Failed to load layout from backend, using defaults:', backendErr);
      setConfig(DEFAULT_CONFIG);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Apply CSS custom properties when config changes
  useEffect(() => {
    // Apply font size class to document
    document.documentElement.classList.remove('text-sm', 'text-base', 'text-lg');
    if (config.font_size === 'sm') {
      document.documentElement.style.fontSize = '14px';
    } else if (config.font_size === 'lg') {
      document.documentElement.style.fontSize = '18px';
    } else {
      document.documentElement.style.fontSize = '16px';
    }

    // Apply font family
    document.documentElement.style.setProperty('--font-family', 
      config.font_family === 'serif' ? 'Georgia, serif' :
      config.font_family === 'mono' ? 'monospace' : 
      'Inter, system-ui, sans-serif'
    );

    // Apply primary/secondary colors as CSS variables (support light/dark variants)
      document.documentElement.style.setProperty('--color-primary-light', config.primary_color_light || config.primary_color || '#E30613');
      document.documentElement.style.setProperty('--color-primary-dark', config.primary_color_dark || config.primary_color || '#E30613');
      document.documentElement.style.setProperty('--color-secondary-light', config.secondary_color_light || config.secondary_color || '#003366');
      document.documentElement.style.setProperty('--color-secondary-dark', config.secondary_color_dark || config.secondary_color || '#003366');

      // Determine active mode and expose active color variables
      const isDark = config.color_mode === 'dark';
      const activePrimary = isDark ? (config.primary_color_dark || config.primary_color || '#E30613') : (config.primary_color_light || config.primary_color || '#E30613');
      const activeSecondary = isDark ? (config.secondary_color_dark || config.secondary_color || '#003366') : (config.secondary_color_light || config.secondary_color || '#003366');
      document.documentElement.style.setProperty('--color-primary', activePrimary);
      document.documentElement.style.setProperty('--color-secondary', activeSecondary);

      // Also mirror into brand-related variables used across the CSS so changes
      // take effect in components that reference --brand-primary / --brand-secondary
      // or --border-focus. Compute simple hover/darker variants.
      const toRgb = (hex: string) => {
        const h = hex.replace('#', '');
        const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return { r, g, b };
      };

      const darken = (hex: string, amount = 0.12) => {
        try {
          const { r, g, b } = toRgb(hex);
          const nr = Math.max(0, Math.min(255, Math.round(r * (1 - amount))));
          const ng = Math.max(0, Math.min(255, Math.round(g * (1 - amount))));
          const nb = Math.max(0, Math.min(255, Math.round(b * (1 - amount))));
          const toHex = (v: number) => v.toString(16).padStart(2, '0');
          return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
        } catch (e) {
          return hex;
        }
      };

      const primary = activePrimary;
      const secondary = activeSecondary;
      const primaryHover = darken(primary, 0.08);
      const secondaryHover = darken(secondary, 0.08);

      document.documentElement.style.setProperty('--brand-primary', primary);
      document.documentElement.style.setProperty('--brand-primary-hover', primaryHover);
      document.documentElement.style.setProperty('--brand-secondary', secondary);
      document.documentElement.style.setProperty('--brand-secondary-hover', secondaryHover);
      // expose RGB components for translucent variants in CSS (use active colors)
      try {
        const p = toRgb(primary);
        const s = toRgb(secondary);
        document.documentElement.style.setProperty('--brand-primary-rgb', `${p.r}, ${p.g}, ${p.b}`);
        document.documentElement.style.setProperty('--brand-secondary-rgb', `${s.r}, ${s.g}, ${s.b}`);
      } catch (e) {
        // ignore
      }
      document.documentElement.style.setProperty('--border-focus', primary);
      // Sidebar active color - translucent variant
      document.documentElement.style.setProperty('--sidebar-active', primary + 'E6');
      // If components reference --color-primary / --brand-primary both will be present

      // Modal color variables (light/dark) - allow Layout settings to override
      try {
        document.documentElement.style.setProperty('--modal-bg-light', String(config.modal_bg_light ?? DEFAULT_CONFIG.modal_bg_light ?? '#ffffff'));
        document.documentElement.style.setProperty('--modal-bg-dark', String(config.modal_bg_dark ?? DEFAULT_CONFIG.modal_bg_dark ?? '#1e293b'));
        document.documentElement.style.setProperty('--modal-text-light', String(config.modal_text_light ?? DEFAULT_CONFIG.modal_text_light ?? '#0f172a'));
        document.documentElement.style.setProperty('--modal-text-dark', String(config.modal_text_dark ?? DEFAULT_CONFIG.modal_text_dark ?? '#f8fafc'));
        document.documentElement.style.setProperty('--modal-border-light', String(config.modal_border_light ?? DEFAULT_CONFIG.modal_border_light ?? '#e2e8f0'));
        document.documentElement.style.setProperty('--modal-border-dark', String(config.modal_border_dark ?? DEFAULT_CONFIG.modal_border_dark ?? '#334155'));
        // Active variables used by components (immediate reflect)
        const isDark = config.color_mode === 'dark';
        document.documentElement.style.setProperty('--modal-bg', String(isDark ? (config.modal_bg_dark ?? DEFAULT_CONFIG.modal_bg_dark) : (config.modal_bg_light ?? DEFAULT_CONFIG.modal_bg_light)));
        document.documentElement.style.setProperty('--modal-text', String(isDark ? (config.modal_text_dark ?? DEFAULT_CONFIG.modal_text_dark) : (config.modal_text_light ?? DEFAULT_CONFIG.modal_text_light)));
        document.documentElement.style.setProperty('--modal-border', String(isDark ? (config.modal_border_dark ?? DEFAULT_CONFIG.modal_border_dark) : (config.modal_border_light ?? DEFAULT_CONFIG.modal_border_light)));
        // Overlay opacity and elevation
        document.documentElement.style.setProperty('--modal-overlay-opacity', String(config.modal_overlay_opacity ?? DEFAULT_CONFIG.modal_overlay_opacity));
        // Map elevation to a shadow value
        const elevation = config.modal_elevation || DEFAULT_CONFIG.modal_elevation || 'medium';
        const shadowMap: Record<string, string> = {
          low: '0 4px 12px -6px rgba(0,0,0,0.08)',
          medium: '0 8px 24px -4px rgba(0,0,0,0.12)',
          high: '0 12px 40px -8px rgba(0,0,0,0.16)',
        };
        document.documentElement.style.setProperty('--modal-shadow', shadowMap[elevation]);
      } catch (e) {
        // ignore
      }

    // Apply light/dark mode
    if (config.color_mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply animations toggle
    if (!config.animations_enabled) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }

    // Apply compact mode
    if (config.compact_mode) {
      document.documentElement.classList.add('compact-mode');
    } else {
      document.documentElement.classList.remove('compact-mode');
    }

    // Appearance options
    if (config.appearance === 'highContrast') {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    // Update favicon dynamically when provided
    try {
      if (config.site_favicon_url) {
        const existing = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
        if (existing) {
          existing.href = config.site_favicon_url;
        } else {
          const link = document.createElement('link');
          link.rel = 'icon';
          link.href = config.site_favicon_url;
          document.head.appendChild(link);
        }
      }
    } catch (e) {
      // ignore
    }

  }, [config]);

  // Listen to external layout:changed events (for example emitted by ThemeProvider)
  // and synchronize the config.color_mode when they occur so both contexts
  // remain consistent when either the header or the settings page changes theme.
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const ev = e as CustomEvent;
        if (ev?.detail?.key === 'color_mode') {
          const v = ev.detail.value as LayoutConfig['color_mode'];
          setConfig(prev => {
            if (prev.color_mode === v) return prev;
            return { ...prev, color_mode: v } as LayoutConfig;
          });
        }
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('layout:changed', handler as EventListener);
    return () => window.removeEventListener('layout:changed', handler as EventListener);
  }, []);

  // Update a single config key (updates local state immediately)
  const updateConfig = useCallback(<K extends keyof LayoutConfig>(key: K, value: LayoutConfig[K]) => {
    setConfig(prev => {
      const next = { ...prev, [key]: value };
      // Debug: log updates so we can trace client-side toggles
      try {
        if (typeof window !== 'undefined') {
          // Prefer console.debug so logs are less noisy in production devtools
          // eslint-disable-next-line no-console
          console.debug('[LayoutContext] updateConfig', key, value, next);
        }
      } catch (e) {
        // ignore
      }
      // Dispatch a global event so parts of the app can react immediately
      try {
        if (typeof window !== 'undefined' && window?.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('layout:changed', { detail: { key, value, config: next } }));
        }
      } catch (e) {
        // ignore
      }
      return next;
    });
  }, []);

  // Save current config to backend
  const saveConfig = useCallback(async () => {
    try {
      const user = getStoredUser();
      const query = user?.id ? `?user_id=${user.id}` : '';
      const saved = await apiClient.put(`/api/v1/layout${query}`, {
        sidebar_position: config.sidebar_position,
        sidebar_collapsed: config.sidebar_collapsed,
        sidebar_width: config.sidebar_width,
        visible_nav_items: config.visible_nav_items,
        visible_nav_items_by_role: config.visible_nav_items_by_role,
        nav_order: config.nav_order,
        dashboard_widgets: config.dashboard_widgets,
        dashboard_widget_order: config.dashboard_widget_order,
        dashboard_widgets_by_role: config.dashboard_widgets_by_role,
        dashboard_layout: config.dashboard_layout,
        default_page_size: config.default_page_size,
        dense_tables: config.dense_tables,
        animations_enabled: config.animations_enabled,
        compact_mode: config.compact_mode,
        site_name: config.site_name,
        site_logo_url: config.site_logo_url,
        site_favicon_url: config.site_favicon_url,
        font_size: config.font_size,
        font_family: config.font_family,
        primary_color: config.primary_color,
        primary_color_light: config.primary_color_light,
        primary_color_dark: config.primary_color_dark,
        secondary_color: config.secondary_color,
        secondary_color_light: config.secondary_color_light,
        secondary_color_dark: config.secondary_color_dark,
        modal_bg_light: config.modal_bg_light,
        modal_bg_dark: config.modal_bg_dark,
        modal_text_light: config.modal_text_light,
        modal_text_dark: config.modal_text_dark,
        modal_border_light: config.modal_border_light,
        modal_border_dark: config.modal_border_dark,
        modal_overlay_opacity: config.modal_overlay_opacity,
        modal_elevation: config.modal_elevation,
        color_mode: config.color_mode,
        ai_chat_enabled: config.ai_chat_enabled,
        feedback_button_enabled: config.feedback_button_enabled,
      });
      // Update local state with authoritative saved config returned by backend
      try {
        // backend returns the LayoutConfig object
        setConfig(prev => ({ ...prev, ...(saved || {}) } as LayoutConfig));
        // debug log for tracing
        // eslint-disable-next-line no-console
        console.info('[LayoutContext] saveConfig: saved config from backend', saved);
      } catch (e) {
        // ignore update failures
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save layout configuration');
      throw err;
    }
  }, [config]);

  // Reset to defaults
  const resetConfig = useCallback(async () => {
    try {
      await apiClient.post('/api/v1/layout/reset');
      setConfig(DEFAULT_CONFIG);
    } catch (err: any) {
      // Even if backend fails, reset locally
      setConfig(DEFAULT_CONFIG);
    }
  }, []);

  return (
    <LayoutContext.Provider value={{
      config,
      isLoading,
      error,
      updateConfig,
      saveConfig,
      resetConfig,
      reloadConfig: loadConfig,
    }}>
      {children}
    </LayoutContext.Provider>
  );
}
