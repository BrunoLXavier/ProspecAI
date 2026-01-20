// Report Templates management page (mirrors Proposals layout)
// Implements RF-09: Report templates CRUD
'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { PlusIcon } from '@heroicons/react/24/outline';
import PageHeader from '@/components/ui/PageHeader';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';
import ReportsList from '@/components/reports/ReportsList';
import ReportsBoard from '@/components/reports/reportsboard';
import ReportFormModal from '@/components/reports/ReportFormModal';
import ReportDetailModal from '@/components/reports/ReportDetailModal';
import { ViewMode } from '@/components/ui/ViewToggle';

export default function TemplatesPage() {
  const t = useTranslations('reports');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<{ search?: string }>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailTemplate, setDetailTemplate] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: templatesRaw = [], isLoading } = useQuery({
    queryKey: ['report-templates'],
    queryFn: async () => {
      try {
        const data = await apiClient.get('/api/v1/reports/templates');
        return data;
      } catch (err) {
        console.warn('Failed to fetch templates, returning empty array', err);
        return [];
      }
    },
  });

  const templates: any[] = Array.isArray(templatesRaw) ? templatesRaw : (templatesRaw?.templates || templatesRaw?.data || []);

  const filterFields: FilterField[] = [
    { key: 'search', label: t('filters.search') || 'Buscar', type: 'text', placeholder: t('filters.searchPlaceholder') || 'Buscar...' },
  ];

  const filtered = useMemo(() => {
    if (!filters.search) return templates;
    const s = filters.search.toLowerCase();
    return templates.filter((tpl: any) => tpl.name?.toLowerCase().includes(s) || tpl.description?.toLowerCase().includes(s));
  }, [templates, filters]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('templatesTitle') || 'Templates de Relatórios'}
        subtitle={t('templatesSubtitle') || 'Gerencie templates de relatórios (CRUD)'}
        viewToggle={true}
        viewMode={viewMode}
        onViewChange={setViewMode}
        action={(
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            {t('newTemplate') || 'Novo Template'}
          </button>
        )}
      />

      <ConfigurableStatisticsBar module="reports" data={templates} />

      <FilterPanel fields={filterFields} values={filters} onChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))} onReset={() => setFilters({})} />

      {viewMode === 'board' ? (
        <ReportsBoard templates={filtered} loading={isLoading} onItemClick={(t) => { setDetailTemplate(t); setIsDetailOpen(true); }} onSelect={() => {}} />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <ReportsList templates={filtered} loading={isLoading} selectedId={null} onSelect={() => {}} onOpenDetail={(t) => { setDetailTemplate(t); setIsDetailOpen(true); }} />
        </div>
      )}

      <ReportFormModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} initial={null} />
      <ReportDetailModal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} template={detailTemplate} onDeleted={(id) => { if (detailTemplate?.id === id) setDetailTemplate(null); }} />
    </div>
  );
}
