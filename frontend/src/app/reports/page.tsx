/**
 * Reports Page — Standardized via useCrudPage
 * Implements RF-09: Report generation and export
 *
 * Note: Reports have a custom generate workflow (select template → choose format → generate)
 * that sits alongside the standard CRUD views. The generate/view modals remain custom
 * because they don't follow the entity CRUD pattern.
 */
'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { DocumentTextIcon, PlusIcon, ChartBarIcon, FolderIcon, FunnelIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import { useCrudPage, FetchResult } from '@/hooks/use-crud-page';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import Icon from '@/components/features/shared/ui/Icon';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import BaseModal from '@/components/features/shared/ui/BaseModal';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
import Pagination from '@/components/features/shared/ui/Pagination';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GeneratedReport {
  id?: string;
  template_id: string;
  generated_at: string;
  format: string;
  content?: string;
  download_url?: string;
}

interface ReportFilters {
  search: string;
}

const initialFilters: ReportFilters = { search: '' };

const templateIcons: Record<string, React.ReactNode> = {
  proposal_summary: <DocumentTextIcon className="h-6 w-6" />,
  matching_analysis: <ChartBarIcon className="h-6 w-6" />,
  portfolio_overview: <FolderIcon className="h-6 w-6" />,
  pipeline_status: <FunnelIcon className="h-6 w-6" />,
  funding_opportunities: <CurrencyDollarIcon className="h-6 w-6" />,
};

// ─── Page Component ──────────────────────────────────────────────────────────

export default function ReportsPage() {
  const t = useTranslations('reports');
  const tCommon = useTranslations('common');
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const state = useCrudPage<GeneratedReport, ReportFilters>({
    queryKey: 'generated-reports',
    initialFilters,
    defaultPageSize: 20,
    filterFn: (item, filters) => {
      if (!filters.search) return true;
      const s = filters.search.toLowerCase();
      return (item.template_id || '').toLowerCase().includes(s) || (item.format || '').toLowerCase().includes(s);
    },
    fetchFn: async () => {
      try {
        const data = await apiClient.get('/api/v1/reports');
        const items = Array.isArray(data) ? data : data?.data || [];
        return { items, total: items.length } as FetchResult<GeneratedReport>;
      } catch (err) {
        console.error('Failed to load generated reports:', err);
        return { items: [], total: 0 };
      }
    },
  });

  const filterFields: FilterField[] = useMemo(() => [
    { key: 'search', label: t('filters.search'), type: 'text', placeholder: t('filters.searchPlaceholder') },
  ], [t]);

  const timelineItems: TimelineItem[] = useMemo(() => {
    return state.data.map((r, idx) => ({
      id: (r as any).id || `report-${idx}`,
      title: r.template_id || t('title') || 'Report',
      description: `${t('format') || 'Format'}: ${(r.format || '').toUpperCase()}`,
      date: r.generated_at,
      status: r.download_url ? 'success' : 'info',
      icon: <DocumentTextIcon className="w-4 h-4" />,
      tags: [{ label: (r.format || '').toUpperCase(), color: 'blue' }],
      onClick: () => { setSelectedReport(r); setIsDetailOpen(true); },
    }));
  }, [state.data, t]);

  const tableColumns: TableColumn<GeneratedReport>[] = useMemo(() => [
    {
      key: 'template_id', header: t('templateLabel') || 'Template', accessor: 'template_id', sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <Icon color="secondary" size="sm" withBackground={false}><DocumentTextIcon /></Icon>
          <span className="font-medium">{value as string || '—'}</span>
        </div>
      ),
    },
    {
      key: 'format', header: t('format') || 'Format', accessor: 'format', sortable: true,
      render: (value) => <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">{((value as string) || '').toUpperCase()}</span>,
    },
    {
      key: 'generated_at', header: t('generated') || 'Generated', accessor: 'generated_at', sortable: true,
      render: (value) => <span className="text-gray-600 dark:text-gray-400">{value ? new Date(value as string).toLocaleString() : '—'}</span>,
    },
    {
      key: 'status', header: t('statusLabel') || 'Status', accessor: (row) => row.download_url ? t('available') || 'Available' : t('processed') || 'Processed',
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${value === (t('available') || 'Available') ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
          {value as string}
        </span>
      ),
    },
  ], [t]);

  const handleDelete = async (report: GeneratedReport) => {
    if (!report) return;
    try {
      if ((report as any).id) {
        await apiClient.delete(`/api/v1/reports/${(report as any).id}`);
      }
      setSelectedReport(null);
      setIsDetailOpen(false);
      state.refetch();
    } catch (err: any) {
      console.error('Failed to delete report:', err);
      // Still close and refetch so user sees the item is still there
      setSelectedReport(null);
      setIsDetailOpen(false);
      state.refetch();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title') || 'Reports'}
        subtitle={t('subtitle') || 'Generated reports and history'}
        viewToggle
        viewMode={state.viewMode}
        onViewChange={state.setViewMode}
        action={
          <button onClick={() => setIsGenerateOpen(true)} title={t('newReport') || 'Generate Report'} className="inline-flex items-center justify-center p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition">
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <ConfigurableStatisticsBar module="reports" data={state.allData} />

      <FilterPanel fields={filterFields} values={state.filters} onChange={state.setFilter} onReset={state.resetFilters} />

      {/* Board View */}
      {state.viewMode === 'board' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.isLoading ? (
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">{tCommon('loading')}</div>
          ) : state.data.length === 0 ? (
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">{t('noReports')}</div>
          ) : (
            state.data.map((r, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 hover:shadow-elevated transition cursor-pointer" onClick={() => { setSelectedReport(r); setIsDetailOpen(true); }}>
                <div className="flex items-start gap-3">
                  <Icon color="secondary" size="lg"><DocumentTextIcon /></Icon>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{r.template_id || '—'}</h3>
                    <p className="text-sm text-gray-500 mt-2">{new Date(r.generated_at).toLocaleString()}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-xs text-gray-400">{(r.format || '').toUpperCase()}</div>
                      <div className="flex items-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedReport(r); setIsDetailOpen(true); }} className="text-sm text-primary-600">{t('view')}</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(r); }} className="text-sm text-red-600">{tCommon('delete')}</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Timeline View */}
      {state.viewMode === 'timeline' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <TimelineView items={timelineItems} loading={state.isLoading} emptyMessage={t('noReports')} animated showConnectors />
        </div>
      )}

      {/* Table View */}
      {state.viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <TableView<GeneratedReport> data={state.data} columns={tableColumns} getRowKey={(row) => (row as any).id || `${row.template_id}-${row.generated_at}`} onRowClick={(row) => { setSelectedReport(row); setIsDetailOpen(true); }} loading={state.isLoading} emptyMessage={t('noReports')} paginated pageSize={state.pageSize} currentPage={state.currentPage} totalItems={state.totalItems} onPageChange={state.setCurrentPage} onPageSizeChange={state.setPageSize} striped hoverable />
        </div>
      )}

      {/* List View */}
      {state.viewMode === 'list' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            {state.isLoading ? (
              <div className="p-8 text-center text-gray-500">{tCommon('loading')}</div>
            ) : state.data.length === 0 ? (
              <div className="p-8 text-center text-gray-500">{t('noReports')}</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {state.data.map((r, idx) => (
                  <li key={idx} className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer" onClick={() => { setSelectedReport(r); setIsDetailOpen(true); }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Icon color="secondary" size="md" withBackground={false}><DocumentTextIcon /></Icon>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{r.template_id}</h3>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{(r.format || '').toUpperCase()}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                          <div><span className="text-gray-500 dark:text-gray-400">{t('generated')}:</span><p className="font-medium text-gray-900 dark:text-white">{new Date(r.generated_at).toLocaleString()}</p></div>
                          <div><span className="text-gray-500 dark:text-gray-400">{t('templateLabel')}:</span><p className="font-medium text-gray-900 dark:text-white">{r.template_id || '—'}</p></div>
                          <div><span className="text-gray-500 dark:text-gray-400">{t('statusLabel')}:</span><p className="font-medium text-gray-900 dark:text-white">{r.download_url ? t('available') : t('processed')}</p></div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {state.totalItems > 0 && (
            <Pagination currentPage={state.currentPage} totalItems={state.totalItems} pageSize={state.pageSize} onPageChange={state.setCurrentPage} onPageSizeChange={state.setPageSize} persistInUrl showTotal showPageSizeSelector />
          )}
        </div>
      )}

      {/* Custom Generate Modal */}
      {isGenerateOpen && (
        <ReportGeneratorModal onClose={() => setIsGenerateOpen(false)} onGenerated={(r: GeneratedReport) => { setIsGenerateOpen(false); state.refetch(); }} />
      )}

      {/* Custom Detail/View Modal */}
      {isDetailOpen && selectedReport && (
        <ReportViewModal report={selectedReport} onClose={() => setIsDetailOpen(false)} onDelete={() => handleDelete(selectedReport)} />
      )}
    </div>
  );
}

// ─── Custom Generate Modal (domain-specific, not standard CRUD) ──────────────

function ReportGeneratorModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: (r: GeneratedReport) => void }) {
  const t = useTranslations('reports');
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [format, setFormat] = useState('html');
  const [pending, setPending] = useState(false);

  useQuery({
    queryKey: ['report-templates-for-gen'],
    queryFn: async () => {
      try {
        const d = await apiClient.get('/api/v1/reports/templates');
        setTemplates(Array.isArray(d) ? d : (d?.templates || d?.data || []));
      } catch { setTemplates([]); }
    },
  });

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    setPending(true);
    try {
      const response = await fetch(`/api/v1/reports/generate/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: selectedTemplate, parameters: {}, format }),
      });
      if (!response.ok) throw new Error('Generate failed');
      if (format === 'html') {
        const html = await response.text();
        onGenerated({ template_id: selectedTemplate, generated_at: new Date().toISOString(), format, content: html });
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        onGenerated({ template_id: selectedTemplate, generated_at: new Date().toISOString(), format, download_url: url });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <BaseModal isOpen onClose={onClose} title={t('newReport') || 'Generate Report'} size="3xl"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-700 border rounded-lg">{t('cancel') || 'Cancel'}</button>
          <button onClick={handleGenerate} disabled={pending || !selectedTemplate} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{pending ? t('generating') || 'Generating...' : t('generate') || 'Generate'}</button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400">{t('templateLabel')}</label>
          <select className="w-full border rounded px-3 py-2 dark:bg-slate-700 dark:border-gray-600 dark:text-white" value={selectedTemplate || ''} onChange={(e) => setSelectedTemplate(e.target.value)}>
            <option value="">{t('selectTemplate') || 'Select...'}</option>
            {templates.map((tpl) => (<option key={tpl.id} value={tpl.id}>{tpl.name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400">{t('format') || 'Format'}</label>
          <div className="flex gap-2 mt-2">
            {['html', 'pdf', 'xlsx'].map((f) => (
              <button key={f} onClick={() => setFormat(f)} className={`px-3 py-2 rounded ${format === f ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300'}`}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

function ReportViewModal({ report, onClose, onDelete }: { report: GeneratedReport; onClose: () => void; onDelete: () => void }) {
  const t = useTranslations('reports');
  return (
    <BaseModal isOpen onClose={onClose} title={t('details') || 'Report'} subtitle={report.template_id} size="3xl"
      footer={
        <div className="flex items-center justify-end gap-3">
          {report.download_url && <a href={report.download_url} download className="px-4 py-2 bg-green-600 text-white rounded-lg">Download</a>}
          <button onClick={onDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg">{t('delete') || 'Delete'}</button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">Template: {report.template_id}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">{t('generated')}: {new Date(report.generated_at).toLocaleString()}</div>
        {report.content && <div className="prose max-h-[500px] overflow-auto border rounded p-4 dark:border-gray-600" dangerouslySetInnerHTML={{ __html: report.content }} />}
      </div>
    </BaseModal>
  );
}
