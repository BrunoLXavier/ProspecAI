/**
 * CreateClientModal Component
 * Modal form for creating new CRM clients with CNPJ auto-fill
 * Implements RF-04: CRM Inteligente
 */
'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import {
  FormInput,
  FormSelect,
  FormTextarea,
} from '@/components/forms';
import {
  createClientSchema,
  CreateClientInput,
  clientTypeOptions,
} from '@/lib/validations';
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-semibold text-gray-900">
                    {t('newClient')}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* CNPJ with Auto-fill - RF-04 Feature */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <label className="block text-sm font-medium text-blue-800 mb-2">
                      {t('autoFillTitle')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={t('cnpjPlaceholder')}
                        className="flex-1 rounded-md border border-blue-300 px-3 py-2 text-sm focus:ring-blue-500"
                        {...register('cnpj')}
                      />
                      <button
                        type="button"
                        onClick={handleCNPJLookup}
                        disabled={isLookingUp}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <MagnifyingGlassIcon className="h-4 w-4" />
                        {isLookingUp ? tCommon('loading') : t('searchPlaceholder')}
                      </button>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
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

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      {tCommon('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSubmitting ? tCommon('saving') : t('create')}
                    </button>
                  </div>

                  {createMutation.error && (
                    <p className="text-sm text-red-600 text-center">
                      {t('createError')}
                    </p>
                  )}
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
