/**
 * ViewEditProjectModal Component
 * Modal for viewing and editing portfolio project details
 * Implements RF-03: Gestão de Portfólio Institucional
 */
'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

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
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                        </svg>
                      </div>
                      <div>
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                          {isEditing ? t('editProject') : project.title}
                        </Dialog.Title>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {project.id}
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
                  <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('projectTitle')}
                      </label>
                      <input
                        type="text"
                        {...register('title', { required: true })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('statusLabel')}
                        </label>
                        <select
                          {...register('status')}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        >
                          <option value="planning">{t('filters.planning')}</option>
                          <option value="active">{t('filters.active')}</option>
                          <option value="completed">{t('filters.completed')}</option>
                          <option value="suspended">{t('filters.suspended')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('trl')}
                        </label>
                        <select
                          {...register('trl', { valueAsNumber: true })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                            <option key={n} value={n}>TRL {n}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('budget')}
                      </label>
                      <input
                        type="number"
                        {...register('budget', { valueAsNumber: true })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('startDate')}
                        </label>
                        <input
                          type="date"
                          {...register('start_date')}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('endDate')}
                        </label>
                        <input
                          type="date"
                          {...register('end_date')}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('area')}
                      </label>
                      <input
                        type="text"
                        {...register('research_area')}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('description')}
                      </label>
                      <textarea
                        {...register('description')}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('lessonsLearned')}
                      </label>
                      <textarea
                        {...register('lessons_learned')}
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
