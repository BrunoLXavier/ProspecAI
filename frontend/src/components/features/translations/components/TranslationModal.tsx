/**
 * TranslationModal Component
 * Modal for editing translation keys across multiple locales
 * Implements i18n management
 */
'use client';

import { useState, useEffect } from 'react';
import { LanguageIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

import { BaseModal, DeleteConfirmation } from '@/components/features/shared/ui';
import { apiClient } from '@/lib/api-client';

interface TranslationKey {
  key: string;
  path: string;
  values: Record<string, string>;
}

interface TranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  translation: TranslationKey | null;
  locales?: string[];
  onUpdated?: () => void;
  onDeleted?: () => void;
}

export default function TranslationModal({
  isOpen,
  onClose,
  translation,
  locales: localesProp,
  onUpdated,
  onDeleted,
}: TranslationModalProps) {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Keep values in sync when translation prop changes
  useEffect(() => {
    if (isOpen && translation) {
      setValues(translation.values || {});
    }
    setShowDeleteConfirm(false);
  }, [isOpen, translation]);

  const handleSave = async () => {
    if (!translation) return;
    setSaving(true);
    try {
      const localesToUpdate = localesProp && localesProp.length ? localesProp : Object.keys(values);
      for (const locale of localesToUpdate) {
        if ((values[locale] ?? '') !== (translation.values[locale] ?? '')) {
          const params = new URLSearchParams({ locale, value: values[locale] || '' });
          await apiClient.put(`/api/v1/translations/${translation.path}?${params.toString()}`);
        }
      }
      onUpdated?.();
      onClose();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!translation) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/v1/translations/${translation.path}`);
      onDeleted?.();
      onClose();
    } catch (err: any) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  if (!translation) return null;

  const locales = localesProp && localesProp.length ? localesProp : Object.keys(values);

  // Footer content - passed to BaseModal footer prop to stay fixed
  const footerContent = (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={() => setShowDeleteConfirm(true)}
        className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
      >
        {tCommon('delete')}
      </button>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600"
        >
          {tCommon('cancel')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? tCommon('saving') || 'Salvando...' : tCommon('save')}
        </button>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={translation.path}
      icon={<LanguageIcon className="w-6 h-6" />}
      size="lg"
      footer={footerContent}
    >
      <div>
        {/* Delete Confirmation */}
        <DeleteConfirmation
          isVisible={showDeleteConfirm}
          message={`${t('translations.deleteConfirm')} "${translation.path}"?`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          isDeleting={deleting}
        />

        {/* Key Path Info */}
        <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase block mb-1">
            {t('translations.keyPath')}
          </span>
          <pre className="font-mono text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">
            {translation.path}
          </pre>
        </div>

        {/* Locale Values */}
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              {t('translations.values')}
            </span>
            <span className="text-sm text-gray-400 dark:text-gray-500">
              {locales.length} locales
            </span>
          </div>

          {locales.map((locale) => (
            <div key={locale} className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {locale}
              </label>
              <textarea
                value={values[locale] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [locale]: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-y focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={2}
                placeholder={tCommon('noResults') || 'Sem valor'}
              />
            </div>
          ))}
        </div>
      </div>
    </BaseModal>
  );
}
