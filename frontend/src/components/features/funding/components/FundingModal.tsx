/**
 * FundingModal Component
 * Unified CRUD modal for funding sources (Create/Edit/Delete)
 * Implements RF-02: Gestão de Fomentos
 * 
 * Consolidates CreateFundingModal + ViewEditFundingModal into single component
 * Uses BaseModal pattern with tabs for better organization
 */
'use client';

import { useEffect, useState } from 'react';
import { CurrencyDollarIcon, DocumentTextIcon, TagIcon } from '@heroicons/react/24/outline';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';

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

import BaseModal, { ModalFooter } from '@/components/features/shared/ui/BaseModal';
import ModalTabs, { type TabItem } from '@/components/features/shared/ui/ModalTabs';
import DeleteConfirmation from '@/components/features/shared/ui/DeleteConfirmation';
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

interface FundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  funding?: FundingSource | null;
  onDelete?: (id: string) => void;
}

export default function FundingModal({ 
  isOpen, 
  onClose, 
  funding = null,
  onDelete 
}: FundingModalProps) {
  const t = useTranslations('funding');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const { user, selectedInstitutes } = useAuth();
  const isAdmin = (user?.roles || []).includes('admin');
  const canCreate = isAdmin || (selectedInstitutes && selectedInstitutes.length > 0);
  
  const [selectedTab, setSelectedTab] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditMode = !!funding?.id;

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
      setSelectedTab(0);
      setShowDeleteConfirm(false);
    } else {
      reset({
        source_name: '',
        status: 'DRAFT',
        category: 'NATIONAL',
        trl_min: 1,
        trl_max: 9,
        focus_areas: [],
        total_amount: 0,
        description: '',
        url: '',
        deadline: '',
      });
      setSelectedTab(0);
      setShowDeleteConfirm(false);
    }
  }, [funding, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: CreateFundingInput) => {
      if (isEditMode) {
        return apiClient.updateFundingSource(funding!.id, data);
      }
      return apiClient.createFundingSource(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funding'] });
      reset();
      onClose();
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
    saveMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  // Check permissions for create mode
  if (!isEditMode && !canCreate) {
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={t('noPermissionTitle') || 'Permissão Necessária'}
        icon={<CurrencyDollarIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
        size="md"
      >
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('noPermissionMessage') || 'Você deve ser administrador ou ter pelo menos um instituto selecionado para criar uma fonte de fomento.'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            {tCommon('close') || 'Fechar'}
          </button>
        </div>
      </BaseModal>
    );
  }

  const displayConfidence = funding?.ai_confidence_score || funding?.aiConfidenceScore;

  // Tab Content Components
  const BasicInfoTab = (
    <div className="space-y-4">
      {/* Show confidence badge if available */}
      {isEditMode && displayConfidence && (
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-500">{t('aiConfidence') || 'Confiança IA'}:</span>
          <ConfidenceBadge score={displayConfidence} />
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <FormInput
            label={t('sourceName')}
            placeholder={t('sourcePlaceholder')}
            error={errors.source_name}
            required
            {...register('source_name')}
          />
        </div>

        <FormSelect
          label={t('category')}
          options={categoryOptions}
          error={errors.category}
          required
          {...register('category')}
        />

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
      </div>
    </div>
  );

  const TRLAndAreasTab = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            error={errors.focus_areas?.root || errors.focus_areas?.message ? { message: String(errors.focus_areas.message), type: 'validate' } : undefined}
            placeholder={t('focusAreasPlaceholder')}
            required
          />
        )}
      />
    </div>
  );

  const DetailsTab = (
    <div className="space-y-4">
      <FormTextarea
        label={t('description')}
        placeholder={t('descriptionPlaceholder')}
        rows={4}
        {...register('description')}
      />

      <FormInput
        label={t('url')}
        type="url"
        placeholder="https://..."
        error={errors.url}
        {...register('url')}
      />
    </div>
  );

  const tabs: TabItem[] = [
    { name: t('tabBasic') || 'Básico', icon: CurrencyDollarIcon, content: BasicInfoTab },
    { name: t('tabTRL') || 'TRL e Áreas', icon: TagIcon, content: TRLAndAreasTab },
    { name: t('tabDetails') || 'Detalhes', icon: DocumentTextIcon, content: DetailsTab },
  ];

  const modalTitle = isEditMode 
    ? (funding.source_name || funding.name || t('editFunding') || 'Editar Fomento')
    : (t('newFunding') || 'Novo Fomento');

  const modalSubtitle = isEditMode ? `ID: ${funding.id}` : undefined;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={<CurrencyDollarIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
      size="2xl"
      footer={
        <ModalFooter
          onCancel={onClose}
          onSubmit={handleSubmit(onSubmit)}
          submitLabel={isEditMode ? (tCommon('save') || 'Salvar') : (t('newFunding') || 'Criar')}
          cancelLabel={tCommon('cancel') || 'Cancelar'}
          deleteLabel={tCommon('delete') || 'Excluir'}
          isSubmitting={isSubmitting || saveMutation.isPending}
          isDeleting={deleteMutation.isPending}
          showDelete={isEditMode}
          onDelete={() => setShowDeleteConfirm(true)}
        />
      }
    >
      <DeleteConfirmation
        isVisible={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isDeleting={deleteMutation.isPending}
        message={t('deleteConfirmation') || 'Tem certeza que deseja excluir este fomento?'}
      />

      {(saveMutation.error || deleteMutation.error) && (
        <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">
            {saveMutation.error ? t('saveError') || 'Erro ao salvar. Tente novamente.' : t('deleteError') || 'Erro ao excluir.'}
          </p>
        </div>
      )}
      
      <ModalTabs
        tabs={tabs}
        selectedIndex={selectedTab}
        onChange={setSelectedTab}
      />
    </BaseModal>
  );
}
