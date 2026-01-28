// Infrastructure Board placeholder using KanbanBoard
 'use client';
import { useTranslations } from 'next-intl';
import KanbanBoard, { KanbanColumn } from '@/components/features/shared/ui/KanbanBoard';

interface ResourceItem {
  id: string;
  name: string;
  description?: string;
  location?: string;
  status?: string;
}

interface Props {
  items: ResourceItem[];
  onItemClick?: (r: ResourceItem) => void;
}

export default function InfrastructureBoard({ items, onItemClick }: Props) {
  const t = useTranslations('infrastructure');

  const columns: KanbanColumn<ResourceItem>[] = [
    { key: 'available', label: t('available') || 'Available', color: 'from-green-500 to-green-600', items: items.filter(i => (i.status || '').toLowerCase() !== 'maintenance' && (i.status || '').toLowerCase() !== 'booked') },
    { key: 'booked', label: t('booked') || 'Booked', color: 'from-blue-500 to-blue-600', items: items.filter(i => (i.status || '').toLowerCase() === 'booked') },
    { key: 'maintenance', label: t('maintenance') || 'Maintenance', color: 'from-yellow-500 to-yellow-600', items: items.filter(i => (i.status || '').toLowerCase() === 'maintenance') },
  ];

  const renderItem = (r: ResourceItem) => (
    <div onClick={() => onItemClick?.(r)} className="block p-3 bg-white dark:bg-slate-800 rounded-lg shadow-soft hover:shadow-elevated transition cursor-pointer">
      <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1 truncate">{r.name}</h4>
      {r.location && <div className="text-xs text-gray-500 dark:text-gray-400">{r.location}</div>}
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-3">{r.description}</p>
    </div>
  );

  return (
    <KanbanBoard columns={columns} renderItem={renderItem} emptyMessage={t('noResults') || 'No resources'} />
  );
}
