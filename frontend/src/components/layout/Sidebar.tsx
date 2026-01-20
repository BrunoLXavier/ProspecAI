// Sidebar Component
// Collapsible sidebar navigation with glass-morphism effect
// Firjan SENAI Brand Identity
'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLayout } from '@/contexts/LayoutContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  HomeIcon,
  CurrencyDollarIcon,
  BriefcaseIcon,
  UserGroupIcon,
  ChartBarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloudArrowUpIcon,
  ShieldExclamationIcon,
  DocumentChartBarIcon,
  ClockIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

// Navigation items configuration
// Implements RF-06: Sidebar navigation with Administration block for Feedback Management
interface NavigationItem {
  id: string;
  name: string;
  href?: string;
  icon?: any;
  isSection?: boolean;
}

const navigationItems: NavigationItem[] = [
  { id: 'dashboard', name: 'dashboard', href: '/dashboard', icon: HomeIcon },
  { id: 'funding', name: 'funding', href: '/funding', icon: CurrencyDollarIcon },
  { id: 'portfolio', name: 'portfolio', href: '/portfolio', icon: BriefcaseIcon },
  { id: 'crm', name: 'crm', href: '/crm', icon: UserGroupIcon },
  { id: 'communications', name: 'communications', href: '/comunications', icon: DocumentTextIcon },
  { id: 'institutes', name: 'institutes', href: '/institutes', icon: UserGroupIcon },
  { id: 'teams', name: 'teams', href: '/teams', icon: UserGroupIcon },
  { id: 'infrastructure', name: 'infrastructure', href: '/infrastructure', icon: DocumentChartBarIcon },
  { id: 'opportunities', name: 'opportunities', href: '/opportunities', icon: ChartBarIcon },
  { id: 'proposals', name: 'proposals', href: '/proposals', icon: DocumentTextIcon },
  // --- Administration Block Start ---
  { id: 'admin', name: 'admin', isSection: true },
  { id: 'piiAnalysis', name: 'piiAnalysis', href: '/pii-analysis', icon: ShieldExclamationIcon },
  // --- Administration Block End ---
  { id: 'ingestion', name: 'ingestion', href: '/ingestion', icon: CloudArrowUpIcon },
  { id: 'reports', name: 'reports', href: '/reports', icon: DocumentChartBarIcon },
  { id: 'reportTemplates', name: 'reportTemplates', href: '/report-templates', icon: DocumentTextIcon },
  { id: 'activity', name: 'activity', href: '/activity', icon: ClockIcon },
  { id: 'notifications', name: 'notifications', href: '/notifications', icon: BellIcon },
  { id: 'settings', name: 'settings', href: '/settings', icon: Cog6ToothIcon },
];
 

// Sidebar Context for external control
interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  toggleCollapse: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
};

// Sidebar Provider
interface SidebarProviderProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

export function SidebarProvider({ children, defaultCollapsed = false }: SidebarProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    }
  }, []);

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, toggleCollapse }}>
      {children}
    </SidebarContext.Provider>
  );
}

// Sidebar Toggle Button (for header)
export function SidebarToggle({ className }: { className?: string }) {
  const { isCollapsed, toggleCollapse } = useSidebar();

  return (
    <button
      onClick={toggleCollapse}
      className={`p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-700 transition-colors duration-200 ${className || ''}`}
      aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}

// Main Sidebar Component
export default function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('navigation');
  const { isCollapsed, toggleCollapse } = useSidebar();
  const { config } = useLayout();
  const [, setVersion] = useState(0);

  // Ensure immediate re-render when layout config updates via event
  useEffect(() => {
    const handler = (ev?: Event) => {
      try {
        // eslint-disable-next-line no-console
        console.debug('[Sidebar] layout:changed event', (ev as CustomEvent)?.detail);
      } catch (e) {}
      setVersion(v => v + 1);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('layout:changed', handler as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('layout:changed', handler as EventListener);
      }
    };
  }, []);

  // Debug: log visible nav items whenever they change
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.debug('[Sidebar] visible_nav_items', config.visible_nav_items);
    } catch (e) {}
  }, [config.visible_nav_items]);

  // Compute visible items applying nav_order when present and applying role-based restrictions
  const { user } = useAuth();
  const globalVisible = config.visible_nav_items || [];
  // Build allowed set from role-based config; if none configured for user's roles, allow all
  const byRole = config.visible_nav_items_by_role || {};
  const userRoles: string[] = (user?.roles && Array.isArray(user.roles)) ? user.roles : [];
  let allowedByRole: Set<string> = new Set();
  if (userRoles.length) {
    userRoles.forEach(r => {
      const arr = byRole[r] || [];
      arr.forEach(i => allowedByRole.add(i));
    });
  }
  const allowedAll = userRoles.length === 0 || allowedByRole.size === 0;
  const visibleIds = globalVisible.filter(id => allowedAll || allowedByRole.has(id) || id === 'settings');
  const order = (config.nav_order && config.nav_order.length) ? config.nav_order : [];
  const orderedIds = [
    ...order.filter(id => visibleIds.includes(id)),
    ...visibleIds.filter(id => !order.includes(id)),
  ];

  const visibleItems = orderedIds
    .map(id => navigationItems.find(item => item.id === id))
    .filter(Boolean) as NavigationItem[];

  // Debug: log effective visible ids
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.debug('[Sidebar] effective visible ids', orderedIds);
    } catch (e) {}
  }, [orderedIds.join(',')]);

  return (
    <aside
      className={`
        fixed top-0 ${config.sidebar_position === 'right' ? 'right-0' : 'left-0'} z-40 h-screen
        glass-sidebar
        flex flex-col
        transition-all duration-350 ease-in-out sidebar-transition overflow-hidden
        ${isCollapsed ? 'w-[72px]' : `w-[${config.sidebar_width}px]`}
      `}
      aria-label="Sidebar"
      style={{
        width: isCollapsed ? '72px' : `${config.sidebar_width}px`,
        [config.sidebar_position === 'right' ? 'right' : 'left']: 0,
      }}
    >
      {/* Logo Section */}
      <div className={`
        flex items-center h-16 px-4
        border-b border-white/10
        ${isCollapsed ? 'justify-center' : 'justify-between'}
      `}>
        <Link href="/dashboard" className="flex items-center gap-3">
          {/* Logo Icon */}
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          {/* Logo Text */}
          <span className={`
            text-xl font-bold text-white whitespace-nowrap
            transition-all duration-350
            ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}
          `}>
            ProspecAI
          </span>
        </Link>
        {/* Collapse Button (Chevron on sidebar edge) */}
        {!isCollapsed && (
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors duration-200"
            aria-label="Collapse sidebar"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
        )}
      </div>
      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item, idx) => {
          if (item.isSection) {
            // Render section header for Administration
            return (
              <div key={item.id} className="mt-6 mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {t('admin')}
                </div>
            );
          }
          const isActive = item.href
            ? pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            : false;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href ?? '#'}
              className={`
                sidebar-item group relative
                ${isCollapsed ? 'justify-center px-2' : ''}
                ${isActive ? 'active' : ''}
              `}
              title={isCollapsed ? t(item.name) : undefined}
            >
              {Icon && <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}`} />}
              <span className={`
                font-medium whitespace-nowrap
                transition-all duration-350
                ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}
              `}>
                {t(item.name)}
              </span>
              {/* Active Indicator (only when expanded) */}
              {isActive && !isCollapsed && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-l-full" />
              )}
            </Link>
          );
        })}
      </nav>
      {/* Expand button when collapsed */}
      {isCollapsed && (
        <div className="px-3 py-2 border-t border-white/10">
          <button
            onClick={toggleCollapse}
            className="w-full p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors duration-200 flex items-center justify-center"
            aria-label="Expand sidebar"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      )}
      {/* User Info Section */}
      <div className={`
        p-3 border-t border-white/10
        ${isCollapsed ? 'flex justify-center' : ''}
      `}>
        <Link
          href="/profile"
          className={`
            flex items-center rounded-lg p-2 hover:bg-white/5 cursor-pointer transition-colors
            ${isCollapsed ? 'justify-center' : 'gap-3'}
          `}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center ring-2 ring-white/20">
              <span className="text-sm font-bold text-white">AD</span>
            </div>
            {/* Online Indicator */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-secondary-400 border-2 border-secondary-500 rounded-full" />
          </div>
          {/* User Details */}
          <div className={`
            flex-1 min-w-0
            transition-all duration-350
            ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}
          `}>
            <p className="text-sm font-medium text-white truncate">Admin User</p>
            <p className="text-xs text-white/60 truncate">admin@prospecai.com</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
