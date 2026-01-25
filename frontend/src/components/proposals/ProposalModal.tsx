/**
 * ProposalModal Component
 * Consolidated Create/Edit/Delete modal for proposals
 * Implements RF-08: Repositório de Propostas
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DocumentTextIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

import { BaseModal, ModalTabs, DeleteConfirmation, type TabItem } from '@/components/ui';
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormCurrencyInput,
} from '@/components/forms';
import { useAuth } from '@/contexts/AuthContext';
import {
  createProposalSchema,
  CreateProposalInput,
} from '@/lib/validations';
import apiClient from '@/lib/api-client';
import ConfidenceBadge from '@/components/common/ConfidenceBadge';
import VersionHistoryPanel from './VersionHistoryPanel';

interface Proposal {
  id: string;
  title: string;
  opportunity_id?: string;
  opportunity_name?: string;
  funding_source_id?: string;
  funding_source?: string;
  status: string;
  version?: number;
  current_version?: number;
  content?: string;
  total_value?: number;
  ai_confidence?: number;
  adherence_score?: number;
  author?: string;
  created_at?: string;
  updated_at?: string;
}

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal?: Proposal | null;
  opportunityId?: string;
  onDelete?: (id: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', labelKey: 'status.draft' },
  { value: 'IN_REVIEW', labelKey: 'status.in_review' },
  { value: 'SUBMITTED', labelKey: 'status.submitted' },
  { value: 'APPROVED', labelKey: 'status.approved' },
  { value: 'REJECTED', labelKey: 'status.rejected' },
];

export default function ProposalModal({
  isOpen,
  onClose,
  proposal,
  opportunityId,
  onDelete,
}: ProposalModalProps) {
  const t = useTranslations('proposals');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const { user, selectedInstitutes } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditMode = !!proposal?.id;
  const isAdmin = (user?.roles || []).includes('admin');
  const canCreate = isAdmin || (selectedInstitutes && selectedInstitutes.length > 0);

  // Fetch opportunities and funding sources
  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => apiClient.listOpportunities(),
    enabled: isOpen,
  });

  const { data: fundingSources = [] } = useQuery({
    queryKey: ['funding'],
    queryFn: () => apiClient.listFundingSources(),
    enabled: isOpen,
  });

  const opportunityOptions = useMemo(() =>
    (Array.isArray(opportunities) ? opportunities : []).map((o: any) => ({
      value: o.id,
      label: o.title,
    })), [opportunities]);

  const fundingOptions = useMemo(() =>
    (Array.isArray(fundingSources) ? fundingSources : []).map((f: any) => ({
      value: f.id,
      label: f.source_name,
    })), [fundingSources]);

  const statusOptions = useMemo(() =>
    STATUS_OPTIONS.map(opt => ({
      value: opt.value,
      label: t(opt.labelKey) || opt.value,
    })), [t]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProposalInput>({
    resolver: zodResolver(createProposalSchema),
    defaultValues: {
      title: '',
      content: '',
      status: 'DRAFT',
      opportunity_id: opportunityId || '',
    },
  });

  // Reset form when proposal changes or modal opens
  useEffect(() => {
    if (isOpen && proposal) {
      reset({
        title: proposal.title || '',
        content: proposal.content || '',
        status: proposal.status || 'DRAFT',
        opportunity_id: proposal.opportunity_id || '',
        funding_source_id: proposal.funding_source_id || '',
      } as any);
    } else if (isOpen && !proposal) {
      reset({
        title: '',
        content: '',
        status: 'DRAFT',
        opportunity_id: opportunityId || '',
      });
    }
    setShowDeleteConfirm(false);
  }, [isOpen, proposal, reset, opportunityId]);

  const saveMutation = useMutation({
    mutationFn: (data: CreateProposalInput) => {
      if (isEditMode) {
        return apiClient.put(`/api/v1/proposals/${proposal!.id}`, data);
      }
      return apiClient.createProposal(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      reset();
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/proposals/${proposal!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      onClose();
      onDelete?.(proposal!.id);
    },
  });

  const onSubmit = (data: CreateProposalInput) => {
    saveMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  // Get confidence score for display
  const confidenceScore = proposal?.ai_confidence || proposal?.adherence_score;
  const version = proposal?.version || proposal?.current_version || 1;

  // Tab 1 content: Básico
  const basicTabContent = (
    <div className="space-y-4">
      <FormInput
        label={t('titleLabel')}
        placeholder={t('titlePlaceholder')}
        error={errors.title}
        required
        {...register('title')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormSelect
          label={t('opportunity')}
          options={opportunityOptions}
          placeholder={t('opportunityPlaceholder')}
          error={errors.opportunity_id}
          required
          {...register('opportunity_id')}
        />

        <FormSelect
          label={t('fundingSource')}
          options={fundingOptions}
          placeholder={t('fundingSourcePlaceholder')}
          {...register('funding_source_id')}
        />
      </div>

      <FormSelect
        label={t('statusLabel')}
        options={statusOptions}
        error={errors.status}
        {...register('status')}
      />

      {/* Collaboration Tip */}
      {!isEditMode && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            💡 <strong>{t('tip') || 'Dica'}</strong> {t('postCreateTip') || 'Após criar, você poderá colaborar em tempo real com sua equipe.'}
          </p>
        </div>
      )}
    </div>
  );

  // Tab 2 content: Conteúdo
  const contentTabContent = (
    <div className="space-y-4">
      <FormTextarea
        label={t('contentLabel')}
        placeholder={t('contentPlaceholder')}
        rows={12}
        error={errors.content}
        required
        {...register('content')}
      />

      <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('contentHint') || 'Descreva detalhadamente o escopo, objetivos, metodologia e resultados esperados da proposta.'}
        </p>
      </div>
    </div>
  );

  // Tab 3 content: Metadados
  const metadataTabContent = (
    <div className="space-y-4">
      {/* Version Badge */}
      {isEditMode && (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t('version') || 'Versão'}
          </span>
          <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium rounded-full">
            v{version}
          </span>
        </div>
      )}

      {/* AI Confidence Score */}
      {isEditMode && confidenceScore !== undefined && (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t('aiConfidence') || 'Confiança IA'}
          </span>
          <ConfidenceBadge score={confidenceScore} />
        </div>
      )}

      {/* Linked Opportunity */}
      {isEditMode && proposal?.opportunity_name && (
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
            {t('linkedOpportunity') || 'Oportunidade Vinculada'}
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {proposal.opportunity_name}
          </span>
        </div>
      )}

      {/* Author info */}
      {isEditMode && proposal?.author && (
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
            {t('author') || 'Autor'}
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {proposal.author}
          </span>
        </div>
      )}

      {/* Timestamps */}
      {isEditMode && (proposal?.created_at || proposal?.updated_at) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {proposal.created_at && (
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                {tCommon('createdAt') || 'Criado em'}
              </span>
              <span className="text-sm text-gray-900 dark:text-white">
                {new Date(proposal.created_at).toLocaleDateString('pt-BR', {
                  dateStyle: 'medium',
                })}
              </span>
            </div>
          )}
          {proposal.updated_at && (
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                {tCommon('updatedAt') || 'Atualizado em'}
              </span>
              <span className="text-sm text-gray-900 dark:text-white">
                {new Date(proposal.updated_at).toLocaleDateString('pt-BR', {
                  dateStyle: 'medium',
                })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Empty state for new proposals */}
      {!isEditMode && (
        <div className="text-center text-gray-500 dark:text-gray-400">
          <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t('metadataAvailableAfterCreate') || 'Os metadados estarão disponíveis após a criação da proposta.'}</p>
        </div>
      )}
    </div>
  );

  // Tab 4 content: Versões (Git-like version history)
  const versionsTabContent = (
    <div className="space-y-4">
      {isEditMode && proposal?.id ? (
        <VersionHistoryPanel
          proposalId={proposal.id}
          currentVersion={version}
        />
      ) : (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <ClockIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t('versionsAvailableAfterCreate') || 'O histórico de versões estará disponível após a criação da proposta.'}</p>
        </div>
      )}
    </div>
  );

  // Tab configuration with content
  const tabs: TabItem[] = [
    { name: t('tabs.basic') || 'Básico', content: basicTabContent },
    { name: t('tabs.content') || 'Conteúdo', content: contentTabContent },
    { name: t('tabs.metadata') || 'Metadados', content: metadataTabContent },
    ...(isEditMode ? [{ name: t('tabs.versions') || 'Versões', content: versionsTabContent }] : []),
  ];

  const renderNoPermission = () => (
    <div className="py-12 px-6 text-center">
      <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {t('noPermissionTitle') || 'Permissão necessária'}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        {t('noPermissionMessage') || 'Você deve ser administrador ou ter pelo menos um instituto selecionado para criar uma proposta.'}
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
      >
        {tCommon('close') || 'Fechar'}
      </button>
    </div>
  );

  // Footer content - passed to BaseModal footer prop to stay fixed
  const footerContent = (
    <div className="flex items-center justify-between">
      <div>
        {isEditMode && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
          >
            {tCommon('delete')}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600"
        >
          {tCommon('cancel')}
        </button>
        <button
          type="submit"
          form="proposal-form"
          disabled={isSubmitting || saveMutation.isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {isSubmitting || saveMutation.isPending
            ? tCommon('saving')
            : isEditMode
            ? tCommon('save')
            : t('newProposal')}
        </button>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? t('editProposal') || 'Editar Proposta' : t('newProposal')}
      icon={<DocumentTextIcon className="w-6 h-6" />}
      size="lg"
      footer={canCreate || isEditMode ? footerContent : undefined}
    >
      {!canCreate && !isEditMode ? (
        renderNoPermission()
      ) : (
        <form id="proposal-form" onSubmit={handleSubmit(onSubmit)}>
          {/* Delete Confirmation */}
          <DeleteConfirmation
            isVisible={showDeleteConfirm && isEditMode}
            message={t('deleteConfirmation') || 'Tem certeza que deseja excluir esta proposta?'}
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteConfirm(false)}
            isDeleting={deleteMutation.isPending}
          />

          <ModalTabs tabs={tabs} />

          {/* Error Message */}
          {saveMutation.error && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400 text-center">
              {isEditMode ? t('updateError') : t('createError')}
            </p>
          )}
        </form>
      )}
    </BaseModal>
  );
}
