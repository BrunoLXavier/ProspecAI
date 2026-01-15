// Settings Page
// User preferences and system configuration
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useLocaleContext, SupportedLocale, LOCALE_FLAGS, LOCALE_NAMES } from '@/contexts/LocaleContext';
import Link from 'next/link';
import {
  SunIcon,
  MoonIcon,
  GlobeAltIcon,
  BellIcon,
  ChatBubbleLeftIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  CheckIcon,
  Cog6ToothIcon,
  LanguageIcon,
  KeyIcon,
  RectangleGroupIcon,
  CpuChipIcon,
  UsersIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  matchingAlerts: boolean;
  deadlineReminders: boolean;
  weeklyDigest: boolean;
}

export default function SettingsPage() {
  const t = useTranslations('settings');
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const isAdmin = !!user?.roles?.includes('admin');
  const { locale, setLocale, availableLocales } = useLocaleContext();
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    matchingAlerts: true,
    deadlineReminders: true,
    weeklyDigest: false,
  });

  // Load settings from localStorage
  useEffect(() => {
    const savedNotifications = localStorage.getItem('prospecai_notifications');
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    
    // Save notifications to localStorage (locale is already saved by LocaleContext)
    localStorage.setItem('prospecai_notifications', JSON.stringify(notifications));
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setIsSaving(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleNotificationChange = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLanguageChange = (langCode: SupportedLocale) => {
    setLocale(langCode);
    // Show save confirmation for immediate feedback
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const languages = availableLocales.map(code => ({
    code,
    name: LOCALE_NAMES[code],
    flag: LOCALE_FLAGS[code],
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t('subtitle')}
        </p>
      </div>

      {/* Appearance Section */}
      <section className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <SunIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('appearance.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('appearance.description')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('appearance.theme')}
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all ${
                theme === 'light'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <SunIcon className="w-6 h-6 text-yellow-500" />
              <span className="font-medium text-gray-900 dark:text-white">
                {t('appearance.light')}
              </span>
              {theme === 'light' && (
                <CheckIcon className="w-5 h-5 text-primary-500" />
              )}
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all ${
                theme === 'dark'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <MoonIcon className="w-6 h-6 text-indigo-500" />
              <span className="font-medium text-gray-900 dark:text-white">
                {t('appearance.dark')}
              </span>
              {theme === 'dark' && (
                <CheckIcon className="w-5 h-5 text-primary-500" />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Language Section */}
      <section className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <GlobeAltIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('language.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('language.description')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                locale === lang.code
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-2xl">{lang.flag}</span>
              <span className="font-medium text-gray-900 dark:text-white text-sm">
                {lang.name}
              </span>
              {locale === lang.code && (
                <CheckIcon className="w-5 h-5 text-primary-500 ml-auto" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Notifications Section */}
      <section className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <BellIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('notifications.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('notifications.description')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { key: 'emailNotifications', label: t('notifications.email') },
            { key: 'pushNotifications', label: t('notifications.push') },
            { key: 'matchingAlerts', label: t('notifications.matching') },
            { key: 'deadlineReminders', label: t('notifications.deadlines') },
            { key: 'weeklyDigest', label: t('notifications.digest') },
          ].map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <span className="text-gray-700 dark:text-gray-300">{label}</span>
              <button
                onClick={() => handleNotificationChange(key as keyof NotificationSettings)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications[key as keyof NotificationSettings]
                    ? 'bg-primary-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications[key as keyof NotificationSettings]
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Security Section */}
      <section className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <ShieldCheckIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('security.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('security.description')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <button className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
            <div className="flex items-center gap-3">
              <UserCircleIcon className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                {t('security.changePassword')}
              </span>
            </div>
            <span className="text-gray-400">→</span>
          </button>
        </div>
      </section>

      {/* Admin Section (visible to admins only) */}
      {isAdmin && (
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <Cog6ToothIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('admin.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('admin.description')}
            </p>
          </div>
        </div>

        <div className="space-y-3">

          <Link
            href="/settings/layout"
            className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
          >
            <div className="flex items-center gap-3">
              <RectangleGroupIcon className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {t('admin.layout')}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('admin.layoutDesc')}
                </p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </Link>

          <Link
            href="/settings/users"
            className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
          >
            <div className="flex items-center gap-3">
              <UsersIcon className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {t('admin.users') || 'User Management'}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('admin.usersDesc') || 'Manage system users and permissions'}
                </p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </Link>

          <Link
            href="/settings/acl"
            className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
          >
            <div className="flex items-center gap-3">
              <KeyIcon className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {t('admin.acl')}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('admin.aclDesc')}
                </p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </Link>

          <Link
            href="/settings/statistics"
            className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
          >
            <div className="flex items-center gap-3">
              <ChartBarIcon className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {t('admin.statistics') || 'Statistics Permissions'}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('admin.statisticsDesc') || 'Configure which statistics are available per user role'}
                </p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </Link>

          <Link
            href="/settings/translations"
            className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
          >
            <div className="flex items-center gap-3">
              <LanguageIcon className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {t('admin.translations')}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('admin.translationsDesc')}
                </p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </Link>

          <Link
            href="/admin/feedback"
            className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
          >
            <div className="flex items-center gap-3">
              <ChatBubbleLeftIcon className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {t('admin.feedback') || 'Feedback'}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('admin.feedbackDesc') || 'Manage user feedback and annotations'}
                </p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </Link>

          <Link
            href="/settings/llm-provider"
            className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
          >
            <div className="flex items-center gap-3">
              <CpuChipIcon className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {t('admin.llmProvider')}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('admin.llmProviderDesc')}
                </p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </Link>
        </div>
        </section>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        {showSaved && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckIcon className="w-5 h-5" />
            <span>{t('saved')}</span>
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t('saving')}
            </>
          ) : (
            t('saveChanges')
          )}
        </button>
      </div>
    </div>
  );
}
