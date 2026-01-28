/**
 * ViewEditClientModal Component
 * Modal for viewing and editing CRM client details
 * Implements RF-04: CRM Inteligente
 */
'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import apiClient from '@/lib/api-client';
import ConfidenceBadge from '@/components/features/shared/common/ConfidenceBadge';

interface Client {
  id: string;
  name: string;
  cnpj: string;
  segment: string;
  annualRevenue?: number;
  annual_revenue?: number;
  maturityLevel?: string;
  maturity_level?: string;
  aiEnrichedData?: boolean;
  ai_enriched?: boolean;
  aiConfidenceScore?: number;
  ai_confidence_score?: number;
  email?: string;
  phone?: string;
  address?: string;
  contact_name?: string;
  contact_email?: string;
  notes?: string;
}

interface ViewEditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onDelete?: (id: string) => void;
}

export default function ViewEditClientModal({ 
  isOpen, 
  onClose, 
  client,
  onDelete 
}: ViewEditClientModalProps) {
  const t = useTranslations('crm');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  // Reset form when client changes
  useEffect(() => {
    if (client) {
      reset({
        name: client.name || '',
        cnpj: client.cnpj || '',
        segment: client.segment || '',
        annual_revenue: client.annual_revenue || client.annualRevenue || 0,
        maturity_level: client.maturity_level || client.maturityLevel || 'startup',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        contact_name: client.contact_name || '',
        contact_email: client.contact_email || '',
        notes: client.notes || '',
      });
    }
    setIsEditing(false);
    setShowDeleteConfirm(false);
  }, [client, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => 
      apiClient.put(`/api/v1/clients/${client!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/clients/${client!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      onClose();
      onDelete?.(client!.id);
    },
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const getMaturityColor = (level: string) => {
    const colors: Record<string, string> = {
      startup: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      growth: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      mature: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  if (!client) return null;

  const displayRevenue = client.annual_revenue || client.annualRevenue || 0;
  const displayMaturity = client.maturity_level || client.maturityLevel || 'startup';
  const displayConfidence = client.ai_confidence_score || client.aiConfidenceScore;
  const isEnriched = client.ai_enriched || client.aiEnrichedData;

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
          <div className="fixed inset-0 bg-black bg-opacity-25 dark:bg-opacity-50" />
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-xl transition-all">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-primary-600 dark:text-primary-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                        </svg>
                      </div>
                      <div>
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                          {isEditing ? t('editClient') : client.name}
                        </Dialog.Title>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {client.id}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {showDeleteConfirm && (
                  <div className="mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-700 dark:text-red-400 mb-3">
                      {t('deleteConfirmation')}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleteMutation.isPending ? tCommon('deleting') : tCommon('confirmDelete')}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        {tCommon('cancel')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Status Badges */}
                {!isEditing && (
                  <div className="px-6 pt-6 flex items-center gap-3 flex-wrap">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getMaturityColor(displayMaturity)}`}>
                      {t(`maturity.${displayMaturity}`)}
                    </span>
                    {isEnriched && displayConfidence && (
                      <ConfidenceBadge score={displayConfidence} />
                    )}
                  </div>
                )}

                {/* Content */}
                {isEditing ? (
                  <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('clientName')}
                        </label>
                        <input
                          type="text"
                          {...register('name', { required: true })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('cnpj')}
                        </label>
                        <input
                          type="text"
                          {...register('cnpj')}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('segment')}
                        </label>
                        <select
                          {...register('segment')}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        >
                          <option value="technology">{t('segments.technology')}</option>
                          <option value="manufacturing">{t('segments.manufacturing')}</option>
                          <option value="services">{t('segments.services')}</option>
                          <option value="agribusiness">{t('segments.agribusiness')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('maturityLabel')}
                        </label>
                        <select
                          {...register('maturity_level')}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        >
                          <option value="startup">{t('maturity.startup')}</option>
                          <option value="growth">{t('maturity.growth')}</option>
                          <option value="mature">{t('maturity.mature')}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('revenue')}
                      </label>
                      <input
                        type="number"
                        {...register('annual_revenue', { valueAsNumber: true })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('email')}
                        </label>
                        <input
                          type="email"
                          {...register('email')}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('phone')}
                        </label>
                        <input
                          type="tel"
                          {...register('phone')}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('address')}
                      </label>
                      <input
                        type="text"
                        {...register('address')}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('contactName')}
                        </label>
                        <input
                          type="text"
                          {...register('contact_name')}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('contactEmail')}
                        </label>
                        <input
                          type="email"
                          {...register('contact_email')}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('notes')}
                      </label>
                      <textarea
                        {...register('notes')}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                      >
                        {tCommon('cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || updateMutation.isPending}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                      >
                        {updateMutation.isPending ? tCommon('saving') : tCommon('save')}
                      </button>
                    </div>

                    {updateMutation.error && (
                      <p className="text-sm text-red-600 text-center">
                        {t('updateError')}
                      </p>
                    )}
                  </form>
                ) : (
                  <div className="p-6 space-y-6">
                    {/* View Mode */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">{t('cnpj')}</label>
                        <p className="font-medium text-gray-900 dark:text-white">{client.cnpj || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">{t('segment')}</label>
                        <p className="font-medium text-gray-900 dark:text-white">{client.segment || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">{t('revenue')}</label>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {new Intl.NumberFormat(undefined, {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(displayRevenue)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">{t('maturityLabel')}</label>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {t(`maturity.${displayMaturity}`)}
                        </p>
                      </div>
                    </div>

                    {(client.email || client.phone) && (
                      <div className="grid grid-cols-2 gap-6">
                        {client.email && (
                          <div>
                            <label className="text-sm text-gray-500 dark:text-gray-400">{t('email')}</label>
                            <p className="font-medium text-gray-900 dark:text-white">{client.email}</p>
                          </div>
                        )}
                        {client.phone && (
                          <div>
                            <label className="text-sm text-gray-500 dark:text-gray-400">{t('phone')}</label>
                            <p className="font-medium text-gray-900 dark:text-white">{client.phone}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {client.address && (
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">{t('address')}</label>
                        <p className="text-gray-700 dark:text-gray-300 mt-1">{client.address}</p>
                      </div>
                    )}

                    {(client.contact_name || client.contact_email) && (
                      <div className="grid grid-cols-2 gap-6">
                        {client.contact_name && (
                          <div>
                            <label className="text-sm text-gray-500 dark:text-gray-400">{t('contactName')}</label>
                            <p className="font-medium text-gray-900 dark:text-white">{client.contact_name}</p>
                          </div>
                        )}
                        {client.contact_email && (
                          <div>
                            <label className="text-sm text-gray-500 dark:text-gray-400">{t('contactEmail')}</label>
                            <p className="font-medium text-gray-900 dark:text-white">{client.contact_email}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {client.notes && (
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">{t('notes')}</label>
                        <p className="text-gray-700 dark:text-gray-300 mt-1">{client.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer */}
                {!isEditing && (
                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition flex items-center gap-2"
                      >
                        <TrashIcon className="w-4 h-4" />
                        {tCommon('delete')}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2"
                      >
                        <PencilIcon className="w-4 h-4" />
                        {tCommon('edit')}
                      </button>
                      <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                      >
                        {tCommon('close')}
                      </button>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
