/**
 * CommunicationsBoard
 * Board view for communication threads grouped by linked entity type
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import KanbanBoard, { KanbanColumn } from '@/components/features/shared/ui/KanbanBoard';
import apiClient from '@/lib/api-client';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import Pagination from '@/components/features/shared/ui/Pagination';
import { Thread, CommunicationsFilters } from '../types';

const COLORS = [
  'from-blue-500 to-blue-600',
  'from-green-500 to-green-600',
  'from-yellow-400 to-yellow-500',
  'from-purple-500 to-purple-600',
  'from-pink-500 to-pink-600',
];

interface CommunicationsBoardProps {
  filters?: CommunicationsFilters;
  onThreadSelect?: (threadId: string) => void;
}

export default function CommunicationsBoard({ filters, onThreadSelect }: CommunicationsBoardProps) {
  const t = useTranslations('communications');
  const [items, setItems] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>('last_message_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');

  const load = async (opts?: { page?: number; page_size?: number; sort?: string | null; direction?: string | null }) => {
    setLoading(true);
    try {
      const page = opts?.page ?? currentPage;
      const ps = opts?.page_size ?? pageSize;
      const skip = Math.max(0, (page - 1) * ps);
      const params: Record<string, any> = { skip, limit: ps };
      if (opts?.sort) params.sort = opts.sort;
      if (opts?.direction) params.direction = opts.direction;
      if (filters?.search) params.search = filters.search;
      if (filters?.showAutoCreated !== undefined) params.include_auto_unconfirmed = String(filters.showAutoCreated);

      const res: any = await apiClient.get('/api/v1/communications', params);
      setItems(res.items || []);
      setTotalItems(res.total ?? (Array.isArray(res) ? res.length : 0));
    } catch (e) {
      setItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ page: currentPage, page_size: pageSize, sort: sortColumn ?? undefined, direction: sortDirection ?? undefined });
  }, [currentPage, pageSize, sortColumn, sortDirection, filters?.search, filters?.showAutoCreated]);

  // Group by linked_entity_type, use 'Unlinked' when missing
  const columns = useMemo(() => {
    const map: Record<string, Thread[]> = {};
    items.forEach((it) => {
      const key = it.linked_entity_type || t('unlinked') || 'Unlinked';
      map[key] = map[key] || [];
      map[key].push(it);
    });

    const keys = Object.keys(map).sort();
    if (keys.length === 0) return [] as KanbanColumn<Thread>[];

    return keys.map((k, i) => ({
      key: k,
      label: k,
      color: COLORS[i % COLORS.length],
      items: map[k],
    }));
  }, [items, t]);

  const renderItem = (thread: Thread) => (
    <div
      className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700 cursor-pointer hover:ring-2 hover:ring-primary-300 transition"
      onClick={() => onThreadSelect?.(thread.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-400" />
            <div className="font-medium text-sm truncate">{thread.subject || t('untitled')}</div>
          </div>
          {thread.preview && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{thread.preview}</p>}
        </div>
        <div className="text-xs text-gray-400 whitespace-nowrap">{thread.participant_count ?? 0}</div>
      </div>
      <div className="mt-2 text-xs text-gray-400">{thread.last_message_at ? new Date(thread.last_message_at).toLocaleString() : ''}</div>
    </div>
  );

  if (!columns.length && !loading) {
    return <div className="p-6 text-center text-gray-500">{t('noThreads') || 'No threads'}</div>;
  }

  return (
    <div className="space-y-4">
      <KanbanBoard columns={columns} renderItem={renderItem} emptyMessage={t('noThreads') || 'No threads'} enableDragDrop={false} />

      {totalItems > 0 && (
        <div>
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
            showTotal
            showPageSizeSelector
          />
        </div>
      )}
    </div>
  );
}
