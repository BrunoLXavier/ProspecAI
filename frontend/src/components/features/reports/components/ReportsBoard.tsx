/**
 * ReportsBoard
 * Simple card grid board view for report templates
 */
'use client';

import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

interface Template {
  id: string;
  name: string;
  description?: string;
  output_formats?: string[];
}

interface Props {
  templates?: Template[];
  loading?: boolean;
  onItemClick?: (template: Template) => void;
  onSelect?: (id: string) => void;
}

export default function ReportsBoard({ templates = [], loading = false, onItemClick, onSelect }: Props) {
  const t = useTranslations('reports');

  if (loading) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-lg shadow">{t('loadingTemplates')}</div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-lg shadow">{t('noTemplates')}</div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template) => (
        <div key={template.id} className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 hover:shadow-elevated transition cursor-pointer" onClick={() => onItemClick?.(template)}>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700">
              <DocumentTextIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{template.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-3">{template.description}</p>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-gray-400 dark:text-gray-300">{(template.output_formats || []).join(', ').toUpperCase()}</div>
                  <div className="flex items-center gap-3">
                  {/* 'Select' action often unused; removed to simplify board UI */}
                  <button onClick={(e) => { e.stopPropagation(); onItemClick?.(template); }} className="text-sm text-gray-500 dark:text-gray-300">{t('details')}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
