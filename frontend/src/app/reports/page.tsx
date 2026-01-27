/**
 * Reports Page
 * Implements RF-09: Report generation and export
 */
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DocumentTextIcon, PlusIcon, ChartBarIcon, FolderIcon, FunnelIcon, CurrencyDollarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';
import PageHeader from '@/components/ui/PageHeader';
import Icon from '@/components/ui/Icon';
// StatCard not required here
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
// report templates components are used in templates page
import { ViewMode } from '@/components/ui/ViewToggle';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import TimelineView, { TimelineItem } from '@/components/ui/TimelineView';
import TableView, { TableColumn } from '@/components/ui/TableView';

// =============================================================================
// Types
// =============================================================================

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  parameters: string[];
  output_formats: string[];
}

interface GeneratedReport {
  template_id: string;
  generated_at: string;
  format: string;
  content?: string;
  download_url?: string;
}

// =============================================================================
// Template Icons
// =============================================================================

const templateIcons: Record<string, React.ReactNode> = {
  proposal_summary: <DocumentTextIcon className="h-6 w-6" />,
  matching_analysis: <ChartBarIcon className="h-6 w-6" />,
  portfolio_overview: <FolderIcon className="h-6 w-6" />,
  pipeline_status: <FunnelIcon className="h-6 w-6" />,
  funding_opportunities: <CurrencyDollarIcon className="h-6 w-6" />,
};

// =============================================================================
// Reports Page
// =============================================================================

export default function ReportsPage() {
  const t = useTranslations('reports');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<{ search?: string }>({});
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const { initialPage, initialPageSize } = usePagination(20, true);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // load generated reports (backend may expose /api/v1/reports)
  const loadReports = async () => {
    try {
      setIsLoadingReports(true);
      const data = await apiClient.get('/api/v1/reports');
      const arr = Array.isArray(data) ? data : data?.data || [];
      setGeneratedReports(arr);
    } catch (err) {
      console.error('Failed to load generated reports:', err);
      setGeneratedReports([]);
      setError((err as any)?.message || 'Failed to load generated reports');
    } finally {
      setIsLoadingReports(false);
    }
  };

  // initial load
  useQuery({
    queryKey: ['generated-reports'],
    queryFn: loadReports,
  });

  const filterFields: FilterField[] = [
    { key: 'search', label: t('filters.search'), type: 'text', placeholder: t('filters.searchPlaceholder') },
  ];

  const filtered = generatedReports.filter((r) => {
    if (!filters.search) return true;
    const s = filters.search.toLowerCase();
    return (r.template_id || '').toLowerCase().includes(s) || (r.generated_at || '').toLowerCase().includes(s) || (r.format || '').toLowerCase().includes(s);
  });

  // Paginate reports for list view
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Timeline items for timeline view
  const timelineItems: TimelineItem[] = useMemo(() => {
    return filtered.map((r, idx) => ({
      id: (r as any).id || `report-${idx}`,
      title: r.template_id || t('untitledReport') || 'Untitled Report',
      description: `${t('format') || 'Format'}: ${(r.format || '').toUpperCase()}`,
      date: r.generated_at,
      status: r.download_url ? 'success' : 'info',
      icon: <DocumentTextIcon className="w-4 h-4" />,
      tags: [
        { label: (r.format || '').toUpperCase(), color: 'blue' },
      ],
      onClick: () => {
        setSelectedReport(r);
        setIsDetailOpen(true);
      },
    }));
  }, [filtered, t]);

  // Table columns for table view
  const tableColumns: TableColumn<GeneratedReport>[] = useMemo(() => [
    {
      key: 'template_id',
      header: t('templateLabel') || 'Template',
      accessor: 'template_id',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <Icon color="secondary" size="sm" withBackground={false}>
            <DocumentTextIcon />
          </Icon>
          <span className="font-medium">{value as string || '—'}</span>
        </div>
      ),
    },
    {
      key: 'format',
      header: t('format') || 'Format',
      accessor: 'format',
      sortable: true,
      render: (value) => (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
          {((value as string) || '').toUpperCase()}
        </span>
      ),
    },
    {
      key: 'generated_at',
      header: t('generated') || 'Generated At',
      accessor: 'generated_at',
      sortable: true,
      render: (value) => (
        <span className="text-gray-600 dark:text-gray-400">
          {value ? new Date(value as string).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('statusLabel') || 'Status',
      accessor: (row) => row.download_url ? t('available') || 'Available' : t('processed') || 'Processed',
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          value === (t('available') || 'Available')
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
        }`}>
          {value as string}
        </span>
      ),
    },
  ], [t]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleDelete = async (report: GeneratedReport) => {
    if (!report) return;
    if (!confirm('Excluir relatório gerado?')) return;
    try {
      // try backend delete
      if ((report as any).id) {
        await apiClient.delete(`/api/v1/reports/${(report as any).id}`);
      }
    } catch (err) {
      console.warn('Delete failed on backend', err);
    }
    // optimistic client removal
    setGeneratedReports((prev) => prev.filter((r) => r !== report));
    setSelectedReport(null);
    setIsDetailOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title') || 'Relatórios'}
        subtitle={t('subtitle') || 'Relatórios gerados e históricos'}
        viewToggle={true}
        viewMode={viewMode}
        onViewChange={setViewMode}
        action={(
          <button
            onClick={() => setIsGenerateOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            {t('newReport') || 'Gerar Relatório'}
          </button>
        )}
      />

      <ConfigurableStatisticsBar module="reports" data={generatedReports} />

      {error && (
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      <FilterPanel fields={filterFields} values={filters} onChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))} onReset={() => setFilters({})} />

      <main>
        {/* Board View */}
        {viewMode === 'board' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingReports ? (
              <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">{t('loading')}</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">{t('noReports')}</div>
            ) : (
              filtered.map((r, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 hover:shadow-elevated transition cursor-pointer" onClick={() => { setSelectedReport(r); setIsDetailOpen(true); }}>
                  <div className="flex items-start gap-3">
                    <Icon color="secondary" size="lg">
                      <DocumentTextIcon />
                    </Icon>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{r.template_id || '—'}</h3>
                      <p className="text-sm text-gray-500 mt-2">{new Date(r.generated_at).toLocaleString()}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-xs text-gray-400">{(r.format || '').toUpperCase()}</div>
                        <div className="flex items-center gap-3">
                          <button onClick={(e) => { e.stopPropagation(); setSelectedReport(r); setIsDetailOpen(true); }} className="text-sm text-primary-600">{t('view')}</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(r); }} className="text-sm text-red-600">{t('delete')}</button>
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
        {viewMode === 'timeline' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <TimelineView
              items={timelineItems}
              loading={isLoadingReports}
              emptyMessage={t('noReports')}
              animated={true}
              showConnectors={true}
            />
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            <TableView<GeneratedReport>
              data={filtered}
              columns={tableColumns}
              getRowKey={(row) => (row as any).id || `${row.template_id}-${row.generated_at}`}
              onRowClick={(row) => {
                setSelectedReport(row);
                setIsDetailOpen(true);
              }}
              loading={isLoadingReports}
              emptyMessage={t('noReports')}
              paginated={true}
              pageSize={pageSize}
              currentPage={currentPage}
              totalItems={filtered.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}

        {/* List View (default) */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
              {isLoadingReports ? (
                <div className="p-8 text-center text-gray-500">{t('loading')}</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-gray-500">{t('noReports')}</div>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedReports.map((r, idx) => (
                    <li key={idx} className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer" onClick={() => { setSelectedReport(r); setIsDetailOpen(true); }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Icon color="secondary" size="md" withBackground={false}>
                              <DocumentTextIcon />
                            </Icon>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{r.template_id}</h3>
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{(r.format || '').toUpperCase()}</span>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">{t('generated')}:</span>
                              <p className="font-medium text-gray-900 dark:text-white">{new Date(r.generated_at).toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">{t('templateLabel')}:</span>
                              <p className="font-medium text-gray-900 dark:text-white">{r.template_id || '—'}</p>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">{t('statusLabel')}:</span>
                              <p className="font-medium text-gray-900 dark:text-white">{r.download_url ? t('available') : t('processed')}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Pagination */}
            {filtered.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                persistInUrl={true}
                showTotal={true}
                showPageSizeSelector={true}
              />
            )}
          </div>
        )}
      </main>

      {/* Generate modal and Detail modal: reuse part of original generation logic inline */}
      {isGenerateOpen && (
        <ReportGeneratorModal onClose={() => setIsGenerateOpen(false)} onGenerated={(r: GeneratedReport) => { setGeneratedReports((p) => [r, ...p]); setIsGenerateOpen(false); }} />
      )}

      {isDetailOpen && selectedReport && (
        <ReportViewModal report={selectedReport} onClose={() => setIsDetailOpen(false)} onDelete={() => handleDelete(selectedReport)} />
      )}
    </div>
  );
}

// Small inline generator modal component reused from original page behavior
function ReportGeneratorModal({ onClose, onGenerated }: any) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [format, setFormat] = useState('html');
  const [params, setParams] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  // load templates
  useQuery({ queryKey: ['report-templates-for-gen'], queryFn: async () => { try { const d = await apiClient.get('/api/v1/reports/templates'); setTemplates(Array.isArray(d) ? d : (d?.templates || d?.data || [])); } catch(e){ setTemplates([]);} } });

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    setPending(true);
    try {
      const response = await fetch(`/api/v1/reports/generate/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: selectedTemplate, parameters: params, format }),
      });
      if (!response.ok) throw new Error('Generate failed');
      if (format === 'html') {
        const html = await response.text();
        const rep = { template_id: selectedTemplate, generated_at: new Date().toISOString(), format, content: html };
        onGenerated(rep);
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const rep = { template_id: selectedTemplate, generated_at: new Date().toISOString(), format, download_url: url };
        onGenerated(rep);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar relatório');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="fixed inset-0 bg-black/40" onClick={onClose} />
    <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Gerar Relatório</h3>
          <button onClick={onClose} className="text-gray-400">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600">Template</label>
            <select className="w-full border rounded px-3 py-2" value={selectedTemplate || ''} onChange={(e) => setSelectedTemplate(e.target.value)}>
              <option value="">Selecione</option>
              {templates.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600">Formato</label>
            <div className="flex gap-2 mt-2">
              {['html','pdf','xlsx'].map((f) => (
                <button key={f} onClick={() => setFormat(f)} className={`px-3 py-2 rounded ${format===f? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
            <div className="flex justify-end gap-3 pt-3 border-t">
            <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-700 border rounded-lg">Cancelar</button>
            <button onClick={handleGenerate} disabled={pending || !selectedTemplate} className="px-4 py-2 bg-blue-600 text-white rounded-lg">{pending? 'Gerando...' : 'Gerar'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportViewModal({ report, onClose, onDelete }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="fixed inset-0 bg-black/40" onClick={onClose} />
    <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Relatório</h3>
          <button onClick={onClose} className="text-gray-400">✕</button>
        </div>
        <div className="space-y-4">
          <div className="text-sm text-gray-600">Template: {report.template_id}</div>
          <div className="text-sm text-gray-600">Gerado em: {new Date(report.generated_at).toLocaleString()}</div>
          {report.content && <div className="prose max-h-[500px] overflow-auto border rounded p-4" dangerouslySetInnerHTML={{ __html: report.content }} />}
          {report.download_url && (
            <div className="pt-4 flex items-center gap-3">
              <a href={report.download_url} download className="px-4 py-2 bg-green-600 text-white rounded-lg">Download</a>
              <button onClick={onDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg">Excluir</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
