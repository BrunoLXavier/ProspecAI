// Report Templates management page (mirrors Proposals layout)
// Implements RF-09: Report templates CRUD
'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import PageHeader from '@/components/ui/PageHeader';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import ReportsList from '@/components/reports/ReportsList';
import ReportsBoard from '@/components/reports/reportsboard';
import ReportModal from '@/components/reports/ReportModal';
import TimelineView, { TimelineItem } from '@/components/ui/TimelineView';
import TableView, { TableColumn } from '@/components/ui/TableView';
import { ViewMode } from '@/components/ui/ViewToggle';

export default function TemplatesPage() {
  const t = useTranslations('reports');
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'timeline' | 'table'>('list');
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

  // Timeline items for TimelineView
  const timelineItems: TimelineItem[] = useMemo(() => {
    return filtered.map((tpl: any) => ({
      id: tpl.id,
      title: tpl.name || 'Untitled Template',
      description: tpl.description || '',
      date: tpl.updated_at || tpl.created_at || new Date().toISOString(),
      status: tpl.is_active ? 'success' : 'pending',
      icon: <DocumentTextIcon className="w-4 h-4" />,
      tags: tpl.type ? [{ label: tpl.type, color: 'blue' }] : [],
      onClick: () => {
        setDetailTemplate(tpl);
        setIsDetailOpen(true);
      },
    }));
  }, [filtered]);

  // Table columns for TableView
  const tableColumns: TableColumn<any>[] = useMemo(() => [
    {
      key: 'name',
      header: t('templateName') || 'Nome',
      accessor: 'name',
      sortable: true,
      filterable: true,
    },
    {
      key: 'description',
      header: t('description') || 'Descrição',
      accessor: 'description',
      sortable: false,
      hiddenOnMobile: true,
    },
    {
      key: 'type',
      header: t('type') || 'Tipo',
      accessor: 'type',
      sortable: true,
    },
    {
      key: 'updated_at',
      header: t('updatedAt') || 'Atualizado',
      accessor: (row: any) => row.updated_at ? new Date(row.updated_at).toLocaleDateString('pt-BR') : '-',
      sortable: true,
      hiddenOnMobile: true,
    },
    {
      key: 'is_active',
      header: t('status') || 'Status',
      accessor: (row: any) => row.is_active ? 'Ativo' : 'Inativo',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${value === 'Ativo' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
          {value as string}
        </span>
      ),
    },
  ], [t]);

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
      ) : viewMode === 'timeline' ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <TimelineView
            items={timelineItems}
            loading={isLoading}
            emptyMessage={t('noTemplates') || 'Nenhum template encontrado'}
          />
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <TableView
            data={paginatedTemplates}
            columns={tableColumns}
            getRowKey={(row) => (row as any).id}
            loading={isLoading}
            onRowClick={(row) => { setDetailTemplate(row); setIsDetailOpen(true); }}
            emptyMessage={t('noTemplates') || 'Nenhum template encontrado'}
            stickyHeader
          />
        </div>
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
        persistInUrl={true}
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
