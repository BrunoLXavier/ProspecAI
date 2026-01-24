/**
 * EmailIngestionConfig Component
 * 
 * Configuration panel for thread email integration:
 * - Display unique email address for the thread
 * - Instructions for forwarding emails
 * - Email whitelist management
 * - Auto-confirmation settings
 * 
 * Implements RF-08: Email ingestion into communication threads
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  EnvelopeIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  PlusIcon,
  XMarkIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';

interface EmailConfig {
  inbound_address: string;
  whitelist: string[];
  auto_confirm: boolean;
  enabled: boolean;
}

interface Props {
  threadId: string;
  onConfigChange?: (config: EmailConfig) => void;
}

export default function EmailIngestionConfig({ threadId, onConfigChange }: Props) {
  const t = useTranslations('communications');
  
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [newWhitelistEmail, setNewWhitelistEmail] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [threadId]);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await apiClient.get(`/api/v1/communications/${threadId}/email-config`);
      setConfig(res);
    } catch (e: any) {
      // If endpoint doesn't exist yet, create default config
      if (e.status === 404) {
        setConfig({
          inbound_address: `thread-${threadId.slice(0, 8)}@inbound.prospecai.com`,
          whitelist: [],
          auto_confirm: false,
          enabled: true,
        });
      } else {
        setError(e.message || 'Failed to load email configuration');
      }
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newConfig: EmailConfig) => {
    setSaving(true);
    setError(null);
    
    try {
      await apiClient.put(`/api/v1/communications/${threadId}/email-config`, newConfig);
      setConfig(newConfig);
      onConfigChange?.(newConfig);
    } catch (e: any) {
      setError(e.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const copyEmailAddress = async () => {
    if (!config?.inbound_address) return;
    
    try {
      await navigator.clipboard.writeText(config.inbound_address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const toggleEnabled = () => {
    if (!config) return;
    saveConfig({ ...config, enabled: !config.enabled });
  };

  const toggleAutoConfirm = () => {
    if (!config) return;
    saveConfig({ ...config, auto_confirm: !config.auto_confirm });
  };

  const addWhitelistEmail = () => {
    if (!config || !newWhitelistEmail.trim()) return;
    
    const email = newWhitelistEmail.trim().toLowerCase();
    if (!email.includes('@')) {
      setError(t('invalidEmail') || 'Invalid email address');
      return;
    }
    
    if (config.whitelist.includes(email)) {
      setError(t('emailAlreadyInWhitelist') || 'Email already in whitelist');
      return;
    }
    
    saveConfig({
      ...config,
      whitelist: [...config.whitelist, email],
    });
    setNewWhitelistEmail('');
  };

  const removeWhitelistEmail = (email: string) => {
    if (!config) return;
    saveConfig({
      ...config,
      whitelist: config.whitelist.filter(e => e !== email),
    });
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center text-gray-500">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin mr-2" />
        {t('loading') || 'Loading...'}
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-4 text-center text-gray-500">
        <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p>{t('emailConfigNotAvailable') || 'Email configuration not available'}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <EnvelopeIcon className="w-5 h-5 text-primary-600" />
          <h3 className="font-medium text-gray-900 dark:text-white">
            {t('emailIngestion') || 'Email Ingestion'}
          </h3>
        </div>
        
        {/* Enable toggle */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={toggleEnabled}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
            {config.enabled ? (t('enabled') || 'Enabled') : (t('disabled') || 'Disabled')}
          </span>
        </label>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Inbound email address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('inboundEmailAddress') || 'Inbound Email Address'}
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm text-gray-900 dark:text-white select-all">
              {config.inbound_address}
            </div>
            <button
              onClick={copyEmailAddress}
              className={`p-2.5 rounded-lg transition ${
                copied
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
              }`}
              title={t('copy') || 'Copy'}
            >
              {copied ? (
                <CheckIcon className="w-5 h-5" />
              ) : (
                <ClipboardDocumentIcon className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('inboundEmailHint') || 'Forward emails to this address to add them to this thread'}
          </p>
        </div>

        {/* Info box */}
        <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg">
          <InformationCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">{t('howItWorks') || 'How it works'}</p>
            <ul className="mt-1 list-disc list-inside space-y-1 text-blue-600 dark:text-blue-300">
              <li>{t('emailStep1') || 'Forward or send emails to the address above'}</li>
              <li>{t('emailStep2') || 'Emails will appear as messages in this thread'}</li>
              <li>{t('emailStep3') || 'Attachments are automatically saved'}</li>
              <li>{t('emailStep4') || 'Use the whitelist to restrict senders'}</li>
            </ul>
          </div>
        </div>

        {/* Advanced settings toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
        >
          <Cog6ToothIcon className="w-4 h-4" />
          {t('advancedSettings') || 'Advanced Settings'}
          <span className={`transform transition ${showAdvanced ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {/* Advanced settings */}
        {showAdvanced && (
          <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            {/* Auto-confirm toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('autoConfirmEmails') || 'Auto-confirm emails'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('autoConfirmHint') || 'Skip human-in-the-loop confirmation for whitelisted senders'}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.auto_confirm}
                  onChange={toggleAutoConfirm}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* Email whitelist */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('emailWhitelist') || 'Allowed Senders (Whitelist)'}
              </label>
              
              {/* Add email input */}
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="email"
                  value={newWhitelistEmail}
                  onChange={(e) => setNewWhitelistEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addWhitelistEmail()}
                  placeholder={t('addEmailPlaceholder') || 'email@example.com'}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                />
                <button
                  onClick={addWhitelistEmail}
                  disabled={!newWhitelistEmail.trim()}
                  className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Whitelist items */}
              {config.whitelist.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  {t('noWhitelistEmails') || 'No whitelist configured - all emails will be accepted'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {config.whitelist.map(email => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm"
                    >
                      <EnvelopeIcon className="w-4 h-4" />
                      {email}
                      <button
                        onClick={() => removeWhitelistEmail(email)}
                        className="ml-1 hover:text-green-900 dark:hover:text-green-200"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {t('whitelistHint') || 'Leave empty to accept emails from any sender, or add specific addresses to restrict'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Saving indicator */}
      {saving && (
        <div className="px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-sm flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
          {t('saving') || 'Saving...'}
        </div>
      )}
    </div>
  );
}
