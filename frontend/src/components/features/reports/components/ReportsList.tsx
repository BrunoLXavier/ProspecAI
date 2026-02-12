/**
 * ReportsList
 * List view for report templates with select and detail actions
 */
'use client';

import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';
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
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onOpenDetail?: (template: Template) => void;
}

export default function ReportsList({ templates = [], loading = false, selectedId, onSelect, onOpenDetail }: Props) {
  const t = useTranslations('reports');

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">{t('loadingTemplates')}</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
      {templates.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('noTemplates')}</div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {templates.map((template) => (
            <li
              key={template.id}
              className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
              onClick={() => onOpenDetail?.(template)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <DocumentTextIcon className="w-6 h-6 text-gray-400 dark:text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{template.description}</p>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className="text-xs text-gray-400 dark:text-gray-300">{(template.output_formats || []).join(', ').toUpperCase()}</div>
                    <div className="flex items-center gap-3">
                    {/* 'Select' action often unused; removed to simplify list UI. Click the row to open details. */}
                    <button onClick={(e) => { e.stopPropagation(); onOpenDetail?.(template); }} className="text-sm text-gray-500 dark:text-gray-300">{t('details')}</button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
