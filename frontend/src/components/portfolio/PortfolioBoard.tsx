// Portfolio Board Component
// Kanban board for Portfolio Projects by status/phase
// Implements RF-03: Gestão de Portfólio Institucional - Board View
'use client';

import { useTranslations } from 'next-intl';
import KanbanBoard, { KanbanColumn } from '@/components/ui/KanbanBoard';

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

interface PortfolioBoardProps {
  projects: Project[];
  onItemClick?: (project: Project) => void;
}

const PROJECT_STATUSES = [
  { key: 'planning', color: 'from-blue-500 to-blue-600' },
  { key: 'active', color: 'from-green-500 to-green-600' },
  { key: 'completed', color: 'from-purple-500 to-purple-600' },
  { key: 'suspended', color: 'from-yellow-500 to-yellow-600' },
];

export default function PortfolioBoard({ projects, onItemClick }: PortfolioBoardProps) {
  const t = useTranslations('portfolio');

  const columns: KanbanColumn<Project>[] = PROJECT_STATUSES.map(status => ({
    key: status.key,
    label: t(`filters.${status.key}`),
    color: status.color,
    items: projects.filter(p => p.status === status.key),
  }));

  const getTRLColor = (trl: number) => {
    if (trl >= 7) return 'text-green-600 dark:text-green-400';
    if (trl >= 4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const renderProjectItem = (project: Project) => (
    <div
      onClick={() => onItemClick?.(project)}
      className="block p-3 bg-white dark:bg-slate-800 rounded-lg shadow-soft hover:shadow-elevated transition-all duration-200 cursor-pointer group"
    >
      <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-2 group-hover:text-primary-500 transition-colors line-clamp-2">
        {project.title}
      </h4>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {project.researchArea}
        </span>
        <span className={`text-xs font-bold ${getTRLColor(project.trl)}`}>
          TRL {project.trl}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">
          {new Date(project.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
        </span>
        <span className="font-medium text-primary-600 dark:text-primary-400">
          {new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: 'BRL',
            notation: 'compact',
          }).format(project.budget)}
        </span>
      </div>
    </div>
  );

  return (
    <KanbanBoard
      columns={columns}
      renderItem={renderProjectItem}
      emptyMessage={t('noProjects')}
    />
  );
}
