/**
 * CreateProposalModal Component
 * Modal form for creating proposals linked to opportunities
 * Implements RF-08: Repositório de Propostas
 */
'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  FormInput,
  FormSelect,
  FormTextarea,
} from '@/components/forms';
import { useTranslations } from 'next-intl';
import {
  createProposalSchema,
  CreateProposalInput,
} from '@/lib/validations';
import apiClient from '@/lib/api-client';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunityId?: string;
}

export default function CreateProposalModal({ 
  isOpen, 
  onClose, 
  opportunityId 
}: CreateProposalModalProps) {
  const t = useTranslations('proposals');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  // Fetch opportunities and funding sources for dropdowns
  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => apiClient.listOpportunities()
  });
  const { data: fundingSources = [] } = useQuery({
    queryKey: ['funding'],
    queryFn: () => apiClient.listFundingSources()
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProposalInput>({
    resolver: zodResolver(createProposalSchema),
    defaultValues: {
      status: 'DRAFT',
      opportunity_id: opportunityId || '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateProposalInput) => apiClient.createProposal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      reset();
      onClose();
    },
  });

  const onSubmit = (data: CreateProposalInput) => {
    createMutation.mutate(data);
  };

  const statusOptions = [
    { value: 'DRAFT', label: t('status.draft') },
    { value: 'IN_REVIEW', label: t('status.in_review') },
  ];

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
                    {t('newProposal')}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Title */}
                  <FormInput
                    label={t('titleLabel')}
                    placeholder={t('titlePlaceholder')}
                    error={errors.title}
                    required
                    {...register('title')}
                  />

                  {/* Opportunity and Funding */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormSelect
                      label={t('opportunity')}
                      options={(Array.isArray(opportunities) ? opportunities : []).map((o: any) => ({ value: o.id, label: o.title }))}
                      placeholder={t('opportunityPlaceholder')}
                      error={errors.opportunity_id}
                      required
                      {...register('opportunity_id')}
                    />

                    <FormSelect
                      label={t('fundingSource')}
                      options={(Array.isArray(fundingSources) ? fundingSources : []).map((f: any) => ({ value: f.id, label: f.source_name }))}
                      placeholder={t('fundingSourcePlaceholder')}
                      {...register('funding_source_id')}
                    />
                  </div>

                  {/* Status */}
                  <FormSelect
                    label={t('statusLabel')}
                    options={statusOptions}
                    error={errors.status}
                    {...register('status')}
                  />

                  {/* Content */}
                  <FormTextarea
                    label={t('contentLabel')}
                    placeholder={t('contentPlaceholder')}
                    rows={10}
                    error={errors.content}
                    required
                    {...register('content')}
                  />

                  {/* Info about collaboration */}
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      💡 <strong>{t('tip')}</strong> {t('postCreateTip')}
                    </p>
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
                      {isSubmitting ? tCommon('saving') : t('newProposal')}
                    </button>
                  </div>

                  {createMutation.error && (
                    <p className="text-sm text-red-600 text-center">
                      {t('createError')}
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
