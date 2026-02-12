/**
 * Preview Panel Component
 * Renders the data preview step with a run button and results table
 * Implements RF-09: Dynamic Reports
 */
'use client';

import { useTranslations } from 'next-intl';
import { PlayIcon } from '@heroicons/react/24/outline';

// =============================================================================
// Types
// =============================================================================

interface PreviewResult {
  row_count: number;
  preview_limit: number;
  data: Record<string, unknown>[];
}

interface PreviewPanelProps {
  selectedFields: string[];
  previewData: PreviewResult | null;
  previewError: string | null;
  isPending: boolean;
  onRunPreview: () => void;
}

// =============================================================================
// Component
// =============================================================================

export default function PreviewPanel({
  selectedFields,
  previewData,
  previewError,
  isPending,
  onRunPreview,
}: PreviewPanelProps) {
  const t = useTranslations('reports');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t('preview')}
        </h3>
        <button
          onClick={onRunPreview}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <PlayIcon className="w-4 h-4" />
          {isPending ? t('loading') : t('runPreview')}
        </button>
      </div>

      {previewError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          {previewError}
        </div>
      )}

      {previewData && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('showingResults', { count: previewData.data.length, total: previewData.row_count })}
          </p>
          <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {selectedFields.map(field => (
                    <th key={field} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {previewData.data.map((row, idx) => (
                  <tr key={idx}>
                    {selectedFields.map(field => (
                      <td key={field} className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                        {String(row[field] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
