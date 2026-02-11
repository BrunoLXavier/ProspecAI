/**
 * CreateProposalModal Component
 * Modal form for creating proposals linked to opportunities
 * Implements RF-08: Repositório de Propostas
 */
'use client';

import { DocumentPlusIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import BaseModal, { ModalFooter } from '@/components/features/shared/ui/BaseModal';
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from '@/components/features/shared/forms';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import {
  createProposalSchema,
  CreateProposalInput,
} from '@/utils/validations';
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
  const { user, selectedInstitutes } = useAuth();
  const isAdmin = (user?.roles || []).includes('admin');
  const canCreate = isAdmin || (selectedInstitutes && selectedInstitutes.length > 0);

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

  const renderFooter = () => {
    if (!canCreate) {
      return (
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            {tCommon('close')}
          </button>
        </div>
      );
    }
    return (
      <ModalFooter
        onCancel={onClose}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={isSubmitting}
        submitLabel={t('newProposal')}
      />
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('newProposal')}
      icon={<DocumentPlusIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
      size="2xl"
      footer={renderFooter()}
    >
      {canCreate ? (
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
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              💡 <strong>{t('tip')}</strong> {t('postCreateTip')}
            </p>
          </div>

          {createMutation.error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {t('createError')}
            </p>
          )}
        </form>
      ) : (
        <div className="py-12 px-6 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('noPermissionTitle')}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{t('noPermissionMessage')}</p>
        </div>
      )}
    </BaseModal>
  );
}
