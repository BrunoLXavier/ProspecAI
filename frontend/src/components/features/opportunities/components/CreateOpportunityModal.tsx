/**
 * CreateOpportunityModal Component
 * Modal form for creating opportunities with priority scoring
 * Implements RF-05: Pipeline de Oportunidades
 * Uses BaseModal + ModalFooter pattern
 */
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BriefcaseIcon } from '@heroicons/react/24/outline';

import BaseModal, { ModalFooter } from '@/components/features/shared/ui/BaseModal';
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormDatePicker,
  FormCurrencyInput,
  FormSlider,
} from '@/components/features/shared/forms';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import {
  createOpportunitySchema,
  CreateOpportunityInput,
  pipelineStageOptions,
} from '@/utils/validations';
import apiClient from '@/lib/api-client';

interface CreateOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateOpportunityModal({ isOpen, onClose }: CreateOpportunityModalProps) {
  const t = useTranslations('opportunities');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const { user, selectedInstitutes } = useAuth();
  const isAdmin = (user?.roles || []).includes('admin');
  const canCreate = isAdmin || (selectedInstitutes && selectedInstitutes.length > 0);

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.listClients()
  });
  const { data: fundingSources = [] } = useQuery({
    queryKey: ['funding'],
    queryFn: () => apiClient.listFundingSources()
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateOpportunityInput>({
    resolver: zodResolver(createOpportunitySchema),
    defaultValues: {
      stage: 'INTELLIGENCE',
      probability: 50,
      estimated_value: 0,
      priority_factors: {
        strategic_fit: 50,
        financial_impact: 50,
        probability: 50,
        urgency: 50,
      },
    },
  });

  const priorityFactors = watch('priority_factors');

  // Calculate priority score (same formula as backend)
  const calculatePriorityScore = () => {
    if (!priorityFactors) return 0;
    return Math.round(
      (priorityFactors.strategic_fit * 0.3) +
      (priorityFactors.financial_impact * 0.25) +
      (priorityFactors.probability * 0.25) +
      (priorityFactors.urgency * 0.2)
    );
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateOpportunityInput) => apiClient.createOpportunity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      reset();
      onClose();
    },
  });

  const onSubmit = (data: CreateOpportunityInput) => {
    createMutation.mutate(data);
  };

  const priorityScore = calculatePriorityScore();

  const renderFooter = () => {
    if (!canCreate) {
      return (
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            {tCommon('close') || 'Close'}
          </button>
        </div>
      );
    }
    return (
      <ModalFooter
        onCancel={onClose}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={isSubmitting}
        submitLabel={t('newOpportunity')}
      />
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('newOpportunity')}
      icon={<BriefcaseIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
      size="3xl"
      footer={renderFooter()}
    >
      {canCreate ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <FormInput
            label={t('title')}
            placeholder={t('titlePlaceholder')}
            error={errors.title}
            required
            {...register('title')}
          />

          <FormTextarea
            label={t('description')}
            placeholder={t('descriptionPlaceholder')}
            rows={3}
            error={errors.description}
            required
            {...register('description')}
          />

          {/* Client and Funding */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              label={t('client')}
              options={(Array.isArray(clients) ? clients : []).map((c: any) => ({ value: c.id, label: c.name }))}
              placeholder={t('clientPlaceholder')}
              error={errors.client_id}
              required
              {...register('client_id')}
            />

            <FormSelect
              label={t('fundingSource')}
              options={(Array.isArray(fundingSources) ? fundingSources : []).map((f: any) => ({ value: f.id, label: f.source_name }))}
              placeholder={t('fundingSourcePlaceholder')}
              {...register('funding_source_id')}
            />
          </div>

          {/* Stage and Value */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormSelect
              label={t('stage')}
              options={pipelineStageOptions}
              error={errors.stage}
              required
              {...register('stage')}
            />

            <Controller
              name="estimated_value"
              control={control}
              render={({ field }) => (
                <FormCurrencyInput
                  label={t('estimatedValue')}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.estimated_value}
                  required
                />
              )}
            />

            <FormDatePicker
              label={t('expectedCloseDate')}
              {...register('expected_close_date')}
            />
          </div>

          {/* Priority Factors - RF-05 Transparent Scoring */}
          <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border dark:border-gray-600">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-900 dark:text-white">{t('priorityFactors')}</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('calculatedScoreLabel')}</span>
                <span className={`text-lg font-bold ${
                  priorityScore >= 70 ? 'text-green-600' :
                  priorityScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {priorityScore}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="priority_factors.strategic_fit"
                control={control}
                render={({ field }) => (
                  <FormSlider
                    label={t('strategicFitLabel')}
                    value={field.value}
                    onChange={field.onChange}
                    helperText={t('strategicFitHelper')}
                  />
                )}
              />

              <Controller
                name="priority_factors.financial_impact"
                control={control}
                render={({ field }) => (
                  <FormSlider
                    label={t('financialImpactLabel')}
                    value={field.value}
                    onChange={field.onChange}
                    helperText={t('financialImpactHelper')}
                  />
                )}
              />

              <Controller
                name="priority_factors.probability"
                control={control}
                render={({ field }) => (
                  <FormSlider
                    label={t('probabilityLabel')}
                    value={field.value}
                    onChange={field.onChange}
                    helperText={t('probabilityHelper')}
                  />
                )}
              />

              <Controller
                name="priority_factors.urgency"
                control={control}
                render={({ field }) => (
                  <FormSlider
                    label={t('urgencyLabel')}
                    value={field.value}
                    onChange={field.onChange}
                    helperText={t('urgencyHelper')}
                  />
                )}
              />
            </div>
          </div>
        </form>
      ) : (
        <div className="py-12 px-6 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('noPermissionTitle') || 'Permission required'}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{t('noPermissionMessage') || 'You must be an administrator or have at least one selected institute to create an opportunity. Select your institute in the header or contact an administrator.'}</p>
        </div>
      )}
    </BaseModal>
  );
}
