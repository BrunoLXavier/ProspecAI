/**
 * ProposalDetailModal Component
 * Modal for viewing and editing proposal details
 * Implements RF-08: Repositório de Propostas
 */
'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon, 
  DocumentTextIcon, 
  CalendarIcon, 
  UserIcon, 
  CurrencyDollarIcon, 
  TagIcon, 
  PencilIcon, 
  TrashIcon 
} from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';
import ConfidenceBadge from '@/components/common/ConfidenceBadge';

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
  { value: 'draft', labelKey: 'status.draft' },
  { value: 'in_review', labelKey: 'status.in_review' },
  { value: 'submitted', labelKey: 'status.submitted' },
  { value: 'approved', labelKey: 'status.approved' },
  { value: 'rejected', labelKey: 'status.rejected' },
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

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        </Transition.Child>

        {/* Modal Container */}
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
                        <DocumentTextIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                          {isEditing ? tCommon('edit') : proposal.title}
                        </Dialog.Title>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {proposal.id}
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

                {/* Content */}
                {isEditing ? (
                  <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    {/* Title */}
                    <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('title')}
                          </label>
                      <input
                        type="text"
                        {...register('title', { required: true })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    {/* Status and Funding Source */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('statusLabel')}
                        </label>
                        <select
                          {...register('status')}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('fundingSource')}
                        </label>
                        <input
                          type="text"
                          {...register('funding_source')}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Total Value and Author */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('totalValue')}
                        </label>
                        <input
                          type="number"
                          {...register('total_value', { valueAsNumber: true })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('author')}
                        </label>
                        <input
                          type="text"
                          {...register('author')}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('description')}
                      </label>
                      <textarea
                        {...register('content')}
                        rows={6}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* Form Actions */}
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
                            {t('created') /* reuse 'created' or consider 'updated' */}
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

                {/* Footer - View Mode Only */}
                {!isEditing && (
                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
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
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
