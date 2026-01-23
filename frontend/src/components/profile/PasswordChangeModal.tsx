/**
 * PasswordChangeModal Component
 * Standardized modal for changing user password
 * Implements RF-09: Security Settings
 */
'use client';

import { useState } from 'react';
import { KeyIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

import { BaseModal } from '@/components/ui';
import { FormInput } from '@/components/forms';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (currentPassword: string, newPassword: string) => Promise<void>;
  saving?: boolean;
}

export default function PasswordChangeModal({
  isOpen,
  onClose,
  onSave,
  saving = false,
}: PasswordChangeModalProps) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t('security.allFieldsRequired') || 'All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('security.passwordMismatch') || 'Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError(t('security.passwordMinLength') || 'Password must be at least 8 characters');
      return;
    }

    try {
      await onSave(currentPassword, newPassword);
      handleClose();
    } catch (err) {
      setError((err as Error).message || t('security.updateError') || 'Error updating password');
    }
  };

  // Footer content - fixed at bottom
  const footerContent = (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={handleClose}
        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600"
      >
        {tCommon('cancel')}
      </button>
      <button
        type="submit"
        form="password-change-form"
        disabled={saving || !currentPassword || !newPassword || !confirmPassword}
        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
      >
        {saving ? tCommon('saving') : (t('security.updatePassword') || 'Update Password')}
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('security.changePassword') || 'Change Password'}
      icon={<KeyIcon className="w-6 h-6" />}
      size="sm"
      footer={footerContent}
    >
      <form id="password-change-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Current Password Section */}
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
          <FormInput
            label={(t('security.currentPassword') || 'Current Password') + ' *'}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>

        {/* New Password Section */}
        <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
          <FormInput
            label={(t('security.newPassword') || 'New Password') + ' *'}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <FormInput
            label={(t('security.confirmPassword') || 'Confirm Password') + ' *'}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        {/* Password Requirements */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
            {t('security.passwordRequirements') || 'Password requirements:'}
          </p>
          <ul className="text-xs text-blue-600 dark:text-blue-400 list-disc list-inside ml-1 space-y-0.5">
            <li>{t('security.minLength') || 'At least 8 characters'}</li>
          </ul>
        </div>
      </form>
    </BaseModal>
  );
}
