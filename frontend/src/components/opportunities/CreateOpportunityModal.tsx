/**
 * CreateOpportunityModal Component
 * Modal form for creating opportunities with priority scoring
 * Implements RF-05: Pipeline de Oportunidades
 */
'use client';

import { Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormDatePicker,
  FormCurrencyInput,
  FormSlider,
} from '@/components/forms';
import { useTranslations } from 'next-intl';
import {
  createOpportunitySchema,
  CreateOpportunityInput,
  pipelineStageOptions,
} from '@/lib/validations';
import apiClient from '@/lib/api-client';

interface CreateOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateOpportunityModal({ isOpen, onClose }: CreateOpportunityModalProps) {
  const t = useTranslations('opportunities');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

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
          <div className="fixed inset-0 bg-black bg-opacity-25" />
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
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-semibold text-gray-900">
                    {t('newOpportunity')}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

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
                      options={clients.map((c: any) => ({ value: c.id, label: c.name }))}
                      placeholder={t('clientPlaceholder')}
                      error={errors.client_id}
                      required
                      {...register('client_id')}
                    />

                    <FormSelect
                      label={t('fundingSource')}
                      options={fundingSources.map((f: any) => ({ value: f.id, label: f.source_name }))}
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
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium text-gray-900">{t('priorityFactors')}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{t('calculatedScoreLabel')}</span>
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

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                      <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      {tCommon('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSubmitting ? tCommon('saving') : t('newOpportunity')}
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
