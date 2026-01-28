/**
 * UserModal Component
 * Standardized Create/Edit/Delete modal for user management
 * Implements RF-09: Admin User Management
 */
'use client';

import { useState, useEffect } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

import { BaseModal, DeleteConfirmation } from '@/components/features/shared/ui';
import { FormInput, FormSelect } from '@/components/features/shared/forms';

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
      <form id="user-form" onSubmit={handleSubmit} className="space-y-5">
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
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Basic Info Section */}
        <div className="space-y-4">
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
        </div>

        {/* Credentials Section */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <FormInput
            label={(t('users.password') || 'Password') + (!isEditMode ? ' *' : '')}
            type="password"
            value={formData.password}
            onChange={(e) => updateField('password', e.target.value)}
            placeholder={isEditMode ? (t('users.leaveBlank') || 'Leave blank to keep current') : ''}
            required={!isEditMode}
          />
        </div>

        {/* Role & Status Section */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-4">
          <FormSelect
            label={t('users.role') || 'Role'}
            value={formData.role}
            onChange={(e) => updateField('role', e.target.value)}
            options={roleOptions}
          />

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${formData.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('users.activeUser') || 'Active user'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => updateField('is_active', !formData.is_active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
                formData.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  formData.is_active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* User Info (Edit mode only) */}
        {isEditMode && (user?.last_login || user?.created_at) && (
          <div className="pt-4 mt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {user?.last_login && (
                <div className="p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                    {t('users.lastLogin') || 'Last Login'}
                  </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {new Date(user.last_login).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
              {user?.created_at && (
                <div className="p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                    {tCommon('createdAt') || 'Created At'}
                  </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {new Date(user.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </BaseModal>
  );
}
