// Email Settings Page
// Admin configuration for SMTP and email templates
// Implements RF-09: Admin-configurable email settings
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import {
  EnvelopeIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
  PaperAirplaneIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_use_tls: boolean;
  from_email: string;
  from_name: string;
  app_name: string;
  app_url: string;
  support_email: string;
  smtp_fallback_host: string;
  smtp_fallback_port: number;
  smtp_fallback_username: string;
  smtp_fallback_password: string;
}

const defaultConfig: EmailConfig = {
  smtp_host: '',
  smtp_port: 587,
  smtp_username: '',
  smtp_password: '',
  smtp_use_tls: true,
  from_email: '',
  from_name: 'ProspecAI',
  app_name: 'ProspecAI',
  app_url: '',
  support_email: '',
  smtp_fallback_host: '',
  smtp_fallback_port: 587,
  smtp_fallback_username: '',
  smtp_fallback_password: '',
};

export default function EmailSettingsPage() {
  const t = useTranslations('settings.email');
  const tCommon = useTranslations('common');
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = !!user?.roles?.includes('admin');

  const [config, setConfig] = useState<EmailConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showFallbackPassword, setShowFallbackPassword] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (!isAdmin && !loading) {
      router.push('/settings');
    }
  }, [isAdmin, loading, router]);

  // Load current config
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<EmailConfig>('/api/v1/admin/settings/email');
      setConfig({ ...defaultConfig, ...response });
      // Check if fallback is configured
      if (response.smtp_fallback_host) {
        setShowFallback(true);
      }
    } catch (error) {
      console.error('Failed to load email config:', error);
      setMessage({ type: 'error', text: t('errors.loadFailed') });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isAdmin) {
      loadConfig();
    }
  }, [isAdmin, loadConfig]);

  const handleChange = (field: keyof EmailConfig, value: string | number | boolean) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      // Only send password if it's not the masked value
      const payload: Partial<EmailConfig> = { ...config };
      if (config.smtp_password === '********') {
        delete payload.smtp_password;
      }
      if (config.smtp_fallback_password === '********') {
        delete payload.smtp_fallback_password;
      }

      await apiClient.put('/api/v1/admin/settings/email', payload);
      setMessage({ type: 'success', text: t('saveSuccess') });
    } catch (error) {
      console.error('Failed to save email config:', error);
      setMessage({ type: 'error', text: t('errors.saveFailed') });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: t('errors.testEmailRequired') });
      return;
    }

    try {
      setTesting(true);
      setMessage(null);
      await apiClient.post('/api/v1/admin/settings/email/test', { to_email: testEmail });
      setMessage({ type: 'success', text: t('testSuccess') });
    } catch (error: any) {
      console.error('Failed to send test email:', error);
      const detail = error.response?.data?.detail || t('errors.testFailed');
      setMessage({ type: 'error', text: detail });
    } finally {
      setTesting(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Alert Message */}
      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircleIcon className="w-5 h-5" />
          ) : (
            <XCircleIcon className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* SMTP Configuration */}
      <section className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <ServerStackIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('smtp.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('smtp.description')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SMTP Host */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('smtp.host')}
            </label>
            <input
              type="text"
              value={config.smtp_host}
              onChange={(e) => handleChange('smtp_host', e.target.value)}
              placeholder="smtp.example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* SMTP Port */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('smtp.port')}
            </label>
            <input
              type="number"
              value={config.smtp_port}
              onChange={(e) => handleChange('smtp_port', parseInt(e.target.value) || 587)}
              placeholder="587"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* SMTP Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('smtp.username')}
            </label>
            <input
              type="text"
              value={config.smtp_username}
              onChange={(e) => handleChange('smtp_username', e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* SMTP Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('smtp.password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={config.smtp_password}
                onChange={(e) => handleChange('smtp_password', e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('smtp.passwordHint')}
            </p>
          </div>

          {/* Use TLS */}
          <div className="flex items-center gap-3 col-span-full">
            <button
              type="button"
              onClick={() => handleChange('smtp_use_tls', !config.smtp_use_tls)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.smtp_use_tls ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.smtp_use_tls ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('smtp.useTls')}
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('smtp.useTlsHint')}
              </p>
            </div>
          </div>
        </div>

        {/* Fallback SMTP */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setShowFallback(!showFallback)}
            className="flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            <ShieldCheckIcon className="w-4 h-4" />
            {showFallback ? t('smtp.hideFallback') : t('smtp.showFallback')}
          </button>

          {showFallback && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('smtp.fallbackHost')}
                </label>
                <input
                  type="text"
                  value={config.smtp_fallback_host}
                  onChange={(e) => handleChange('smtp_fallback_host', e.target.value)}
                  placeholder="backup-smtp.example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('smtp.fallbackPort')}
                </label>
                <input
                  type="number"
                  value={config.smtp_fallback_port}
                  onChange={(e) => handleChange('smtp_fallback_port', parseInt(e.target.value) || 587)}
                  placeholder="587"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('smtp.fallbackUsername')}
                </label>
                <input
                  type="text"
                  value={config.smtp_fallback_username}
                  onChange={(e) => handleChange('smtp_fallback_username', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('smtp.fallbackPassword')}
                </label>
                <div className="relative">
                  <input
                    type={showFallbackPassword ? 'text' : 'password'}
                    value={config.smtp_fallback_password}
                    onChange={(e) => handleChange('smtp_fallback_password', e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFallbackPassword(!showFallbackPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showFallbackPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sender Configuration */}
      <section className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <EnvelopeIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('sender.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('sender.description')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* From Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('sender.fromEmail')}
            </label>
            <input
              type="email"
              value={config.from_email}
              onChange={(e) => handleChange('from_email', e.target.value)}
              placeholder="noreply@prospecai.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* From Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('sender.fromName')}
            </label>
            <input
              type="text"
              value={config.from_name}
              onChange={(e) => handleChange('from_name', e.target.value)}
              placeholder="ProspecAI"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* App Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('sender.appName')}
            </label>
            <input
              type="text"
              value={config.app_name}
              onChange={(e) => handleChange('app_name', e.target.value)}
              placeholder="ProspecAI"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* App URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('sender.appUrl')}
            </label>
            <input
              type="url"
              value={config.app_url}
              onChange={(e) => handleChange('app_url', e.target.value)}
              placeholder="https://prospecai.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Support Email */}
          <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('sender.supportEmail')}
            </label>
            <input
              type="email"
              value={config.support_email}
              onChange={(e) => handleChange('support_email', e.target.value)}
              placeholder="support@prospecai.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('sender.supportEmailHint')}
            </p>
          </div>
        </div>
      </section>

      {/* Test Email */}
      <section className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <PaperAirplaneIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('test.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('test.description')}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder={t('test.placeholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleTestEmail}
            disabled={testing || !testEmail}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {testing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('test.sending')}
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="w-4 h-4" />
                {t('test.send')}
              </>
            )}
          </button>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Link
          href="/settings"
          className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition"
        >
          {tCommon('cancel')}
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {tCommon('saving')}
            </>
          ) : (
            tCommon('save')
          )}
        </button>
      </div>
    </div>
  );
}
