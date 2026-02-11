"use client";
// Implements RF-03: Infrastructure management modal with full DB schema fields
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
  resource?: any | null;
}

const infraSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(200),
  descricao: z.string().optional().or(z.literal('')),
  tipo: z.string().optional().or(z.literal('')),
  status: z.string().optional().or(z.literal('')),
  endereco: z.string().optional().or(z.literal('')),
  email_responsavel: z.string().optional().or(z.literal('')),
  telefone_responsavel: z.string().optional().or(z.literal('')),
  area_m2: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().positive().optional()),
  capacidade_atendimentos: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().int().positive().optional()),
  // Maturity fields
  maturidade_gestao: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().min(0).max(5).optional()),
  maturidade_base_tecnologica: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().min(0).max(5).optional()),
  maturidade_produtos_servicos: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().min(0).max(5).optional()),
  maturidade_cooperacao: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().min(0).max(5).optional()),
  maturidade_regulatoria: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().min(0).max(5).optional()),
  maturidade_laboratorial: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().min(0).max(5).optional()),
  description: z.string().optional().or(z.literal('')),
});

type InfraForm = z.infer<typeof infraSchema>;

const STATUS_OPTIONS = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Em Manutenção', label: 'Em Manutenção' },
  { value: 'Inativo', label: 'Inativo' },
];

const TIPO_OPTIONS = [
  { value: 'Laboratório', label: 'Laboratório' },
  { value: 'Oficina', label: 'Oficina' },
  { value: 'Fábrica', label: 'Fábrica' },
  { value: 'Escritório', label: 'Escritório' },
  { value: 'Data Center', label: 'Data Center' },
  { value: 'Outro', label: 'Outro' },
];

export default function InfrastructureModal({ isOpen, onClose, resource }: Props) {
  const t = useTranslations('infrastructure');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isEditMode = !!resource?.id;
  const isAdmin = (user?.roles || []).includes('admin');

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<InfraForm>({
    resolver: zodResolver(infraSchema),
    defaultValues: { name: '', status: 'Ativo' } as any,
  });

  useEffect(() => {
    if (isOpen && resource) {
      reset({
        name: resource.name || '', descricao: resource.descricao || resource.description || '',
        tipo: resource.tipo || resource.type || '', status: resource.status || 'Ativo',
        endereco: resource.endereco || resource.location || '',
        email_responsavel: resource.email_responsavel || '',
        telefone_responsavel: resource.telefone_responsavel || '',
        area_m2: resource.area_m2 || resource.capacity?.area_m2 || undefined,
        capacidade_atendimentos: resource.capacidade_atendimentos || resource.capacity?.units || undefined,
        maturidade_gestao: resource.maturidade_gestao ?? undefined,
        maturidade_base_tecnologica: resource.maturidade_base_tecnologica ?? undefined,
        maturidade_produtos_servicos: resource.maturidade_produtos_servicos ?? undefined,
        maturidade_cooperacao: resource.maturidade_cooperacao ?? undefined,
        maturidade_regulatoria: resource.maturidade_regulatoria ?? undefined,
        maturidade_laboratorial: resource.maturidade_laboratorial ?? undefined,
        description: resource.description || '',
      } as any);
    } else if (isOpen) {
      reset({ name: '', status: 'Ativo' } as any);
    }
    setShowDeleteConfirm(false);
  }, [isOpen, resource, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: InfraForm) => {
      if (isEditMode) return apiClient.patch(`/api/v1/infrastructures/${resource!.id}`, data);
      return apiClient.post('/api/v1/infrastructures', data);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['infrastructures'] }); reset(); onClose(); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/infrastructures/${resource!.id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['infrastructures'] }); onClose(); },
  });

  const onSubmit = (data: InfraForm) => saveMutation.mutate(data);

  const tabs = [
    { name: t('tabs.basic') || 'Dados Básicos', content: (
      <div className="space-y-4">
        <FormInput label={t('name') || 'Nome'} error={errors.name} {...register('name')} required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Controller name="tipo" control={control} render={({ field }) => (
            <FormSelect label={t('type') || 'Tipo'} options={TIPO_OPTIONS} value={field.value || ''} onChange={field.onChange} />
          )} />
          <Controller name="status" control={control} render={({ field }) => (
            <FormSelect label={t('status') || 'Status'} options={STATUS_OPTIONS} value={field.value || 'Ativo'} onChange={field.onChange} />
          )} />
        </div>
        <FormTextarea label={t('description') || 'Descrição'} rows={3} {...register('descricao')} />
        <FormInput label={t('location') || 'Endereço'} {...register('endereco')} />
      </div>
    ) },
    { name: t('tabs.contact') || 'Contato e Capacidade', content: (
      <div className="space-y-4">
        <FormInput label={t('email') || 'E-mail do Responsável'} type="email" {...register('email_responsavel')} />
        <FormInput label={t('phone') || 'Telefone do Responsável'} {...register('telefone_responsavel')} placeholder="+55 (00) 00000-0000" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label={t('area_m2') || 'Área (m²)'} type="number" {...register('area_m2')} />
          <FormInput label={t('units') || 'Capacidade de Atendimentos'} type="number" {...register('capacidade_atendimentos')} />
        </div>
      </div>
    ) },
    { name: t('tabs.maturity') || 'Maturidade', content: (
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('maturityHelp') || 'Escala de 0 a 5 para cada dimensão de maturidade'}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label={t('maturityManagement') || 'Gestão'} type="number" min={0} max={5} step={1} {...register('maturidade_gestao')} />
          <FormInput label={t('maturityTechBase') || 'Base Tecnológica'} type="number" min={0} max={5} step={1} {...register('maturidade_base_tecnologica')} />
          <FormInput label={t('maturityProducts') || 'Produtos/Serviços'} type="number" min={0} max={5} step={1} {...register('maturidade_produtos_servicos')} />
          <FormInput label={t('maturityCooperation') || 'Cooperação'} type="number" min={0} max={5} step={1} {...register('maturidade_cooperacao')} />
          <FormInput label={t('maturityRegulatory') || 'Regulatória'} type="number" min={0} max={5} step={1} {...register('maturidade_regulatoria')} />
          <FormInput label={t('maturityLab') || 'Laboratorial'} type="number" min={0} max={5} step={1} {...register('maturidade_laboratorial')} />
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
        <button type="submit" form="infrastructure-form" disabled={isSubmitting || saveMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
          {isSubmitting || saveMutation.isPending ? tCommon('saving') || 'Salvando...' : (isEditMode ? tCommon('save') || 'Salvar' : t('create') || 'Criar')}
        </button>
      </div>
    </div>
  );

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}
      title={isEditMode ? (resource?.name || t('untitled')) : (t('new') || 'Novo Recurso')}
      subtitle={isEditMode ? (resource?.tipo || resource?.type || '') : ''}
      size="lg" footer={isAdmin || isEditMode ? footerContent : undefined}>
      {!isAdmin && !isEditMode ? (
        <div className="py-12 px-6 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('noPermissionTitle') || 'Permissão necessária'}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{t('noPermissionMessage') || 'Você não possui permissão para criar recursos.'}</p>
          <div className="flex justify-center"><button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">{tCommon('close') || 'Fechar'}</button></div>
        </div>
      ) : (
        <form id="infrastructure-form" onSubmit={handleSubmit(onSubmit)}>
          <DeleteConfirmation isVisible={showDeleteConfirm && isEditMode} onConfirm={() => deleteMutation.mutate()} onCancel={() => setShowDeleteConfirm(false)} isDeleting={deleteMutation.isPending} message={t('deleteConfirmation') || 'Tem certeza que deseja excluir este recurso?'} />
          <ModalTabs tabs={tabs as any} />
          {saveMutation.error && <p className="mt-4 text-sm text-red-600 dark:text-red-400 text-center">{isEditMode ? t('updateError') : t('createError')}</p>}
        </form>
      )}
    </BaseModal>
  );
}
