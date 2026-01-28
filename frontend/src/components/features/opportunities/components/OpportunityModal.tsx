/**
 * OpportunityModal Component
 * Consolidated Create/Edit/Delete modal for pipeline opportunities
 * Implements RF-05: Pipeline de Oportunidades
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BriefcaseIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

import { BaseModal, ModalTabs, DeleteConfirmation, type TabItem } from '@/components/features/shared/ui';
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormDatePicker,
  FormCurrencyInput,
  FormSlider,
} from '@/components/features/shared/forms';
import { useAuth } from '@/contexts/AuthContext';
import {
  createOpportunitySchema,
  CreateOpportunityInput,
  pipelineStageOptions,
} from '@/utils/validations';
import apiClient from '@/lib/api-client';
import ConfidenceBadge from '@/components/features/shared/common/ConfidenceBadge';

interface Opportunity {
  id: string;
  title: string;
  description?: string;
  client_id?: string;
  client_name?: string;
  funding_source_id?: string;
  funding_source_name?: string;
  stage: string;
  status?: string;
  estimated_value: number;
  probability?: number;
  deadline?: string;
  expected_close_date?: string;
  owner?: string;
  priority_score?: number;
  priority_factors?: {
    strategic_fit: number;
    financial_impact: number;
    probability: number;
    urgency: number;
  };
}

interface OpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity?: Opportunity | null;
  onDelete?: (id: string) => void;
}

export default function OpportunityModal({
  isOpen,
  onClose,
  opportunity,
  onDelete,
}: OpportunityModalProps) {
  const t = useTranslations('opportunities');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const { user, selectedInstitutes } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditMode = !!opportunity?.id;
  const isAdmin = (user?.roles || []).includes('admin');
  const canCreate = isAdmin || (selectedInstitutes && selectedInstitutes.length > 0);

  // Fetch clients and funding sources
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.listClients(),
    enabled: isOpen,
  });

  const { data: fundingSources = [] } = useQuery({
    queryKey: ['funding'],
    queryFn: () => apiClient.listFundingSources(),
    enabled: isOpen,
  });

  const clientOptions = useMemo(() =>
    (Array.isArray(clients) ? clients : []).map((c: any) => ({
      value: c.id,
      label: c.name,
    })), [clients]);

  const fundingOptions = useMemo(() =>
    (Array.isArray(fundingSources) ? fundingSources : []).map((f: any) => ({
      value: f.id,
      label: f.source_name,
    })), [fundingSources]);

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
      title: '',
      description: '',
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
  const priorityScore = useMemo(() => {
    if (!priorityFactors) return 0;
    return Math.round(
      (priorityFactors.strategic_fit * 0.3) +
      (priorityFactors.financial_impact * 0.25) +
      (priorityFactors.probability * 0.25) +
      (priorityFactors.urgency * 0.2)
    );
  }, [priorityFactors]);

  // Reset form when opportunity changes or modal opens
  useEffect(() => {
    if (isOpen && opportunity) {
      reset({
        title: opportunity.title || '',
        description: opportunity.description || '',
        client_id: opportunity.client_id || '',
        funding_source_id: opportunity.funding_source_id || '',
        stage: opportunity.stage || 'INTELLIGENCE',
        estimated_value: opportunity.estimated_value || 0,
        probability: opportunity.probability || 50,
        expected_close_date: opportunity.expected_close_date || opportunity.deadline?.split('T')[0] || '',
        priority_factors: opportunity.priority_factors || {
          strategic_fit: 50,
          financial_impact: 50,
          probability: 50,
          urgency: 50,
        },
      } as any);
    } else if (isOpen && !opportunity) {
      reset({
        title: '',
        description: '',
        stage: 'INTELLIGENCE',
        probability: 50,
        estimated_value: 0,
        priority_factors: {
          strategic_fit: 50,
          financial_impact: 50,
          probability: 50,
          urgency: 50,
        },
      });
    }
    setShowDeleteConfirm(false);
  }, [isOpen, opportunity, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: CreateOpportunityInput) => {
      if (isEditMode) {
        return apiClient.put(`/api/v1/opportunities/${opportunity!.id}`, data);
      }
      return apiClient.createOpportunity(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      if (isEditMode) {
        queryClient.invalidateQueries({ queryKey: ['opportunity', opportunity?.id] });
      }
      reset();
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/opportunities/${opportunity!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      onClose();
      onDelete?.(opportunity!.id);
    },
  });

  const onSubmit = (data: CreateOpportunityInput) => {
    saveMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  // Tab 1 content: Básico
  const basicTabContent = (
    <div className="space-y-4">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormSelect
          label={t('client')}
          options={clientOptions}
          placeholder={t('clientPlaceholder')}
          error={errors.client_id}
          required
          {...register('client_id')}
        />

        <FormSelect
          label={t('fundingSource')}
          options={fundingOptions}
          placeholder={t('fundingSourcePlaceholder')}
          {...register('funding_source_id')}
        />
      </div>

      <FormSelect
        label={t('stage')}
        options={pipelineStageOptions}
        error={errors.stage}
        required
        {...register('stage')}
      />
    </div>
  );

  // Tab 2 content: Valores & Prazo
  const valuesTabContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          {...register('expected_close_date' as any)}
        />
      </div>

      <Controller
        name="probability"
        control={control}
        render={({ field }) => (
          <FormSlider
            label={t('probability')}
            value={field.value}
            onChange={field.onChange}
            helperText={t('probabilityHelper') || 'Probabilidade de fechamento (%)'}
          />
        )}
      />

      {isEditMode && opportunity?.priority_score !== undefined && (
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('currentScore') || 'Score Atual'}
            </span>
            <ConfidenceBadge score={opportunity.priority_score} />
          </div>
        </div>
      )}
    </div>
  );

  // Tab 3 content: Priorização - RF-05 Transparent Scoring
  const priorityTabContent = (
    <div className="space-y-4">
      {/* Calculated Score Display */}
      <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-900 dark:text-white">
            {t('calculatedScoreLabel') || 'Score Calculado'}
          </span>
          <span className={`text-2xl font-bold ${
            priorityScore >= 70 ? 'text-green-600 dark:text-green-400' :
            priorityScore >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {priorityScore}%
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {t('scoreFormula') || 'Fórmula: (Aderência×0.3) + (Impacto×0.25) + (Probabilidade×0.25) + (Urgência×0.2)'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Controller
          name="priority_factors.strategic_fit"
          control={control}
          render={({ field }) => (
            <FormSlider
              label={t('strategicFitLabel') || 'Aderência Estratégica'}
              value={field.value}
              onChange={field.onChange}
              helperText={t('strategicFitHelper') || 'Peso: 30%'}
            />
          )}
        />

        <Controller
          name="priority_factors.financial_impact"
          control={control}
          render={({ field }) => (
            <FormSlider
              label={t('financialImpactLabel') || 'Impacto Financeiro'}
              value={field.value}
              onChange={field.onChange}
              helperText={t('financialImpactHelper') || 'Peso: 25%'}
            />
          )}
        />

        <Controller
          name="priority_factors.probability"
          control={control}
          render={({ field }) => (
            <FormSlider
              label={t('probabilityLabel') || 'Probabilidade de Sucesso'}
              value={field.value}
              onChange={field.onChange}
              helperText={t('probabilityHelper') || 'Peso: 25%'}
            />
          )}
        />

        <Controller
          name="priority_factors.urgency"
          control={control}
          render={({ field }) => (
            <FormSlider
              label={t('urgencyLabel') || 'Urgência'}
              value={field.value}
              onChange={field.onChange}
              helperText={t('urgencyHelper') || 'Peso: 20%'}
            />
          )}
        />
      </div>
    </div>
  );

  // Tab configuration with content
  const tabs: TabItem[] = [
    { name: t('tabs.basic') || 'Básico', content: basicTabContent },
    { name: t('tabs.values') || 'Valores & Prazo', content: valuesTabContent },
    { name: t('tabs.priority') || 'Priorização', content: priorityTabContent },
  ];

  const renderNoPermission = () => (
    <div className="py-12 px-6 text-center">
      <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {t('noPermissionTitle') || 'Permissão necessária'}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        {t('noPermissionMessage') || 'Você deve ser administrador ou ter pelo menos um instituto selecionado para criar uma oportunidade.'}
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
          form="opportunity-form"
          disabled={isSubmitting || saveMutation.isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {isSubmitting || saveMutation.isPending
            ? tCommon('saving')
            : isEditMode
            ? tCommon('save')
            : t('newOpportunity')}
        </button>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? t('editOpportunity') : t('newOpportunity')}
      icon={<BriefcaseIcon className="w-6 h-6" />}
      size="lg"
      footer={canCreate || isEditMode ? footerContent : undefined}
    >
      {!canCreate && !isEditMode ? (
        renderNoPermission()
      ) : (
        <form id="opportunity-form" onSubmit={handleSubmit(onSubmit)}>
          {/* Delete Confirmation */}
          <DeleteConfirmation
            isVisible={showDeleteConfirm && isEditMode}
            message={t('deleteConfirmation') || 'Tem certeza que deseja excluir esta oportunidade?'}
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
