/**
 * CreateFundingModal Component
 * Modal form for creating new funding sources
 * Migrated to use BaseModal + ModalFooter for consistent design system
 * Implements RF-02: Gestão de Fomentos
 */
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BanknotesIcon } from '@heroicons/react/24/outline';

import BaseModal, { ModalFooter } from '@/components/features/shared/ui/BaseModal';
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormDatePicker,
  FormCurrencyInput,
  FormTagInput,
} from '@/components/features/shared/forms';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import {
  createFundingSchema,
  CreateFundingInput,
  categoryOptions,
  statusOptions,
  trlOptions,
} from '@/utils/validations';
import apiClient from '@/lib/api-client';

interface CreateFundingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateFundingModal({ isOpen, onClose }: CreateFundingModalProps) {
  const t = useTranslations('funding');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const { user, selectedInstitutes } = useAuth();
  const isAdmin = (user?.roles || []).includes('admin');
  const canCreate = isAdmin || (selectedInstitutes && selectedInstitutes.length > 0);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFundingInput>({
    resolver: zodResolver(createFundingSchema),
    defaultValues: {
      status: 'DRAFT',
      category: 'NATIONAL',
      trl_min: 1,
      trl_max: 9,
      focus_areas: [],
      total_amount: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateFundingInput) => apiClient.createFundingSource(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funding'] });
      reset();
      onClose();
    },
  });

  const onSubmit = (data: CreateFundingInput) => {
    createMutation.mutate(data);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('newFunding')}
      icon={<BanknotesIcon className="w-5 h-5 text-primary-600" />}
      size="2xl"
      footer={
        canCreate ? (
          <ModalFooter
            onCancel={onClose}
            onSubmit={handleSubmit(onSubmit)}
            isSubmitting={isSubmitting}
            submitLabel={t('newFunding')}
          />
        ) : undefined
      }
    >
      {canCreate ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
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
              label={t('statusLabel')}
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

          {/* Financial */}
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

          {/* TRL Range */}
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

          {/* Focus Areas */}
          <Controller
            name="focus_areas"
            control={control}
            render={({ field }) => (
              <FormTagInput
                label={t('focusAreas')}
                value={field.value}
                onChange={field.onChange}
                error={errors.focus_areas?.root || errors.focus_areas?.message ? { message: String(errors.focus_areas.message), type: 'validate' } : undefined}
                placeholder={t('focusAreasPlaceholder')}
                required
              />
            )}
          />

          {/* Description */}
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

          {createMutation.error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {t('createError')}
            </p>
          )}
        </form>
      ) : (
        <div className="py-12 px-6 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('noPermissionTitle') || 'Permission required'}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{t('noPermissionMessage') || 'You must be an administrator or have at least one selected institute to create a funding source. Select your institute in the header or contact an administrator.'}</p>
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              {tCommon('close') || 'Close'}
            </button>
          </div>
        </div>
      )}
    </BaseModal>
  );
}
