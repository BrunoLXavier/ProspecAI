/**
 * TeamModal
 */
'use client';

import { Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  team: any | null;
}

export default function TeamModal({ isOpen, onClose, team }: Props) {
  const t = useTranslations('teams');
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (team) reset({ name: team.name || '', description: team.description || '' });
    else reset({ name: '', description: '' });
  }, [team, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (team?.id) return apiClient.patch(`/api/v1/teams/${team.id}`, data);
      return apiClient.post('/api/v1/teams', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/teams/${team!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      onClose();
    },
  });

  const onSubmit = (data: any) => saveMutation.mutate(data);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-xl transition-all">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">{team ? team.name : t('new')}</Dialog.Title>
                    {team && <p className="text-sm text-gray-500">ID: {team.id}</p>}
                  </div>
                  <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"><XMarkIcon className="w-5 h-5"/></button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('name')}</label>
                    <input {...register('name', { required: true })} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('description')}</label>
                    <textarea {...register('description')} className="w-full px-4 py-2 border rounded-lg" />
                  </div>

                  <div className="flex justify-end gap-2">
                    {team && (<button type="button" onClick={() => deleteMutation.mutate()} className="px-4 py-2 bg-red-600 text-white rounded-lg">{t('delete')}</button>)}
                    <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg">{team ? t('save') : t('create')}</button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
