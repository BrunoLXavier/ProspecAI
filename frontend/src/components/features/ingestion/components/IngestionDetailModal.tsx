/**
 * IngestionDetailModal Component
 * Modal for viewing and editing ingestion job details
 * Implements RF-01: Ingestão de dados multiorigem
 */
'use client';

import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ServerIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';
import BaseModal from '@/components/features/shared/ui/BaseModal';

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

interface IngestionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: IngestionJob | null;
  onDelete?: (id: string) => void;
}

const STATUS_CONFIG: Record<string, { color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  pending: { color: 'gray', Icon: DocumentTextIcon },
  validating: { color: 'blue', Icon: ArrowPathIcon },
  processing: { color: 'blue', Icon: ArrowPathIcon },
  pii_detection: { color: 'yellow', Icon: ShieldExclamationIcon },
  completed: { color: 'green', Icon: CheckCircleIcon },
  failed: { color: 'red', Icon: XCircleIcon },
  cancelled: { color: 'gray', Icon: XCircleIcon },
};

const SOURCE_TYPE_OPTIONS = [
  { value: 'csv' },
  { value: 'xlsx' },
  { value: 'json' },
  { value: 'xml' },
  { value: 'file' },
];

const SOURCE_TYPE_LABELS: Record<string, string> = {
  csv: 'csv',
  xlsx: 'xlsx',
  json: 'json',
  xml: 'xml',
  file: 'file',
};

export default function IngestionDetailModal({ 
  isOpen, 
  onClose, 
  job, 
  onDelete 
}: IngestionDetailModalProps) {
  const t = useTranslations('ingestion');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  // Reset form when job changes
  useEffect(() => {
    if (job) {
      reset({
        name: job.name || '',
        description: job.description || '',
        source_type: job.source_type || 'csv',
      });
    }
    setIsEditing(false);
    setShowDeleteConfirm(false);
  }, [job, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => 
      apiClient.put(`/api/v1/ingestion/jobs/${job!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/ingestion/jobs/${job!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] });
      onClose();
      onDelete?.(job!.id);
    },
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  if (!job) return null;

  const statusConfig = STATUS_CONFIG[job.status] || { color: 'gray', Icon: DocumentTextIcon };
  const StatusIcon = statusConfig.Icon;
  const isInProgress = ['validating', 'processing', 'pii_detection'].includes(job.status);

  // Normalize numeric fields to avoid runtime errors when backend returns incomplete objects
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
    return new Intl.DateTimeFormat(undefined, {
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

  // Build footer based on mode
  const renderFooter = () => {
    if (isEditing) return null; // Edit mode has its own form buttons
    return (
      <div className="flex justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition flex items-center gap-2"
          >
            <TrashIcon className="w-4 h-4" />
            {tCommon('delete')}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2"
          >
            <PencilIcon className="w-4 h-4" />
            {tCommon('edit')}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            {tCommon('close')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t('titleEdit') : job.name}
      subtitle={`ID: ${job.id}`}
      icon={
        <StatusIcon className={`w-6 h-6 text-${statusConfig.color}-600 dark:text-${statusConfig.color}-400 ${isInProgress ? 'animate-spin' : ''}`} />
      }
      size="3xl"
      noContentScroll={false}
      footer={renderFooter()}
    >
                {/* Delete Confirmation */}
                {showDeleteConfirm && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-700 dark:text-red-400 mb-3">
                      {t('deleteConfirmation')}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleteMutation.isPending ? tCommon('deleting') : tCommon('confirmDelete')}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        {tCommon('cancel')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Content */}
                {isEditing ? (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('name')}
                      </label>
                      <input
                        type="text"
                        {...register('name', { required: true })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    {/* Source Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('sourceType')}
                      </label>
                      <select
                        {...register('source_type')}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      >
                        {SOURCE_TYPE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{t(`sourceTypes.${opt.value}`)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('description')}
                      </label>
                      <textarea
                        {...register('description')}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                      >
                        {tCommon('cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || updateMutation.isPending}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                      >
                        {updateMutation.isPending ? tCommon('saving') ?? tCommon('deleting') : tCommon('save')}
                      </button>
                    </div>

                    {updateMutation.error && (
                      <p className="text-sm text-red-600 text-center">
                          {t('updateError')}
                        </p>
                    )}
                  </form>
                ) : (
                  <div className="space-y-6">
                    {/* Status and Type Row */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className={`px-3 py-1 text-sm font-medium rounded-full bg-${statusConfig.color}-100 dark:bg-${statusConfig.color}-900/30 text-${statusConfig.color}-700 dark:text-${statusConfig.color}-300`}>
                        {t(`status.${job.status}`) ?? job.status}
                      </span>
                      <span className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center gap-1">
                        <ServerIcon className="w-3 h-3" />
                        {t(`sourceTypes.${job.source_type}`) ?? job.source_type}
                      </span>
                      {job.pii_detected_count > 0 && (
                        <span className="px-3 py-1 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full flex items-center gap-1">
                          <ShieldExclamationIcon className="w-3 h-3" />
                          {job.pii_detected_count} {t('piiDetected')}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {job.description && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                          {t('description')}
                        </label>
                        <p className="text-gray-700 dark:text-gray-300">
                          {job.description}
                        </p>
                      </div>
                    )}

                    {/* Progress Bar */}
                    {isInProgress && (
                      <div>
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                          <span>{job.current_step || t('processing')}</span>
                          <span className="font-medium">{Math.round(safeNumbers.progress_percentage)}%</span>
                        </div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-600 transition-all duration-500"
                            style={{ width: `${safeNumbers.progress_percentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">{t('stats.files')}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {safeNumbers.processed_files}/{safeNumbers.total_files}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">{t('stats.records')}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {safeNumbers.processed_records.toLocaleString()}/{safeNumbers.total_records.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">{t('stats.piiDetected')}</p>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          {safeNumbers.pii_detected_count}
                        </p>
                        {safeNumbers.pii_anonymized_count > 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            {safeNumbers.pii_anonymized_count} {t('piiAnonymized')}
                          </p>
                        )}
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">{t('stats.failures')}</p>
                        <p className={`text-2xl font-bold ${safeNumbers.failed_records > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                          {safeNumbers.failed_records}
                        </p>
                      </div>
                    </div>

                    {/* Error Message */}
                    {job.error_message && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-start gap-3">
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-800 dark:text-red-300">{t('error')}</p>
                            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                              {job.error_message}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                          <CalendarIcon className="w-3 h-3 inline mr-1" />
                          {t('createdAt')}
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {job.created_at ? formatDate(job.created_at) : '-'}
                        </p>
                      </div>
                      
                      {job.started_at && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                            <CalendarIcon className="w-3 h-3 inline mr-1" />
                            {t('startedAt')}
                          </label>
                          <p className="text-gray-900 dark:text-white">
                            {job.started_at ? formatDate(job.started_at) : '-'}
                          </p>
                        </div>
                      )}

                      {job.completed_at && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                            <CalendarIcon className="w-3 h-3 inline mr-1" />
                            {t('completedAt')}
                          </label>
                          <p className="text-gray-900 dark:text-white">
                            {job.completed_at ? formatDate(job.completed_at) : '-'}
                          </p>
                        </div>
                      )}

                      {job.started_at && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                            {t('duration')}
                          </label>
                          <p className="text-gray-900 dark:text-white">
                            {job.started_at ? formatDuration(job.started_at, job.completed_at) : '-'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
    </BaseModal>
  );
}
