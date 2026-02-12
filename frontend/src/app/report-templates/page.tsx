// Report Templates Page — Standardized via useCrudPage + EntityModal
// Implements RF-09: Report template CRUD management
'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import { useCrudPage, FetchResult } from '@/hooks/use-crud-page';
import { reportDefinition, ReportFormData } from '@/lib/form-registry/definitions/report.definition';
import EntityModal from '@/components/features/shared/ui/EntityModal';
import { ReportsBoard, ReportsList } from '@/components/features/reports';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import Pagination from '@/components/features/shared/ui/Pagination';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  output_formats: string[];
  parameters: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface TemplateFilters {
  search: string;
}

const initialFilters: TemplateFilters = { search: '' };

// ─── Page Component ──────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const t = useTranslations('reports');
  const tCommon = useTranslations('common');

  const state = useCrudPage<ReportTemplate, TemplateFilters>({
    queryKey: 'report-templates',
    definition: reportDefinition,
    initialFilters,
    defaultPageSize: 20,
    filterFn: (item, filters) => {
      if (!filters.search) return true;
      const s = filters.search.toLowerCase();
      return (item.name || '').toLowerCase().includes(s) || (item.description || '').toLowerCase().includes(s);
    },
    fetchFn: async () => {
      try {
        const data = await apiClient.get('/api/v1/reports/templates');
        const items = Array.isArray(data) ? data : (data?.templates || data?.data || []);
        return { items, total: items.length } as FetchResult<ReportTemplate>;
      } catch (err) {
        console.warn('Failed to fetch templates', err);
        return { items: [], total: 0 };
      }
    },
  });

  const filterFields: FilterField[] = useMemo(() => [
    { key: 'search', label: t('filters.search') || 'Search', type: 'text', placeholder: t('filters.searchPlaceholder') || 'Search...' },
  ], [t]);

  const timelineItems: TimelineItem[] = useMemo(() => {
    return state.data.map((tpl) => ({
      id: tpl.id,
      title: tpl.name || 'Untitled Template',
      description: tpl.description || '',
      date: tpl.updated_at || tpl.created_at || new Date().toISOString(),
      status: tpl.is_active ? 'success' : 'pending',
      icon: <DocumentTextIcon className="w-4 h-4" />,
      tags: tpl.type ? [{ label: tpl.type, color: 'blue' }] : [],
      onClick: () => state.openViewModal(tpl),
    }));
  }, [state.data]);

  const tableColumns: TableColumn<ReportTemplate>[] = useMemo(() => [
    { key: 'name', header: t('templateName') || 'Name', accessor: 'name', sortable: true },
    { key: 'description', header: t('description') || 'Description', accessor: 'description', sortable: false, hiddenOnMobile: true },
    { key: 'type', header: t('type') || 'Type', accessor: 'type', sortable: true },
    {
      key: 'updated_at', header: t('updatedAt') || 'Updated', accessor: (row) => row.updated_at ? new Date(row.updated_at).toLocaleDateString('pt-BR') : '-', sortable: true, hiddenOnMobile: true,
    },
    {
      key: 'is_active', header: t('statusLabel') || 'Status', accessor: (row) => row.is_active ? 'active' : 'inactive', sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${value === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
          {value === 'active' ? t('available') || 'Active' : t('processed') || 'Inactive'}
        </span>
      ),
    },
  ], [t]);

  const modalEntity = useMemo(() => {
    if (!state.selectedItem) return null;
    const tpl = state.selectedItem;
    return {
      id: tpl.id,
      name: tpl.name || '',
      description: tpl.description || '',
      type: tpl.type || '',
      output_formats: tpl.output_formats || [],
      parameters: tpl.parameters || [],
      is_active: tpl.is_active ?? true,
    };
  }, [state.selectedItem]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('templatesTitle') || 'Report Templates'}
        subtitle={t('templatesSubtitle') || 'Manage report templates'}
        viewToggle
        viewMode={state.viewMode}
        onViewChange={state.setViewMode}
        action={
          <button onClick={state.openCreateModal} title={t('newTemplate') || 'New Template'} className="inline-flex items-center justify-center p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition">
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <EntityModal<ReportFormData>
        definition={reportDefinition}
        entity={state.isCreateModalOpen ? null : modalEntity}
        mode={state.isCreateModalOpen ? 'create' : 'edit'}
        isOpen={state.isCreateModalOpen || state.isViewModalOpen}
        onClose={state.closeModal}
        onSuccess={() => { state.closeModal(); state.refetch(); }}
        onDeleteSuccess={() => { state.closeModal(); state.refetch(); }}
        icon={<DocumentTextIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
        size="2xl"
      />

      <ConfigurableStatisticsBar module="reports" data={state.allData} />

      <FilterPanel fields={filterFields} values={state.filters} onChange={state.setFilter} onReset={state.resetFilters} />

      {state.viewMode === 'board' && (
        <ReportsBoard templates={state.allData} loading={state.isLoading} onItemClick={(tpl) => state.openViewModal(tpl as ReportTemplate)} onSelect={() => {}} />
      )}

      {state.viewMode === 'timeline' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <TimelineView items={timelineItems} loading={state.isLoading} emptyMessage={t('noTemplates') || 'No templates found'} />
        </div>
      )}

      {state.viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <TableView data={state.data} columns={tableColumns} getRowKey={(row) => row.id} onRowClick={state.openViewModal} loading={state.isLoading} emptyMessage={t('noTemplates') || 'No templates found'} paginated pageSize={state.pageSize} currentPage={state.currentPage} totalItems={state.totalItems} onPageChange={state.setCurrentPage} onPageSizeChange={state.setPageSize} stickyHeader striped hoverable />
        </div>
      )}

      {state.viewMode === 'list' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            <ReportsList templates={state.data} loading={state.isLoading} selectedId={null} onSelect={() => {}} onOpenDetail={(tpl) => state.openViewModal(tpl as ReportTemplate)} />
          </div>
          {state.totalItems > 0 && (
            <Pagination currentPage={state.currentPage} totalItems={state.totalItems} pageSize={state.pageSize} onPageChange={state.setCurrentPage} onPageSizeChange={state.setPageSize} persistInUrl showTotal showPageSizeSelector />
          )}
        </div>
      )}
    </div>
  );
}
