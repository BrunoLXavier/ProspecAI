/**
 * Reports List Page Component
 * Full page for managing report templates with CRUD and generation
 * Implements RF-09: Report management and export
 */
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  UserIcon,
  MagnifyingGlassIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/components/ui/PageHeader';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  useReportTemplates,
  useDeleteTemplate,
  useGenerateReport,
  downloadReport,
  getReportFilename,
} from '@/hooks/useReportBuilder';
import type { OutputFormat, ReportTemplate } from '@/types/features/report-builder';

export default function ReportsPage() {
  const t = useTranslations('reports');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ReportTemplate | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const { data: templates = [], isLoading, error } = useReportTemplates();
  const deleteMutation = useDeleteTemplate();
  const generateMutation = useGenerateReport();

  // Filter templates by search query
  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleGenerate = async (template: ReportTemplate, format: OutputFormat) => {
    setGeneratingId(template.id);
    
    try {
      const result = await generateMutation.mutateAsync({
        templateId: template.id,
        format,
      });

      if (result instanceof Blob) {
        downloadReport(result, getReportFilename(template.name, format));
      } else if (format === 'html') {
        const html = typeof result === 'string' ? result : JSON.stringify(result);
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(html);
        }
      } else if (format === 'json') {
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        downloadReport(blob, getReportFilename(template.name, format));
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGeneratingId(null);
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return <UserIcon className="w-4 h-4" />;
      case 'institute':
        return <BuildingOfficeIcon className="w-4 h-4" />;
      case 'all_tenants':
        return <GlobeAltIcon className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return t('private') || 'Private';
      case 'institute':
        return t('institute') || 'Institute';
      case 'all_tenants':
        return t('allTenants') || 'All Users';
      default:
        return visibility;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-red-600 dark:text-red-400">
            {t('errorLoading') || 'Failed to load reports'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title={t('title') || 'Reports'}
        subtitle={t('subtitle') || 'Create and manage custom reports'}
        action={
          <Link
            href="/reports/builder"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            {t('createReport') || 'Create Report'}
          </Link>
        }
      />

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchReports') || 'Search reports...'}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg
                        bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <TableCellsIcon className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600" />
            <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">
              {searchQuery
                ? (t('noSearchResults') || 'No reports found')
                : (t('noReports') || 'No reports yet')}
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {searchQuery
                ? (t('tryDifferentSearch') || 'Try a different search term')
                : (t('getStarted') || 'Get started by creating your first custom report with the visual query builder')}
            </p>
            {!searchQuery && (
              <Link
                href="/reports/builder"
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                {t('createReport') || 'Create Report'}
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 
                           shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <DocumentTextIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {template.name}
                        </h3>
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-2 mt-4">
                    <span 
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full 
                                 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      title={getVisibilityLabel(template.visibility)}
                    >
                      {getVisibilityIcon(template.visibility)}
                      {getVisibilityLabel(template.visibility)}
                    </span>
                    {template.schedule_enabled && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full 
                                       bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {t('scheduled') || 'Scheduled'}
                      </span>
                    )}
                  </div>

                  {/* Output format badges */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {template.output_formats?.map((format) => (
                      <span
                        key={format}
                        className="px-2 py-0.5 text-xs rounded bg-blue-50 dark:bg-blue-900/20 
                                   text-blue-600 dark:text-blue-400 uppercase font-medium"
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800/50 
                                border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/reports/builder?edit=${template.id}`}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 
                                 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                      title={t('edit') || 'Edit'}
                    >
                      <PencilIcon className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(template)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 
                                 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                      title={t('delete') || 'Delete'}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Generate dropdown */}
                  <div className="relative group">
                    <button
                      disabled={generatingId === template.id}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg 
                                 hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                    >
                      {generatingId === template.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      ) : (
                        <ArrowDownTrayIcon className="w-4 h-4" />
                      )}
                      {t('export') || 'Export'}
                    </button>
                    
                    <div className="absolute right-0 bottom-full mb-2 w-32 bg-white dark:bg-gray-800 
                                    rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 
                                    opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                                    transition-all duration-150 z-10 overflow-hidden">
                      {(template.output_formats || ['html', 'csv', 'json']).map((format) => (
                        <button
                          key={format}
                          onClick={() => handleGenerate(template, format)}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 
                                     hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4 text-gray-400" />
                          {format.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Metadata footer */}
                <div className="px-5 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {t('lastModified') || 'Modified'}: {new Date(template.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteReportTitle') || 'Delete Report'}
        description={`${t('deleteReportMessage') || 'Are you sure you want to delete'} "${deleteTarget?.name}"? ${t('cannotUndo') || 'This action cannot be undone.'}`}
        confirmLabel={t('delete') || 'Delete'}
      />
    </div>
  );
}
