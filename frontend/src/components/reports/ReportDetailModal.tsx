/**
 * ReportDetailModal
 * Shows template details and allows edit/delete
 */
'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import ReportFormModal from './ReportFormModal';
import { useTranslations } from 'next-intl';

interface Template {
  id: string;
  name: string;
  description?: string;
  parameters?: string[];
  output_formats?: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  template: Template | null;
  onDeleted?: (id: string) => void;
}

export default function ReportDetailModal({ isOpen, onClose, template, onDeleted }: Props) {
  const t = useTranslations('reports');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/reports/templates/${template!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      onDeleted?.(template!.id);
      onClose();
    },
  });

  const handleDelete = () => {
    if (!template) return;
    if (confirm(t('deleteConfirmation'))) {
      deleteMutation.mutate();
    }
  };

  if (!template) return null;

  return (
    <>
      <ReportFormModal isOpen={editing} onClose={() => setEditing(false)} initial={{
        id: template.id,
        name: template.name,
        description: template.description,
        parameters: (template.parameters || []).join(','),
        output_formats: (template.output_formats || []).join(','),
      }} />

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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title className="text-lg font-semibold text-gray-900">{template.name}</Dialog.Title>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {template.description && <p className="text-sm text-gray-700">{template.description}</p>}

                    <div>
                      <h4 className="text-xs text-gray-500 uppercase">{t('parameters')}</h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(template.parameters || []).map((p) => (
                          <span key={p} className="text-xs bg-gray-100 px-2 py-1 rounded">{p}</span>
                        ))}
                        {(!template.parameters || template.parameters.length === 0) && <span className="text-xs text-gray-400">{t('none')}</span>}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs text-gray-500 uppercase">{t('formats')}</h4>
                      <div className="mt-2 flex gap-2">
                        {(template.output_formats || []).map((f) => (
                          <span key={f} className="text-xs bg-gray-100 px-2 py-1 rounded">{f.toUpperCase()}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setEditing(true)} className="px-4 py-2 bg-white border rounded-lg flex items-center gap-2">
                      <PencilIcon className="h-4 w-4" /> {tCommon('edit')}
                    </button>
                    <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2">
                      <TrashIcon className="h-4 w-4" /> {tCommon('delete')}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
