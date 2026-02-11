"use client";
// Implements RF-03: Team management modal with full DB schema fields
import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';
import { BaseModal, ModalTabs, DeleteConfirmation } from '@/components/features/shared/ui';
import { FormInput, FormTextarea, FormSelect } from '@/components/features/shared/forms';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  team?: any | null;
}

const teamSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório').max(200),
  cargo: z.string().optional().or(z.literal('')),
  departamento: z.string().optional().or(z.literal('')),
  especializacao: z.string().optional().or(z.literal('')),
  vinculo_principal: z.string().optional().or(z.literal('')),
  formacao: z.string().optional().or(z.literal('')),
  experiencia_anos: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().int().min(0).optional()),
  email_profissional: z.string().email().optional().or(z.literal('')),
  telefone_profissional: z.string().optional().or(z.literal('')),
  lattes_url: z.string().url().optional().or(z.literal('')),
  linkedin_url: z.string().url().optional().or(z.literal('')),
  orcid: z.string().optional().or(z.literal('')),
  researchgate: z.string().optional().or(z.literal('')),
});

type TeamForm = z.infer<typeof teamSchema>;

const VINCULO_OPTIONS = [
  { value: 'CLT', label: 'CLT' },
  { value: 'Bolsista', label: 'Bolsista' },
  { value: 'Consultor', label: 'Consultor' },
  { value: 'Estagiário', label: 'Estagiário' },
  { value: 'PJ', label: 'PJ' },
  { value: 'Outro', label: 'Outro' },
];

export default function TeamModal({ isOpen, onClose, team }: Props) {
  const t = useTranslations('teams');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isEditMode = !!team?.id;
  const isAdmin = (user?.roles || []).includes('admin');

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<TeamForm>({
    resolver: zodResolver(teamSchema),
    defaultValues: { nome: '' } as any,
  });

  useEffect(() => {
    if (isOpen && team) {
      reset({
        nome: team.nome || team.name || '',
        cargo: team.cargo || '', departamento: team.departamento || '',
        especializacao: team.especializacao || '', vinculo_principal: team.vinculo_principal || '',
        formacao: team.formacao || '', experiencia_anos: team.experiencia_anos ?? undefined,
        email_profissional: team.email_profissional || '',
        telefone_profissional: team.telefone_profissional || '',
        lattes_url: team.lattes_url || '', linkedin_url: team.linkedin_url || '',
        orcid: team.orcid || '', researchgate: team.researchgate || '',
      } as any);
    } else if (isOpen) {
      reset({ nome: '' } as any);
    }
    setShowDeleteConfirm(false);
  }, [isOpen, team, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: TeamForm) => {
      if (isEditMode) return apiClient.patch(`/api/v1/teams/${team!.id}`, data);
      return apiClient.post('/api/v1/teams', data);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); reset(); onClose(); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/teams/${team!.id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); onClose(); },
  });

  const onSubmit = (data: TeamForm) => saveMutation.mutate(data);

  const tabs = [
    { name: t('tabs.basic') || 'Dados Pessoais', content: (
      <div className="space-y-4">
        <FormInput label={t('name') || 'Nome Completo'} error={errors.nome} {...register('nome')} required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label={t('role') || 'Cargo'} {...register('cargo')} />
          <FormInput label={t('department') || 'Departamento'} {...register('departamento')} />
        </div>
        <FormInput label={t('specialization') || 'Especialização'} {...register('especializacao')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Controller name="vinculo_principal" control={control} render={({ field }) => (
            <FormSelect label={t('bond') || 'Vínculo Principal'} options={VINCULO_OPTIONS} value={field.value || ''} onChange={field.onChange} />
          )} />
          <FormInput label={t('experience') || 'Experiência (anos)'} type="number" min={0} {...register('experiencia_anos')} />
        </div>
        <FormInput label={t('education') || 'Formação'} {...register('formacao')} />
      </div>
    ) },
    { name: t('tabs.contact') || 'Contato', content: (
      <div className="space-y-4">
        <FormInput label={t('professionalEmail') || 'E-mail Profissional'} type="email" {...register('email_profissional')} />
        <FormInput label={t('professionalPhone') || 'Telefone Profissional'} {...register('telefone_profissional')} placeholder="+55 (00) 00000-0000" />
      </div>
    ) },
    { name: t('tabs.academic') || 'Acadêmico', content: (
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('academicHelp') || 'Links para perfis acadêmicos e de pesquisa'}</p>
        <FormInput label="Lattes" {...register('lattes_url')} placeholder="https://lattes.cnpq.br/..." />
        <FormInput label="LinkedIn" {...register('linkedin_url')} placeholder="https://linkedin.com/in/..." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="ORCID" {...register('orcid')} placeholder="0000-0000-0000-0000" />
          <FormInput label="ResearchGate" {...register('researchgate')} placeholder="https://researchgate.net/profile/..." />
        </div>
      </div>
    ) },
  ];

  const footerContent = (
    <div className="flex items-center justify-between">
      <div>{isEditMode && (
        <button type="button" onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" disabled={deleteMutation.isPending}>{tCommon('delete') || 'Excluir'}</button>
      )}</div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600">{tCommon('cancel') || 'Cancelar'}</button>
        <button type="submit" form="team-form" disabled={isSubmitting || saveMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
          {isSubmitting || saveMutation.isPending ? tCommon('saving') || 'Salvando...' : (isEditMode ? tCommon('save') || 'Salvar' : t('create') || 'Criar')}
        </button>
      </div>
    </div>
  );

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}
      title={isEditMode ? (team?.nome || team?.name || t('untitled')) : (t('new') || 'Novo Membro')}
      subtitle={isEditMode ? (team?.cargo || '') : ''}
      size="lg" footer={isAdmin || isEditMode ? footerContent : undefined}>
      {!isAdmin && !isEditMode ? (
        <div className="py-12 px-6 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('noPermissionTitle') || 'Permissão necessária'}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{t('noPermissionMessage') || 'Você não possui permissão para criar membros.'}</p>
          <div className="flex justify-center"><button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">{tCommon('close') || 'Fechar'}</button></div>
        </div>
      ) : (
        <form id="team-form" onSubmit={handleSubmit(onSubmit)}>
          <DeleteConfirmation isVisible={showDeleteConfirm && isEditMode} onConfirm={() => deleteMutation.mutate()} onCancel={() => setShowDeleteConfirm(false)} isDeleting={deleteMutation.isPending} message={t('deleteConfirmation') || 'Tem certeza que deseja excluir este membro?'} />
          <ModalTabs tabs={tabs as any} />
          {saveMutation.error && <p className="mt-4 text-sm text-red-600 dark:text-red-400 text-center">{isEditMode ? t('updateError') : t('createError')}</p>}
        </form>
      )}
    </BaseModal>
  );
}
