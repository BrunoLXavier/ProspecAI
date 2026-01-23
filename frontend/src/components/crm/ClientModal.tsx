/**
 * ClientModal Component
 * Unified CRUD modal for CRM clients (Create/Edit/Delete)
 * Implements RF-04: CRM Inteligente
 * 
 * Features:
 * - CNPJ auto-fill via enrichment API
 * - Tabs for better organization
 * - Confidence badge for AI-enriched data
 */
'use client';

import { useEffect, useState } from 'react';
import { BuildingOffice2Icon, UserIcon, DocumentTextIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';

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

import BaseModal, { ModalFooter } from '@/components/ui/BaseModal';
import ModalTabs, { TabHint, type TabItem } from '@/components/ui/ModalTabs';
import DeleteConfirmation from '@/components/ui/DeleteConfirmation';
import ConfidenceBadge from '@/components/common/ConfidenceBadge';

interface Client {
  id: string;
  name: string;
  cnpj?: string;
  type?: string;
  segment?: string;
  industry?: string;
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
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  website?: string;
  contact_name?: string;
  notes?: string;
}

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
  onDelete?: (id: string) => void;
}

export default function ClientModal({ 
  isOpen, 
  onClose, 
  client = null,
  onDelete 
}: ClientModalProps) {
  const t = useTranslations('crm');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const { user, selectedInstitutes } = useAuth();
  const isAdmin = (user?.roles || []).includes('admin');
  const canCreate = isAdmin || (selectedInstitutes && selectedInstitutes.length > 0);
  
  const [selectedTab, setSelectedTab] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const isEditMode = !!client?.id;

  const {
    register,
    handleSubmit,
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

  // Reset form when client changes
  useEffect(() => {
    if (client) {
      reset({
        name: client.name || '',
        cnpj: client.cnpj || '',
        type: (client.type || 'COMPANY') as any,
        contact_email: client.contact_email || client.email || '',
        contact_phone: client.contact_phone || client.phone || '',
        industry: client.industry || client.segment || '',
        address: client.address || '',
        website: client.website || '',
        notes: client.notes || '',
      });
      setSelectedTab(0);
      setShowDeleteConfirm(false);
    } else {
      reset({
        name: '',
        cnpj: '',
        type: 'COMPANY',
        contact_email: '',
        contact_phone: '',
        industry: '',
        address: '',
        website: '',
        notes: '',
      });
      setSelectedTab(0);
      setShowDeleteConfirm(false);
    }
  }, [client, reset]);

  // CNPJ Lookup - RF-04 Feature
  const handleCNPJLookup = async () => {
    if (!cnpjValue || cnpjValue.length < 14) return;
    
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

  const saveMutation = useMutation({
    mutationFn: (data: CreateClientInput) => {
      if (isEditMode) {
        return apiClient.put(`/api/v1/clients/${client!.id}`, data);
      }
      return apiClient.createClient(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      reset();
      onClose();
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

  const onSubmit = (data: CreateClientInput) => {
    saveMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  // Check permissions for create mode
  if (!isEditMode && !canCreate) {
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={t('noPermissionTitle') || 'Permissão Necessária'}
        icon={<BuildingOffice2Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
        size="md"
      >
        <div className="p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('noPermissionMessage') || 'Você deve ser administrador ou ter pelo menos um instituto selecionado para criar um cliente.'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            {tCommon('close') || 'Fechar'}
          </button>
        </div>
      </BaseModal>
    );
  }

  const displayConfidence = client?.ai_confidence_score || client?.aiConfidenceScore;
  const isEnriched = client?.ai_enriched || client?.aiEnrichedData;

  // Tab Content Components
  const CNPJLookupSection = (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
      <label className="block text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
        {t('autoFillTitle') || 'Preenchimento Automático via CNPJ'}
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder={t('cnpjPlaceholder') || '00.000.000/0000-00'}
          className="flex-1 rounded-lg border border-blue-300 dark:border-blue-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-blue-500"
          {...register('cnpj')}
        />
        <button
          type="button"
          onClick={handleCNPJLookup}
          disabled={isLookingUp}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
        >
          <MagnifyingGlassIcon className="h-4 w-4" />
          {isLookingUp ? (tCommon('loading') || 'Buscando...') : (t('searchPlaceholder') || 'Buscar')}
        </button>
      </div>
      <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
        {t('cnpjAutoFillDescription') || 'Informe o CNPJ para preencher automaticamente os dados da empresa.'}
      </p>
    </div>
  );

  const BasicInfoTab = (
    <div className="space-y-4">
      {/* Show confidence badge if available */}
      {isEditMode && (displayConfidence || isEnriched) && (
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          {isEnriched && (
            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
              {t('aiEnriched') || 'Enriquecido por IA'}
            </span>
          )}
          {displayConfidence && <ConfidenceBadge score={displayConfidence} />}
        </div>
      )}

      {/* CNPJ Lookup - only show in create mode or if no enrichment yet */}
      {(!isEditMode || !isEnriched) && CNPJLookupSection}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <FormInput
            label={t('clientName')}
            placeholder={t('namePlaceholder')}
            error={errors.name}
            required
            {...register('name')}
          />
        </div>

        <FormSelect
          label={t('typeLabel')}
          options={clientTypeOptions}
          error={errors.type}
          required
          {...register('type')}
        />

        <FormInput
          label={t('industryLabel')}
          placeholder={t('industryPlaceholder')}
          error={errors.industry}
          required
          {...register('industry')}
        />
      </div>
    </div>
  );

  const ContactTab = (
    <div className="space-y-4">
      <TabHint variant="info">
        {t('contactHint') || 'Informações de contato principal da empresa.'}
      </TabHint>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <FormInput
          label={t('website')}
          type="url"
          placeholder={t('websitePlaceholder') || 'https://...'}
          error={errors.website}
          {...register('website')}
        />

        <div className="sm:col-span-2">
          <FormInput
            label={t('address')}
            placeholder={t('addressPlaceholder')}
            {...register('address')}
          />
        </div>
      </div>
    </div>
  );

  const NotesTab = (
    <div className="space-y-4">
      <FormTextarea
        label={t('notes')}
        placeholder={t('notesPlaceholder')}
        rows={6}
        {...register('notes')}
      />
    </div>
  );

  const tabs: TabItem[] = [
    { name: t('tabBasic') || 'Dados', icon: BuildingOffice2Icon, content: BasicInfoTab },
    { name: t('tabContact') || 'Contato', icon: UserIcon, content: ContactTab },
    { name: t('tabNotes') || 'Notas', icon: DocumentTextIcon, content: NotesTab },
  ];

  const modalTitle = isEditMode 
    ? (client.name || t('editClient') || 'Editar Cliente')
    : (t('newClient') || 'Novo Cliente');

  const modalSubtitle = isEditMode ? `ID: ${client.id}` : undefined;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={<BuildingOffice2Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
      size="2xl"
      footer={
        <ModalFooter
          onCancel={onClose}
          onSubmit={handleSubmit(onSubmit)}
          submitLabel={isEditMode ? (tCommon('save') || 'Salvar') : (t('create') || 'Criar')}
          cancelLabel={tCommon('cancel') || 'Cancelar'}
          deleteLabel={tCommon('delete') || 'Excluir'}
          isSubmitting={isSubmitting || saveMutation.isPending}
          isDeleting={deleteMutation.isPending}
          showDelete={isEditMode}
          onDelete={() => setShowDeleteConfirm(true)}
        />
      }
    >
      <DeleteConfirmation
        isVisible={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isDeleting={deleteMutation.isPending}
        message={t('deleteConfirmation') || 'Tem certeza que deseja excluir este cliente?'}
      />

      {(saveMutation.error || deleteMutation.error) && (
        <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">
            {saveMutation.error ? (t('createError') || 'Erro ao salvar. Tente novamente.') : (t('deleteError') || 'Erro ao excluir.')}
          </p>
        </div>
      )}
      
      <ModalTabs
        tabs={tabs}
        selectedIndex={selectedTab}
        onChange={setSelectedTab}
      />
    </BaseModal>
  );
}
