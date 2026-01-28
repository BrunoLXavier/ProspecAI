/**
 * DynamicProposalForm Component
 * Form that dynamically renders fields based on funding source template
 * Implements RF-08: Template-based proposals with auto-fill support
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosProgressEvent } from 'axios';
import {
  SparklesIcon,
  DocumentArrowUpIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import DynamicFieldInput, { FieldTemplate, AutoFillSuggestion } from './DynamicFieldInput';
import { Button } from '@/components/features/shared/ui';
import apiClient from '@/lib/api-client';

interface DynamicProposalFormProps {
  proposalId?: string;
  fundingSourceId?: string;
  templateId?: string;
  initialValues?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>, commitMessage?: string) => Promise<void>;
  onCancel?: () => void;
  mode: 'create' | 'edit';
}

interface TemplateData {
  template: {
    id: string;
    name: string;
    description?: string;
  };
  standard_fields: FieldTemplate[];
  template_fields: FieldTemplate[];
  merged_fields: FieldTemplate[];
}

export default function DynamicProposalForm({
  proposalId,
  fundingSourceId,
  templateId,
  initialValues = {},
  onSubmit,
  onCancel,
  mode,
}: DynamicProposalFormProps) {
  const t = useTranslations('proposals');
  const queryClient = useQueryClient();
  
  const [commitMessage, setCommitMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [suggestions, setSuggestions] = useState<Record<string, AutoFillSuggestion>>({});
  
  // Fetch template and fields for this funding source
  const { data: templateData, isLoading: isLoadingTemplate } = useQuery<TemplateData>({
    queryKey: ['proposal-template', fundingSourceId, templateId],
    queryFn: async () => {
      if (templateId) {
        return apiClient.get(`/proposals/templates/${templateId}`);
      } else if (fundingSourceId) {
        return apiClient.get(`/proposals/templates/for-funding/${fundingSourceId}`);
      }
      // Return standard fields only
      const standardFields = await apiClient.get('/proposals/templates/standard-fields');
      return {
        template: { id: 'generic', name: 'Template Genérico' },
        standard_fields: standardFields,
        template_fields: [],
        merged_fields: standardFields,
      };
    },
    enabled: true,
  });

  // Fetch auto-fill suggestions if editing
  const { data: suggestionsData } = useQuery({
    queryKey: ['proposal-suggestions', proposalId],
    queryFn: () => apiClient.get(`/proposals/${proposalId}/auto-fill/suggestions?status_filter=pending`),
    enabled: mode === 'edit' && !!proposalId,
    refetchInterval: 5000, // Poll for new suggestions
  });

  // Update suggestions state when data changes
  useEffect(() => {
    if (suggestionsData) {
      const suggestionsMap: Record<string, AutoFillSuggestion> = {};
      (suggestionsData as AutoFillSuggestion[]).forEach((s) => {
        suggestionsMap[s.field_key] = s;
      });
      setSuggestions(suggestionsMap);
    }
  }, [suggestionsData]);

  // Form setup
  const methods = useForm<Record<string, unknown>>({
    defaultValues: initialValues,
  });

  const { handleSubmit, setValue, formState: { isSubmitting, isDirty } } = methods;

  // Accept suggestion mutation
  const acceptSuggestionMutation = useMutation({
    mutationFn: async ({ suggestionId, value }: { suggestionId: string; value: unknown }) => {
      return apiClient.post(
        `/proposals/${proposalId}/auto-fill/suggestions/${suggestionId}/confirm?accept=true`,
        { corrected_value: value }
      );
    },
    onSuccess: (_, variables) => {
      // Update form value
      const suggestion = Object.values(suggestions).find((s) => s.id === variables.suggestionId);
      if (suggestion) {
        setValue(suggestion.field_key, variables.value, { shouldDirty: true });
        // Remove from pending suggestions
        setSuggestions((prev) => {
          const updated = { ...prev };
          delete updated[suggestion.field_key];
          return updated;
        });
      }
      queryClient.invalidateQueries({ queryKey: ['proposal-suggestions', proposalId] });
    },
  });

  // Reject suggestion mutation
  const rejectSuggestionMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      return apiClient.post(
        `/proposals/${proposalId}/auto-fill/suggestions/${suggestionId}/confirm?accept=false`
      );
    },
    onSuccess: (_, suggestionId) => {
      const suggestion = Object.values(suggestions).find((s) => s.id === suggestionId);
      if (suggestion) {
        setSuggestions((prev) => {
          const updated = { ...prev };
          delete updated[suggestion.field_key];
          return updated;
        });
      }
      queryClient.invalidateQueries({ queryKey: ['proposal-suggestions', proposalId] });
    },
  });

  // Accept all high-confidence suggestions
  const acceptAllMutation = useMutation({
    mutationFn: async (minConfidence: number) => {
      return apiClient.post(
        `/proposals/${proposalId}/auto-fill/confirm-all?min_confidence=${minConfidence}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-suggestions', proposalId] });
      queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] });
    },
  });

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('enable_auto_fill', 'true');
      
      return apiClient.post(
        `/proposals/${proposalId}/attachments`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            setUploadProgress(percent);
          },
        }
      );
    },
    onSuccess: () => {
      setIsUploading(false);
      setUploadProgress(0);
      queryClient.invalidateQueries({ queryKey: ['proposal-attachments', proposalId] });
    },
    onError: () => {
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  // Handle file drop/select
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !proposalId) return;
    
    setIsUploading(true);
    for (const file of Array.from(files)) {
      await uploadMutation.mutateAsync(file);
    }
  }, [proposalId, uploadMutation]);

  // Form submission handler
  const handleFormSubmit = async (data: Record<string, unknown>) => {
    await onSubmit(data, mode === 'edit' ? commitMessage : undefined);
  };

  // Sort fields by order
  const sortedFields = (templateData?.merged_fields || []).sort((a, b) => a.order - b.order);

  // Count pending suggestions
  const pendingSuggestionsCount = Object.values(suggestions).filter(
    (s) => s.status === 'pending'
  ).length;

  // Count high confidence suggestions (>80%)
  const highConfidenceCount = Object.values(suggestions).filter(
    (s) => s.status === 'pending' && s.confidence_score >= 0.8
  ).length;

  if (isLoadingTemplate) {
    return (
      <div className="flex items-center justify-center p-8">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">{t('loading_template')}</span>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Template info header */}
        {templateData?.template && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800">
              {templateData.template.name}
            </h3>
            {templateData.template.description && (
              <p className="text-sm text-blue-600 mt-1">
                {templateData.template.description}
              </p>
            )}
          </div>
        )}

        {/* Auto-fill banner (if editing and has suggestions) */}
        {mode === 'edit' && pendingSuggestionsCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <SparklesIcon className="h-6 w-6 text-amber-600 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-amber-800">
                    {t('auto_fill.suggestions_available', { count: pendingSuggestionsCount })}
                  </h3>
                  <p className="text-sm text-amber-600 mt-1">
                    {t('auto_fill.review_suggestions')}
                  </p>
                </div>
              </div>
              {highConfidenceCount > 0 && (
                <button
                  type="button"
                  onClick={() => acceptAllMutation.mutate(0.8)}
                  disabled={acceptAllMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-md text-sm hover:bg-amber-700 disabled:opacity-50"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  {t('auto_fill.accept_all_high', { count: highConfidenceCount })}
                </button>
              )}
            </div>
          </div>
        )}

        {/* File upload area (for editing only) */}
        {mode === 'edit' && proposalId && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.docx,.doc,.txt"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <DocumentArrowUpIcon className="h-10 w-10 text-gray-400 mb-2" />
              <span className="text-sm font-medium text-gray-700">
                {t('upload.drag_drop')}
              </span>
              <span className="text-xs text-gray-500 mt-1">
                {t('upload.supported_formats')}
              </span>
            </label>
            
            {isUploading && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 mt-1">
                  {t('upload.progress', { percent: uploadProgress })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Dynamic fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedFields.map((field) => (
            <div 
              key={field.field_key}
              className={
                ['textarea', 'richtext', 'object', 'array'].includes(field.field_type)
                  ? 'md:col-span-2'
                  : ''
              }
            >
              <DynamicFieldInput
                field={field}
                register={methods.register}
                control={methods.control}
                errors={methods.formState.errors}
                suggestion={suggestions[field.field_key]}
                onAcceptSuggestion={(suggestionId, value) =>
                  acceptSuggestionMutation.mutate({ suggestionId, value })
                }
                onRejectSuggestion={(suggestionId) =>
                  rejectSuggestionMutation.mutate(suggestionId)
                }
              />
            </div>
          ))}
        </div>

        {/* Commit message (for edit mode) */}
        {mode === 'edit' && (
          <div className="border-t border-gray-200 pt-4">
            <label 
              htmlFor="commit-message" 
              className="block text-sm font-medium text-gray-700"
            >
              {t('version.commit_message')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="commit-message"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder={t('version.commit_placeholder')}
              className="mt-1 block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('version.commit_help')}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
            >
              {t('cancel')}
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || (mode === 'edit' && (!isDirty || !commitMessage.trim()))}
            isLoading={isSubmitting}
          >
            {mode === 'create' ? t('create') : t('save_version')}
          </Button>
        </div>

        {/* Validation warning for edit mode */}
        {mode === 'edit' && isDirty && !commitMessage.trim() && (
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <ExclamationTriangleIcon className="h-5 w-5" />
            {t('version.commit_required')}
          </div>
        )}
      </form>
    </FormProvider>
  );
}
