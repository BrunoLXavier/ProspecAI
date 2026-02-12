/**
 * useEntityForm — Unified Entity Form Hook
 * Encapsulates useForm + zodResolver + useMutation + reset logic
 * for create, edit, and view modes. This is the SINGLE hook for
 * all entity modal form logic.
 *
 * Absorbs ~100 lines of identical boilerplate from every feature modal.
 *
 * Usage:
 *   const entityForm = useEntityForm({
 *     definition: fundingDefinition,
 *     entity: selectedFunding,
 *     mode: 'edit',
 *   });
 *
 * Implements RF-01 through RF-09: Standardized entity form orchestration
 */
'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { EntityFormDefinition } from '@/lib/form-registry/types';
import { buildZodSchema } from '@/lib/form-registry/build-zod-schema';
import { useToast } from '@/contexts/ToastContext';
import apiClient from '@/lib/api-client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type EntityFormMode = 'create' | 'edit' | 'view';

export interface UseEntityFormConfig<T = any> {
  /** Entity form definition from the registry */
  definition: EntityFormDefinition<T>;
  /** Existing entity for edit/view mode (null for create) */
  entity?: T | null;
  /** Form mode */
  mode?: EntityFormMode;
  /** Override API endpoint (defaults to definition.apiEndpoint) */
  apiEndpoint?: string;
  /** React Query cache key to invalidate on success */
  queryKey?: string;
  /** Callback after successful create/update */
  onSuccess?: (data: any) => void;
  /** Callback after successful delete */
  onDeleteSuccess?: () => void;
  /** Callback on error */
  onError?: (error: any) => void;
  /** Additional data to merge into the submission payload */
  extraData?: Record<string, any>;
}

export interface UseEntityFormReturn<T = any> {
  /** react-hook-form instance */
  form: UseFormReturn<any>;
  /** Current form mode */
  mode: EntityFormMode;
  /** Submit handler for create/update */
  onSubmit: () => void;
  /** Delete handler */
  onDelete: () => void;
  /** Whether form is submitting (create/update) */
  isSubmitting: boolean;
  /** Whether delete is in progress */
  isDeleting: boolean;
  /** Whether the modal was just successfully submitted */
  isSuccess: boolean;
  /** Server error message (if any) */
  serverError: string | null;
  /** The entity form definition */
  definition: EntityFormDefinition<T>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useEntityForm<T extends Record<string, any> = any>(
  config: UseEntityFormConfig<T>
): UseEntityFormReturn<T> {
  const {
    definition,
    entity,
    mode: initialMode,
    apiEndpoint,
    queryKey,
    onSuccess,
    onDeleteSuccess,
    onError,
    extraData,
  } = config;

  const mode: EntityFormMode = initialMode ?? (entity ? 'edit' : 'create');
  const endpoint = apiEndpoint ?? definition.apiEndpoint;
  const cacheKey = queryKey ?? definition.entityKey;

  const t = useTranslations('validation');
  const tToast = useTranslations('toast');
  const queryClient = useQueryClient();

  let toast: ReturnType<typeof useToast> | null = null;
  try {
    toast = useToast();
  } catch {
    // ToastProvider not available — skip toast notifications
  }

  // Build Zod schema with i18n messages
  const schema = useMemo(
    () => buildZodSchema(definition, t, mode === 'view' ? 'edit' : mode),
    [definition, t, mode]
  );

  // Initialize react-hook-form
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: definition.defaultValues as any,
    mode: 'onBlur',
  });

  // Reset form when entity changes (edit/view mode)
  useEffect(() => {
    if (entity && (mode === 'edit' || mode === 'view')) {
      // Map entity fields to form values using definition field names
      // The API interceptor already converts snake_case → camelCase
      const values: Record<string, any> = {};
      for (const field of definition.fields) {
        const entityValue = (entity as any)[field.name];
        if (entityValue !== undefined) {
          values[field.name] = entityValue;
        }
      }
      form.reset({ ...definition.defaultValues, ...values } as any);
    } else if (mode === 'create') {
      form.reset(definition.defaultValues as any);
    }
  }, [entity, mode, definition, form]);

  // ── Create/Update Mutation ──────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = extraData ? { ...data, ...extraData } : data;
      if (mode === 'edit' && entity && (entity as any).id) {
        return apiClient.patch(`${endpoint}/${(entity as any).id}`, payload);
      }
      return apiClient.post(endpoint, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [cacheKey] });
      const messageKey = mode === 'edit' ? 'updateSuccess' : 'createSuccess';
      toast?.success(messageKey);
      onSuccess?.(data);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || 'Unknown error';
      toast?.error('operationFailed');
      onError?.(error);
    },
  });

  // ── Delete Mutation ─────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!entity || !(entity as any).id) throw new Error('No entity to delete');
      return apiClient.delete(`${endpoint}/${(entity as any).id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [cacheKey] });
      toast?.success('deleteSuccess');
      onDeleteSuccess?.();
    },
    onError: (error: any) => {
      toast?.error('deleteFailed');
      onError?.(error);
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────

  const onSubmit = useCallback(() => {
    form.handleSubmit((data: any) => {
      saveMutation.mutate(data);
    })();
  }, [form, saveMutation]);

  const onDelete = useCallback(() => {
    deleteMutation.mutate();
  }, [deleteMutation]);

  // ── Server Error ────────────────────────────────────────────────────────

  const serverError = useMemo(() => {
    const saveErr = saveMutation.error as any;
    const delErr = deleteMutation.error as any;
    const err = saveErr || delErr;
    if (!err) return null;
    return err?.response?.data?.detail || err?.message || 'Unknown error';
  }, [saveMutation.error, deleteMutation.error]);

  return {
    form,
    mode,
    onSubmit,
    onDelete,
    isSubmitting: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSuccess: saveMutation.isSuccess,
    serverError,
    definition,
  };
}

export default useEntityForm;
