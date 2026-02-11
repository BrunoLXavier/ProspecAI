"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';
import { BaseModal, ModalFooter, ModalTabs, DeleteConfirmation } from '@/components/features/shared/ui';
import { FormInput, FormTextarea } from '@/components/features/shared/forms';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  institute?: any | null;
}

const instituteSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(200, 'Máx 200 caracteres'),
  description: z.string().optional(),
  metadata: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    area_m2: z.preprocess((v) => (v === '' ? undefined : Number(v)), z.number().positive().optional()),
  }).optional(),
});

type InstituteForm = z.infer<typeof instituteSchema>;

export default function InstituteModal({ isOpen, onClose, institute }: Props) {
  const t = useTranslations('institutes');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isEditMode = !!institute?.id;
  const isAdmin = (user?.roles || []).includes('admin');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InstituteForm>({
    resolver: zodResolver(instituteSchema),
    defaultValues: { name: '', description: '', metadata: {} } as any,
  });

  useEffect(() => {
    if (isOpen && institute) {
      reset({
        name: institute.name || '',
        description: institute.description || '',
        metadata: institute.metadata || {},
      } as any);
    } else if (isOpen && !institute) {
      reset({ name: '', description: '', metadata: {} } as any);
    }
    setShowDeleteConfirm(false);
  }, [isOpen, institute, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: InstituteForm) => {
      if (isEditMode) return apiClient.patch(`/api/v1/institutes/${institute!.id}`, data);
      return apiClient.post('/api/v1/institutes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutes'] });
      reset();
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/institutes/${institute!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutes'] });
      onClose();
    },
  });

  const onSubmit = (data: InstituteForm) => saveMutation.mutate(data);

  const tabs = [
    { name: t('tabs.basic') || 'Básico', content: (
      <div className="space-y-4">
        <FormInput label={t('name') || 'Nome'} error={errors.name} {...register('name')} required />
        <FormTextarea label={t('description') || 'Descrição'} rows={4} error={errors.description} {...register('description')} />
      </div>
    ) },
    { name: t('tabs.metadata') || 'Metadados', content: (
      <div className="space-y-4">
        <FormInput label={t('city') || 'Cidade'} {...register('metadata.city' as const)} />
        <FormInput label={t('state') || 'Estado'} {...register('metadata.state' as const)} />
        <FormInput label={t('area_m2') || 'Área (m²)'} {...register('metadata.area_m2' as const)} />
      </div>
    ) },
  ];

  const footerContent = (
    <div className="flex items-center justify-between">
      <div>
        {isEditMode && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
            disabled={deleteMutation.isPending}
          >
            {tCommon('delete') || 'Excluir'}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg">
          {tCommon('cancel') || 'Cancelar'}
        </button>
        <button type="submit" form="institute-form" disabled={isSubmitting || saveMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg">
          {isSubmitting || saveMutation.isPending ? tCommon('saving') || 'Salvando' : (isEditMode ? tCommon('save') || 'Salvar' : t('create') || 'Criar')}
        </button>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? (institute?.name || t('untitled')) : (t('new') || 'Novo Instituto')}
      subtitle={isEditMode ? (institute?.metadata?.city || '') : ''}
      size="lg"
      footer={isAdmin || isEditMode ? footerContent : undefined}
    >
      {!isAdmin && !isEditMode ? (
        <div className="py-12 px-6 text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">{t('noPermissionTitle') || 'Permissão necessária'}</p>
          <p className="text-sm text-gray-600 mb-6">{t('noPermissionMessage') || 'Você não possui permissão para criar um instituto.'}</p>
          <div className="flex justify-center">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg">{tCommon('close') || 'Fechar'}</button>
          </div>
        </div>
      ) : (
        <form id="institute-form" onSubmit={handleSubmit(onSubmit)}>
          <DeleteConfirmation
            isVisible={showDeleteConfirm && isEditMode}
            onConfirm={() => deleteMutation.mutate()}
            onCancel={() => setShowDeleteConfirm(false)}
            isDeleting={deleteMutation.isPending}
            message={t('deleteConfirmation') || 'Tem certeza que deseja excluir este instituto?'}
          />

          <ModalTabs tabs={tabs as any} />

          {saveMutation.error && (
            <p className="mt-4 text-sm text-red-600 text-center">{isEditMode ? t('updateError') : t('createError')}</p>
          )}
        </form>
      )}
    </BaseModal>
  );
}
