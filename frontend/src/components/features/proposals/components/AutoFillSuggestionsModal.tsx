/**
 * AutoFillSuggestionsModal Component
 * Modal for reviewing and accepting/rejecting AI auto-fill suggestions
 * Implements RF-08: Human-in-the-Loop for AI suggestions
 */
'use client';

import { useState } from 'react';
import { Tab } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  PencilIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

import BaseModal from '@/components/features/shared/ui/BaseModal';
import apiClient from '@/lib/api-client';

interface AutoFillSuggestion {
  id: string;
  field_key: string;
  field_label: string;
  suggested_value: unknown;
  confidence_score: number;
  confidence_badge: 'green' | 'yellow' | 'red';
  source_text?: string;
  source_attachment_id?: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface AutoFillSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string;
  onSuggestionAccepted?: (fieldKey: string, value: unknown) => void;
}

const confidenceBadgeStyles = {
  green: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
  red: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
};

export default function AutoFillSuggestionsModal({
  isOpen,
  onClose,
  proposalId,
  onSuggestionAccepted,
}: AutoFillSuggestionsModalProps) {
  const t = useTranslations('proposals');
  const queryClient = useQueryClient();
  
  const [filterStatus, setFilterStatus] = useState<'pending' | 'all'>('pending');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedValue, setEditedValue] = useState<string>('');

  // Fetch suggestions
  const { data: suggestions = [], isLoading, refetch } = useQuery<AutoFillSuggestion[]>({
    queryKey: ['auto-fill-suggestions', proposalId, filterStatus],
    queryFn: () =>
      apiClient.get(
        `/proposals/${proposalId}/auto-fill/suggestions?status_filter=${filterStatus}`
      ),
    enabled: isOpen,
  });

  // Accept suggestion mutation
  const acceptMutation = useMutation({
    mutationFn: async ({ suggestionId, value }: { suggestionId: string; value: unknown }) => {
      return apiClient.post(
        `/proposals/${proposalId}/auto-fill/suggestions/${suggestionId}/confirm?accept=true`,
        { corrected_value: value }
      );
    },
    onSuccess: (_, variables) => {
      const suggestion = suggestions.find((s) => s.id === variables.suggestionId);
      if (suggestion) {
        onSuggestionAccepted?.(suggestion.field_key, variables.value);
      }
      queryClient.invalidateQueries({ queryKey: ['auto-fill-suggestions', proposalId] });
      queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] });
      setEditingId(null);
    },
  });

  // Reject suggestion mutation
  const rejectMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      return apiClient.post(
        `/proposals/${proposalId}/auto-fill/suggestions/${suggestionId}/confirm?accept=false`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-fill-suggestions', proposalId] });
    },
  });

  // Accept all high-confidence
  const acceptAllMutation = useMutation({
    mutationFn: async (minConfidence: number) => {
      return apiClient.post(
        `/proposals/${proposalId}/auto-fill/confirm-all?min_confidence=${minConfidence}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-fill-suggestions', proposalId] });
      queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] });
    },
  });

  // Group suggestions by confidence
  const groupedSuggestions = {
    green: suggestions.filter((s) => s.confidence_badge === 'green' && s.status === 'pending'),
    yellow: suggestions.filter((s) => s.confidence_badge === 'yellow' && s.status === 'pending'),
    red: suggestions.filter((s) => s.confidence_badge === 'red' && s.status === 'pending'),
  };

  const pendingCount = suggestions.filter((s) => s.status === 'pending').length;
  const highConfidenceCount = groupedSuggestions.green.length;

  const renderSuggestionCard = (suggestion: AutoFillSuggestion) => {
    const isEditing = editingId === suggestion.id;
    const isPending = suggestion.status === 'pending';
    
    return (
      <div
        key={suggestion.id}
        className={`
          p-4 rounded-lg border transition-all
          ${isPending ? 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700' : 'bg-gray-50 dark:bg-slate-900 border-gray-100 dark:border-gray-800'}
          ${suggestion.status === 'accepted' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : ''}
          ${suggestion.status === 'rejected' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : ''}
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {suggestion.field_label}
            </span>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              ({suggestion.field_key})
            </span>
          </div>
          <span
            className={`
              text-xs px-2 py-0.5 rounded-full border
              ${confidenceBadgeStyles[suggestion.confidence_badge]}
            `}
          >
            {Math.round(suggestion.confidence_score * 100)}%
          </span>
        </div>

        {/* Value */}
        <div className="mb-3">
          {isEditing ? (
            <textarea
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
              className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              rows={3}
            />
          ) : (
            <div className="p-2 bg-gray-50 dark:bg-slate-700 rounded-md">
              <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans">
                {typeof suggestion.suggested_value === 'object'
                  ? JSON.stringify(suggestion.suggested_value, null, 2)
                  : String(suggestion.suggested_value)}
              </pre>
            </div>
          )}
        </div>

        {/* Source text */}
        {suggestion.source_text && (
          <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-100 dark:border-amber-800">
            <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 mb-1">
              <DocumentTextIcon className="h-3.5 w-3.5" />
              {t('auto_fill.source_excerpt')}
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-200 italic">
              &quot;{suggestion.source_text}&quot;
            </p>
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div className="flex items-center justify-end gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      // Try to parse as JSON if it looks like JSON
                      const value = editedValue.startsWith('{') || editedValue.startsWith('[')
                        ? JSON.parse(editedValue)
                        : editedValue;
                      acceptMutation.mutate({ suggestionId: suggestion.id, value });
                    } catch {
                      acceptMutation.mutate({ suggestionId: suggestion.id, value: editedValue });
                    }
                  }}
                  disabled={acceptMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  {t('auto_fill.save_edited')}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(suggestion.id);
                    setEditedValue(
                      typeof suggestion.suggested_value === 'object'
                        ? JSON.stringify(suggestion.suggested_value, null, 2)
                        : String(suggestion.suggested_value)
                    );
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
                >
                  <PencilIcon className="h-4 w-4" />
                  {t('auto_fill.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => rejectMutation.mutate(suggestion.id)}
                  disabled={rejectMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md disabled:opacity-50"
                >
                  <XCircleIcon className="h-4 w-4" />
                  {t('auto_fill.reject')}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    acceptMutation.mutate({
                      suggestionId: suggestion.id,
                      value: suggestion.suggested_value,
                    })
                  }
                  disabled={acceptMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  {t('auto_fill.accept')}
                </button>
              </>
            )}
          </div>
        )}

        {/* Status badge for non-pending */}
        {!isPending && (
          <div className="flex justify-end">
            <span
              className={`
                text-xs px-2 py-1 rounded-full
                ${suggestion.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''}
                ${suggestion.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : ''}
              `}
            >
              {suggestion.status === 'accepted' ? t('auto_fill.status_accepted') : t('auto_fill.status_rejected')}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderFooter = () => (
    <div className="flex items-center justify-between">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('auto_fill.human_in_loop_notice')}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
      >
        {t('close')}
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('auto_fill.modal_title')}
      subtitle={t('auto_fill.modal_subtitle', { count: pendingCount })}
      icon={<SparklesIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
      size="3xl"
      footer={renderFooter()}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <ArrowPathIcon className="h-4 w-4" />
            {t('auto_fill.refresh')}
          </button>
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-4 w-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'pending' | 'all')}
              className="text-sm border-0 bg-transparent focus:ring-0 text-gray-700 dark:text-gray-300"
            >
              <option value="pending">{t('auto_fill.filter_pending')}</option>
              <option value="all">{t('auto_fill.filter_all')}</option>
            </select>
          </div>
        </div>
        
        {highConfidenceCount > 0 && (
          <button
            type="button"
            onClick={() => acceptAllMutation.mutate(0.8)}
            disabled={acceptAllMutation.isPending}
            className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircleIcon className="h-4 w-4" />
            {t('auto_fill.accept_all_high', { count: highConfidenceCount })}
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-12">
          <SparklesIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t('auto_fill.no_suggestions')}</p>
        </div>
      ) : (
        <Tab.Group>
          <Tab.List className="flex space-x-1 rounded-lg bg-gray-100 dark:bg-slate-700 p-1 mb-4">
            <Tab
              className={({ selected }) =>
                `w-full rounded-md py-2 text-sm font-medium leading-5 transition-all
                ${selected
                  ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`
              }
            >
              <span className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {t('auto_fill.high_confidence')} ({groupedSuggestions.green.length})
              </span>
            </Tab>
            <Tab
              className={({ selected }) =>
                `w-full rounded-md py-2 text-sm font-medium leading-5 transition-all
                ${selected
                  ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`
              }
            >
              <span className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                {t('auto_fill.medium_confidence')} ({groupedSuggestions.yellow.length})
              </span>
            </Tab>
            <Tab
              className={({ selected }) =>
                `w-full rounded-md py-2 text-sm font-medium leading-5 transition-all
                ${selected
                  ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`
              }
            >
              <span className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {t('auto_fill.low_confidence')} ({groupedSuggestions.red.length})
              </span>
            </Tab>
          </Tab.List>
          
          <Tab.Panels>
            <Tab.Panel className="space-y-3">
              {groupedSuggestions.green.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {t('auto_fill.no_high_confidence')}
                </p>
              ) : (
                groupedSuggestions.green.map(renderSuggestionCard)
              )}
            </Tab.Panel>
            <Tab.Panel className="space-y-3">
              {groupedSuggestions.yellow.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {t('auto_fill.no_medium_confidence')}
                </p>
              ) : (
                groupedSuggestions.yellow.map(renderSuggestionCard)
              )}
            </Tab.Panel>
            <Tab.Panel className="space-y-3">
              {groupedSuggestions.red.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {t('auto_fill.no_low_confidence')}
                </p>
              ) : (
                groupedSuggestions.red.map(renderSuggestionCard)
              )}
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      )}
    </BaseModal>
  );
}
