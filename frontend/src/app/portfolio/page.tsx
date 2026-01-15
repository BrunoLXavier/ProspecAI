// Portfolio Projects Page
// Implements RF-03: Gestão de Portfólio Institucional
'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/outline';
import CreateProjectModal from '@/components/portfolio/CreateProjectModal';
import ViewEditProjectModal from '@/components/portfolio/ViewEditProjectModal';
import PortfolioBoard from '@/components/portfolio/PortfolioBoard';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import PageHeader from '@/components/ui/PageHeader';
import { ViewMode } from '@/components/ui/ViewToggle';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';

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
};

export default function PortfolioPage() {
  const t = useTranslations('portfolio');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(urlView === 'board' || urlView === 'list' ? urlView : 'list');
  const [filters, setFilters] = useState<FilterValues>(initialFilters);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Define filter fields configuration
  const filterFields: FilterField[] = useMemo(() => [
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
  ], [t, tCommon]);

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects', filters],
    queryFn: async () => {
      // TODO: Replace with actual API call using filters
      return [
        {
          id: '1',
          title: 'Projeto Automação Industrial 4.0',
          status: 'active',
          trl: 6,
          budget: 1500000,
          startDate: '2025-01-15',
          endDate: '2026-12-31',
          researchArea: 'Indústria 4.0',
        },
        {
          id: '2',
          title: 'Energia Renovável para Comunidades',
          status: 'planning',
          trl: 3,
          budget: 800000,
          startDate: '2026-03-01',
          endDate: '2027-06-30',
          researchArea: 'Sustentabilidade',
        },
      ];
    }
  });

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

      {/* Create Project Modal */}
      <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* View/Edit Project Modal */}
      <ViewEditProjectModal 
        isOpen={isViewModalOpen} 
        onClose={() => {
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
      {viewMode === 'board' ? (
        <PortfolioBoard 
          projects={projects} 
          onItemClick={handleProjectClick}
        />
      ) : (
        /* List View */
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">{tCommon('loading')}</div>
          ) : projects.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">{tCommon('noResults')}</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {projects.map((project) => (
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
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}
                        >
                          {t(`status.${project.status}`)}
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
          )}
        </div>
      )}
    </div>
  );
}
