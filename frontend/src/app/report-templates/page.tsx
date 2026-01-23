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
import Pagination, { usePagination } from '@/components/ui/Pagination';
import ReportsList from '@/components/reports/ReportsList';
import ReportsBoard from '@/components/reports/reportsboard';
import ReportModal from '@/components/reports/ReportModal';
import { ViewMode } from '@/components/ui/ViewToggle';

export default function TemplatesPage() {
  const t = useTranslations('reports');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<{ search?: string }>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailTemplate, setDetailTemplate] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Pagination state
  const { initialPage, initialPageSize } = usePagination(20, true);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

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
  
  // Paginated templates
  const paginatedTemplates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);
  
  // Handle filter change with pagination reset
  const handleFilterChange = (k: string, v: string | boolean) => {
    setFilters((p) => ({ ...p, [k]: v }));
    setCurrentPage(1);
  };

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

      <FilterPanel fields={filterFields} values={filters} onChange={handleFilterChange} onReset={() => { setFilters({}); setCurrentPage(1); }} />

      {viewMode === 'board' ? (
        <ReportsBoard templates={filtered} loading={isLoading} onItemClick={(t) => { setDetailTemplate(t); setIsDetailOpen(true); }} onSelect={() => {}} />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <ReportsList templates={paginatedTemplates} loading={isLoading} selectedId={null} onSelect={() => {}} onOpenDetail={(t) => { setDetailTemplate(t); setIsDetailOpen(true); }} />
        </div>
      )}
      
      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        syncWithUrl={true}
      />

      <ReportModal 
        isOpen={isCreateOpen || isDetailOpen} 
        onClose={() => { 
          setIsCreateOpen(false); 
          setIsDetailOpen(false); 
          setDetailTemplate(null); 
        }} 
        template={detailTemplate} 
        onDelete={(id) => { if (detailTemplate?.id === id) setDetailTemplate(null); }} 
      />
    </div>
  );
}
