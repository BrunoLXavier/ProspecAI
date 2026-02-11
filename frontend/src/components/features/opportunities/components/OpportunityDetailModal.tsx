/**
 * OpportunityDetailModal Component
 * Modal for viewing and editing opportunity details
 * Implements RF-05: Pipeline de Oportunidades
 * Uses BaseModal + ModalFooter pattern
 */
'use client';

import { useState, useEffect } from 'react';
import { 
  BriefcaseIcon, 
  CalendarIcon, 
  UserIcon, 
  BuildingOfficeIcon,
  ChartBarIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useForm, FieldError } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';
import ConfidenceBadge from '@/components/features/shared/ui/ConfidenceBadge';
import BaseModal, { ModalFooter } from '@/components/features/shared/ui/BaseModal';
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormDatePicker,
} from '@/components/features/shared/forms';

interface Opportunity {
  id: string;
  title: string;
  client_name: string;
  client_id?: string;
  stage: string;
  status: string;
  estimated_value: number;
  probability: number;
  deadline: string;
  owner: string;
  description?: string;
  funding_source_id?: string;
  funding_source_name?: string;
  priority_score?: number;
  created_at?: string;
  updated_at?: string;
}

interface OpportunityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: Opportunity | null;
  onDelete?: (id: string) => void;
}

const STAGE_OPTIONS = [
  { value: 'intelligence', label: 'Intelligence' },
  { value: 'approach', label: 'Approach' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  intelligence: { label: 'Intelligence', color: 'blue' },
  approach: { label: 'Approach', color: 'purple' },
  proposal: { label: 'Proposal', color: 'yellow' },
  negotiation: { label: 'Negotiation', color: 'orange' },
  won: { label: 'Won', color: 'green' },
  lost: { label: 'Lost', color: 'red' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'green' },
  pending: { label: 'Pending', color: 'yellow' },
  completed: { label: 'Completed', color: 'blue' },
  cancelled: { label: 'Cancelled', color: 'gray' },
};

export default function OpportunityDetailModal({ 
  isOpen, 
  onClose, 
  opportunity,
  onDelete 
}: OpportunityDetailModalProps) {
  const t = useTranslations('opportunities');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch full opportunity data if we only have the ID
  const { data: fetchedOpportunity, isLoading: isLoadingOpportunity } = useQuery({
    queryKey: ['opportunity', opportunity?.id],
    queryFn: () => apiClient.getOpportunity(opportunity!.id),
    enabled: isOpen && !!opportunity?.id && !opportunity?.title,
  });

  // Use fetched data if available, otherwise use passed opportunity
  const opportunityData = fetchedOpportunity || opportunity;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  // Reset form when opportunity data changes
  useEffect(() => {
    if (opportunityData) {
      reset({
        title: opportunityData.title || '',
        client_name: opportunityData.client_name || '',
        stage: opportunityData.stage || 'intelligence',
        status: opportunityData.status || 'active',
        estimated_value: opportunityData.estimated_value || 0,
        probability: opportunityData.probability || 50,
        deadline: opportunityData.deadline ? opportunityData.deadline.split('T')[0] : '',
        owner: opportunityData.owner || '',
        description: opportunityData.description || '',
      });
    }
    setIsEditing(false);
    setShowDeleteConfirm(false);
  }, [opportunityData, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => 
      apiClient.put(`/api/v1/opportunities/${opportunityData!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity', opportunityData?.id] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/opportunities/${opportunityData!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      onClose();
      onDelete?.(opportunityData!.id);
    },
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  // Show loading state when fetching opportunity data
  if (!opportunityData || isLoadingOpportunity) {
    if (!isOpen) return null;
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={tCommon('loading')}
        icon={<BriefcaseIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
        size="2xl"
      >
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-300">{tCommon('loading')}</span>
        </div>
      </BaseModal>
    );
  }

  const stageConfig = STAGE_CONFIG[opportunityData.stage] || { label: opportunityData.stage, color: 'gray' };
  const statusConfig = STATUS_CONFIG[opportunityData.status] || { label: opportunityData.status, color: 'gray' };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
    }).format(new Date(dateStr));
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDeadline = opportunityData.deadline ? getDaysUntilDeadline(opportunityData.deadline) : 0;

  const renderFooter = () => {
    if (isEditing) {
      return (
        <ModalFooter
          onCancel={() => setIsEditing(false)}
          onSubmit={handleSubmit(onSubmit)}
          isSubmitting={isSubmitting || updateMutation.isPending}
        />
      );
    }
    return (
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition flex items-center gap-2"
          >
            <TrashIcon className="w-4 h-4" />
            {tCommon('delete')}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2"
          >
            <PencilIcon className="w-4 h-4" />
            {tCommon('edit')}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            {tCommon('close')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? tCommon('edit') : opportunityData.title}
      subtitle={`ID: ${opportunityData.id}`}
      icon={<BriefcaseIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
      size="2xl"
      footer={renderFooter()}
    >
      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
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

      {/* Status Badges - View Mode Only */}
      {!isEditing && (
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <span className={`px-3 py-1 text-sm font-medium rounded-full bg-${stageConfig.color}-100 dark:bg-${stageConfig.color}-900/30 text-${stageConfig.color}-700 dark:text-${stageConfig.color}-300`}>
            {t(`stages.${opportunityData.stage}`)}
          </span>
          <span className={`px-3 py-1 text-sm font-medium rounded-full bg-${statusConfig.color}-100 dark:bg-${statusConfig.color}-900/30 text-${statusConfig.color}-700 dark:text-${statusConfig.color}-300`}>
            {t(`statuses.${opportunityData.status}`)}
          </span>
          <ConfidenceBadge score={opportunityData.probability / 100} />
          {opportunityData.priority_score !== undefined && (
            <span className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full flex items-center gap-1">
              <ChartBarIcon className="w-3 h-3" />
              {t('priority')}: {opportunityData.priority_score}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <FormInput
            label={t('title')}
            error={errors.title as FieldError}
            required
            {...register('title', { required: true })}
          />

          {/* Client and Owner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label={t('client')}
              error={errors.client_name as FieldError}
              required
              {...register('client_name', { required: true })}
            />

            <FormInput
              label={t('owner')}
              error={errors.owner as FieldError}
              required
              {...register('owner', { required: true })}
            />
          </div>

          {/* Stage and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              label={t('stage')}
              options={STAGE_OPTIONS}
              {...register('stage')}
            />

            <FormSelect
              label={t('status')}
              options={STATUS_OPTIONS}
              {...register('status')}
            />
          </div>

          {/* Value and Probability */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label={t('estimatedValue')}
              type="number"
              {...register('estimated_value', { valueAsNumber: true })}
            />

            <FormInput
              label={t('probability')}
              type="number"
              {...register('probability', { valueAsNumber: true, min: 0, max: 100 })}
            />
          </div>

          {/* Deadline */}
          <FormDatePicker
            label={t('deadline')}
            {...register('deadline', { required: true })}
          />

          {/* Description */}
          <FormTextarea
            label={t('description')}
            rows={4}
            {...register('description')}
          />

          {updateMutation.error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {t('updateError')}
            </p>
          )}
        </form>
      ) : (
        <div className="space-y-6">
          {/* Value Highlight */}
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-900/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-600 dark:text-primary-400 font-medium uppercase mb-1">
                  {t('estimatedValue')}
                </p>
                <p className="text-3xl font-bold text-primary-700 dark:text-primary-300">
                  {formatCurrency(opportunityData.estimated_value)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-primary-600 dark:text-primary-400 font-medium uppercase mb-1">
                  {t('probability')}
                </p>
                <p className="text-3xl font-bold text-primary-700 dark:text-primary-300">
                  {opportunityData.probability}%
                </p>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                <BuildingOfficeIcon className="w-3 h-3 inline mr-1" />
                {t('client')}
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                {opportunityData.client_name}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                <UserIcon className="w-3 h-3 inline mr-1" />
                {t('owner')}
              </label>
              <p className="text-gray-900 dark:text-white">
                {opportunityData.owner}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                <CalendarIcon className="w-3 h-3 inline mr-1" />
                {t('deadline')}
              </label>
              <div className="flex items-center gap-2">
                <p className="text-gray-900 dark:text-white">
                  {opportunityData.deadline ? formatDate(opportunityData.deadline) : '-'}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  daysUntilDeadline < 0 
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : daysUntilDeadline <= 7 
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                }`}>
                  {daysUntilDeadline < 0 
                    ? `${Math.abs(daysUntilDeadline)} ${t('daysAgo')}`
                    : daysUntilDeadline === 0 
                    ? t('today')
                    : `${daysUntilDeadline} ${t('days')}`
                  }
                </span>
              </div>
            </div>

            {opportunityData.funding_source_name && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  {t('fundingSource')}
                </label>
                <p className="text-gray-900 dark:text-white">
                  {opportunityData.funding_source_name}
                </p>
              </div>
            )}

            {opportunityData.created_at && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  <CalendarIcon className="w-3 h-3 inline mr-1" />
                  {t('createdAt')}
                </label>
                <p className="text-gray-900 dark:text-white">
                  {formatDate(opportunityData.created_at)}
                </p>
              </div>
            )}

            {opportunityData.updated_at && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  <CalendarIcon className="w-3 h-3 inline mr-1" />
                  {t('updatedAt')}
                </label>
                <p className="text-gray-900 dark:text-white">
                  {formatDate(opportunityData.updated_at)}
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          {opportunityData.description && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                {t('description')}
              </label>
              <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {opportunityData.description}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </BaseModal>
  );
}
