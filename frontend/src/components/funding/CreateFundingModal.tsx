/**
 * CreateFundingModal Component
 * Modal form for creating new funding sources
 * Implements RF-02: Gestão de Fomentos
 */
'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormDatePicker,
  FormCurrencyInput,
  FormTagInput,
} from '@/components/forms';
import { useTranslations } from 'next-intl';
import {
  createFundingSchema,
  CreateFundingInput,
  categoryOptions,
  statusOptions,
  trlOptions,
} from '@/lib/validations';
import apiClient from '@/lib/api-client';

interface CreateFundingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateFundingModal({ isOpen, onClose }: CreateFundingModalProps) {
  const t = useTranslations('funding');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-semibold text-gray-900">
                    {t('newFunding')}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

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
                      {isSubmitting ? tCommon('saving') : t('newFunding')}
                    </button>
                  </div>

                  {createMutation.error && (
                    <p className="text-sm text-red-600 text-center">
                      Erro ao criar fomento. Tente novamente.
                    </p>
                  )}
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
