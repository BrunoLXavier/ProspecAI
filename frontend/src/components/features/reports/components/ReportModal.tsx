/**
 * ReportModal Component
 * Consolidated Create/Edit/Delete modal for report templates
 * Implements RF-09: Relatórios Personalizáveis
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DocumentChartBarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

import { BaseModal, ModalTabs, DeleteConfirmation, type TabItem } from '@/components/features/shared/ui';
import { FormInput, FormTextarea } from '@/components/features/shared/forms';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';

interface Template {
  id?: string;
  name: string;
  description?: string;
  parameters?: string[] | string;
  output_formats?: string[] | string;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: Template | null;
  onDelete?: (id: string) => void;
}

export default function ReportModal({
  isOpen,
  onClose,
  template,
  onDelete,
}: ReportModalProps) {
  const t = useTranslations('reports');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const { user, selectedInstitutes } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditMode = !!template?.id;
  const isAdmin = (user?.roles || []).includes('admin');
  const canCreate = isAdmin || (selectedInstitutes && selectedInstitutes.length > 0);

  // State for dynamic arrays
  const [params, setParams] = useState<string[]>([]);
  const [formats, setFormats] = useState<string[]>(['html', 'pdf']);
  const paramInputRef = useRef<HTMLInputElement | null>(null);
  const formatInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string; description: string }>({
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Reset form when template changes or modal opens
  useEffect(() => {
    if (isOpen && template) {
      reset({
        name: template.name || '',
        description: template.description || '',
      });
      // Parse parameters
      const paramList = template.parameters
        ? Array.isArray(template.parameters)
          ? template.parameters
          : String(template.parameters).split(',').map(s => s.trim()).filter(Boolean)
        : [];
      setParams(paramList);
      // Parse formats
      const formatList = template.output_formats
        ? Array.isArray(template.output_formats)
          ? template.output_formats
          : String(template.output_formats).split(',').map(s => s.trim()).filter(Boolean)
        : ['html', 'pdf'];
      setFormats(formatList);
    } else if (isOpen && !template) {
      reset({ name: '', description: '' });
      setParams([]);
      setFormats(['html', 'pdf']);
    }
    setShowDeleteConfirm(false);
  }, [isOpen, template, reset]);

  const [saveError, setSaveError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => {
      const payload = {
        name: data.name,
        description: data.description,
        parameters: params,
        output_formats: formats,
      };
      if (isEditMode) {
        return apiClient.put(`/api/v1/reports/templates/${template!.id}`, payload);
      }
      return apiClient.post('/api/v1/reports/templates', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      setSaveError(null);
      reset();
      onClose();
    },
    onError: (error: any) => {
      console.error('Failed to save report template:', error);
      setSaveError(error.response?.data?.detail || 'Failed to save template');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/reports/templates/${template!.id}`),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['report-templates'] });
      onClose();
      onDelete?.(template!.id as string);
    },
    onError: (error: any) => {
      console.error('Failed to delete report template:', error);
    },
  });

  const onSubmit = (data: { name: string; description: string }) => {
    saveMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleAddParam = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !params.includes(trimmed)) {
      setParams(prev => [...prev, trimmed]);
    }
  };

  const handleAddFormat = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (trimmed && !formats.includes(trimmed)) {
      setFormats(prev => [...prev, trimmed]);
    }
  };

  // Tab 1 content: Básico
  const basicTabContent = (
    <div className="space-y-4">
      {saveError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {saveError}
        </div>
      )}
      <FormInput
        label={t('name')}
        placeholder={t('namePlaceholder') || 'Nome do template'}
        error={errors.name}
        required
        {...register('name', { required: true })}
      />

      <FormTextarea
        label={t('description')}
        placeholder={t('descriptionPlaceholder') || 'Descrição do template'}
        rows={4}
        {...register('description')}
      />
    </div>
  );

  // Tab 2 content: Parâmetros
  const parametersTabContent = (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('parametersHelp') || 'Adicione parâmetros que serão solicitados ao gerar o relatório.'} 
        <span className="font-mono text-xs ml-1">start_date, end_date</span>
      </p>

      {/* Current parameters */}
      <div className="flex flex-wrap gap-2">
        {params.map((p) => (
          <span
            key={p}
            className="inline-flex items-center gap-2 bg-gray-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg text-sm text-gray-800 dark:text-white"
          >
            <span className="font-mono">{p}</span>
            <button
              type="button"
              onClick={() => setParams(prev => prev.filter(x => x !== p))}
              className="text-gray-500 dark:text-gray-400 hover:text-red-500"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </span>
        ))}
        {params.length === 0 && (
          <span className="text-sm text-gray-400 dark:text-gray-500">
            {t('noParameters') || 'Nenhum parâmetro adicionado'}
          </span>
        )}
      </div>

      {/* Add parameter input */}
      <div className="flex gap-2">
        <input
          ref={paramInputRef}
          type="text"
          placeholder={t('addParameterPlaceholder') || 'Digite e pressione Enter'}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              const input = e.target as HTMLInputElement;
              handleAddParam(input.value);
              input.value = '';
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (paramInputRef.current) {
              handleAddParam(paramInputRef.current.value);
              paramInputRef.current.value = '';
            }
          }}
          className="px-4 py-2 bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-white rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-slate-500"
        >
          {tCommon('add') || 'Adicionar'}
        </button>
      </div>
    </div>
  );

  // Tab 3 content: Formatos de Saída
  const formatsTabContent = (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('formatsHelp') || 'Selecione os formatos de saída disponíveis para este relatório.'}
      </p>

      {/* Current formats */}
      <div className="flex flex-wrap gap-2">
        {formats.map((f) => (
          <span
            key={f}
            className="inline-flex items-center gap-2 bg-primary-100 dark:bg-primary-900/30 px-3 py-1.5 rounded-lg text-sm text-primary-700 dark:text-primary-300 font-medium"
          >
            {f.toUpperCase()}
            <button
              type="button"
              onClick={() => setFormats(prev => prev.filter(x => x !== f))}
              className="text-primary-500 dark:text-primary-400 hover:text-red-500"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </span>
        ))}
      </div>

      {/* Add format input */}
      <div className="flex gap-2">
        <input
          ref={formatInputRef}
          type="text"
          placeholder={t('addFormatPlaceholder') || 'ex: xlsx, csv, json'}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              const input = e.target as HTMLInputElement;
              handleAddFormat(input.value);
              input.value = '';
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (formatInputRef.current) {
              handleAddFormat(formatInputRef.current.value);
              formatInputRef.current.value = '';
            }
          }}
          className="px-4 py-2 bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-white rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-slate-500"
        >
          {tCommon('add') || 'Adicionar'}
        </button>
      </div>

      {/* Common formats hint */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {t('commonFormats') || 'Formatos comuns: PDF, HTML, XLSX, CSV, JSON'}
        </p>
      </div>
    </div>
  );

  // Tab configuration with content
  const tabs: TabItem[] = [
    { name: t('tabs.basic') || 'Básico', content: basicTabContent },
    { name: t('tabs.parameters') || 'Parâmetros', content: parametersTabContent },
    { name: t('tabs.formats') || 'Formatos', content: formatsTabContent },
  ];

  const renderNoPermission = () => (
    <div className="py-12 px-6 text-center">
      <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {t('noPermissionTitle') || 'Permissão necessária'}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        {t('noPermissionMessage') || 'Você deve ser administrador ou ter pelo menos um instituto selecionado para criar um template.'}
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
      >
        {tCommon('close') || 'Fechar'}
      </button>
    </div>
  );

  // Footer content - passed to BaseModal footer prop to stay fixed
  const footerContent = (
    <div className="flex items-center justify-between">
      <div>
        {isEditMode && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
          >
            {tCommon('delete')}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600"
        >
          {tCommon('cancel')}
        </button>
        <button
          type="submit"
          form="report-form"
          disabled={isSubmitting || saveMutation.isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {isSubmitting || saveMutation.isPending
            ? tCommon('saving')
            : isEditMode
            ? tCommon('save')
            : t('newTemplate')}
        </button>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? t('editTemplate') : t('newTemplate')}
      icon={<DocumentChartBarIcon className="w-6 h-6" />}
      size="3xl"
      footer={canCreate || isEditMode ? footerContent : undefined}
    >
      {!canCreate && !isEditMode ? (
        renderNoPermission()
      ) : (
        <form id="report-form" onSubmit={handleSubmit(onSubmit)}>
          {/* Delete Confirmation */}
          <DeleteConfirmation
            isVisible={showDeleteConfirm && isEditMode}
            message={t('deleteConfirmation') || 'Tem certeza que deseja excluir este template?'}
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteConfirm(false)}
            isDeleting={deleteMutation.isPending}
          />

          <ModalTabs tabs={tabs} />

          {/* Error Message */}
          {saveMutation.error && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400 text-center">
              {isEditMode ? t('updateError') : t('createError')}
            </p>
          )}
        </form>
      )}
    </BaseModal>
  );
}
