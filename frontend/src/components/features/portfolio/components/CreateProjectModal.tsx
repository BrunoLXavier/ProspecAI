/**
 * CreateProjectModal Component
 * Modal form for creating new portfolio projects
 * Implements RF-03: Portfólio Institucional
 * Uses BaseModal + ModalFooter pattern
 */
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

import BaseModal, { ModalFooter } from '@/components/features/shared/ui/BaseModal';
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormDatePicker,
  FormCurrencyInput,
  FormTagInput,
} from '@/components/features/shared/forms';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import {
  createProjectSchema,
  CreateProjectInput,
  projectStatusOptions,
  trlOptions,
} from '@/utils/validations';
import apiClient from '@/lib/api-client';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const t = useTranslations('portfolio');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const { user, selectedInstitutes } = useAuth();

  const isAdmin = (user?.roles || []).includes('admin');
  const canCreate = isAdmin || (selectedInstitutes && selectedInstitutes.length > 0);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      status: 'PLANNING',
      current_trl: 1,
      keywords: [],
      budget: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateProjectInput) => apiClient.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      reset();
      onClose();
    },
  });

  // Load institutes for the select field so we can show names
  const { data: institutes = [] } = useQuery({
    queryKey: ['institutes', 'for-project-modal'],
    queryFn: async () => {
      try {
        const resp = await apiClient.get('/api/v1/institutes');
        return resp?.items ?? resp ?? [];
      } catch (e) {
        console.debug('[CreateProjectModal] Failed loading institutes', e);
        return [];
      }
    },
    staleTime: 60_000,
  });

  // Build select options
  const instituteOptions = (institutes || []).map((ins: any) => {
    const displayName = ins.nome || ins.name || ins.title || ins.label || ins.id;
    const code = ins.isi_sigla || ins.code || (ins.id ? String(ins.id).slice(0, 6) : '');
    return { value: ins.id, label: code ? `${displayName} (${code})` : displayName };
  });

  // Pre-fill instituto_id from header selection if available
  const defaultInstituteId = selectedInstitutes && selectedInstitutes.length > 0 ? selectedInstitutes[0] : undefined;
  const multipleInstitutesAvailable = instituteOptions.length > 1;

  const onSubmit = (data: CreateProjectInput) => {
    const payload: any = {
      ...data,
      instituto_id: (data as any).instituto_id || defaultInstituteId,
    };
    createMutation.mutate(payload);
  };

  const renderFooter = () => {
    if (!canCreate) {
      return (
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            {tCommon('close') || 'Close'}
          </button>
        </div>
      );
    }
    return (
      <ModalFooter
        onCancel={onClose}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={isSubmitting}
        submitLabel={t('newProject')}
      />
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('newProject')}
      icon={<ClipboardDocumentListIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
      size="2xl"
      footer={renderFooter()}
    >
      {canCreate ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <FormInput
            label={t('projectTitle')}
            placeholder={t('projectTitlePlaceholder')}
            error={errors.title}
            required
            {...register('title')}
          />

          <FormTextarea
            label={t('description')}
            placeholder={t('descriptionPlaceholder')}
            rows={4}
            error={errors.description}
            required
            {...register('description')}
          />

          {/* Status and TRL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              label={t('statusLabel')}
              options={projectStatusOptions}
              error={errors.status}
              required
              {...register('status')}
            />

            <FormSelect
              label={t('trl')}
              options={trlOptions}
              error={errors.current_trl}
              required
              {...register('current_trl', { valueAsNumber: true })}
            />
          </div>

          {/* Institute selector (optional) */}
          {instituteOptions.length > 0 && (
            <FormSelect
              label={t('institute') || 'Instituto'}
              options={instituteOptions}
              error={(errors as any).instituto_id}
              helperText={multipleInstitutesAvailable ? (t('selectInstituteHelper') || 'Selecione o instituto responsável pelo projeto') : undefined}
              placeholder={t('selectInstitutePlaceholder') || 'Selecione um instituto'}
              {...register('instituto_id', { required: multipleInstitutesAvailable ? (t('instituteRequired') || 'Selecione um instituto') : false })}
              required={multipleInstitutesAvailable}
            />
          )}

          {/* Financial and Research */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="budget"
              control={control}
              render={({ field }) => (
                <FormCurrencyInput
                  label={t('budget')}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.budget}
                  required
                />
              )}
            />

            <FormInput
              label={t('area')}
              placeholder={t('areaPlaceholder')}
              error={errors.research_area}
              required
              {...register('research_area')}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormDatePicker
              label={t('startDate')}
              {...register('start_date')}
            />

            <FormDatePicker
              label={t('endDate')}
              {...register('end_date')}
            />
          </div>

          {/* Keywords */}
          <Controller
            name="keywords"
            control={control}
            render={({ field }) => (
              <FormTagInput
                label={t('keywords')}
                value={field.value}
                onChange={field.onChange}
                error={errors.keywords?.root || errors.keywords?.message ? { message: String(errors.keywords.message), type: 'validate' } : undefined}
                placeholder={t('keywordsPlaceholder')}
                required
              />
            )}
          />

          {/* Lessons Learned */}
          <FormTextarea
            label={t('lessonsLearned')}
            placeholder={t('lessonsLearnedPlaceholder')}
            rows={3}
            {...register('lessons_learned')}
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
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{t('noPermissionMessage') || 'You must be an administrator or have at least one selected institute to create a project. Select your institute in the header or contact an administrator.'}</p>
        </div>
      )}
    </BaseModal>
  );
}
