/**
 * CreateClientModal Component
 * Modal form for creating new CRM clients with CNPJ auto-fill
 * Migrated to use BaseModal + ModalFooter for consistent design system
 * Implements RF-04: CRM Inteligente
 */
'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';

import BaseModal, { ModalFooter } from '@/components/features/shared/ui/BaseModal';
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from '@/components/features/shared/forms';
import {
  createClientSchema,
  CreateClientInput,
  clientTypeOptions,
} from '@/utils/validations';
import apiClient from '@/lib/api-client';

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateClientModal({ isOpen, onClose }: CreateClientModalProps) {
  const queryClient = useQueryClient();
  const [isLookingUp, setIsLookingUp] = useState(false);
  const t = useTranslations('crm');
  const tCommon = useTranslations('common');
  const { user, selectedInstitutes } = useAuth();
  const isAdmin = (user?.roles || []).includes('admin');
  const canCreate = isAdmin || (selectedInstitutes && selectedInstitutes.length > 0);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      type: 'COMPANY',
    },
  });

  const cnpjValue = watch('cnpj');

  const createMutation = useMutation({
    mutationFn: (data: CreateClientInput) => apiClient.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      reset();
      onClose();
    },
  });

  const handleCNPJLookup = async () => {
    if (!cnpjValue || cnpjValue.length < 18) return;
    
    setIsLookingUp(true);
    try {
      const data = await apiClient.enrichCNPJ(cnpjValue);
      if (data) {
        setValue('name', data.razao_social || data.nome_fantasia || '');
        setValue('contact_email', data.email || '');
        setValue('contact_phone', data.telefone || '');
        setValue('industry', data.cnae_principal?.descricao || '');
        setValue('address', `${data.logradouro || ''}, ${data.numero || ''} - ${data.municipio || ''}/${data.uf || ''}`);
      }
    } catch (error) {
      console.error('CNPJ lookup failed:', error);
    } finally {
      setIsLookingUp(false);
    }
  };

  const onSubmit = (data: CreateClientInput) => {
    createMutation.mutate(data);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('newClient')}
      icon={<UserPlusIcon className="w-5 h-5 text-primary-600" />}
      size="2xl"
      footer={
        canCreate ? (
          <ModalFooter
            onCancel={onClose}
            onSubmit={handleSubmit(onSubmit)}
            isSubmitting={isSubmitting}
          />
        ) : undefined
      }
    >
      {canCreate ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* CNPJ with Auto-fill - RF-04 Feature */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <label className="block text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
              {t('autoFillTitle')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t('cnpjPlaceholder')}
                className="flex-1 rounded-lg border border-blue-300 dark:border-blue-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-blue-500"
                {...register('cnpj')}
              />
              <button
                type="button"
                onClick={handleCNPJLookup}
                disabled={isLookingUp}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                <MagnifyingGlassIcon className="h-4 w-4" />
                {isLookingUp ? tCommon('loading') : t('searchPlaceholder')}
              </button>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {t('cnpjAutoFillDescription')}
            </p>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label={t('clientName')}
              placeholder={t('namePlaceholder')}
              error={errors.name}
              required
              {...register('name')}
            />

            <FormSelect
              label={t('typeLabel')}
              options={clientTypeOptions}
              error={errors.type}
              required
              {...register('type')}
            />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label={t('contactEmail')}
              type="email"
              placeholder={t('contactEmailPlaceholder')}
              error={errors.contact_email}
              required
              {...register('contact_email')}
            />

            <FormInput
              label={t('phone')}
              type="tel"
              placeholder={t('phonePlaceholder')}
              {...register('contact_phone')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label={t('industryLabel')}
              placeholder={t('industryPlaceholder')}
              error={errors.industry}
              required
              {...register('industry')}
            />

            <FormInput
              label={t('website')}
              type="url"
              placeholder={t('websitePlaceholder')}
              error={errors.website}
              {...register('website')}
            />
          </div>

          <FormInput
            label={t('address')}
            placeholder={t('addressPlaceholder')}
            {...register('address')}
          />

          <FormTextarea
            label={t('notes')}
            placeholder={t('notesPlaceholder')}
            rows={3}
            {...register('notes')}
          />

          {createMutation.error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {t('createError')}
            </p>
          )}
        </form>
      ) : (
        <div className="py-12 px-6 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('noPermissionTitle') || 'Permission required'}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{t('noPermissionMessage') || 'You must be an administrator or have at least one selected institute to create a client. Select your institute in the header or contact an administrator.'}</p>
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              {tCommon('close') || 'Close'}
            </button>
          </div>
        </div>
      )}
    </BaseModal>
  );
}
