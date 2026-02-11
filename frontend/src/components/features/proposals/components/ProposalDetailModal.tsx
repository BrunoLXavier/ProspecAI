/**
 * ProposalDetailModal Component
 * Modal for viewing and editing proposal details
 * Implements RF-08: Repositório de Propostas
 */
'use client';

import { useState, useEffect } from 'react';
import { 
  DocumentTextIcon, 
  CalendarIcon, 
  UserIcon, 
  TagIcon, 
  PencilIcon, 
  TrashIcon 
} from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';
import BaseModal, { ModalFooter } from '@/components/features/shared/ui/BaseModal';
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from '@/components/features/shared/forms';
import ConfidenceBadge from '@/components/features/shared/ui/ConfidenceBadge';

interface Proposal {
  id: string;
  title: string;
  opportunity_id?: string;
  opportunity_name?: string;
  funding_source?: string;
  status: string;
  version?: number;
  current_version?: number;
  content?: string;
  total_value?: number;
  ai_confidence?: number;
  adherence_score?: number;
  created_at: string;
  updated_at?: string;
  submitted_at?: string;
  author?: string;
}

interface ProposalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: Proposal | null;
  onDelete?: (id: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'status.draft' },
  { value: 'in_review', label: 'status.in_review' },
  { value: 'submitted', label: 'status.submitted' },
  { value: 'approved', label: 'status.approved' },
  { value: 'rejected', label: 'status.rejected' },
];

const STATUS_CONFIG: Record<string, { labelKey: string; color: string }> = {
  draft: { labelKey: 'status.draft', color: 'gray' },
  in_review: { labelKey: 'status.in_review', color: 'yellow' },
  submitted: { labelKey: 'status.submitted', color: 'blue' },
  approved: { labelKey: 'status.approved', color: 'green' },
  rejected: { labelKey: 'status.rejected', color: 'red' },
};

export default function ProposalDetailModal({ 
  isOpen, 
  onClose, 
  proposal, 
  onDelete 
}: ProposalDetailModalProps) {
  const t = useTranslations('proposals');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  // Reset form when proposal changes
  useEffect(() => {
    if (proposal) {
      reset({
        title: proposal.title || '',
        status: proposal.status || 'draft',
        funding_source: proposal.funding_source || '',
        total_value: proposal.total_value || 0,
        content: proposal.content || '',
        author: proposal.author || '',
      });
    }
    setIsEditing(false);
    setShowDeleteConfirm(false);
  }, [proposal, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => 
      apiClient.put(`/api/v1/proposals/${proposal!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setIsEditing(false);
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

  const onSubmit = (data: any) => {
    updateMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  if (!proposal) return null;

  const statusConfig = STATUS_CONFIG[proposal.status] || { labelKey: proposal.status, color: 'gray' };
  const version = proposal.version || proposal.current_version || 1;
  const confidence = proposal.ai_confidence || proposal.adherence_score;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateStr));
  };

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
            className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
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
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
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
      title={isEditing ? tCommon('edit') : proposal.title}
      subtitle={`ID: ${proposal.id}`}
      icon={<DocumentTextIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
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

      {/* Content */}
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <FormInput
            label={t('title')}
            {...register('title', { required: true })}
          />

          {/* Status and Funding Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              label={t('statusLabel')}
              options={STATUS_OPTIONS.map(opt => ({ value: opt.value, label: t(opt.label) }))}
              {...register('status')}
            />
            <FormInput
              label={t('fundingSource')}
              {...register('funding_source')}
            />
          </div>

          {/* Total Value and Author */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label={t('totalValue')}
              type="number"
              {...register('total_value', { valueAsNumber: true })}
            />
            <FormInput
              label={t('author')}
              {...register('author')}
            />
          </div>

          {/* Content */}
          <FormTextarea
            label={t('description')}
            rows={6}
            {...register('content')}
          />

          {updateMutation.error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {t('updateError')}
            </p>
          )}
        </form>
      ) : (
        <div className="space-y-6">
          {/* Status and Version Row */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className={`px-3 py-1 text-sm font-medium rounded-full bg-${statusConfig.color}-100 dark:bg-${statusConfig.color}-900/30 text-${statusConfig.color}-700 dark:text-${statusConfig.color}-300`}>
              {t(statusConfig.labelKey)}
            </span>
            <span className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
              v{version}.0
            </span>
            {confidence !== undefined && (
              <ConfidenceBadge score={confidence} />
            )}
          </div>

          {/* Value Highlight */}
          {proposal.total_value !== undefined && (
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-900/10 rounded-xl p-6">
              <p className="text-sm text-primary-600 dark:text-primary-400 font-medium uppercase mb-1">
                {t('totalValue')}
              </p>
              <p className="text-3xl font-bold text-primary-700 dark:text-primary-300">
                {formatCurrency(proposal.total_value)}
              </p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {proposal.opportunity_name && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  {t('linkedOpportunity')}
                </label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {proposal.opportunity_name}
                </p>
              </div>
            )}

            {proposal.funding_source && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  <TagIcon className="w-3 h-3 inline mr-1" />
                  {t('fundingSource')}
                </label>
                <p className="text-gray-900 dark:text-white">
                  {proposal.funding_source}
                </p>
              </div>
            )}

            {proposal.author && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  <UserIcon className="w-3 h-3 inline mr-1" />
                  {t('author')}
                </label>
                <p className="text-gray-900 dark:text-white">
                  {proposal.author}
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                <CalendarIcon className="w-3 h-3 inline mr-1" />
                {t('created')}
              </label>
              <p className="text-gray-900 dark:text-white">
                {formatDate(proposal.created_at)}
              </p>
            </div>

            {proposal.updated_at && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  <CalendarIcon className="w-3 h-3 inline mr-1" />
                  {t('created')}
                </label>
                <p className="text-gray-900 dark:text-white">
                  {formatDate(proposal.updated_at)}
                </p>
              </div>
            )}

            {proposal.submitted_at && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  <CalendarIcon className="w-3 h-3 inline mr-1" />
                  {t('submitted')}
                </label>
                <p className="text-gray-900 dark:text-white">
                  {formatDate(proposal.submitted_at)}
                </p>
              </div>
            )}
          </div>

          {/* Content/Description */}
          {proposal.content && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                {t('descriptionLabel')}
              </label>
              <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {proposal.content}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </BaseModal>
  );
}
