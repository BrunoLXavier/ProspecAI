/**
 * DeleteConfirmation - Inline delete confirmation component
 * Used inside modals for delete confirmation flow
 */
'use client';

import { useTranslations } from 'next-intl';

interface DeleteConfirmationProps {
  isVisible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
  message?: string;
}

export default function DeleteConfirmation({
  isVisible,
  onConfirm,
  onCancel,
  isDeleting = false,
  message,
}: DeleteConfirmationProps) {
  const tCommon = useTranslations('common');
  
  if (!isVisible) return null;

  return (
    <div className="mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <p className="text-red-700 dark:text-red-400 mb-3">
        {message || tCommon('deleteConfirmMessage') || 'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.'}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isDeleting}
          className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {isDeleting ? (tCommon('deleting') || 'Excluindo...') : (tCommon('confirmDelete') || 'Confirmar Exclusão')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          {tCommon('cancel') || 'Cancelar'}
        </button>
      </div>
    </div>
  );
}
