// Institutes Board placeholder using KanbanBoard
 'use client';
import { useTranslations } from 'next-intl';
import KanbanBoard, { KanbanColumn } from '@/components/ui/KanbanBoard';

interface InstituteItem {
  id: string;
  name: string;
  description?: string;
  metadata?: any;
  member_ids?: string[];
  member_count?: number;
}

interface Props {
  items: InstituteItem[];
  onItemClick?: (it: InstituteItem) => void;
}

export default function InstitutesBoard({ items, onItemClick }: Props) {
  const t = useTranslations('institutes');

  const columns: KanbanColumn<InstituteItem>[] = [
    {
      key: 'institutes',
      label: t('title') || 'Institutes',
      color: 'from-blue-500 to-blue-600',
      items: items,
    },
    {
      key: 'prospects',
      label: t('boardProspects') || 'Prospects',
      color: 'from-yellow-500 to-yellow-600',
      items: [],
    },
    {
      key: 'archived',
      label: t('boardArchived') || 'Archived',
      color: 'from-gray-500 to-gray-600',
      items: [],
    },
  ];

  const renderItem = (it: InstituteItem) => (
    <div onClick={() => onItemClick?.(it)} className="block p-3 bg-white dark:bg-slate-800 rounded-lg shadow-soft hover:shadow-elevated transition cursor-pointer">
      <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1 truncate">{it.name}</h4>
      {it.metadata?.city && <div className="text-xs text-gray-500 dark:text-gray-400">{it.metadata.city}</div>}
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-3">{it.description}</p>
    </div>
  );

  return (
    <KanbanBoard columns={columns} renderItem={renderItem} emptyMessage={t('noResults') || 'No institutes'} />
  );
}
