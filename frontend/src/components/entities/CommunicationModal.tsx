/**
 * CommunicationModal
 * 
 * Modal for creating/editing communication threads with:
 * - Subject and initial message
 * - Linked entity selection (Proposal, Client, Funding Source)
 * - Participant management
 * - Human-in-the-loop confirmation display
 * 
 * Implements RF-08: Communications and collaboration
 */
'use client';

import { Fragment, useEffect, useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import {
  UserPlusIcon,
  LinkIcon,
  CheckIcon,
  ChevronUpDownIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';
import { BaseModal, DeleteConfirmation } from '@/components/ui';
import EntitySearchInput from '@/components/ui/EntitySearchInput';

interface Thread {
  id?: string;
  subject?: string;
  linked_entity_type?: string;
  linked_entity_id?: string;
  is_auto_created?: boolean;
  auto_created_confirmed?: boolean;
  metadata?: Record<string, any>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  comm: Thread | null;
  preselectedEntityType?: string;
  preselectedEntityId?: string;
}

interface FormData {
  subject: string;
  initialMessage: string;
  linkedEntityType: string;
  linkedEntityId: string;
}

const ENTITY_TYPES = [
  { value: '', label: 'None' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'client', label: 'Client' },
  { value: 'funding_source', label: 'Funding Source' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'project', label: 'Project' },
];

export default function CommunicationModal({
  isOpen,
  onClose,
  comm,
  preselectedEntityType,
  preselectedEntityId,
}: Props) {
  const t = useTranslations('communications');
  const queryClient = useQueryClient();
  
  const [selectedEntityType, setSelectedEntityType] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [newParticipant, setNewParticipant] = useState('');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      subject: '',
      initialMessage: '',
      linkedEntityType: '',
      linkedEntityId: '',
    },
  });

  // Translation helper with fallback
  const tr = (key: string, fallback: string) => {
    try {
      const v = t(key);
      if (!v || typeof v !== 'string' || v.includes('.')) return fallback;
      return v;
    } catch {
      return fallback;
    }
  };

  // Reset form when modal opens/closes or comm changes
  useEffect(() => {
    if (isOpen) {
      if (comm) {
        reset({
          subject: comm.subject || '',
          initialMessage: '',
          linkedEntityType: comm.linked_entity_type || '',
          linkedEntityId: comm.linked_entity_id || '',
        });
        setSelectedEntityType(comm.linked_entity_type || '');
      } else {
        reset({
          subject: '',
          initialMessage: '',
          linkedEntityType: preselectedEntityType || '',
          linkedEntityId: preselectedEntityId || '',
        });
        setSelectedEntityType(preselectedEntityType || '');
      }
      setParticipants([]);
      setNewParticipant('');
    }
  }, [isOpen, comm, reset, preselectedEntityType, preselectedEntityId]);

  // Update form when entity type changes - clear entity ID when type changes
  useEffect(() => {
    setValue('linkedEntityType', selectedEntityType);
    // Clear the entity ID when entity type changes (unless it's the initial load)
    setValue('linkedEntityId', '');
  }, [selectedEntityType, setValue]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: any = {
        subject: data.subject,
        linked_entity_type: data.linkedEntityType || null,
        linked_entity_id: data.linkedEntityId || null,
        participant_ids: participants,
        initial_message: data.initialMessage || null,
      };

      if (comm?.id) {
        // For updates, we might need different logic
        return apiClient.patch(`/api/v1/communications/${comm.id}`, payload);
      }
      return apiClient.post('/api/v1/communications', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/communications/${comm!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      onClose();
    },
  });

  const onSubmit = (data: FormData) => {
    saveMutation.mutate(data);
  };

  const addParticipant = () => {
    if (newParticipant && !participants.includes(newParticipant)) {
      setParticipants([...participants, newParticipant]);
      setNewParticipant('');
    }
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p !== id));
  };

  const isEditing = Boolean(comm?.id);
  const isAutoCreated = comm?.is_auto_created;
  const isConfirmed = comm?.auto_created_confirmed;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Footer content - passed to BaseModal footer prop to stay fixed
  const footerContent = (
    <div className="flex items-center justify-between">
      <div>
        {isEditing && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
          >
            {tr('delete', 'Delete')}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600"
        >
          {tr('cancel', 'Cancel')}
        </button>
        <button
          type="submit"
          form="communication-form"
          disabled={saveMutation.isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {saveMutation.isPending
            ? tr('saving', 'Saving...')
            : isEditing
            ? tr('save', 'Save')
            : tr('create', 'Create')}
        </button>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? comm?.subject || tr('editThread', 'Edit Thread') : tr('newThread', 'New Thread')}
      subtitle={isEditing ? `ID: ${comm?.id}` : undefined}
      icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />}
      size="xl"
      footer={footerContent}
      noContentScroll={isEditing}
    >
      <div>
        {/* Delete Confirmation */}
        <DeleteConfirmation
          isVisible={showDeleteConfirm && isEditing}
          message={tr('deleteConfirmation', 'Are you sure you want to delete this thread?')}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setShowDeleteConfirm(false)}
          isDeleting={deleteMutation.isPending}
        />

        {/* Auto-created badge */}
        {isAutoCreated && (
          <div className={`mb-4 flex items-center gap-2 px-3 py-2 rounded-lg ${
            isConfirmed
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
          }`}>
            {isConfirmed ? (
              <>
                <CheckBadgeIcon className="w-5 h-5" />
                <span className="text-sm">{tr('autoCreatedConfirmed', 'Auto-created thread (Confirmed)')}</span>
              </>
            ) : (
              <>
                <ExclamationTriangleIcon className="w-5 h-5" />
                <span className="text-sm">{tr('autoCreatedPending', 'Auto-created thread - Needs confirmation')}</span>
              </>
            )}
          </div>
        )}

        <form id="communication-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {tr('subject', 'Subject')} *
            </label>
            <input
              {...register('subject', { required: tr('subjectRequired', 'Subject is required') })}
              className={`w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:text-white ${
                errors.subject ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder={tr('subjectPlaceholder', 'Enter thread subject...')}
            />
            {errors.subject && (
              <p className="mt-1 text-sm text-red-500">{errors.subject.message}</p>
            )}
          </div>

          {/* Linked Entity Type */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <LinkIcon className="w-4 h-4 inline mr-1" />
              {tr('linkedEntity', 'Link to Entity')}
            </label>
            <Listbox value={selectedEntityType} onChange={setSelectedEntityType}>
              <div className="relative">
                <Listbox.Button className="relative w-full px-4 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                  <span>
                    {ENTITY_TYPES.find(e => e.value === selectedEntityType)?.label || tr('selectType', 'Select type...')}
                  </span>
                  <ChevronUpDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </Listbox.Button>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <Listbox.Options className="absolute z-[9999] mt-1 w-full bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 max-h-60 overflow-auto">
                    {ENTITY_TYPES.map((type) => (
                      <Listbox.Option
                        key={type.value}
                        value={type.value}
                        className={({ active }) =>
                          `relative px-4 py-2 cursor-pointer ${
                            active ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                          }`
                        }
                      >
                        {({ selected }) => (
                          <span className={`flex items-center ${selected ? 'font-medium' : ''}`}>
                            {type.label}
                            {selected && <CheckIcon className="w-4 h-4 ml-auto text-primary-600" />}
                          </span>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </Listbox>
          </div>

          {/* Linked Entity ID */}
          {selectedEntityType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {tr('entityId', 'Entity ID')}
              </label>
              <EntitySearchInput
                entityType={selectedEntityType}
                value={watch('linkedEntityId')}
                onChange={(id) => setValue('linkedEntityId', id)}
                placeholder={tr('entitySearchPlaceholder', 'Search and select an entity...')}
              />
              <p className="mt-1 text-xs text-gray-500">
                {tr('entityIdHint', 'Select the related entity from the list')}
              </p>
            </div>
          )}

          {/* Participants */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <UserPlusIcon className="w-4 h-4 inline mr-1" />
                {tr('participants', 'Participants')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newParticipant}
                  onChange={(e) => setNewParticipant(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-700 dark:text-white"
                  placeholder={tr('participantIdPlaceholder', 'Enter user ID...')}
                />
                <button
                  type="button"
                  onClick={addParticipant}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-600 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-500"
                >
                  {tr('add', 'Add')}
                </button>
              </div>
              {participants.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {participants.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-lg text-sm"
                    >
                      {p}
                      <button
                        type="button"
                        onClick={() => removeParticipant(p)}
                        className="hover:text-primary-900"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Initial message (only for new threads) */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {tr('initialMessage', 'Initial Message')}
              </label>
              <textarea
                {...register('initialMessage')}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-700 dark:text-white resize-none"
                placeholder={tr('initialMessagePlaceholder', 'Start the conversation...')}
              />
            </div>
          )}
        </form>
      </div>
    </BaseModal>
  );
}
