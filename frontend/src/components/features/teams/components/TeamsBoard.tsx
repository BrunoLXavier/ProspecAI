// Teams Board placeholder using KanbanBoard
 'use client';
import { useTranslations } from 'next-intl';
import KanbanBoard, { KanbanColumn } from '@/components/features/shared/ui/KanbanBoard';

interface TeamItem {
  id: string;
  name: string;
  description?: string;
  member_ids?: string[];
}

interface Props {
  items: TeamItem[];
  onItemClick?: (t: TeamItem) => void;
}

export default function TeamsBoard({ items, onItemClick }: Props) {
  const t = useTranslations('teams');

  const columns: KanbanColumn<TeamItem>[] = [
    { key: 'active', label: t('active') || 'Active', color: 'from-green-500 to-green-600', items: items.filter(i => (i as any).active !== false) },
    { key: 'inactive', label: t('inactive') || 'Inactive', color: 'from-yellow-500 to-yellow-600', items: items.filter(i => (i as any).active === false) },
    { key: 'archived', label: t('archived') || 'Archived', color: 'from-gray-500 to-gray-600', items: [] },
  ];

  const renderItem = (team: TeamItem) => (
    <div onClick={() => onItemClick?.(team)} className="block p-3 bg-white dark:bg-slate-800 rounded-lg shadow-soft hover:shadow-elevated transition cursor-pointer">
      <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1 truncate">{team.name}</h4>
      <p className="text-sm text-gray-500 dark:text-gray-400">{team.description}</p>
    </div>
  );

  return (
    <KanbanBoard columns={columns} renderItem={renderItem} emptyMessage={t('noResults') || 'No teams'} />
  );
}
