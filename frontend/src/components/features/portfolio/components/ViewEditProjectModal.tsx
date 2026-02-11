/**
 * ViewEditProjectModal Component
 * Modal for viewing and editing portfolio project details
 * Implements RF-03: Gestão de Portfólio Institucional
 * Uses BaseModal + ModalFooter pattern
 */
'use client';

import { useState, useEffect } from 'react';
import { ClipboardDocumentListIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import BaseModal, { ModalFooter } from '@/components/features/shared/ui/BaseModal';
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormDatePicker,
} from '@/components/features/shared/forms';
import apiClient from '@/lib/api-client';

interface Project {
  id: string;
  title: string;
  status: string;
  trl: number;
  budget: number;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  researchArea?: string;
  research_area?: string;
  description?: string;
  objectives?: string[];
  team?: string[];
  lessons_learned?: string;
}

interface ViewEditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onDelete?: (id: string) => void;
}

const statusOptions = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'suspended', label: 'Suspended' },
];

const trlOptions = [
  { value: 1, label: 'TRL 1' },
  { value: 2, label: 'TRL 2' },
  { value: 3, label: 'TRL 3' },
  { value: 4, label: 'TRL 4' },
  { value: 5, label: 'TRL 5' },
  { value: 6, label: 'TRL 6' },
  { value: 7, label: 'TRL 7' },
  { value: 8, label: 'TRL 8' },
  { value: 9, label: 'TRL 9' },
];

export default function ViewEditProjectModal({ 
  isOpen, 
  onClose, 
  project,
  onDelete 
}: ViewEditProjectModalProps) {
  const t = useTranslations('portfolio');
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

  // Reset form when project changes
  useEffect(() => {
    if (project) {
      reset({
        title: project.title || '',
        status: project.status || 'planning',
        trl: project.trl || 1,
        budget: project.budget || 0,
        start_date: project.start_date || project.startDate || '',
        end_date: project.end_date || project.endDate || '',
        research_area: project.research_area || project.researchArea || '',
        description: project.description || '',
        lessons_learned: project.lessons_learned || '',
      });
    }
    setIsEditing(false);
    setShowDeleteConfirm(false);
  }, [project, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => 
      apiClient.updateProject(project!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsEditing(false);
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

  const onSubmit = (data: any) => {
    updateMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planning: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      suspended: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTRLColor = (trl: number) => {
    if (trl >= 7) return 'text-green-600 dark:text-green-400';
    if (trl >= 4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  if (!project) return null;

  const displayStartDate = project.start_date || project.startDate;
  const displayEndDate = project.end_date || project.endDate;
  const displayArea = project.research_area || project.researchArea;

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
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t('editProject') : project.title}
      subtitle={`ID: ${project.id}`}
      icon={<ClipboardDocumentListIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
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
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(project.status)}`}>
            {t(`status.${project.status}`)}
          </span>
          <span className={`px-3 py-1 text-sm font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 ${getTRLColor(project.trl)}`}>
            TRL {project.trl}
          </span>
        </div>
      )}

      {/* Content */}
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormInput
            label={t('projectTitle')}
            error={errors.title}
            required
            {...register('title', { required: true })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              label={t('statusLabel')}
              options={statusOptions}
              {...register('status')}
            />

            <FormSelect
              label={t('trl')}
              options={trlOptions}
              {...register('trl', { valueAsNumber: true })}
            />
          </div>

          <FormInput
            label={t('budget')}
            type="number"
            {...register('budget', { valueAsNumber: true })}
          />

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

          <FormInput
            label={t('area')}
            {...register('research_area')}
          />

          <FormTextarea
            label={t('description')}
            rows={3}
            {...register('description')}
          />

          <FormTextarea
            label={t('lessonsLearned')}
            rows={3}
            {...register('lessons_learned')}
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
              <label className="text-sm text-gray-500 dark:text-gray-400">{t('budget')}</label>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: 'BRL',
                }).format(project.budget)}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">{t('area')}</label>
              <p className="font-medium text-gray-900 dark:text-white">{displayArea || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">{t('period')}</label>
              <p className="font-medium text-gray-900 dark:text-white">
                {displayStartDate 
                  ? new Date(displayStartDate).toLocaleDateString()
                  : '-'} - {displayEndDate 
                  ? new Date(displayEndDate).toLocaleDateString()
                  : '-'}
              </p>
            </div>
          </div>

          {project.description && (
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">{t('description')}</label>
              <p className="text-gray-700 dark:text-gray-300 mt-1">{project.description}</p>
            </div>
          )}

          {project.objectives && project.objectives.length > 0 && (
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">{t('objectives')}</label>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mt-1">
                {project.objectives.map((obj, idx) => (
                  <li key={idx}>{obj}</li>
                ))}
              </ul>
            </div>
          )}

          {project.lessons_learned && (
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">{t('lessonsLearned')}</label>
              <p className="text-gray-700 dark:text-gray-300 mt-1">{project.lessons_learned}</p>
            </div>
          )}
        </div>
      )}
    </BaseModal>
  );
}
