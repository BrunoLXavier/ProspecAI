"use client";

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';
import { BaseModal, ModalFooter, ModalTabs, DeleteConfirmation } from '@/components/features/shared/ui';
import { FormInput, FormTextarea, FormTagInput } from '@/components/features/shared/forms';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  team?: any | null;
}

const teamSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(200),
  description: z.string().optional(),
  member_ids: z.array(z.string()).optional(),
});

type TeamForm = z.infer<typeof teamSchema>;

export default function TeamModal({ isOpen, onClose, team }: Props) {
  const t = useTranslations('teams');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isEditMode = !!team?.id;
  const isAdmin = (user?.roles || []).includes('admin');

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<TeamForm>({
    resolver: zodResolver(teamSchema),
    defaultValues: { name: '', description: '', member_ids: [] } as any,
  });

  useEffect(() => {
    if (isOpen && team) {
      reset({ name: team.name || '', description: team.description || '', member_ids: team.member_ids || [] } as any);
    } else if (isOpen && !team) {
      reset({ name: '', description: '', member_ids: [] } as any);
    }
    setShowDeleteConfirm(false);
  }, [isOpen, team, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: TeamForm) => {
      if (isEditMode) return apiClient.patch(`/api/v1/teams/${team!.id}`, data);
      return apiClient.post('/api/v1/teams', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      reset();
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/teams/${team!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      onClose();
    },
  });

  const onSubmit = (data: TeamForm) => saveMutation.mutate(data);

  const tabs = [
    { name: t('tabs.basic') || 'Básico', content: (
      <div className="space-y-4">
        <FormInput label={t('name') || 'Nome'} error={errors.name} {...register('name')} required />
        <FormTextarea label={t('description') || 'Descrição'} rows={4} {...register('description')} />
      </div>
    ) },
    { name: t('tabs.members') || 'Membros', content: (
      <div className="space-y-4">
        <Controller
          name="member_ids"
          control={control}
          render={({ field }) => (
            <FormTagInput label={t('members') || 'Membros'} value={field.value || []} onChange={field.onChange} placeholder={t('membersPlaceholder') || ''} />
          )}
        />
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
        <button type="submit" form="team-form" disabled={saveMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg">
          {saveMutation.isPending ? tCommon('saving') || 'Salvando' : (isEditMode ? tCommon('save') || 'Salvar' : t('create') || 'Criar')}
        </button>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? (team?.name || t('untitled')) : (t('new') || 'Nova Equipe')}
      subtitle={isEditMode ? (team?.description || '') : ''}
      size="md"
      footer={isAdmin || isEditMode ? footerContent : undefined}
    >
      {!isAdmin && !isEditMode ? (
        <div className="py-12 px-6 text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">{t('noPermissionTitle') || 'Permissão necessária'}</p>
          <p className="text-sm text-gray-600 mb-6">{t('noPermissionMessage') || 'Você não possui permissão para criar equipes.'}</p>
          <div className="flex justify-center">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg">{tCommon('close') || 'Fechar'}</button>
          </div>
        </div>
      ) : (
        <form id="team-form" onSubmit={handleSubmit(onSubmit)}>
          <DeleteConfirmation
            isVisible={showDeleteConfirm && isEditMode}
            onConfirm={() => deleteMutation.mutate()}
            onCancel={() => setShowDeleteConfirm(false)}
            isDeleting={deleteMutation.isPending}
            message={t('deleteConfirmation') || 'Tem certeza que deseja excluir esta equipe?'}
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
