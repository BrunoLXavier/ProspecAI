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
          <div className="fixed inset-0" style={{ backgroundColor: 'rgba(0,0,0,var(--modal-overlay-opacity))' }} />
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
              <Dialog.Panel
                className="w-full max-w-4xl transform overflow-hidden rounded-2xl p-6 transition-all"
                style={{
                  backgroundColor: 'var(--modal-bg)',
                  color: 'var(--modal-text)',
                  border: '1px solid var(--modal-border)',
                  boxShadow: 'var(--modal-shadow)'
                }}
              >
                <div className="flex items-start justify-between mb-4 gap-4">
                  <div className="flex-1 pr-4">
                    <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-slate-50 break-words">{translation.path}</Dialog.Title>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">{t('translations.keyPath')}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                    <div className="rounded-md p-4" style={{ backgroundColor: 'var(--modal-bg)', border: '1px solid var(--modal-border)' }}>
                      <h4 className="text-xs text-gray-500 uppercase mb-2">{t('translations.keyPath')}</h4>
                      <pre className="font-mono text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">{translation.path}</pre>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs text-gray-500 uppercase dark:text-slate-300">{t('translations.values')}</h4>
                      <div className="text-sm text-gray-400 dark:text-slate-400">{(localesProp && localesProp.length ? localesProp.length : Object.keys(values).length)} locales</div>
                    </div>

                    <div className="max-h-72 overflow-auto space-y-3 p-2" style={{ backgroundColor: 'var(--modal-bg)' }}>
                      {(localesProp && localesProp.length ? localesProp : Object.keys(values)).map(locale => (
                        <div key={locale} className="flex items-start gap-4 p-2 rounded" style={{ backgroundColor: 'transparent' }}>
                          <div className="w-28 flex-shrink-0 text-sm text-gray-700 dark:text-slate-300 font-medium">{locale}</div>
                          <div className="flex-1">
                            {editing ? (
                              <textarea
                                value={values[locale] ?? ''}
                                onChange={(e) => setValues(prev => ({ ...prev, [locale]: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm resize-vertical"
                                style={{ backgroundColor: 'var(--modal-bg)', color: 'var(--modal-text)', borderColor: 'var(--modal-border)' }}
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

                <div className="mt-6 flex items-center justify-end gap-3">
                  {editing ? (
                    <>
                      <button onClick={() => setEditing(false)} className="px-4 py-2 bg-transparent border border-gray-200 text-gray-700 rounded-lg dark:bg-white/10 dark:border-slate-700 dark:text-slate-200">{tCommon('cancel')}</button>
                      <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg">{saving ? t('settings.saving') : tCommon('save')}</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditing(true)} className="px-4 py-2 bg-transparent border border-gray-200 text-gray-700 dark:bg-white/10 dark:border-slate-700 dark:text-slate-200 rounded-lg flex items-center gap-2"><PencilIcon className="h-4 w-4" /> {tCommon('edit')}</button>
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
