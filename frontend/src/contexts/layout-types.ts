/**
 * Layout Types and Default Configuration
 * Type definitions and defaults for layout customization
 * Implements RF-07 (layout configuration per user/tenant)
 */

// =============================================================================
// Types
// =============================================================================

/** Widget configuration with role-based access */
export interface WidgetRoleConfig {
  [role: string]: string[];
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
  nav_parent_map?: { [id: string]: string | null };
  visible_nav_items_by_role?: WidgetRoleConfig;
  nav_order: string[];
  // Dashboard
  dashboard_widgets: string[];
  dashboard_widget_order: string[];
  dashboard_widgets_by_role: WidgetRoleConfig;
  dashboard_layout: string;
  // UI Preferences
  default_page_size: number;
  dense_tables: boolean;
  animations_enabled: boolean;
  compact_mode: boolean;
  // Appearance
  appearance?: 'default' | 'highContrast' | 'system';
  color_mode?: 'light' | 'dark';
  // Feature toggles
  ai_chat_enabled?: boolean;
  feedback_button_enabled?: boolean;
  // Button colors
  chat_button_color?: string;
  feedback_button_color?: string;
  chat_button_color_dark?: string;
  feedback_button_color_dark?: string;
  // Sidebar colors
  sidebar_color?: string;
  sidebar_color_dark?: string;
  sidebar_text_light?: string;
  sidebar_text_dark?: string;
  // Font color tokens
  body_text_light?: string;
  body_text_dark?: string;
  heading_text_light?: string;
  heading_text_dark?: string;
  muted_text_light?: string;
  muted_text_dark?: string;
  // Branding
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
  // Background / border tokens
  bg_light?: string;
  bg_dark?: string;
  border_light?: string;
  border_dark?: string;
  modal_bg_light?: string;
  modal_bg_dark?: string;
  modal_text_light?: string;
  modal_text_dark?: string;
  modal_border_light?: string;
  modal_border_dark?: string;
  modal_overlay_opacity?: number;
  modal_elevation?: 'low' | 'medium' | 'high';
}

export interface LayoutContextType {
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

/** All available widget IDs */
export const ALL_WIDGET_IDS = [
  'pipeline', 'opportunities', 'metrics', 'activity', 'matching', 'calendar',
  'analytics-kpis', 'analytics-pipeline', 'analytics-trl', 'analytics-trends', 'analytics-export',
];

export const DEFAULT_CONFIG: LayoutConfig = {
  sidebar_position: 'left',
  sidebar_collapsed: false,
  sidebar_width: 260,
  visible_nav_items: [
    'dashboard', 'funding', 'portfolio', 'crm', 'opportunities',
    'proposals', 'communications', 'institutes', 'teams', 'infrastructure', 'feedbackManagement', 'ingestion', 'piiAnalysis', 'reports', 'reportTemplates', 'activity', 'notifications', 'settings'
  ],
  nav_order: [],
  nav_parent_map: {},
  dashboard_widgets: [
    'pipeline', 'opportunities', 'metrics', 'activity', 'matching', 'calendar',
    'analytics-kpis', 'analytics-pipeline', 'analytics-trl', 'analytics-trends', 'analytics-export',
  ],
  dashboard_widget_order: [],
  dashboard_widgets_by_role: {
    admin: ALL_WIDGET_IDS,
    manager: ['pipeline', 'opportunities', 'metrics', 'activity', 'matching'],
    user: ['pipeline', 'metrics', 'activity'],
    viewer: ['metrics', 'activity'],
  },
  visible_nav_items_by_role: {
    admin: [
      'dashboard', 'funding', 'portfolio', 'crm', 'opportunities',
      'proposals', 'communications', 'institutes', 'teams', 'infrastructure', 'reports', 'reportTemplates', 'activity', 'ingestion', 'piiAnalysis', 'notifications', 'settings'
    ],
    manager: ['dashboard', 'funding', 'portfolio', 'crm', 'opportunities', 'proposals', 'reports', 'reportTemplates', 'activity'],
    user: ['dashboard', 'opportunities', 'proposals', 'activity', 'notifications'],
    viewer: ['dashboard', 'activity', 'notifications'],
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
  bg_light: '#ffffff',
  bg_dark: '#1e293b',
  modal_text_light: '#0f172a',
  modal_text_dark: '#f8fafc',
  modal_border_light: '#e2e8f0',
  modal_border_dark: '#334155',
  border_light: '#e2e8f0',
  border_dark: '#334155',
  modal_overlay_opacity: 0.4,
  modal_elevation: 'medium',
  chat_button_color: '#E30613',
  feedback_button_color: '#f59e0b',
  chat_button_color_dark: '#E30613',
  feedback_button_color_dark: '#f59e0b',
  sidebar_color: '#003366',
  sidebar_color_dark: '#002244',
  sidebar_text_light: '#ffffff',
  sidebar_text_dark: '#ffffff',
  body_text_light: '#0f172a',
  body_text_dark: '#f8fafc',
  heading_text_light: '#0f172a',
  heading_text_dark: '#f8fafc',
  muted_text_light: '#6b7280',
  muted_text_dark: '#9ca3af',
};
