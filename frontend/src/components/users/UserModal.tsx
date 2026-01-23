/**
 * UserModal Component
 * Standardized Create/Edit/Delete modal for user management
 * Implements RF-09: Admin User Management
 */
'use client';

import { useState, useEffect } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

import { BaseModal, DeleteConfirmation } from '@/components/ui';
import { FormInput, FormSelect } from '@/components/forms';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

interface UserFormData {
  email: string;
  name: string;
  role: string;
  password?: string;
  is_active: boolean;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  onSave: (data: UserFormData, isEdit: boolean, userId?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  saving?: boolean;
  deleting?: boolean;
  error?: string | null;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'viewer', label: 'Viewer' },
];

export default function UserModal({
  isOpen,
  onClose,
  user,
  onSave,
  onDelete,
  saving = false,
  deleting = false,
  error,
}: UserModalProps) {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    name: '',
    role: 'analyst',
    password: '',
    is_active: true,
  });

  const isEditMode = !!user?.id;

  // Get translated role options
  const roleOptions = ROLE_OPTIONS.map(opt => ({
    value: opt.value,
    label: t(`users.roleTypes.${opt.value}`) || opt.label,
  }));

  // Reset form when user changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFormData({
          email: user.email || '',
          name: user.name || '',
          role: user.role || 'analyst',
          password: '',
          is_active: user.is_active ?? true,
        });
      } else {
        setFormData({
          email: '',
          name: '',
          role: 'analyst',
          password: '',
          is_active: true,
        });
      }
      setShowDeleteConfirm(false);
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData, isEditMode, user?.id);
  };

  const handleDelete = async () => {
    if (user?.id && onDelete) {
      await onDelete(user.id);
    }
  };

  const updateField = <K extends keyof UserFormData>(field: K, value: UserFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Footer content
  const footerContent = (
    <div className="flex items-center justify-between">
      <div>
        {isEditMode && onDelete && (
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
          form="user-form"
          disabled={saving || !formData.email || !formData.name || (!isEditMode && !formData.password)}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {saving
            ? tCommon('saving')
            : isEditMode
            ? tCommon('save')
            : t('users.create') || 'Create'}
        </button>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? (t('users.editUser') || 'Edit User') : (t('users.newUser') || 'New User')}
      icon={<UserCircleIcon className="w-6 h-6" />}
      size="md"
      footer={footerContent}
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Delete Confirmation */}
        <DeleteConfirmation
          isVisible={showDeleteConfirm && isEditMode}
          message={t('users.deleteConfirmation') || 'Are you sure you want to delete this user?'}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          isDeleting={deleting}
        />

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <FormInput
          label={(t('users.name') || 'Name') + ' *'}
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          required
        />

        <FormInput
          label={(t('users.email') || 'Email') + ' *'}
          type="email"
          value={formData.email}
          onChange={(e) => updateField('email', e.target.value)}
          required
        />

        <FormInput
          label={(t('users.password') || 'Password') + (!isEditMode ? ' *' : '')}
          type="password"
          value={formData.password}
          onChange={(e) => updateField('password', e.target.value)}
          placeholder={isEditMode ? (t('users.leaveBlank') || 'Leave blank to keep current') : ''}
          required={!isEditMode}
        />

        <FormSelect
          label={t('users.role') || 'Role'}
          value={formData.role}
          onChange={(e) => updateField('role', e.target.value)}
          options={roleOptions}
        />

        {/* Active Toggle */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => updateField('is_active', !formData.is_active)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.is_active ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.is_active ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {t('users.activeUser') || 'Active user'}
          </span>
        </div>

        {/* Last Login Info (Edit mode only) */}
        {isEditMode && user?.last_login && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {t('users.lastLogin') || 'Last Login'}
              </span>
              <span className="text-gray-700 dark:text-gray-300">
                {new Date(user.last_login).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        )}

        {/* Created At Info (Edit mode only) */}
        {isEditMode && user?.created_at && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {tCommon('createdAt') || 'Created At'}
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              {new Date(user.created_at).toLocaleString('pt-BR')}
            </span>
          </div>
        )}
      </form>
    </BaseModal>
  );
}
