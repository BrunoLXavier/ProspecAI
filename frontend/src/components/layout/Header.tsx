// Header Component
// Top navigation bar with user menu, notifications, search, language and dark mode toggle
// Firjan SENAI Brand Identity
'use client';

import React, { Fragment } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Transition } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import {
  BellIcon,
  MagnifyingGlassIcon,
  SunIcon,
  MoonIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { SidebarToggle, useSidebar } from './Sidebar';
import { NotificationBadge } from '../ui/Badge';
import { SearchInput } from '../ui/Input';
import { useTheme } from './ThemeProvider';
import { LanguageToggle } from '../ui/LanguageToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

// Breadcrumb configuration - keys for i18n translation
const breadcrumbMap: Record<string, string> = {
  '/': 'dashboard',
  '/funding': 'funding',
  '/portfolio': 'portfolio',
  '/crm': 'crm',
  '/opportunities': 'opportunities',
  '/proposals': 'proposals',
  '/settings': 'settings',
  '/reports': 'reports',
  '/settings/translations': 'translations',
};

interface HeaderNotification {
  id: string | number;
  title: string;
  description?: string;
  time?: string;
  unread?: boolean;
  link?: string;
}

export default function Header() {
  const pathname = usePathname();
  const t = useTranslations('navigation');
  const { theme, toggleTheme } = useTheme();
  const { isCollapsed } = useSidebar();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Generate breadcrumbs
  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: t('dashboard'), href: '/' }];
    
    if (segments.length > 0) {
      let currentPath = '';
      segments.forEach((segment) => {
        currentPath += `/${segment}`;
        const translationKey = breadcrumbMap[currentPath];
        const name = translationKey ? t(translationKey) : segment.charAt(0).toUpperCase() + segment.slice(1);
        breadcrumbs.push({ name, href: currentPath });
      });
    }
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const { data: notifications = [] } = useQuery<HeaderNotification[]>({
    queryKey: ['notifications', 'header'],
    queryFn: async () => {
      try {
        const resp = await apiClient.get<HeaderNotification[]>('/api/v1/notifications');
        return resp ?? [];
      } catch (err) {
        console.error('Failed to load header notifications', err);
        return [];
      }
    },
    staleTime: 60_000,
  });

  const unreadCount = (notifications || []).filter((n: any) => n.unread).length;

  return (
    <header className={`
      fixed top-0 right-0 z-30
      h-16 glass-header
      flex items-center justify-between gap-4
      px-4 lg:px-6
      transition-all duration-350
      ${isCollapsed ? 'left-[72px]' : 'left-[260px]'}
    `}>
      {/* Left Section: Toggle + Breadcrumbs */}
      <div className="flex items-center gap-4">
        {/* Mobile/Tablet Menu Toggle */}
        <SidebarToggle className="lg:hidden" />

        {/* Breadcrumbs */}
        <nav className="hidden sm:flex items-center text-sm" aria-label="Breadcrumb">
          {breadcrumbs.map((item, index) => (
            <div key={item.href} className="flex items-center">
              {index > 0 && (
                <ChevronRightIcon className="w-4 h-4 mx-2 text-gray-400 dark:text-gray-500" />
              )}
              {index === breadcrumbs.length - 1 ? (
                <span className="font-medium text-gray-900 dark:text-white">
                  {item.name}
                </span>
              ) : (
                <a
                  href={item.href}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  {item.name}
                </a>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Right Section: Search + Actions */}
      <div className="flex items-center gap-2 lg:gap-4">
        {/* Search Bar */}
        <div className="hidden md:block w-64 lg:w-80">
          <SearchInput
            placeholder="Buscar..."
            inputSize="sm"
            variant="filled"
          />
        </div>

        {/* Search Icon (Mobile) */}
        <button className="md:hidden header-icon-btn">
          <MagnifyingGlassIcon className="w-5 h-5" />
        </button>

        {/* Language Toggle */}
        <LanguageToggle />

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="header-icon-btn"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <SunIcon className="w-5 h-5" />
          ) : (
            <MoonIcon className="w-5 h-5" />
          )}
        </button>

        {/* Notifications */}
        <Menu as="div" className="relative">
          <Menu.Button className="header-icon-btn">
            <NotificationBadge count={unreadCount}>
              <BellIcon className="w-5 h-5" />
            </NotificationBadge>
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-150"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl bg-white dark:bg-slate-800 shadow-elevated border border-gray-200 dark:border-slate-700 focus:outline-none overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Notificações
                </h3>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <Menu.Item key={notification.id}>
                    {({ active }) => (
                      <button
                        className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-colors ${
                          active ? 'bg-gray-50 dark:bg-slate-700/50' : ''
                        } ${notification.unread ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
                      >
                        <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                          notification.unread ? 'bg-primary-500' : 'bg-transparent'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {notification.description}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {notification.time}
                          </p>
                        </div>
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>

              <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700">
                <a
                  href="/notifications"
                  className="text-sm font-medium text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  Ver todas as notificações
                </a>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>

        {/* User Menu */}
        <Menu as="div" className="relative">
          <Menu.Button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">AD</span>
            </div>
            <span className="hidden lg:block text-sm font-medium text-gray-700 dark:text-gray-300">
              Admin
            </span>
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-150"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white dark:bg-slate-800 shadow-elevated border border-gray-200 dark:border-slate-700 focus:outline-none overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.fullName || user?.username || 'Usuário'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email || ''}</p>
              </div>

              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <a
                      href="/profile"
                      className={`flex items-center gap-3 px-4 py-2 text-sm ${
                        active
                          ? 'bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <UserCircleIcon className="w-5 h-5" />
                      Meu Perfil
                    </a>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <a
                      href="/settings"
                      className={`flex items-center gap-3 px-4 py-2 text-sm ${
                        active
                          ? 'bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <Cog6ToothIcon className="w-5 h-5" />
                      Configurações
                    </a>
                  )}
                </Menu.Item>
              </div>

              <div className="py-1 border-t border-gray-200 dark:border-slate-700">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleLogout}
                      className={`flex items-center gap-3 w-full px-4 py-2 text-sm ${
                        active
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      <ArrowRightOnRectangleIcon className="w-5 h-5" />
                      Sair
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </header>
  );
}
