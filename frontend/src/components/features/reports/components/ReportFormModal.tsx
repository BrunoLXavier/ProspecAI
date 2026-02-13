/**
 * ReportFormModal
 * Modal for creating or editing report templates
 */
'use client';

import { useEffect, useState, useRef } from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import BaseModal, { ModalFooter } from '@/components/features/shared/ui/BaseModal';
import {
  FormInput,
  FormTextarea,
} from '@/components/features/shared/forms';

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
  const { user, selectedInstitutes } = useAuth();
  const isAdmin = (user?.roles || []).includes('admin');
  const canCreate = isAdmin || (selectedInstitutes && selectedInstitutes.length > 0);

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

  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/v1/reports/templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      setFormError(null);
      onClose();
    },
    onError: (error: any) => {
      console.error('Failed to create report template:', error);
      setFormError(error.response?.data?.detail || 'Failed to create template');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiClient.put(`/api/v1/reports/templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      setFormError(null);
      onClose();
    },
    onError: (error: any) => {
      console.error('Failed to update report template:', error);
      setFormError(error.response?.data?.detail || 'Failed to update template');
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

  const renderFooter = () => {
    if (!canCreate) {
      return (
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            {tCommon('close')}
          </button>
        </div>
      );
    }
    return (
      <ModalFooter
        onCancel={onClose}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={isSubmitting || createMutation.isPending || updateMutation.isPending}
        submitLabel={initial ? t('saveChanges') : t('createTemplate')}
      />
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={initial ? t('editTemplate') : t('newTemplate')}
      icon={<DocumentTextIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
      size="3xl"
      footer={renderFooter()}
    >
      {canCreate ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {formError}
            </div>
          )}
          <FormInput
            label={t('name')}
            required
            {...register('name', { required: true })}
          />

          <FormTextarea
            label={t('description')}
            rows={3}
            {...register('description')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{t('parameters')}</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('parametersHelp')} <span className="font-mono">start_date</span>, <span className="font-mono">end_date</span></p>
            <div className="flex flex-wrap gap-2 mb-2">
              {params.map((p) => (
                <span key={p} className="inline-flex items-center gap-2 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-gray-800 dark:text-white">{p}
                  <button type="button" onClick={() => setParams(prev => prev.filter(x => x !== p))} className="text-xs text-gray-500 dark:text-gray-300 ml-2">×</button>
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
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-primary-500"
              placeholder={t('paramPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{t('outputFormats')}</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('outputFormatsHelp')}</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {formats.map((f) => (
                <span key={f} className="inline-flex items-center gap-2 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-gray-800 dark:text-white">{f}
                  <button type="button" onClick={() => setFormats(prev => prev.filter(x => x !== f))} className="text-xs text-gray-500 dark:text-gray-300 ml-2">×</button>
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
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-primary-500"
              placeholder={t('outputFormatsPlaceholder')}
            />
          </div>
        </form>
      ) : (
        <div className="py-12 px-6 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('noPermissionTitle')}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">{t('noPermissionMessage')}</p>
        </div>
      )}
    </BaseModal>
  );
}
