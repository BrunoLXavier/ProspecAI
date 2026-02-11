/**
 * ViewEditClientModal Component
 * Modal for viewing and editing CRM client details
 * Migrated to use BaseModal + ModalFooter for consistent design system
 * Implements RF-04: CRM Inteligente
 */
'use client';

import { useState, useEffect } from 'react';
import { BuildingOffice2Icon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useForm, FieldError } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import BaseModal, { ModalFooter } from '@/components/features/shared/ui/BaseModal';
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from '@/components/features/shared/forms';
import apiClient from '@/lib/api-client';
import ConfidenceBadge from '@/components/features/shared/ui/ConfidenceBadge';

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

const segmentOptions = [
  { value: 'technology', label: 'Technology' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'services', label: 'Services' },
  { value: 'agribusiness', label: 'Agribusiness' },
];

const maturityOptions = [
  { value: 'startup', label: 'Startup' },
  { value: 'growth', label: 'Growth' },
  { value: 'mature', label: 'Mature' },
];

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

  const renderFooter = () => {
    if (isEditing) {
      return (
        <ModalFooter
          onCancel={() => setIsEditing(false)}
          onSubmit={handleSubmit(onSubmit)}
          isSubmitting={isSubmitting || updateMutation.isPending}
        />
      );
    }

    return (
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition flex items-center gap-2"
        >
          <TrashIcon className="w-4 h-4" />
          {tCommon('delete')}
        </button>
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
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t('editClient') : client.name}
      subtitle={`ID: ${client.id}`}
      icon={<BuildingOffice2Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
      size="2xl"
      footer={renderFooter()}
    >
      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
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
        <div className="mb-6 flex items-center gap-3 flex-wrap">
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label={t('clientName')}
              error={errors.name as FieldError | undefined}
              required
              {...register('name', { required: true })}
            />
            <FormInput
              label={t('cnpj')}
              {...register('cnpj')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              label={t('segment')}
              options={segmentOptions}
              {...register('segment')}
            />
            <FormSelect
              label={t('maturityLabel')}
              options={maturityOptions}
              {...register('maturity_level')}
            />
          </div>

          <FormInput
            label={t('revenue')}
            type="number"
            {...register('annual_revenue', { valueAsNumber: true })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label={t('email')}
              type="email"
              {...register('email')}
            />
            <FormInput
              label={t('phone')}
              type="tel"
              {...register('phone')}
            />
          </div>

          <FormInput
            label={t('address')}
            {...register('address')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label={t('contactName')}
              {...register('contact_name')}
            />
            <FormInput
              label={t('contactEmail')}
              type="email"
              {...register('contact_email')}
            />
          </div>

          <FormTextarea
            label={t('notes')}
            rows={3}
            {...register('notes')}
          />

          {updateMutation.error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {t('updateError')}
            </p>
          )}
        </form>
      ) : (
        <div className="space-y-6">
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
    </BaseModal>
  );
}
