/**
 * ProjectModal Component
 * Consolidated Create/Edit/Delete modal for portfolio projects
 * Implements RF-03: Portfólio Institucional
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

import { BaseModal, ModalTabs, DeleteConfirmation, type TabItem } from '@/components/ui';
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormDatePicker,
  FormCurrencyInput,
  FormTagInput,
} from '@/components/forms';
import { useAuth } from '@/contexts/AuthContext';
import {
  createProjectSchema,
  CreateProjectInput,
  projectStatusOptions,
  trlOptions,
} from '@/lib/validations';
import apiClient from '@/lib/api-client';

interface Project {
  id: string;
  title: string;
  description?: string;
  status: string;
  trl?: number;
  current_trl?: number;
  budget?: number;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  researchArea?: string;
  research_area?: string;
  keywords?: string[];
  lessons_learned?: string;
  instituto_id?: string;
}

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  onDelete?: (id: string) => void;
}

export default function ProjectModal({
  isOpen,
  onClose,
  project,
  onDelete,
}: ProjectModalProps) {
  const t = useTranslations('portfolio');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const { user, selectedInstitutes } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditMode = !!project?.id;
  const isAdmin = (user?.roles || []).includes('admin');
  const canCreate = isAdmin || (selectedInstitutes && selectedInstitutes.length > 0);

  // Load institutes for the select field
  const { data: institutes = [] } = useQuery({
    queryKey: ['institutes', 'for-project-modal'],
    queryFn: async () => {
      try {
        const resp = await apiClient.get('/api/v1/institutes');
        return resp?.items ?? resp ?? [];
      } catch (e) {
        console.debug('[ProjectModal] Failed loading institutes', e);
        return [];
      }
    },
    staleTime: 60_000,
    enabled: isOpen,
  });

  const instituteOptions = useMemo(() => (institutes || []).map((ins: any) => {
    const displayName = ins.nome || ins.name || ins.title || ins.label || ins.id;
    const code = ins.isi_sigla || ins.code || '';
    return { value: ins.id, label: code ? `${displayName} (${code})` : displayName };
  }), [institutes]);

  const defaultInstituteId = selectedInstitutes && selectedInstitutes.length > 0 ? selectedInstitutes[0] : undefined;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'PLANNING',
      current_trl: 1,
      keywords: [],
      budget: 0,
    },
  });

  // Reset form when project changes or modal opens
  useEffect(() => {
    if (isOpen && project) {
      reset({
        title: project.title || '',
        description: project.description || '',
        status: project.status || 'PLANNING',
        current_trl: project.current_trl || project.trl || 1,
        budget: project.budget || 0,
        start_date: project.start_date || project.startDate || '',
        end_date: project.end_date || project.endDate || '',
        research_area: project.research_area || project.researchArea || '',
        keywords: project.keywords || [],
        lessons_learned: project.lessons_learned || '',
        instituto_id: project.instituto_id || defaultInstituteId,
      } as any);
    } else if (isOpen && !project) {
      reset({
        title: '',
        description: '',
        status: 'PLANNING',
        current_trl: 1,
        keywords: [],
        budget: 0,
        instituto_id: defaultInstituteId,
      } as any);
    }
    setShowDeleteConfirm(false);
  }, [isOpen, project, reset, defaultInstituteId]);

  const saveMutation = useMutation({
    mutationFn: (data: CreateProjectInput) => {
      const payload: any = {
        ...data,
        instituto_id: (data as any).instituto_id || defaultInstituteId,
      };
      if (isEditMode) {
        return apiClient.updateProject(project!.id, payload);
      }
      return apiClient.createProject(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      reset();
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/portfolio/projects/${project!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onClose();
      onDelete?.(project!.id);
    },
  });

  const onSubmit = (data: CreateProjectInput) => {
    saveMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  // Tab 1 content: Básico
  const basicTabContent = (
    <div className="space-y-4">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormSelect
          label={t('statusLabel')}
          options={projectStatusOptions}
          error={errors.status}
          required
          {...register('status')}
        />

        {instituteOptions.length > 0 && (
          <FormSelect
            label={t('institute') || 'Instituto'}
            options={instituteOptions}
            error={(errors as any).instituto_id}
            placeholder={t('selectInstitutePlaceholder') || 'Selecione'}
            {...register('instituto_id' as any)}
          />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormDatePicker
          label={t('startDate')}
          {...register('start_date' as any)}
        />
        <FormDatePicker
          label={t('endDate')}
          {...register('end_date' as any)}
        />
      </div>
    </div>
  );

  // Tab 2 content: Financeiro & TRL
  const financialTabContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <FormSelect
          label={t('trl')}
          options={trlOptions}
          error={errors.current_trl}
          required
          {...register('current_trl', { valueAsNumber: true })}
        />
      </div>

      <FormInput
        label={t('area')}
        placeholder={t('areaPlaceholder')}
        error={errors.research_area}
        required
        {...register('research_area' as any)}
      />

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
    </div>
  );

  // Tab 3 content: Lições Aprendidas
  const lessonsTabContent = (
    <div className="space-y-4">
      <FormTextarea
        label={t('lessonsLearned')}
        placeholder={t('lessonsLearnedPlaceholder')}
        rows={6}
        {...register('lessons_learned' as any)}
      />

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {t('lessonsLearnedHint') || 'Documente as principais lições aprendidas durante o projeto para referência futura e melhoria contínua.'}
        </p>
      </div>
    </div>
  );

  // Tab configuration with content
  const tabs: TabItem[] = [
    { name: t('tabs.basic') || 'Básico', content: basicTabContent },
    { name: t('tabs.financial') || 'Financeiro & TRL', content: financialTabContent },
    { name: t('tabs.lessons') || 'Lições Aprendidas', content: lessonsTabContent },
  ];

  const renderNoPermission = () => (
    <div className="py-12 px-6 text-center">
      <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {t('noPermissionTitle') || 'Permissão necessária'}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        {t('noPermissionMessage') || 'Você deve ser administrador ou ter pelo menos um instituto selecionado para criar um projeto.'}
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
      >
        {tCommon('close') || 'Fechar'}
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? t('editProject') : t('newProject')}
      icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
      size="lg"
    >
      {!canCreate && !isEditMode ? (
        renderNoPermission()
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          {/* Delete Confirmation */}
          <DeleteConfirmation
            isVisible={showDeleteConfirm && isEditMode}
            message={t('deleteConfirmation') || 'Tem certeza que deseja excluir este projeto?'}
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteConfirm(false)}
            isDeleting={deleteMutation.isPending}
          />

          <ModalTabs tabs={tabs} />

          {/* Error Message */}
          {saveMutation.error && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400 text-center">
              {isEditMode ? t('updateError') : t('createError')}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                >
                  {tCommon('delete')}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || saveMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {isSubmitting || saveMutation.isPending
                  ? tCommon('saving')
                  : isEditMode
                  ? tCommon('save')
                  : t('newProject')}
              </button>
            </div>
          </div>
        </form>
      )}
    </BaseModal>
  );
}
