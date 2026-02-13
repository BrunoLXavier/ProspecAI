/**
 * IngestionModal Component
 * Consolidated modal for viewing/editing ingestion job details
 * Implements RF-01: Ingestão de dados multiorigem
 */
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ShieldExclamationIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

import { BaseModal, ModalTabs, DeleteConfirmation, type TabItem } from '@/components/features/shared/ui';
import { FormInput, FormSelect, FormTextarea } from '@/components/features/shared/forms';
import apiClient from '@/lib/api-client';

interface IngestionJob {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'validating' | 'processing' | 'pii_detection' | 'completed' | 'failed' | 'cancelled';
  source_type: string;
  total_files: number;
  processed_files: number;
  total_records: number;
  processed_records: number;
  failed_records: number;
  pii_detected_count: number;
  pii_anonymized_count: number;
  progress_percentage: number;
  current_step?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

interface IngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: IngestionJob | null;
  onDelete?: (id: string) => void;
}

const STATUS_CONFIG: Record<string, { color: string; bgClass: string; textClass: string }> = {
  pending: { color: 'gray', bgClass: 'bg-gray-100 dark:bg-gray-700', textClass: 'text-gray-700 dark:text-gray-300' },
  validating: { color: 'blue', bgClass: 'bg-blue-100 dark:bg-blue-900/30', textClass: 'text-blue-700 dark:text-blue-300' },
  processing: { color: 'blue', bgClass: 'bg-blue-100 dark:bg-blue-900/30', textClass: 'text-blue-700 dark:text-blue-300' },
  pii_detection: { color: 'yellow', bgClass: 'bg-yellow-100 dark:bg-yellow-900/30', textClass: 'text-yellow-700 dark:text-yellow-300' },
  completed: { color: 'green', bgClass: 'bg-green-100 dark:bg-green-900/30', textClass: 'text-green-700 dark:text-green-300' },
  failed: { color: 'red', bgClass: 'bg-red-100 dark:bg-red-900/30', textClass: 'text-red-700 dark:text-red-300' },
  cancelled: { color: 'gray', bgClass: 'bg-gray-100 dark:bg-gray-700', textClass: 'text-gray-700 dark:text-gray-300' },
};

const SOURCE_TYPE_OPTIONS = [
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'XLSX' },
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'file', label: 'File' },
];

export default function IngestionModal({
  isOpen,
  onClose,
  job,
  onDelete,
}: IngestionModalProps) {
  const t = useTranslations('ingestion');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string; description: string; source_type: string }>();

  // Reset form when job changes
  useEffect(() => {
    if (isOpen && job) {
      reset({
        name: job.name || '',
        description: job.description || '',
        source_type: job.source_type || 'csv',
      });
    }
    setShowDeleteConfirm(false);
  }, [isOpen, job, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: { name: string; description: string; source_type: string }) =>
      apiClient.put(`/api/v1/ingestion/jobs/${job!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] });
      onClose();
    },
    onError: (error: any) => {
      console.error('Failed to update ingestion job:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/ingestion/jobs/${job!.id}`),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['ingestion-jobs'] });
      onClose();
      onDelete?.(job!.id);
    },
    onError: (error: any) => {
      console.error('Failed to delete ingestion job:', error);
    },
  });

  const onSubmit = (data: { name: string; description: string; source_type: string }) => {
    saveMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  if (!job) return null;

  const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
  const isInProgress = ['validating', 'processing', 'pii_detection'].includes(job.status);

  // Normalize numeric fields
  const safeNumbers = {
    total_files: job.total_files ?? 0,
    processed_files: job.processed_files ?? 0,
    total_records: job.total_records ?? 0,
    processed_records: job.processed_records ?? 0,
    failed_records: job.failed_records ?? 0,
    pii_detected_count: job.pii_detected_count ?? 0,
    pii_anonymized_count: job.pii_anonymized_count ?? 0,
    progress_percentage: job.progress_percentage ?? 0,
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateStr));
  };

  const formatDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);

    if (diffMins >= 60) {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    }
    return `${diffMins}m ${diffSecs}s`;
  };

  // Get status icon
  const getStatusIcon = () => {
    if (isInProgress) return <ArrowPathIcon className="w-5 h-5 animate-spin" />;
    if (job.status === 'completed') return <CheckCircleIcon className="w-5 h-5" />;
    if (job.status === 'failed' || job.status === 'cancelled') return <XCircleIcon className="w-5 h-5" />;
    return <DocumentTextIcon className="w-5 h-5" />;
  };

  // Tab 1 content: Detalhes
  const detailsTabContent = (
    <div className="space-y-4">
      {/* Status and Type */}
      <div className="flex flex-wrap gap-2">
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusConfig.bgClass} ${statusConfig.textClass}`}>
          {t(`status.${job.status}`) ?? job.status}
        </span>
        <span className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center gap-1">
          <ServerIcon className="w-3 h-3" />
          {job.source_type.toUpperCase()}
        </span>
        {safeNumbers.pii_detected_count > 0 && (
          <span className="px-3 py-1 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full flex items-center gap-1">
            <ShieldExclamationIcon className="w-3 h-3" />
            {safeNumbers.pii_detected_count} PII
          </span>
        )}
      </div>

      {/* Description */}
      {job.description && (
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase block mb-1">
            {t('description')}
          </span>
          <p className="text-gray-700 dark:text-gray-300">{job.description}</p>
        </div>
      )}

      {/* Timestamps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase block mb-1">
            {t('createdAt') || 'Criado em'}
          </span>
          <span className="text-gray-900 dark:text-white">{formatDate(job.created_at)}</span>
        </div>
        {job.started_at && (
          <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase block mb-1">
              {t('duration') || 'Duração'}
            </span>
            <span className="text-gray-900 dark:text-white">
              {formatDuration(job.started_at, job.completed_at)}
            </span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {job.error_message && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <span className="text-xs font-medium text-red-500 uppercase block mb-1">
            {t('errorMessage') || 'Erro'}
          </span>
          <p className="text-red-700 dark:text-red-300">{job.error_message}</p>
        </div>
      )}
    </div>
  );

  // Tab 2 content: Progresso
  const progressTabContent = (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">{t('progress') || 'Progresso'}</span>
          <span className="font-medium text-gray-900 dark:text-white">{safeNumbers.progress_percentage}%</span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              job.status === 'completed'
                ? 'bg-green-500'
                : job.status === 'failed'
                ? 'bg-red-500'
                : 'bg-primary-500'
            }`}
            style={{ width: `${safeNumbers.progress_percentage}%` }}
          />
        </div>
      </div>

      {/* Current Step */}
      {job.current_step && isInProgress && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {t('currentStep') || 'Etapa atual'}: {job.current_step}
          </span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {safeNumbers.processed_files}/{safeNumbers.total_files}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('files') || 'Arquivos'}
          </span>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {safeNumbers.processed_records}/{safeNumbers.total_records}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('records') || 'Registros'}
          </span>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-center">
          <span className="text-2xl font-bold text-red-600 dark:text-red-400">
            {safeNumbers.failed_records}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('failedRecords') || 'Falhas'}
          </span>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-center">
          <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {safeNumbers.pii_anonymized_count}/{safeNumbers.pii_detected_count}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('piiAnonymized') || 'PII Anonimizados'}
          </span>
        </div>
      </div>
    </div>
  );

  // Tab 3 content: Editar
  const editTabContent = (
    <form id="ingestion-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormInput
        label={t('name')}
        placeholder={t('namePlaceholder') || 'Nome do job'}
        error={errors.name}
        required
        {...register('name', { required: true })}
      />

      <FormSelect
        label={t('sourceType')}
        options={SOURCE_TYPE_OPTIONS}
        error={errors.source_type}
        {...register('source_type')}
      />

      <FormTextarea
        label={t('description')}
        placeholder={t('descriptionPlaceholder') || 'Descrição do job'}
        rows={4}
        {...register('description')}
      />
    </form>
  );

  // Tab configuration with content
  const tabs: TabItem[] = [
    { name: t('tabs.details') || 'Detalhes', content: detailsTabContent },
    { name: t('tabs.progress') || 'Progresso', content: progressTabContent },
    { name: t('tabs.edit') || 'Editar', content: editTabContent },
  ];

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
          {tCommon('close')}
        </button>
        <button
          type="submit"
          form="ingestion-form"
          disabled={isSubmitting || saveMutation.isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {isSubmitting || saveMutation.isPending ? tCommon('saving') : tCommon('save')}
        </button>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={job.name}
      icon={getStatusIcon()}
      size="3xl"
      footer={footerContent}
    >
      {/* Delete Confirmation */}
      <DeleteConfirmation
        isVisible={showDeleteConfirm}
        message={t('deleteConfirmation') || 'Tem certeza que deseja excluir este job de ingestão?'}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isDeleting={deleteMutation.isPending}
      />

      <ModalTabs tabs={tabs} />

      {/* Error Message */}
      {saveMutation.error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400 text-center">
          {t('updateError') || 'Erro ao atualizar'}
        </p>
      )}
    </BaseModal>
  );
}
