/**
 * ViewEditFundingModal Component
 * Modal for viewing and editing funding source details
 * Implements RF-02: Gestão de Fomentos
 */
'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PencilIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormDatePicker,
  FormCurrencyInput,
  FormTagInput,
} from '@/components/forms';
import {
  createFundingSchema,
  CreateFundingInput,
  categoryOptions,
  statusOptions,
  trlOptions,
} from '@/utils/validations';
import apiClient from '@/lib/api-client';
import ConfidenceBadge from '@/components/common/ConfidenceBadge';

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
          <div className="fixed inset-0 bg-black bg-opacity-25 dark:bg-opacity-50" />
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-xl transition-all">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-primary-600 dark:text-primary-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                          {isEditing ? t('editFunding') : displayName}
                        </Dialog.Title>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {funding.id}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {showDeleteConfirm && (
                  <div className="mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
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
                  <div className="px-6 pt-6 flex items-center gap-3 flex-wrap">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(funding.status)}`}>
                      {funding.status}
                    </span>
                    {displayConfidence && <ConfidenceBadge score={displayConfidence} />}
                  </div>
                )}

                {/* Content */}
                {isEditing ? (
                  <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
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
                        {updateMutation.isPending ? tCommon('saving') : tCommon('save')}
                      </button>
                    </div>

                    {updateMutation.error && (
                      <p className="text-sm text-red-600 text-center">
                        {t('updateError')}
                      </p>
                    )}
                  </form>
                ) : (
                  <div className="p-6 space-y-6">
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

                {/* Footer */}
                {!isEditing && (
                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                    <div className="flex gap-2">
                      <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition flex items-center gap-2"
                        >
                          <TrashIcon className="w-4 h-4" />
                          {tCommon('delete') || 'Delete'}
                        </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2"
                      >
                        <PencilIcon className="w-4 h-4" />
                        {tCommon('edit') || 'Edit'}
                      </button>
                      <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                      >
                        {tCommon('close') || 'Close'}
                      </button>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
