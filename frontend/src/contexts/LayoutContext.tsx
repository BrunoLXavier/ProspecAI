/**
 * Layout Context
 * Manages layout configuration with hybrid backend + localStorage persistence
 * Implements RF-07 (layout configuration per user/tenant)
 */
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { getStoredUser } from '@/contexts/AuthContext';
import { DEFAULT_CONFIG, ALL_WIDGET_IDS } from './layout-types';
import type { LayoutConfig, LayoutContextType, WidgetRoleConfig } from './layout-types';

// Re-export types and constants for backward compatibility
export { DEFAULT_CONFIG, ALL_WIDGET_IDS } from './layout-types';
export type { LayoutConfig, LayoutContextType, WidgetRoleConfig } from './layout-types';

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
      // If the user has an explicit local preference saved under 'theme', prefer it
      // over the backend value so local toggles don't get overridden on reload.
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const storedTheme = window.localStorage.getItem('theme') as LayoutConfig['color_mode'] | null;
          if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
            backendConfig.color_mode = storedTheme;
          }
        }
      } catch (e) {
        // ignore storage access errors and fall back to backend config
      }
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
      // Per-button tokens (chat / feedback) - keep defaults if not provided
      document.documentElement.style.setProperty('--color-chat-button', config.chat_button_color || DEFAULT_CONFIG.chat_button_color || '#E30613');
      document.documentElement.style.setProperty('--color-feedback-button', config.feedback_button_color || DEFAULT_CONFIG.feedback_button_color || '#f59e0b');
      document.documentElement.style.setProperty('--color-chat-button-dark', config.chat_button_color_dark || config.chat_button_color || DEFAULT_CONFIG.chat_button_color || '#E30613');
      document.documentElement.style.setProperty('--color-feedback-button-dark', config.feedback_button_color_dark || config.feedback_button_color || DEFAULT_CONFIG.feedback_button_color || '#f59e0b');
      // expose RGB for the active feedback button color so CSS can use translucent variants
      try {
        const fb = (config.color_mode === 'dark' ? (config.feedback_button_color_dark || config.feedback_button_color) : (config.feedback_button_color || config.feedback_button_color_dark)) || DEFAULT_CONFIG.feedback_button_color || '#f59e0b';
        const h = fb.replace('#', '');
        const hex = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
        const fr = (hex >> 16) & 255;
        const fg = (hex >> 8) & 255;
        const fbv = hex & 255;
        document.documentElement.style.setProperty('--brand-feedback-rgb', `${fr}, ${fg}, ${fbv}`);
      } catch (e) {
        // ignore
      }
      // Sidebar background tokens - pick active value according to color mode
      const sidebarLight = config.sidebar_color || activeSecondary;
      const sidebarDark = (config.sidebar_color_dark || config.secondary_color_dark || config.secondary_color || DEFAULT_CONFIG.secondary_color_dark) ?? sidebarLight;
      const activeSidebar = (config.color_mode === 'dark') ? sidebarDark : sidebarLight;
      document.documentElement.style.setProperty('--sidebar-bg', activeSidebar);
      document.documentElement.style.setProperty('--sidebar-bg-dark', sidebarDark);
      // Sidebar text tokens: allow customizing sidebar text separately
      const sidebarTextLight = String(config.sidebar_text_light ?? DEFAULT_CONFIG.sidebar_text_light ?? '#ffffff');
      const sidebarTextDark = String(config.sidebar_text_dark ?? DEFAULT_CONFIG.sidebar_text_dark ?? '#ffffff');
      document.documentElement.style.setProperty('--sidebar-text', config.color_mode === 'dark' ? sidebarTextDark : sidebarTextLight);
      // expose RGB for translucent variants
      try {
        const st = (config.color_mode === 'dark' ? (config.sidebar_text_dark || DEFAULT_CONFIG.sidebar_text_dark) : (config.sidebar_text_light || DEFAULT_CONFIG.sidebar_text_light)) || '#ffffff';
        const h = st.replace('#', '');
        const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
        const sr = (bigint >> 16) & 255;
        const sg = (bigint >> 8) & 255;
        const sb = bigint & 255;
        document.documentElement.style.setProperty('--sidebar-text-rgb', `${sr}, ${sg}, ${sb}`);
      } catch (e) {
        // ignore
      }
      // Font colors (light / dark)
      document.documentElement.style.setProperty('--text-body-light', String(config.body_text_light ?? DEFAULT_CONFIG.body_text_light));
      document.documentElement.style.setProperty('--text-body-dark', String(config.body_text_dark ?? DEFAULT_CONFIG.body_text_dark));
      document.documentElement.style.setProperty('--text-heading-light', String(config.heading_text_light ?? DEFAULT_CONFIG.heading_text_light));
      document.documentElement.style.setProperty('--text-heading-dark', String(config.heading_text_dark ?? DEFAULT_CONFIG.heading_text_dark));
      document.documentElement.style.setProperty('--text-muted-light', String(config.muted_text_light ?? DEFAULT_CONFIG.muted_text_light));
      document.documentElement.style.setProperty('--text-muted-dark', String(config.muted_text_dark ?? DEFAULT_CONFIG.muted_text_dark));
      // Map the configured body/heading/muted tokens to the commonly-used
      // global tokens so existing CSS uses the right colors according to mode.
      try {
        const bodyLight = String(config.body_text_light ?? DEFAULT_CONFIG.body_text_light);
        const bodyDark = String(config.body_text_dark ?? DEFAULT_CONFIG.body_text_dark);
        const headingLight = String(config.heading_text_light ?? DEFAULT_CONFIG.heading_text_light);
        const headingDark = String(config.heading_text_dark ?? DEFAULT_CONFIG.heading_text_dark);
        const mutedLight = String(config.muted_text_light ?? DEFAULT_CONFIG.muted_text_light);
        const mutedDark = String(config.muted_text_dark ?? DEFAULT_CONFIG.muted_text_dark);
        const isDarkMode = config.color_mode === 'dark';
        document.documentElement.style.setProperty('--text-primary', isDarkMode ? bodyDark : bodyLight);
        document.documentElement.style.setProperty('--text-secondary', isDarkMode ? headingDark : headingLight);
        document.documentElement.style.setProperty('--text-muted', isDarkMode ? mutedDark : mutedLight);
      } catch (e) {
        // ignore mapping errors
      }
      document.documentElement.style.setProperty('--border-focus', primary);
      // Sidebar active color - translucent variant
      document.documentElement.style.setProperty('--sidebar-active', primary + 'E6');
      // If components reference --color-primary / --brand-primary both will be present

      // Modal color variables (light/dark) - allow Layout settings to override
      // Declare chosenShadow in outer scope so it's available when we
      // persist the compact theme blob below (avoids TS scope error).
      let chosenShadow: string | null = null;
      try {
        // Allow shared background/border tokens to override modal-specific tokens.
        document.documentElement.style.setProperty('--modal-bg-light', String(config.bg_light ?? config.modal_bg_light ?? DEFAULT_CONFIG.modal_bg_light ?? '#ffffff'));
        document.documentElement.style.setProperty('--modal-bg-dark', String(config.bg_dark ?? config.modal_bg_dark ?? DEFAULT_CONFIG.modal_bg_dark ?? '#1e293b'));
        // Modal text tokens mirror the configured body text tokens so font color
        // controls apply uniformly to system and modal text.
        document.documentElement.style.setProperty('--modal-text-light', String(config.body_text_light ?? DEFAULT_CONFIG.body_text_light ?? '#0f172a'));
        document.documentElement.style.setProperty('--modal-text-dark', String(config.body_text_dark ?? DEFAULT_CONFIG.body_text_dark ?? '#f8fafc'));
        document.documentElement.style.setProperty('--modal-border-light', String(config.border_light ?? config.modal_border_light ?? DEFAULT_CONFIG.modal_border_light ?? '#e2e8f0'));
        document.documentElement.style.setProperty('--modal-border-dark', String(config.border_dark ?? config.modal_border_dark ?? DEFAULT_CONFIG.modal_border_dark ?? '#334155'));
        // Active variables used by components (immediate reflect)
        const isDark = config.color_mode === 'dark';
        // Active modal/bg used by components: prefer shared bg tokens when provided
        document.documentElement.style.setProperty('--modal-bg', String(isDark ? (config.bg_dark ?? config.modal_bg_dark ?? DEFAULT_CONFIG.modal_bg_dark) : (config.bg_light ?? config.modal_bg_light ?? DEFAULT_CONFIG.modal_bg_light)));
        // Use the configured body text tokens for modal text so font color settings
        // apply to both system and modals consistently.
        const modalText = isDark ? (config.body_text_dark ?? DEFAULT_CONFIG.body_text_dark) : (config.body_text_light ?? DEFAULT_CONFIG.body_text_light);
        document.documentElement.style.setProperty('--modal-text', String(modalText));
        document.documentElement.style.setProperty('--modal-border', String(isDark ? (config.border_dark ?? config.modal_border_dark ?? DEFAULT_CONFIG.modal_border_dark) : (config.border_light ?? config.modal_border_light ?? DEFAULT_CONFIG.modal_border_light)));
        // Overlay opacity and elevation
        document.documentElement.style.setProperty('--modal-overlay-opacity', String(config.modal_overlay_opacity ?? DEFAULT_CONFIG.modal_overlay_opacity));
        // Map system/page background and border tokens so 'Fundo' and 'Borda' apply to pages
        try {
          const bgLight = String(config.bg_light ?? config.modal_bg_light ?? DEFAULT_CONFIG.modal_bg_light ?? '#ffffff');
          const bgDark = String(config.bg_dark ?? config.modal_bg_dark ?? DEFAULT_CONFIG.modal_bg_dark ?? '#1e293b');
          const borderLight = String(config.border_light ?? config.modal_border_light ?? DEFAULT_CONFIG.modal_border_light ?? '#e2e8f0');
          const borderDark = String(config.border_dark ?? config.modal_border_dark ?? DEFAULT_CONFIG.modal_border_dark ?? '#334155');
          // Expose light/dark variants
          document.documentElement.style.setProperty('--bg-primary-light', bgLight);
          document.documentElement.style.setProperty('--bg-primary-dark', bgDark);
          document.documentElement.style.setProperty('--border-primary-light', borderLight);
          document.documentElement.style.setProperty('--border-primary-dark', borderDark);
          // Active global tokens used by existing CSS (body uses --bg-secondary)
          document.documentElement.style.setProperty('--bg-primary', isDark ? bgDark : bgLight);
          document.documentElement.style.setProperty('--bg-secondary', isDark ? bgDark : bgLight);
          document.documentElement.style.setProperty('--surface-primary', isDark ? bgDark : bgLight);
          document.documentElement.style.setProperty('--surface-elevated', isDark ? (config.modal_bg_dark ?? bgDark) : (config.modal_bg_light ?? bgLight));
          document.documentElement.style.setProperty('--border-primary', isDark ? borderDark : borderLight);
          document.documentElement.style.setProperty('--border-secondary', isDark ? borderDark : borderLight);
        } catch (e) {
          // ignore mapping errors
        }
        // Map elevation to a shadow value, using different shadow tones for light vs dark mode
        const elevation = config.modal_elevation || DEFAULT_CONFIG.modal_elevation || 'medium';
        const shadowMapLight: Record<string, string> = {
          low: '0 4px 12px -6px rgba(0,0,0,0.08)',
          medium: '0 8px 24px -4px rgba(0,0,0,0.12)',
          high: '0 12px 40px -8px rgba(0,0,0,0.16)',
        };
        // For dark mode, use subtle light glows layered to simulate elevation on dark surfaces
        const shadowMapDark: Record<string, string> = {
          low: '0 4px 10px -6px rgba(255,255,255,0.03), 0 1px 0 rgba(0,0,0,0.12) inset',
          medium: '0 8px 22px -6px rgba(255,255,255,0.04), 0 2px 0 rgba(0,0,0,0.18) inset',
          high: '0 12px 40px -8px rgba(255,255,255,0.05), 0 4px 0 rgba(0,0,0,0.22) inset',
        };
        const isDarkMode = config.color_mode === 'dark';
        chosenShadow = isDarkMode ? shadowMapDark[elevation] : shadowMapLight[elevation];
        document.documentElement.style.setProperty('--modal-shadow', chosenShadow || '');
      } catch (e) {
        // ignore
      }

      // Persist a compact theme blob to localStorage so ThemeScript can apply
      // colors before React hydration (reduces FOUC). Only non-sensitive color
      // tokens are stored.
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const isDarkMode = config.color_mode === 'dark';
          let primaryRgb = '';
          try {
            const pr = toRgb(activePrimary);
            primaryRgb = `${pr.r}, ${pr.g}, ${pr.b}`;
          } catch (e) {
            // ignore
          }
          const themeBlob: Record<string, any> = {
            color_mode: config.color_mode,
            '--color-primary': activePrimary,
            '--color-secondary': activeSecondary,
            '--brand-primary': primary,
            '--brand-primary-hover': primaryHover,
            '--brand-primary-rgb': primaryRgb,
            '--color-chat-button': config.chat_button_color || DEFAULT_CONFIG.chat_button_color,
            '--color-feedback-button': config.feedback_button_color || DEFAULT_CONFIG.feedback_button_color,
            '--color-chat-button-dark': config.chat_button_color_dark || config.chat_button_color || DEFAULT_CONFIG.chat_button_color,
            '--color-feedback-button-dark': config.feedback_button_color_dark || config.feedback_button_color || DEFAULT_CONFIG.feedback_button_color,
            '--sidebar-bg': (isDarkMode ? (config.sidebar_color_dark || config.secondary_color_dark || config.secondary_color || DEFAULT_CONFIG.secondary_color_dark) : (config.sidebar_color || activeSecondary)),
            '--sidebar-bg-dark': (config.sidebar_color_dark || config.secondary_color_dark || config.secondary_color || DEFAULT_CONFIG.secondary_color_dark) ?? null,
            '--sidebar-text-light': config.sidebar_text_light || DEFAULT_CONFIG.sidebar_text_light,
            '--sidebar-text-dark': config.sidebar_text_dark || DEFAULT_CONFIG.sidebar_text_dark,
            '--sidebar-text': String(isDarkMode ? (config.sidebar_text_dark || DEFAULT_CONFIG.sidebar_text_dark) : (config.sidebar_text_light || DEFAULT_CONFIG.sidebar_text_light)),
            '--sidebar-text-rgb': (function(){ try { const st = (isDarkMode ? (config.sidebar_text_dark || DEFAULT_CONFIG.sidebar_text_dark) : (config.sidebar_text_light || DEFAULT_CONFIG.sidebar_text_light)) || '#ffffff'; const h = st.replace('#',''); const bigint = parseInt(h.length===3 ? h.split('').map(c=>c+c).join('') : h,16); const sr = (bigint>>16)&255; const sg = (bigint>>8)&255; const sb = bigint&255; return `${sr}, ${sg}, ${sb}` } catch(e){ return null } })(),
            '--text-body-light': config.body_text_light || DEFAULT_CONFIG.body_text_light,
            '--text-body-dark': config.body_text_dark || DEFAULT_CONFIG.body_text_dark,
            '--text-heading-light': config.heading_text_light || DEFAULT_CONFIG.heading_text_light,
            '--text-heading-dark': config.heading_text_dark || DEFAULT_CONFIG.heading_text_dark,
            '--text-muted-light': config.muted_text_light || DEFAULT_CONFIG.muted_text_light,
            '--text-muted-dark': config.muted_text_dark || DEFAULT_CONFIG.muted_text_dark,
            '--modal-text-light': config.body_text_light || DEFAULT_CONFIG.body_text_light,
            '--modal-text-dark': config.body_text_dark || DEFAULT_CONFIG.body_text_dark,
            '--modal-bg': String(isDarkMode ? (config.bg_dark ?? config.modal_bg_dark ?? DEFAULT_CONFIG.modal_bg_dark) : (config.bg_light ?? config.modal_bg_light ?? DEFAULT_CONFIG.modal_bg_light)),
            '--modal-text': String(isDarkMode ? (config.body_text_dark ?? DEFAULT_CONFIG.body_text_dark) : (config.body_text_light ?? DEFAULT_CONFIG.body_text_light)),
            '--modal-border': String(isDarkMode ? (config.border_dark ?? config.modal_border_dark ?? DEFAULT_CONFIG.modal_border_dark) : (config.border_light ?? config.modal_border_light ?? DEFAULT_CONFIG.modal_border_light)),
            '--modal-overlay-opacity': String(config.modal_overlay_opacity ?? DEFAULT_CONFIG.modal_overlay_opacity),
            '--modal-shadow': String(chosenShadow),
          };
          try {
            localStorage.setItem('prospecai:layout_theme', JSON.stringify(themeBlob));
          } catch (e) {
            // ignore storage errors
          }
        }
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
        sidebar_color: config.sidebar_color,
        sidebar_color_dark: config.sidebar_color_dark,
        modal_bg_light: config.modal_bg_light,
        modal_bg_dark: config.modal_bg_dark,
        // Shared background / border tokens (new keys)
        bg_light: (config as any).bg_light,
        bg_dark: (config as any).bg_dark,
        modal_text_light: config.modal_text_light,
        modal_text_dark: config.modal_text_dark,
        modal_border_light: config.modal_border_light,
        modal_border_dark: config.modal_border_dark,
        // Navigation hierarchy (parent map)
        nav_parent_map: config.nav_parent_map,
        border_light: (config as any).border_light,
        border_dark: (config as any).border_dark,
        modal_overlay_opacity: config.modal_overlay_opacity,
        modal_elevation: config.modal_elevation,
        color_mode: config.color_mode,
        chat_button_color: config.chat_button_color,
        chat_button_color_dark: config.chat_button_color_dark,
        feedback_button_color: config.feedback_button_color,
        feedback_button_color_dark: config.feedback_button_color_dark,
        // Font color tokens
        body_text_light: config.body_text_light,
        body_text_dark: config.body_text_dark,
        heading_text_light: config.heading_text_light,
        heading_text_dark: config.heading_text_dark,
        muted_text_light: config.muted_text_light,
        muted_text_dark: config.muted_text_dark,
        // Sidebar text tokens
        sidebar_text_light: (config as any).sidebar_text_light,
        sidebar_text_dark: (config as any).sidebar_text_dark,
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

  // Auto-save certain layout changes (debounced) so user modifications
  // to widget visibility/order and nav order persist without explicit save.
  React.useEffect(() => {
    let timer: any = null;
    const lastPayloadRef = (LayoutContext as any).__lastAutosavePayloadRef as React.MutableRefObject<string | null> | undefined;
    const inFlightRef = (LayoutContext as any).__autosaveInFlightRef as React.MutableRefObject<boolean> | undefined;
    // Initialize refs on the function object so they persist across re-renders
    if (!lastPayloadRef) {
      (LayoutContext as any).__lastAutosavePayloadRef = { current: null };
    }
    if (!inFlightRef) {
      (LayoutContext as any).__autosaveInFlightRef = { current: false };
    }
    const lastRef = (LayoutContext as any).__lastAutosavePayloadRef as React.MutableRefObject<string | null>;
    const inFlight = (LayoutContext as any).__autosaveInFlightRef as React.MutableRefObject<boolean>;

    try {
      const payloadObj = {
        dashboard_widgets: config.dashboard_widgets || [],
        dashboard_widget_order: config.dashboard_widget_order || [],
        nav_order: config.nav_order || [],
        visible_nav_items: config.visible_nav_items || [],
        nav_parent_map: config.nav_parent_map || {},
      };
      const payloadStr = JSON.stringify(payloadObj);

      // Debounce writes when user is actively changing settings
      timer = setTimeout(async () => {
        if (isLoading) return;
        if (inFlight.current) return; // avoid overlapping saves
        if (lastRef.current === payloadStr) return; // nothing changed since last save

        inFlight.current = true;
        try {
          await saveConfig();
          // record the payload we just saved so identical future changes don't trigger
          lastRef.current = payloadStr;
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[LayoutContext] autosave failed', err);
        } finally {
          inFlight.current = false;
        }
      }, 600);
    } catch (e) {
      // ignore
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  // Trigger autosave when these layout keys change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.dashboard_widgets, config.dashboard_widget_order, config.nav_order, config.visible_nav_items, config.nav_parent_map, isLoading]);

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
