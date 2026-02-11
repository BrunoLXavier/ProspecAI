"use client";
// Implements RF-03: Institute management modal with full DB schema fields
import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';
import { BaseModal, ModalTabs, DeleteConfirmation } from '@/components/features/shared/ui';
import { FormInput, FormTextarea, FormSelect, FormSwitch } from '@/components/features/shared/forms';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  institute?: any | null;
}

const instituteSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(200),
  sigla: z.string().max(20).optional().or(z.literal('')),
  tipo: z.string().optional().or(z.literal('')),
  cnpj: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  endereco_logradouro: z.string().optional().or(z.literal('')),
  endereco_cidade: z.string().optional().or(z.literal('')),
  endereco_uf: z.string().optional().or(z.literal('')),
  endereco_cep: z.string().optional().or(z.literal('')),
  telefone: z.string().optional().or(z.literal('')),
  email: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  area_atuacao: z.string().optional().or(z.literal('')),
  area_m2: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().positive().optional()),
  ano_fundacao: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().int().min(1800).max(2100).optional()),
  status: z.string().optional().or(z.literal('')),
  acreditacao_capes: z.boolean().optional(),
  acreditacao_embrapii: z.boolean().optional(),
});

type InstituteForm = z.infer<typeof instituteSchema>;

const STATUS_OPTIONS = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Inativo', label: 'Inativo' },
];

const TIPO_OPTIONS = [
  { value: 'ISI', label: 'ISI - Instituto SENAI de Inovação' },
  { value: 'IST', label: 'IST - Instituto SENAI de Tecnologia' },
  { value: 'CIS', label: 'CIS - Centro de Inovação SESI' },
  { value: 'Hub', label: 'Hub de Inovação' },
  { value: 'Outro', label: 'Outro' },
];

const UF_OPTIONS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
  'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
].map((uf) => ({ value: uf, label: uf }));

export default function InstituteModal({ isOpen, onClose, institute }: Props) {
  const t = useTranslations('institutes');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isEditMode = !!institute?.id;
  const isAdmin = (user?.roles || []).includes('admin');

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<InstituteForm>({
    resolver: zodResolver(instituteSchema),
    defaultValues: { name: '', status: 'Ativo', acreditacao_capes: false, acreditacao_embrapii: false } as any,
  });

  useEffect(() => {
    if (isOpen && institute) {
      reset({
        name: institute.name || '', sigla: institute.sigla || '', tipo: institute.tipo || '',
        cnpj: institute.cnpj || '', description: institute.description || '',
        endereco_logradouro: institute.endereco_logradouro || '',
        endereco_cidade: institute.endereco_cidade || institute.metadata?.city || '',
        endereco_uf: institute.endereco_uf || institute.metadata?.state || '',
        endereco_cep: institute.endereco_cep || '',
        telefone: institute.telefone || '', email: institute.email || '', website: institute.website || '',
        area_atuacao: institute.area_atuacao || '',
        area_m2: institute.area_m2 || institute.metadata?.area_m2 || undefined,
        ano_fundacao: institute.ano_fundacao || undefined,
        status: institute.status || 'Ativo',
        acreditacao_capes: institute.acreditacao_capes ?? false,
        acreditacao_embrapii: institute.acreditacao_embrapii ?? false,
      } as any);
    } else if (isOpen) {
      reset({ name: '', status: 'Ativo', acreditacao_capes: false, acreditacao_embrapii: false } as any);
    }
    setShowDeleteConfirm(false);
  }, [isOpen, institute, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: InstituteForm) => {
      if (isEditMode) return apiClient.patch(`/api/v1/institutes/${institute!.id}`, data);
      return apiClient.post('/api/v1/institutes', data);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['institutes'] }); reset(); onClose(); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/institutes/${institute!.id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['institutes'] }); onClose(); },
  });

  const onSubmit = (data: InstituteForm) => saveMutation.mutate(data);

  const tabs = [
    { name: t('tabs.basic') || 'Dados Básicos', content: (
      <div className="space-y-4">
        <FormInput label={t('name') || 'Nome'} error={errors.name} {...register('name')} required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label={t('sigla') || 'Sigla'} {...register('sigla')} placeholder="Ex: ISI B&F" />
          <Controller name="tipo" control={control} render={({ field }) => (
            <FormSelect label={t('type') || 'Tipo'} options={TIPO_OPTIONS} value={field.value || ''} onChange={field.onChange} />
          )} />
        </div>
        <FormInput label={t('cnpj') || 'CNPJ'} {...register('cnpj')} placeholder="00.000.000/0000-00" />
        <FormTextarea label={t('description') || 'Descrição'} rows={3} error={errors.description} {...register('description')} />
        <Controller name="status" control={control} render={({ field }) => (
          <FormSelect label={t('status') || 'Status'} options={STATUS_OPTIONS} value={field.value || 'Ativo'} onChange={field.onChange} />
        )} />
      </div>
    ) },
    { name: t('tabs.address') || 'Endereço', content: (
      <div className="space-y-4">
        <FormInput label={t('address') || 'Logradouro'} {...register('endereco_logradouro')} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2"><FormInput label={t('city') || 'Cidade'} {...register('endereco_cidade')} /></div>
          <Controller name="endereco_uf" control={control} render={({ field }) => (
            <FormSelect label={t('state') || 'UF'} options={UF_OPTIONS} value={field.value || ''} onChange={field.onChange} />
          )} />
        </div>
        <FormInput label={t('zipcode') || 'CEP'} {...register('endereco_cep')} placeholder="00000-000" />
      </div>
    ) },
    { name: t('tabs.contact') || 'Contato', content: (
      <div className="space-y-4">
        <FormInput label={t('phone') || 'Telefone'} {...register('telefone')} placeholder="+55 (00) 00000-0000" />
        <FormInput label={t('email') || 'E-mail'} type="email" {...register('email')} />
        <FormInput label={t('website') || 'Website'} {...register('website')} placeholder="https://" />
      </div>
    ) },
    { name: t('tabs.details') || 'Detalhes', content: (
      <div className="space-y-4">
        <FormInput label={t('focusArea') || 'Área de Atuação'} {...register('area_atuacao')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label={t('area_m2') || 'Área (m²)'} type="number" {...register('area_m2')} />
          <FormInput label={t('foundedYear') || 'Ano de Fundação'} type="number" {...register('ano_fundacao')} />
        </div>
        <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('accreditations') || 'Acreditações'}</p>
          <div className="space-y-3">
            <Controller name="acreditacao_capes" control={control} render={({ field }) => (
              <FormSwitch label="CAPES" checked={!!field.value} onChange={field.onChange} />
            )} />
            <Controller name="acreditacao_embrapii" control={control} render={({ field }) => (
              <FormSwitch label="EMBRAPII" checked={!!field.value} onChange={field.onChange} />
            )} />
          </div>
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
        <button type="submit" form="institute-form" disabled={isSubmitting || saveMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
          {isSubmitting || saveMutation.isPending ? tCommon('saving') || 'Salvando...' : (isEditMode ? tCommon('save') || 'Salvar' : t('create') || 'Criar')}
        </button>
      </div>
    </div>
  );

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}
      title={isEditMode ? (institute?.name || t('untitled')) : (t('new') || 'Novo Instituto')}
      subtitle={isEditMode ? `${institute?.sigla || ''} ${institute?.endereco_cidade ? `• ${institute.endereco_cidade}` : ''}`.trim() : ''}
      size="lg" footer={isAdmin || isEditMode ? footerContent : undefined}>
      {!isAdmin && !isEditMode ? (
        <div className="py-12 px-6 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('noPermissionTitle') || 'Permissão necessária'}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{t('noPermissionMessage') || 'Você não possui permissão para criar um instituto.'}</p>
          <div className="flex justify-center"><button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">{tCommon('close') || 'Fechar'}</button></div>
        </div>
      ) : (
        <form id="institute-form" onSubmit={handleSubmit(onSubmit)}>
          <DeleteConfirmation isVisible={showDeleteConfirm && isEditMode} onConfirm={() => deleteMutation.mutate()} onCancel={() => setShowDeleteConfirm(false)} isDeleting={deleteMutation.isPending} message={t('deleteConfirmation') || 'Tem certeza que deseja excluir este instituto?'} />
          <ModalTabs tabs={tabs as any} />
          {saveMutation.error && <p className="mt-4 text-sm text-red-600 dark:text-red-400 text-center">{isEditMode ? t('updateError') : t('createError')}</p>}
        </form>
      )}
    </BaseModal>
  );
}
