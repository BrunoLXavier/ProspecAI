/**
 * AutoFillSuggestionsModal Component
 * Modal for reviewing and accepting/rejecting AI auto-fill suggestions
 * Implements RF-08: Human-in-the-Loop for AI suggestions
 */
'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  XMarkIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  PencilIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

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
  green: 'bg-green-100 text-green-800 border-green-300',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  red: 'bg-red-100 text-red-800 border-red-300',
};

const confidenceLabels = {
  green: 'Alta Confiança (>80%)',
  yellow: 'Média Confiança (60-80%)',
  red: 'Baixa Confiança (<60%)',
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
    onSuccess: (data) => {
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
          ${isPending ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}
          ${suggestion.status === 'accepted' ? 'border-green-200 bg-green-50' : ''}
          ${suggestion.status === 'rejected' ? 'border-red-200 bg-red-50' : ''}
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="text-sm font-medium text-gray-900">
              {suggestion.field_label}
            </span>
            <span className="ml-2 text-xs text-gray-500">
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
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          ) : (
            <div className="p-2 bg-gray-50 rounded-md">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                {typeof suggestion.suggested_value === 'object'
                  ? JSON.stringify(suggestion.suggested_value, null, 2)
                  : String(suggestion.suggested_value)}
              </pre>
            </div>
          )}
        </div>

        {/* Source text */}
        {suggestion.source_text && (
          <div className="mb-3 p-2 bg-amber-50 rounded-md border border-amber-100">
            <div className="flex items-center gap-1 text-xs text-amber-700 mb-1">
              <DocumentTextIcon className="h-3.5 w-3.5" />
              {t('auto_fill.source_excerpt')}
            </div>
            <p className="text-xs text-amber-800 italic">
              "{suggestion.source_text}"
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
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
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
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
                >
                  <PencilIcon className="h-4 w-4" />
                  {t('auto_fill.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => rejectMutation.mutate(suggestion.id)}
                  disabled={rejectMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 text-red-600 text-sm hover:bg-red-50 rounded-md disabled:opacity-50"
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
                ${suggestion.status === 'accepted' ? 'bg-green-100 text-green-800' : ''}
                ${suggestion.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
              `}
            >
              {suggestion.status === 'accepted' ? t('auto_fill.status_accepted') : t('auto_fill.status_rejected')}
            </span>
          </div>
        )}
      </div>
    );
  };

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
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <SparklesIcon className="h-6 w-6 text-amber-600" />
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-gray-900">
                        {t('auto_fill.modal_title')}
                      </Dialog.Title>
                      <p className="text-sm text-gray-500">
                        {t('auto_fill.modal_subtitle', { count: pendingCount })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      {t('auto_fill.refresh')}
                    </button>
                    <div className="flex items-center gap-2">
                      <FunnelIcon className="h-4 w-4 text-gray-400" />
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as 'pending' | 'all')}
                        className="text-sm border-0 bg-transparent focus:ring-0"
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
                <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="text-center py-12">
                      <SparklesIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">{t('auto_fill.no_suggestions')}</p>
                    </div>
                  ) : (
                    <Tab.Group>
                      <Tab.List className="flex space-x-1 rounded-lg bg-gray-100 p-1 mb-4">
                        <Tab
                          className={({ selected }) =>
                            `w-full rounded-md py-2 text-sm font-medium leading-5 transition-all
                            ${selected
                              ? 'bg-white text-gray-900 shadow'
                              : 'text-gray-600 hover:text-gray-800'
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
                              ? 'bg-white text-gray-900 shadow'
                              : 'text-gray-600 hover:text-gray-800'
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
                              ? 'bg-white text-gray-900 shadow'
                              : 'text-gray-600 hover:text-gray-800'
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
                            <p className="text-center text-gray-500 py-8">
                              {t('auto_fill.no_high_confidence')}
                            </p>
                          ) : (
                            groupedSuggestions.green.map(renderSuggestionCard)
                          )}
                        </Tab.Panel>
                        <Tab.Panel className="space-y-3">
                          {groupedSuggestions.yellow.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">
                              {t('auto_fill.no_medium_confidence')}
                            </p>
                          ) : (
                            groupedSuggestions.yellow.map(renderSuggestionCard)
                          )}
                        </Tab.Panel>
                        <Tab.Panel className="space-y-3">
                          {groupedSuggestions.red.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">
                              {t('auto_fill.no_low_confidence')}
                            </p>
                          ) : (
                            groupedSuggestions.red.map(renderSuggestionCard)
                          )}
                        </Tab.Panel>
                      </Tab.Panels>
                    </Tab.Group>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    {t('auto_fill.human_in_loop_notice')}
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                  >
                    {t('close')}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
