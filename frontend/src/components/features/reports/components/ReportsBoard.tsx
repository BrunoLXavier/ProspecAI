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
      <div className="p-8 text-center bg-white rounded-lg shadow">{t('loadingTemplates')}</div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-lg shadow">{t('noTemplates')}</div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template) => (
        <div key={template.id} className="bg-white rounded-lg shadow p-6 hover:shadow-elevated transition cursor-pointer" onClick={() => onItemClick?.(template)}>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gray-100">
              <DocumentTextIcon className="w-6 h-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
              <p className="text-sm text-gray-500 mt-2 line-clamp-3">{template.description}</p>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-gray-400">{(template.output_formats || []).join(', ').toUpperCase()}</div>
                  <div className="flex items-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); onSelect?.(template.id); }} className="text-sm text-primary-600">{t('select')}</button>
                  <button onClick={(e) => { e.stopPropagation(); onItemClick?.(template); }} className="text-sm text-gray-500">{t('details')}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
