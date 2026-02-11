/**
 * CommunicationsTable
 * Full table view for communication threads with search, sorting and pagination
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';
import apiClient from '@/lib/api-client';
import { ExclamationTriangleIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

interface Thread {
  id: string;
  subject?: string;
  preview?: string;
  last_message_at?: string;
  created_at?: string;
  linked_entity_type?: string | null;
  linked_entity_id?: string | null;
  participant_count?: number;
  is_auto_created?: boolean;
  auto_created_confirmed?: boolean;
}

export default function CommunicationsTable() {
  const t = useTranslations('communications');
  const [items, setItems] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  const load = async (opts?: { page?: number; page_size?: number; search?: string; sort?: string | null; direction?: string | null }) => {
    setLoading(true);
    try {
      const page = opts?.page ?? currentPage;
      const ps = opts?.page_size ?? pageSize;
      const skip = Math.max(0, (page - 1) * ps);

      const params: Record<string, any> = {};
      params.skip = skip;
      params.limit = ps;
      if (opts?.search ?? search) params.search = opts?.search ?? search;
      if (opts?.sort) params.sort = opts.sort;
      if (opts?.direction) params.direction = opts.direction;

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
    load({ page: currentPage, page_size: pageSize, search, sort: sortColumn ?? undefined, direction: sortDirection ?? undefined });
  }, [currentPage, pageSize, search, sortColumn, sortDirection]);

  const columns: TableColumn<Thread>[] = useMemo(() => [
    {
      key: 'subject',
      header: t('subject') || 'Subject',
      accessor: 'subject',
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div className="flex flex-col">
          <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{value || (t('untitled') || 'Untitled')}</div>
          {row.preview && <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{row.preview}</div>}
        </div>
      ),
    },
    {
      key: 'participants',
      header: t('participants') || 'Participants',
      accessor: (r: Thread) => r.participant_count ?? 0,
      sortable: true,
      align: 'center',
    },
    {
      key: 'linked',
      header: t('linkedEntity') || 'Linked',
      accessor: (r: Thread) => r.linked_entity_type || '-',
      sortable: true,
      filterable: true,
    },
    {
      key: 'last_message',
      header: t('lastMessage') || 'Last message',
      accessor: (r: Thread) => r.last_message_at || r.created_at || '',
      sortable: true,
      render: (value) => value ? new Date(String(value)).toLocaleString() : '',
      align: 'right',
    },
    {
      key: 'status',
      header: t('status') || 'Status',
      accessor: (r: Thread) => r.is_auto_created ? 'auto' : 'normal',
      sortable: false,
      align: 'center',
      render: (_v, row) => (
        row.is_auto_created ? (
          row.auto_created_confirmed ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckBadgeIcon className="w-4 h-4" />{t('autoConfirmed') || 'Auto (confirmed)'}</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600"><ExclamationTriangleIcon className="w-4 h-4" />{t('autoUnconfirmed') || 'Auto (unconfirmed)'}</span>
          )
        ) : (
          <span className="text-sm text-gray-500">{t('manual') || 'Manual'}</span>
        )
      ),
    },
  ], [t]);

  return (
    <TableView<Thread>
      data={items}
      columns={columns}
      getRowKey={(r) => r.id}
      searchable={true}
      searchPlaceholder={t('searchThreads') || 'Search...'}
      searchValue={search}
      onSearchChange={(v) => { setSearch( v ); setCurrentPage(1); }}
      paginated={true}
      pageSize={pageSize}
      currentPage={currentPage}
      totalItems={totalItems}
      onPageChange={(p) => setCurrentPage(p)}
      onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
      serverSideSorting={true}
      onSortChange={(col, dir) => { setSortColumn(col); setSortDirection(dir as 'asc' | 'desc' | null); setCurrentPage(1); }}
      sortColumn={sortColumn ?? undefined}
      sortDirection={sortDirection ?? undefined}
      loading={loading}
      emptyMessage={t('noThreads') || 'No threads found'}
      stickyHeader={true}
      hoverable={true}
      striped={true}
      onRowClick={(r) => { /* could open thread detail */ }}
    />
  );
}
