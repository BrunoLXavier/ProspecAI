/**
 * Save Template Form Component
 * Renders the form for saving a report template with metadata and output formats
 * Implements RF-09: Dynamic Reports
 */
'use client';

import { useTranslations } from 'next-intl';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';

// =============================================================================
// Types
// =============================================================================

type Visibility = 'private' | 'institute' | 'all_tenants';

interface SaveTemplateFormProps {
  templateName: string;
  templateDescription: string;
  visibility: Visibility;
  outputFormats: string[];
  isSaving: boolean;
  editId: string | null;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onVisibilityChange: (value: Visibility) => void;
  onOutputFormatsChange: (formats: string[]) => void;
  onSave: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const AVAILABLE_FORMATS = ['html', 'csv', 'json', 'pdf', 'xlsx'];

// =============================================================================
// Component
// =============================================================================

export default function SaveTemplateForm({
  templateName,
  templateDescription,
  visibility,
  outputFormats,
  isSaving,
  editId,
  onNameChange,
  onDescriptionChange,
  onVisibilityChange,
  onOutputFormatsChange,
  onSave,
}: SaveTemplateFormProps) {
  const t = useTranslations('reports');

  const toggleFormat = (format: string, checked: boolean) => {
    if (checked) {
      onOutputFormatsChange([...outputFormats, format]);
    } else {
      onOutputFormatsChange(outputFormats.filter(f => f !== format));
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        {t('saveTemplate') || 'Save Report Template'}
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('templateName') || 'Template Name'} *
          </label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="My Custom Report"
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('description') || 'Description'}
          </label>
          <textarea
            value={templateDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={3}
            placeholder="Describe what this report shows..."
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('visibility') || 'Visibility'}
          </label>
          <select
            value={visibility}
            onChange={(e) => onVisibilityChange(e.target.value as Visibility)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="private">Private (Only me)</option>
            <option value="institute">My Institute</option>
            <option value="all_tenants">All Users</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('outputFormats') || 'Output Formats'}
          </label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_FORMATS.map(format => (
              <label key={format} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={outputFormats.includes(format)}
                  onChange={(e) => toggleFormat(format, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="uppercase text-sm">{format}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onSave}
        disabled={isSaving || !templateName.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
      >
        <DocumentArrowDownIcon className="w-5 h-5" />
        {isSaving ? 'Saving...' : (editId ? 'Update Template' : 'Save Template')}
      </button>
    </div>
  );
}
