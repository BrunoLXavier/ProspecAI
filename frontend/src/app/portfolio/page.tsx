// Portfolio Projects Page
// Implements RF-03: Gestão de Portfólio Institucional
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import ProjectModal from '@/components/features/portfolio/components/ProjectModal';
import PortfolioBoard from '@/components/features/portfolio/components/PortfolioBoard';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import { ViewMode } from '@/components/features/shared/ui/ViewToggle';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import Pagination, { usePagination } from '@/components/features/shared/ui/Pagination';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';

interface Project {
  id: string;
  title: string;
  status: string;
  trl: number;
  budget: number;
  startDate: string;
  endDate: string;
  researchArea: string;
}

interface FilterValues {
  search: string;
  status: string;
  researchArea: string;
  trlMin: string;
  trlMax: string;
  startDateFrom: string;
  startDateTo: string;
  minBudget: string;
  maxBudget: string;
  instituteId: string;
}

const initialFilters: FilterValues = {
  search: '',
  status: 'all',
  researchArea: 'all',
  trlMin: '',
  trlMax: '',
  startDateFrom: '',
  startDateTo: '',
  minBudget: '',
  maxBudget: '',
  instituteId: 'all',
};

export default function PortfolioPage() {
  const t = useTranslations('portfolio');
  const tCommon = useTranslations('common');
  const tInstitutes = useTranslations('institutes');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { selectedInstitutes } = useAuth();
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(
    urlView && ['list', 'board', 'timeline', 'table'].includes(urlView) ? urlView : 'list'
  );
  const [filters, setFilters] = useState<FilterValues>(initialFilters);
  const [highlightProcessed, setHighlightProcessed] = useState(false);

  // Pagination state
  const { initialPage, initialPageSize } = usePagination(20, true);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Load institutes for filter dropdown
  const { data: institutes = [] } = useQuery<any[]>({
    queryKey: ['institutes', 'filter'],
    queryFn: async () => {
      try {
        const resp = await apiClient.get('/api/v1/institutes');
        return resp?.items ?? resp ?? [];
      } catch (e) {
        return [];
      }
    },
    staleTime: 60_000,
  });

  // Filter institutes to only show selected ones from header
  const availableInstitutes = useMemo(() => {
    if (!selectedInstitutes.length) return institutes;
    return institutes.filter((ins: any) => selectedInstitutes.includes(ins.id));
  }, [institutes, selectedInstitutes]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Define filter fields configuration
  const filterFields: FilterField[] = useMemo(() => [
    {
      key: 'instituteId',
      label: tInstitutes('title'),
      type: 'select',
      options: [
        { value: 'all', label: tInstitutes('selectAll') },
        ...availableInstitutes.map((ins: any) => ({
          value: ins.id,
          label: ins.nome || ins.name || ins.title || 'Instituto',
        })),
      ],
    },
    {
      key: 'search',
      label: tCommon('search'),
      type: 'text',
      placeholder: t('searchPlaceholder'),
    },
    {
      key: 'status',
      label: t('statusLabel'),
      type: 'select',
      options: [
        { value: 'all', label: t('filters.allStatus') },
        { value: 'planning', label: t('filters.planning') },
        { value: 'active', label: t('filters.active') },
        { value: 'completed', label: t('filters.completed') },
        { value: 'suspended', label: t('filters.suspended') },
      ],
    },
    {
      key: 'researchArea',
      label: t('area'),
      type: 'select',
      options: [
        { value: 'all', label: t('filters.allAreas') },
        { value: 'industry_4_0', label: t('areas.industry_4_0') },
        { value: 'sustainability', label: t('areas.sustainability') },
        { value: 'health', label: t('areas.health') },
        { value: 'agribusiness', label: t('areas.agribusiness') },
      ],
    },
    {
      key: 'trlRange',
      label: t('trl'),
      type: 'range',
      minKey: 'trlMin',
      maxKey: 'trlMax',
      min: 1,
      max: 9,
    },
    {
      key: 'startDateRange',
      label: t('period'),
      type: 'range',
      minKey: 'startDateFrom',
      maxKey: 'startDateTo',
      inputType: 'date',
    },
    {
      key: 'budgetRange',
      label: t('budget'),
      type: 'range',
      minKey: 'minBudget',
      maxKey: 'maxBudget',
    },
  ], [t, tCommon, tInstitutes, availableInstitutes]);

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects', filters],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (filters.instituteId && filters.instituteId !== 'all') params.institute_id = filters.instituteId;
      if (filters.status && filters.status !== 'all') params.status = filters.status;   
      if (filters.researchArea && filters.researchArea !== 'all') params.research_area = filters.researchArea;
      if (filters.trlMin) params.trl_min = Number(filters.trlMin);
      if (filters.trlMax) params.trl_max = Number(filters.trlMax);
      if (filters.startDateFrom) params.start_after = filters.startDateFrom;
      if (filters.startDateTo) params.end_before = filters.startDateTo;
      if (filters.minBudget) params.min_budget = Number(filters.minBudget);
      if (filters.maxBudget) params.max_budget = Number(filters.maxBudget);

      const res = await apiClient.listProjects(params);
      return Array.isArray(res) ? res : (res.items ?? []);
    }
  });

  // Paginate projects for list view
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return projects.slice(start, start + pageSize);
  }, [projects, currentPage, pageSize]);

  // Handle highlight param to auto-open project modal
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId && projects.length > 0 && !highlightProcessed) {
      const projectToHighlight = projects.find((p: any) => p.id === highlightId);
      if (projectToHighlight) {
        setSelectedProject(projectToHighlight);
        setIsViewModalOpen(true);
        setHighlightProcessed(true);
        router.replace('/portfolio', { scroll: false });
      }
    }
  }, [searchParams, projects, highlightProcessed, router]);

  // Transform projects to timeline items
  const timelineItems: TimelineItem[] = useMemo(() => {
    return paginatedProjects.map((project) => ({
      id: project.id,
      title: project.title,
      description: `${t('area')}: ${project.researchArea} | ${t('budget')}: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(project.budget)}`,
      date: project.startDate,
      status: project.status === 'completed' ? 'success' : project.status === 'active' ? 'info' : project.status === 'suspended' ? 'warning' : 'default',
      onClick: () => handleProjectClick(project),
    }));
  }, [paginatedProjects, t]);

  // Table columns for TableView
  const tableColumns: TableColumn<Project>[] = useMemo(() => [
    { key: 'title', header: t('projectName'), accessor: 'title', sortable: true },
    { 
      key: 'status', 
      header: t('statusLabel'), 
      accessor: 'status', 
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(value as string)}`}>
          {String(t(`status.${String(value)}`) || value || '')}
        </span>
      ),
    },
    { 
      key: 'trl', 
      header: t('trl'), 
      accessor: 'trl', 
      sortable: true,
      render: (value) => <span className={`font-bold ${getTRLColor(value as number)}`}>TRL {String(value)}</span>,
    },
    { 
      key: 'budget', 
      header: t('budget'), 
      accessor: 'budget', 
      sortable: true,
      render: (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(value as number),
    },
    { key: 'researchArea', header: t('area'), accessor: 'researchArea', sortable: true },
    { 
      key: 'startDate', 
      header: t('period'), 
      accessor: 'startDate', 
      sortable: true,
      render: (value, row) => `${new Date(value as string).toLocaleDateString('pt-BR')} - ${new Date(row.endDate).toLocaleDateString('pt-BR')}`,
    },
  ], [t]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planning: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',     
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',   
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',       
      suspended: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getTRLColor = (trl: number) => {
    if (trl >= 7) return 'text-green-600 dark:text-green-400';
    if (trl >= 4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setIsViewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        viewToggle={true}
        viewMode={viewMode}
        onViewChange={setViewMode}
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            {t('newProject')}
          </button>
        }
      />

      {/* Create/Edit Project Modal */}
      <ProjectModal 
        isOpen={isModalOpen || isViewModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setIsViewModalOpen(false);
          setSelectedProject(null);
        }}
        project={selectedProject}
      />

      {/* Configurable Statistics Bar */}
      <ConfigurableStatisticsBar
        module="portfolio"
        data={projects}
      />

      {/* Advanced Filters */}
      <FilterPanel
        fields={filterFields}
        values={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        defaultExpanded={false}
      />

      {/* Content View */}
      {viewMode === 'board' && (
        <PortfolioBoard
          projects={projects}
          onItemClick={handleProjectClick}
        />
      )}

      {viewMode === 'timeline' && (
        <div className="space-y-4">
          <TimelineView
            items={timelineItems}
            showConnectors={true}
            animated={true}
          />
          {projects.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={projects.length}
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

      {viewMode === 'table' && (
        <TableView<Project>
          data={projects}
          columns={tableColumns}
          getRowKey={(row) => row.id}
          onRowClick={handleProjectClick}
          loading={isLoading}
          emptyMessage={tCommon('noResults')}
          searchable={false}
          paginated={true}
          pageSize={pageSize}
          currentPage={currentPage}
          totalItems={projects.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          striped={true}
          hoverable={true}
        />
      )}

      {viewMode === 'list' ? (
        projects.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">{tCommon('noResults')}</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedProjects.map((project) => (
              <li
                key={project.id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer"
                onClick={() => handleProjectClick(project)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {project.title}
                      </h3>
                        <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                        {String(t(`status.${String(project.status)}`) || project.status || '')}
                        </span>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm mt-3">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">{t('trl')}:</span>
                        <p className={`font-bold ${getTRLColor(project.trl)}`}>
                          TRL {project.trl}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">{t('budget')}:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            notation: 'compact',
                          }).format(project.budget)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">{t('area')}:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{project.researchArea}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">{t('period')}:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {new Date(project.startDate).toLocaleDateString('pt-BR')} -{' '}
                          {new Date(project.endDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )
        ) : null}

      {/* Pagination */}
      {projects.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={projects.length}
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
  );
}

