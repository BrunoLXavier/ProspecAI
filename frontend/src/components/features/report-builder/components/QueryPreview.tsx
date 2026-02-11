/**
 * Query Preview Component
 * Shows a live preview of the report query results
 */
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  PlayIcon, 
  EyeIcon,
  ExclamationTriangleIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';
import { usePreviewQuery } from '@/hooks/use-report-builder';
import type { QueryConfig } from '@/components/features/report-builder/types';

interface QueryPreviewProps {
  queryConfig: QueryConfig;
  isValid: boolean;
}

export default function QueryPreview({ queryConfig, isValid }: QueryPreviewProps) {
  const t = useTranslations('reports');
  const [previewLimit, setPreviewLimit] = useState(10);
  const { mutate: runPreview, data: previewData, isPending, error } = usePreviewQuery();

  const handlePreview = () => {
    if (!isValid) return;
    runPreview({ query_config: queryConfig, limit: previewLimit });
  };

  // Auto-preview when query changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isValid && queryConfig.base_table && queryConfig.selected_fields.length > 0) {
        runPreview({ query_config: queryConfig, limit: previewLimit });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [JSON.stringify(queryConfig), isValid, previewLimit]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          <EyeIcon className="w-4 h-4 inline-block mr-2" />
          {t('preview') || 'Preview'}
        </label>
        <div className="flex items-center gap-2">
          <select
            value={previewLimit}
            onChange={(e) => setPreviewLimit(Number(e.target.value))}
            className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={5}>5 rows</option>
            <option value={10}>10 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
          </select>
          <button
            onClick={handlePreview}
            disabled={!isValid || isPending}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                       text-sm font-medium transition-colors"
          >
            <PlayIcon className="w-4 h-4" />
            {isPending ? (t('loading') || 'Loading...') : (t('runPreview') || 'Run')}
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-700 dark:text-red-300">
                {t('previewError') || 'Preview Error'}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                {error.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No data message */}
      {!isPending && !error && previewData?.data?.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <TableCellsIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500 dark:text-gray-400">
            {t('noDataFound') || 'No data found matching your criteria'}
          </p>
        </div>
      )}

      {/* Preview table */}
      {previewData && previewData.data && previewData.data.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('showing') || 'Showing'} {previewData.data.length} {t('of') || 'of'} {previewData.row_count} {t('rows') || 'rows'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  {Object.keys(previewData.data[0]).map(key => (
                    <th 
                      key={key}
                      className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {previewData.data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    {Object.values(row).map((value, cellIdx) => (
                      <td 
                        key={cellIdx}
                        className="px-4 py-2 text-gray-900 dark:text-gray-100 whitespace-nowrap"
                      >
                        <CellValue value={value} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isPending && (
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      )}

      {/* Not valid message */}
      {!isValid && !previewData && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <EyeIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500 dark:text-gray-400">
            {t('selectTableAndFields') || 'Select a table and at least one field to preview'}
          </p>
        </div>
      )}
    </div>
  );
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">null</span>;
  }
  
  if (typeof value === 'boolean') {
    return (
      <span className={value ? 'text-green-600' : 'text-red-600'}>
        {value ? '✓' : '✗'}
      </span>
    );
  }
  
  if (typeof value === 'object') {
    return (
      <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
        {JSON.stringify(value).slice(0, 50)}...
      </span>
    );
  }
  
  const stringValue = String(value);
  
  // Truncate long strings
  if (stringValue.length > 100) {
    return <span title={stringValue}>{stringValue.slice(0, 100)}...</span>;
  }
  
  // Format UUIDs
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stringValue)) {
    return (
      <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
        {stringValue.slice(0, 8)}...
      </span>
    );
  }
  
  // Format dates
  if (/^\d{4}-\d{2}-\d{2}T/.test(stringValue)) {
    try {
      return <span>{new Date(stringValue).toLocaleString()}</span>;
    } catch {
      return <span>{stringValue}</span>;
    }
  }
  
  return <span>{stringValue}</span>;
}
