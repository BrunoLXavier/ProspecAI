// Shared types for layout-settings sub-components
// Implements RF-07 (layout configuration per user/tenant)

import { LayoutConfig } from '@/contexts/LayoutContext';

export interface AvailableNavItem {
  id: string;
  label: string;
}

export interface AvailableWidget {
  id: string;
  label: string;
  size: 'small' | 'medium' | 'large';
}

export interface AvailableRole {
  id: string;
  label: string;
}

export interface DragPayload {
  type: string;
  id: string;
  role?: string;
}

export interface LayoutSectionProps {
  config: LayoutConfig;
  updateConfig: <K extends keyof LayoutConfig>(key: K, value: LayoutConfig[K]) => void;
  t: (key: string) => string;
}
