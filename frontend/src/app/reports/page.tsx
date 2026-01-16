/**
 * Reports Page
 * Implements RF-09: Report generation and export
 */
'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  DocumentTextIcon,
  ChartBarIcon,
  FolderIcon,
  FunnelIcon,
  CurrencyDollarIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '@/hooks/useI18n';
import apiClient from '@/lib/api-client';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import ReportsList from '@/components/reports/ReportsList';
import ReportsBoard from '@/components/reports/reportsboard';
import ReportFormModal from '@/components/reports/ReportFormModal';
import ReportDetailModal from '@/components/reports/ReportDetailModal';
import { useQueryClient } from '@tanstack/react-query';
import { ViewMode } from '@/components/ui/ViewToggle';

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
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<{ search?: string; format?: string }>({});
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>('html');
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [recentReports, setRecentReports] = useState<GeneratedReport[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailTemplate, setDetailTemplate] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['report-templates'],
    queryFn: async () => {
      try {
        const data = await apiClient.get<ReportTemplate[]>('/api/v1/reports/templates');
        return data;
      } catch (err: any) {
        // If unauthorized, return empty array and let ApiClient handle redirect/refresh
        console.error('Failed fetching report templates', err);
        if (err?.response?.status === 401) {
          return [] as ReportTemplate[];
        }
        throw err;
      }
    },
  });

  // Normalize templates response to always be an array.
  const templatesArray: ReportTemplate[] = (() => {
    if (!templates) return [];
    if (Array.isArray(templates)) return templates as ReportTemplate[];
    const maybe = templates as any;
    if (Array.isArray(maybe.templates)) return maybe.templates;
    if (Array.isArray(maybe.data)) return maybe.data;
    return [];
  })();

  // Generate report mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/reports/generate/${selectedFormat}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('prospecai_access_token')}`,
        },
        body: JSON.stringify({
          template_id: selectedTemplate,
          parameters,
          format: selectedFormat,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      if (selectedFormat === 'html') {
        const html = await response.text();
        return { content: html, format: selectedFormat };
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        return { download_url: url, format: selectedFormat };
      }
    },
    onSuccess: (data) => {
      const report: GeneratedReport = {
        template_id: selectedTemplate!,
        generated_at: new Date().toISOString(),
        format: data.format,
        content: data.content,
        download_url: data.download_url,
      };
      setGeneratedReport(report);
      setRecentReports((prev) => [report, ...prev].slice(0, 10));
    },
    onError: (err: any) => {
      const msg = err?.message || JSON.stringify(err) || 'Erro ao gerar relatório';
      setGenError(msg);
      console.error('Report generation error:', err);
    },
  });

  const handleGenerate = () => {
    if (!selectedTemplate) return;
    setGenError(null);
    generateMutation.mutate();
  };

  // Handle template selection
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    setGeneratedReport(null);
    setParameters({});
  };

  // Handle parameter change
  const handleParameterChange = (key: string, value: string) => {
    setParameters((prev) => ({ ...prev, [key]: value }));
  };

  // Get selected template details
  const currentTemplate = templatesArray.find((t) => t.id === selectedTemplate);

  const stats = {
    templates: templatesArray.length || 0,
    recent: recentReports.length,
  };

  const filterFields: FilterField[] = [
    { key: 'search', label: 'Buscar', type: 'text', placeholder: 'Buscar templates...' },
    { key: 'format', label: 'Formato', type: 'select', options: [
      { value: 'html', label: 'HTML' },
      { value: 'pdf', label: 'PDF' },
      { value: 'xlsx', label: 'XLSX' },
    ] },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerador de Relatórios"
        subtitle="Crie relatórios personalizados com dados do sistema"
        viewToggle={true}
        viewMode={viewMode}
        onViewChange={(m) => setViewMode(m)}
        action={(
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Novo Relatório
          </button>
        )}
      />

      <div className="max-w-7xl mx-auto px-4">
        <ConfigurableStatisticsBar module="proposals" data={templatesArray} />

        <div className="mt-4">
          <FilterPanel
            fields={filterFields}
            values={filters}
            onChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))}
            onReset={() => setFilters({})}
          />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-2">
        {viewMode === 'board' ? (
          <div className="w-full">
              <ReportsBoard
              templates={templatesArray}
              loading={templatesLoading}
              onItemClick={(t) => { setDetailTemplate(t); setIsDetailOpen(true); }}
              onSelect={(id) => handleSelectTemplate(id)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Template Selection */}
            <div className="lg:col-span-1 space-y-6">
              <ReportsList
                templates={templatesArray}
                loading={templatesLoading}
                selectedId={selectedTemplate}
                onSelect={(id) => handleSelectTemplate(id)}
                onOpenDetail={(template) => { setDetailTemplate(template); setIsDetailOpen(true); }}
              />

              {/* Recent Reports */}
              {recentReports.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Relatórios Recentes
                  </h2>
                  <div className="space-y-2">
                    {recentReports.map((report, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700">
                            {templatesArray.find((t) => t.id === report.template_id)?.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(report.generated_at).toLocaleString()}
                          </p>
                        </div>
                        <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded">
                          {report.format.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Configuration & Preview */}
            <div className="lg:col-span-2 space-y-6">
            {!selectedTemplate ? (
              <div className="bg-white rounded-lg shadow overflow-hidden p-12 text-center">
                <DocumentTextIcon className="h-16 w-16 mx-auto text-gray-300" />
                <p className="mt-4 text-gray-500">
                  Selecione um template para começar
                </p>
              </div>
            ) : (
              <>
                {/* Configuration */}
                <div className="bg-white rounded-lg shadow overflow-hidden p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Configurações
                  </h2>

                  {/* Format Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Formato de Saída
                    </label>
                    <div className="flex gap-3">
                      {currentTemplate?.output_formats?.map((format) => (
                        <button
                          key={format}
                          onClick={() => setSelectedFormat(format)}
                          className={`
                            px-4 py-2 rounded-lg font-medium text-sm
                            ${selectedFormat === format
                              ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                              : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                            }
                          `}
                        >
                          {format.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Parameters */}
                  {currentTemplate?.parameters && currentTemplate.parameters.length > 0 && (
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Parâmetros
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentTemplate.parameters.map((param) => (
                          <div key={param}>
                            <label className="block text-xs text-gray-500 mb-1 capitalize">
                              {param.replace(/_/g, ' ')}
                            </label>
                            <input
                              type="text"
                              value={parameters[param] || ''}
                              onChange={(e) => handleParameterChange(param, e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder={`Enter ${param}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generate Button */}
                  <div className="mb-6">
                    <h2 className="text-lg font-medium text-gray-900">Templates</h2>
                    <p className="mt-1 text-sm text-gray-600">Saved report templates and quick exports.</p>
                  </div>

                  {/* statistics bar intentionally shown above the filters; removed duplicate here */}
                     <div className="mb-6">
                    <button
                        onClick={() => handleGenerate()}
                      disabled={!selectedTemplate || generateMutation.isPending}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {generateMutation.isPending ? (
                        <>
                          <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <ArrowDownTrayIcon className="h-5 w-5" />
                          Gerar Relatório
                        </>
                      )}
                    </button>
                      {genError && (
                        <div className="mt-3 text-sm text-red-600">Erro: {genError}</div>
                      )}
                  </div>
                </div>

                {/* Generated report preview handled below */}

                {/* Preview / Download */}
                {generatedReport && (
                  <div className="bg-white rounded-lg shadow overflow-hidden p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">
                        Relatório Gerado
                      </h2>
                      {generatedReport.download_url && (
                        <a
                          href={generatedReport.download_url}
                          download={`report.${generatedReport.format}`}
                          className="
                            flex items-center gap-2 px-4 py-2 bg-green-600 text-white
                            font-medium rounded-lg hover:bg-green-700
                          "
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          Download
                        </a>
                      )}
                    </div>

                    {generatedReport.content && (
                      <div
                        className="prose prose-sm max-w-none border rounded-lg p-6 bg-gray-50 overflow-auto max-h-[600px]"
                        dangerouslySetInnerHTML={{ __html: generatedReport.content }}
                      />
                    )}

                    {generatedReport.download_url && !generatedReport.content && (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <DocumentArrowDownIcon className="h-12 w-12 mx-auto text-green-500" />
                        <p className="mt-4 text-gray-600">
                          Relatório pronto para download
                        </p>
                        <p className="text-sm text-gray-400">
                          Formato: {generatedReport.format.toUpperCase()}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      </main>

        {/* Modals */}
        <ReportFormModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} initial={null} />
        <ReportDetailModal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} template={detailTemplate} onDeleted={(id) => {
          // if deleted template was selected, clear selection
          if (selectedTemplate === id) setSelectedTemplate(null);
          setDetailTemplate(null);
        }} />
    </div>
  );
}
