"use client";

import { useState, useEffect } from 'react';
import { LanguageIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import BaseModal, { ModalFooter } from '@/components/features/shared/ui/BaseModal';
import { FormTextarea } from '@/components/features/shared/forms';

interface TranslationKey {
  key: string;
  path: string;
  values: Record<string, string>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  translation: TranslationKey | null;
  onUpdated?: () => void;
  onDeleted?: () => void;
}
interface ModalProps extends Props {
  locales?: string[];
}

export default function TranslationDetailModal({ isOpen, onClose, translation, onUpdated, onDeleted, locales: localesProp }: ModalProps) {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(translation?.values || {});
  const [saving, setSaving] = useState(false);

  // keep values in sync when translation prop changes
  useEffect(() => {
    setValues(translation?.values || {});
    setEditing(false);
    setSaving(false);
  }, [translation]);

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
      setEditing(false);
      onUpdated?.();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!translation) return;
    if (!confirm(`${t('translations.deleteConfirm')} "${translation.path}"?`)) return;
    try {
      await apiClient.delete(`/api/v1/translations/${translation.path}`);
      onDeleted?.();
      onClose();
    } catch (err: any) {
      console.error(err);
    }
  };

  if (!translation) return null;

  const renderFooter = () => {
    if (editing) {
      return (
        <ModalFooter
          onCancel={() => setEditing(false)}
          onSubmit={handleSave}
          isSubmitting={saving}
        />
      );
    }
    return (
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => setEditing(true)}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center gap-2 transition-colors"
        >
          <PencilIcon className="h-4 w-4" /> {tCommon('edit')}
        </button>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
        >
          <TrashIcon className="h-4 w-4" /> {tCommon('delete')}
        </button>
      </div>
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={translation.path}
      subtitle={t('translations.keyPath')}
      icon={<LanguageIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
      size="3xl"
      footer={renderFooter()}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="rounded-md p-4 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-gray-600">
            <h4 className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2">{t('translations.keyPath')}</h4>
            <pre className="font-mono text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">{translation.path}</pre>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs text-gray-500 dark:text-gray-400 uppercase">{t('translations.values')}</h4>
            <div className="text-sm text-gray-400 dark:text-gray-500">{(localesProp && localesProp.length ? localesProp.length : Object.keys(values).length)} locales</div>
          </div>

          <div className="max-h-72 overflow-auto space-y-3 p-2">
            {(localesProp && localesProp.length ? localesProp : Object.keys(values)).map(locale => (
              <div key={locale} className="flex items-start gap-4 p-2 rounded">
                <div className="w-28 flex-shrink-0 text-sm text-gray-700 dark:text-gray-300 font-medium">{locale}</div>
                <div className="flex-1">
                  {editing ? (
                    <textarea
                      value={values[locale] ?? ''}
                      onChange={(e) => setValues(prev => ({ ...prev, [locale]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm resize-vertical bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      rows={2}
                    />
                  ) : (
                    <div className="text-sm text-gray-700 dark:text-gray-300 font-sans whitespace-pre-wrap break-words">{values[locale] || tCommon('noResults')}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
