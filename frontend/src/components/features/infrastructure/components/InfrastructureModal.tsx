"use client";

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
  resource?: any | null;
}

const infraSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(200),
  type: z.string().optional(),
  location: z.string().optional(),
  capacity: z.object({
    area_m2: z.preprocess((v) => (v === '' ? undefined : Number(v)), z.number().positive().optional()),
    units: z.preprocess((v) => (v === '' ? undefined : Number(v)), z.number().int().positive().optional()),
  }).optional(),
  description: z.string().optional(),
});

type InfraForm = z.infer<typeof infraSchema>;

export default function InfrastructureModal({ isOpen, onClose, resource }: Props) {
  const t = useTranslations('infrastructure');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isEditMode = !!resource?.id;
  const isAdmin = (user?.roles || []).includes('admin');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InfraForm>({
    resolver: zodResolver(infraSchema),
    defaultValues: { name: '', type: '', location: '', capacity: {}, description: '' } as any,
  });

  useEffect(() => {
    if (isOpen && resource) {
      reset({
        name: resource.name || '',
        type: resource.type || '',
        location: resource.location || '',
        capacity: resource.capacity || {},
        description: resource.description || '',
      } as any);
    } else if (isOpen && !resource) {
      reset({ name: '', type: '', location: '', capacity: {}, description: '' } as any);
    }
    setShowDeleteConfirm(false);
  }, [isOpen, resource, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: InfraForm) => {
      if (isEditMode) return apiClient.patch(`/api/v1/infrastructures/${resource!.id}`, data);
      return apiClient.post('/api/v1/infrastructures', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['infrastructures'] });
      reset();
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/infrastructures/${resource!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['infrastructures'] });
      onClose();
    },
  });

  const onSubmit = (data: InfraForm) => saveMutation.mutate(data);

  const tabs = [
    { name: t('tabs.basic') || 'Básico', content: (
      <div className="space-y-4">
        <FormInput label={t('name') || 'Nome'} error={errors.name} {...register('name')} required />
        <FormInput label={t('type') || 'Tipo'} {...register('type')} />
        <FormInput label={t('location') || 'Local'} {...register('location')} />
      </div>
    ) },
    { name: t('tabs.capacity') || 'Capacidade', content: (
      <div className="space-y-4">
        <FormInput label={t('area_m2') || 'Área (m²)'} {...register('capacity.area_m2' as const)} />
        <FormInput label={t('units') || 'Unidades'} {...register('capacity.units' as const)} />
        <FormTextarea label={t('description') || 'Descrição'} rows={4} {...register('description')} />
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
        <button type="submit" form="infrastructure-form" disabled={saveMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg">
          {saveMutation.isPending ? tCommon('saving') || 'Salvando' : (isEditMode ? tCommon('save') || 'Salvar' : t('create') || 'Criar')}
        </button>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? (resource?.name || t('untitled')) : (t('new') || 'Novo Recurso')}
      subtitle={isEditMode ? (resource?.type || '') : ''}
      size="lg"
      footer={isAdmin || isEditMode ? footerContent : undefined}
    >
      {!isAdmin && !isEditMode ? (
        <div className="py-12 px-6 text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">{t('noPermissionTitle') || 'Permissão necessária'}</p>
          <p className="text-sm text-gray-600 mb-6">{t('noPermissionMessage') || 'Você não possui permissão para criar recursos.'}</p>
          <div className="flex justify-center">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg">{tCommon('close') || 'Fechar'}</button>
          </div>
        </div>
      ) : (
        <form id="infrastructure-form" onSubmit={handleSubmit(onSubmit)}>
          <DeleteConfirmation
            isVisible={showDeleteConfirm && isEditMode}
            onConfirm={() => deleteMutation.mutate()}
            onCancel={() => setShowDeleteConfirm(false)}
            isDeleting={deleteMutation.isPending}
            message={t('deleteConfirmation') || 'Tem certeza que deseja excluir este recurso?'}
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
