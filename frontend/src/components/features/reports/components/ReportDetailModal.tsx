/**
 * ReportDetailModal
 * Shows template details and allows edit/delete
 */
'use client';

import { useState } from 'react';
import { DocumentTextIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import ReportFormModal from './ReportFormModal';
import { useTranslations } from 'next-intl';
import BaseModal from '@/components/features/shared/ui/BaseModal';

interface Template {
  id: string;
  name: string;
  description?: string;
  parameters?: string[];
  output_formats?: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  template: Template | null;
  onDeleted?: (id: string) => void;
}

export default function ReportDetailModal({ isOpen, onClose, template, onDeleted }: Props) {
  const t = useTranslations('reports');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/reports/templates/${template!.id}`),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['report-templates'] });
      onDeleted?.(template!.id);
      onClose();
    },
    onError: (error: any) => {
      console.error('Failed to delete report template:', error);
    },
  });

  const handleDelete = () => {
    if (!template) return;
    if (confirm(t('deleteConfirmation'))) {
      deleteMutation.mutate();
    }
  };

  if (!template) return null;

  const renderFooter = () => (
    <div className="flex items-center justify-end gap-3">
      <button
        onClick={() => setEditing(true)}
        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center gap-2 transition-colors"
      >
        <PencilIcon className="h-4 w-4" /> {tCommon('edit')}
      </button>
      <button
        onClick={handleDelete}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
      >
        <TrashIcon className="h-4 w-4" /> {tCommon('delete')}
      </button>
    </div>
  );

  return (
    <>
      <ReportFormModal isOpen={editing} onClose={() => setEditing(false)} initial={{
        id: template.id,
        name: template.name,
        description: template.description,
        parameters: (template.parameters || []).join(','),
        output_formats: (template.output_formats || []).join(','),
      }} />

      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={template.name}
        icon={<DocumentTextIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
        size="3xl"
        footer={renderFooter()}
      >
        <div className="space-y-4">
          {template.description && <p className="text-sm text-gray-700 dark:text-gray-200">{template.description}</p>}

          <div>
            <h4 className="text-xs text-gray-500 dark:text-gray-400 uppercase">{t('parameters')}</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {(template.parameters || []).map((p) => (
                <span key={p} className="text-xs bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-gray-800 dark:text-white">{p}</span>
              ))}
              {(!template.parameters || template.parameters.length === 0) && <span className="text-xs text-gray-400 dark:text-gray-500">{t('none')}</span>}
            </div>
          </div>

          <div>
            <h4 className="text-xs text-gray-500 dark:text-gray-400 uppercase">{t('formats')}</h4>
            <div className="mt-2 flex gap-2">
              {(template.output_formats || []).map((f) => (
                <span key={f} className="text-xs bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-gray-800 dark:text-white">{f.toUpperCase()}</span>
              ))}
            </div>
          </div>
        </div>
      </BaseModal>
    </>
  );
}
