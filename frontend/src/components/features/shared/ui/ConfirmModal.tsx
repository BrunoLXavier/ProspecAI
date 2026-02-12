/**
 * ConfirmModal — Standardized Confirmation Dialog
 * Now composes BaseModal instead of reimplementing Dialog/Transition.
 * Uses i18n for all labels — no hardcoded English defaults.
 *
 * Implements RF-05: Standardized confirmation patterns
 */
'use client';

import React, { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import BaseModal from './BaseModal';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Visual variant — determines confirm button color */
  variant?: ConfirmVariant;
  /** Whether the confirm action is in progress */
  isLoading?: boolean;
  /** Custom content instead of description text */
  children?: ReactNode;
}

const variantButtonClasses: Record<ConfirmVariant, string> = {
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50',
  warning: 'bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50',
  info: 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50',
};

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = 'danger',
  isLoading = false,
  children,
}: ConfirmModalProps) {
  const tCommon = useTranslations('common');

  const resolvedTitle = title || tCommon('confirmAction');
  const resolvedConfirmLabel = confirmLabel || tCommon('confirm');
  const resolvedCancelLabel = cancelLabel || tCommon('cancel');

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={isLoading}
        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
      >
        {resolvedCancelLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={isLoading}
        className={`px-4 py-2 rounded-lg transition-colors ${variantButtonClasses[variant]}`}
      >
        {isLoading ? tCommon('processing') : resolvedConfirmLabel}
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onCancel}
      title={resolvedTitle}
      icon={<ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />}
      size="md"
      footer={footer}
      showCloseButton={false}
    >
      {children ?? (
        description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )
      )}
    </BaseModal>
  );
}
