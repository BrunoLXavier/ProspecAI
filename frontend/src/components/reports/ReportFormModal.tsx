/**
 * ReportFormModal
 * Modal for creating or editing report templates
 */
'use client';

import { Fragment, useEffect, useState, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useTranslations } from 'next-intl';

interface TemplateInput {
  id?: string;
  name: string;
  description?: string;
  parameters?: string; // comma separated
  output_formats?: string; // comma separated
}

interface ReportFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initial?: TemplateInput | null;
}

export default function ReportFormModal({ isOpen, onClose, initial }: ReportFormModalProps) {
  const t = useTranslations('reports');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<TemplateInput>({
    defaultValues: initial || { name: '', description: '', parameters: '', output_formats: 'html,pdf' },
  });

  const [params, setParams] = useState<string[]>(() => (initial && initial.parameters ? (Array.isArray(initial.parameters) ? initial.parameters : (initial.parameters as string).split(',').map(s => s.trim()).filter(Boolean)) : []));
  const [formats, setFormats] = useState<string[]>(() => (initial && initial.output_formats ? (Array.isArray(initial.output_formats) ? initial.output_formats : (initial.output_formats as string).split(',').map(s => s.trim()).filter(Boolean)) : ['html','pdf']));
  const paramInputRef = useRef<HTMLInputElement | null>(null);
  const formatInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initial) {
      reset(initial);
    } else {
      reset({ name: '', description: '', parameters: '', output_formats: 'html,pdf' });
    }
    setParams(initial && initial.parameters ? (Array.isArray(initial.parameters) ? initial.parameters : (initial.parameters as string).split(',').map(s => s.trim()).filter(Boolean)) : []);
    setFormats(initial && initial.output_formats ? (Array.isArray(initial.output_formats) ? initial.output_formats : (initial.output_formats as string).split(',').map(s => s.trim()).filter(Boolean)) : ['html','pdf']);
  }, [initial, reset]);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/v1/reports/templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiClient.put(`/api/v1/reports/templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      onClose();
    },
  });

  const onSubmit = (data: TemplateInput) => {
    const payload = {
      name: data.name,
      description: data.description,
      parameters: params,
      output_formats: formats,
    };

    if (initial && initial.id) {
      updateMutation.mutate({ id: initial.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    {initial ? t('editTemplate') : t('newTemplate')}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('name')}</label>
                    <input {...register('name', { required: true })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('description')}</label>
                    <textarea {...register('description')} rows={3} className="w-full px-3 py-2 border rounded-lg" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('parameters')}</label>
                    <p className="text-xs text-gray-500 mb-2">{t('parametersHelp')} <span className="font-mono">start_date</span>, <span className="font-mono">end_date</span></p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {params.map((p) => (
                        <span key={p} className="inline-flex items-center gap-2 bg-gray-100 px-2 py-1 rounded">{p}
                          <button type="button" onClick={() => setParams(prev => prev.filter(x => x !== p))} className="text-xs text-gray-500 ml-2">×</button>
                        </span>
                      ))}
                    </div>
                    <input
                      ref={paramInputRef}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const v = (e.currentTarget as HTMLInputElement).value.trim();
                          if (v) {
                            setParams(prev => Array.from(new Set([...prev, v])));
                            (e.currentTarget as HTMLInputElement).value = '';
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder={t('paramPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('outputFormats')}</label>
                    <p className="text-xs text-gray-500 mb-2">{t('outputFormatsHelp')}</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formats.map((f) => (
                        <span key={f} className="inline-flex items-center gap-2 bg-gray-100 px-2 py-1 rounded">{f}
                          <button type="button" onClick={() => setFormats(prev => prev.filter(x => x !== f))} className="text-xs text-gray-500 ml-2">×</button>
                        </span>
                      ))}
                    </div>
                    <input
                      ref={formatInputRef}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const v = (e.currentTarget as HTMLInputElement).value.trim().toLowerCase();
                          if (v) {
                            setFormats(prev => Array.from(new Set([...prev, v])));
                            (e.currentTarget as HTMLInputElement).value = '';
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder={t('outputFormatsPlaceholder')}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-white border rounded-lg">{tCommon('cancel')}</button>
                    <button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                      {isSubmitting || createMutation.isPending || updateMutation.isPending ? tCommon('saving') : (initial ? t('saveChanges') : t('createTemplate'))}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
