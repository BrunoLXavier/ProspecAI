// Barrel export for layout-settings components
// Implements RF-07 (layout configuration per user/tenant)

export { default as NavigationItemsSection } from './components/NavigationItemsSection';
export { default as NavigationRolesSection } from './components/NavigationRolesSection';
export { default as DashboardWidgetsSection } from './components/DashboardWidgetsSection';
export { default as WidgetRolesSection } from './components/WidgetRolesSection';
export { default as SidebarConfigSection } from './components/SidebarConfigSection';
export { default as UIPreferencesSection } from './components/UIPreferencesSection';
export { default as ThemeColorsSection } from './components/ThemeColorsSection';
export { default as BrandingSection } from './components/BrandingSection';
export { default as TypographySection } from './components/TypographySection';
export { default as LayoutLoadingSkeleton } from './components/LayoutLoadingSkeleton';

export type { AvailableNavItem, AvailableWidget, AvailableRole, DragPayload, LayoutSectionProps } from './components/types';
export { hexToRgb, contrastRatio, luminance, adjustLightness, rotateHue, pickTextColorForBackground } from './components/color-utils';
