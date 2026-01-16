"use client";

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PencilIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';

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

export default function TranslationDetailModal({ isOpen, onClose, translation, onUpdated, onDeleted }: Props) {
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
      const locales = Object.keys(values);
      for (const locale of locales) {
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

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">{translation.path}</Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs text-gray-500 uppercase">{t('translations.keyPath')}</h4>
                    <p className="font-mono text-sm mt-1 text-gray-700 dark:text-gray-300">{translation.path}</p>
                  </div>

                  <div>
                    <h4 className="text-xs text-gray-500 uppercase">{t('translations.values')}</h4>
                    <div className="mt-2 space-y-2">
                      {Object.keys(values).map(locale => (
                        <div key={locale} className="flex items-center gap-3">
                          <div className="w-20 text-sm text-gray-600 dark:text-gray-300">{locale}</div>
                          {editing ? (
                            <input
                              value={values[locale] ?? ''}
                              onChange={(e) => setValues(prev => ({ ...prev, [locale]: e.target.value }))}
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                            />
                          ) : (
                            <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">{values[locale] || tCommon('noResults')}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  {editing ? (
                    <>
                      <button onClick={() => setEditing(false)} className="px-4 py-2 bg-white border rounded-lg">{tCommon('cancel')}</button>
                      <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg">{saving ? t('settings.saving') : tCommon('save')}</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditing(true)} className="px-4 py-2 bg-white border rounded-lg flex items-center gap-2"><PencilIcon className="h-4 w-4" /> {tCommon('edit')}</button>
                      <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2"><TrashIcon className="h-4 w-4" /> {tCommon('delete')}</button>
                    </>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
