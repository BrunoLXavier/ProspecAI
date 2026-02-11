/**
 * ViewEditFundingModal Component
 * Modal for viewing and editing funding source details
 * Migrated to use BaseModal + ModalFooter for consistent design system
 * Implements RF-02: Gestão de Fomentos
 */
'use client';

import { useState, useEffect } from 'react';
import { CurrencyDollarIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import BaseModal, { ModalFooter } from '@/components/features/shared/ui/BaseModal';
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormDatePicker,
  FormCurrencyInput,
  FormTagInput,
} from '@/components/features/shared/forms';
import {
  createFundingSchema,
  CreateFundingInput,
  categoryOptions,
  statusOptions,
  trlOptions,
} from '@/utils/validations';
import apiClient from '@/lib/api-client';
import ConfidenceBadge from '@/components/features/shared/ui/ConfidenceBadge';

interface FundingSource {
  id: string;
  name?: string;
  source_name?: string;
  instrumentType?: string;
  instrument_type?: string;
  category?: string;
  status: string;
  totalAmount?: number;
  total_amount?: number;
  trlMin?: number;
  trl_min?: number;
  trlMax?: number;
  trl_max?: number;
  submissionEnd?: string;
  deadline?: string;
  aiConfidenceScore?: number;
  ai_confidence_score?: number;
  description?: string;
  url?: string;
  focus_areas?: string[];
}

interface ViewEditFundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  funding: FundingSource | null;
  onDelete?: (id: string) => void;
}

export default function ViewEditFundingModal({ 
  isOpen, 
  onClose, 
  funding,
  onDelete 
}: ViewEditFundingModalProps) {
  const t = useTranslations('funding');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFundingInput>({
    resolver: zodResolver(createFundingSchema),
  });

  // Reset form when funding changes
  useEffect(() => {
    if (funding) {
      reset({
        source_name: funding.source_name || funding.name || '',
        category: (funding.category || 'NATIONAL') as any,
        status: (funding.status || 'DRAFT') as any,
        deadline: funding.deadline || funding.submissionEnd || '',
        total_amount: funding.total_amount || funding.totalAmount || 0,
        trl_min: funding.trl_min || funding.trlMin || 1,
        trl_max: funding.trl_max || funding.trlMax || 9,
        description: funding.description || '',
        url: funding.url || '',
        focus_areas: funding.focus_areas || [],
      });
    }
    setIsEditing(false);
    setShowDeleteConfirm(false);
  }, [funding, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: CreateFundingInput) => 
      apiClient.updateFundingSource(funding!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funding'] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.deleteFundingSource(funding!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funding'] });
      onClose();
      onDelete?.(funding!.id);
    },
  });

  const onSubmit = (data: CreateFundingInput) => {
    updateMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      suspended: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      OPEN: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      CLOSED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (!funding) return null;

  const displayName = funding.source_name || funding.name || t('sourceName');
  const displayAmount = funding.total_amount || funding.totalAmount || 0;
  const displayDeadline = funding.deadline || funding.submissionEnd;
  const displayConfidence = funding.ai_confidence_score || funding.aiConfidenceScore;

  const renderFooter = () => {
    if (isEditing) {
      return (
        <ModalFooter
          onCancel={() => setIsEditing(false)}
          onSubmit={handleSubmit(onSubmit)}
          isSubmitting={isSubmitting || updateMutation.isPending}
        />
      );
    }

    return (
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition flex items-center gap-2"
        >
          <TrashIcon className="w-4 h-4" />
          {tCommon('delete')}
        </button>
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
      title={isEditing ? t('editFunding') : displayName}
      subtitle={`ID: ${funding.id}`}
      icon={<CurrencyDollarIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
      size="2xl"
      footer={renderFooter()}
    >
      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
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

      {/* Status Badges */}
      {!isEditing && (
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(funding.status)}`}>
            {funding.status}
          </span>
          {displayConfidence && <ConfidenceBadge score={displayConfidence} />}
        </div>
      )}

      {/* Content */}
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label={t('sourceName')}
              placeholder={t('sourcePlaceholder')}
              error={errors.source_name}
              required
              {...register('source_name')}
            />

            <FormSelect
              label={t('category')}
              options={categoryOptions}
              error={errors.category}
              required
              {...register('category')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              label={t('status')}
              options={statusOptions}
              error={errors.status}
              {...register('status')}
            />

            <FormDatePicker
              label={t('deadline')}
              error={errors.deadline}
              required
              {...register('deadline')}
            />
          </div>

          <Controller
            name="total_amount"
            control={control}
            render={({ field }) => (
              <FormCurrencyInput
                label={t('totalAmount')}
                value={field.value}
                onChange={field.onChange}
                error={errors.total_amount}
                required
              />
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label={t('trlMin')}
              options={trlOptions}
              error={errors.trl_min}
              required
              {...register('trl_min', { valueAsNumber: true })}
            />

            <FormSelect
              label={t('trlMax')}
              options={trlOptions}
              error={errors.trl_max}
              required
              {...register('trl_max', { valueAsNumber: true })}
            />
          </div>

          <Controller
            name="focus_areas"
            control={control}
            render={({ field }) => (
              <FormTagInput
                label={t('focusAreas')}
                value={field.value}
                onChange={field.onChange}
                placeholder={t('focusAreasPlaceholder')}
              />
            )}
          />

          <FormTextarea
            label={t('description')}
            placeholder={t('descriptionPlaceholder')}
            rows={3}
            {...register('description')}
          />

          <FormInput
            label={t('url')}
            type="url"
            placeholder="https://..."
            error={errors.url}
            {...register('url')}
          />

          {updateMutation.error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {t('updateError')}
            </p>
          )}
        </form>
      ) : (
        <div className="space-y-6">
          {/* View Mode */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">{t('type')}</label>
              <p className="font-medium text-gray-900 dark:text-white">
                {funding.instrument_type || funding.instrumentType || funding.category || '-'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">{t('amount')}</label>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: 'BRL',
                }).format(displayAmount)}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">{t('trl')}</label>
              <p className="font-medium text-gray-900 dark:text-white">
                {funding.trl_min || funding.trlMin || 1} - {funding.trl_max || funding.trlMax || 9}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">{t('deadline')}</label>
              <p className="font-medium text-gray-900 dark:text-white">
                {displayDeadline 
                  ? new Date(displayDeadline).toLocaleDateString()
                  : '-'}
              </p>
            </div>
          </div>

          {funding.focus_areas && funding.focus_areas.length > 0 && (
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">{t('focusAreas')}</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {funding.focus_areas.map((area, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {funding.description && (
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">{t('description')}</label>
              <p className="text-gray-700 dark:text-gray-300 mt-1">{funding.description}</p>
            </div>
          )}

          {funding.url && (
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">{t('url')}</label>
              <a
                href={funding.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 dark:text-primary-400 hover:underline block mt-1"
              >
                {funding.url}
              </a>
            </div>
          )}
        </div>
      )}
    </BaseModal>
  );
}
