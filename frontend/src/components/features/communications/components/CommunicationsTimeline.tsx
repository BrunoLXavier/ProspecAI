/**
 * CommunicationsTimeline
 * Timeline view of communication threads ordered by last message time
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import Pagination from '@/components/features/shared/ui/Pagination';
import apiClient from '@/lib/api-client';
import { ExclamationTriangleIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

interface Thread {
  id: string;
  subject?: string;
  preview?: string;
  last_message_at?: string;
  created_at?: string;
  is_auto_created?: boolean;
  auto_created_confirmed?: boolean;
}

export default function CommunicationsTimeline() {
  const t = useTranslations('communications');
  const [items, setItems] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  const load = async (page = 1, page_size = pageSize) => {
    setLoading(true);
    try {
      const skip = Math.max(0, (page - 1) * page_size);
      const params: Record<string, any> = { skip, limit: page_size };
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
    load(currentPage, pageSize);
  }, [currentPage, pageSize]);

  const timelineItems: TimelineItem[] = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      const da = new Date(a.last_message_at || a.created_at || 0).getTime();
      const db = new Date(b.last_message_at || b.created_at || 0).getTime();
      return db - da;
    });

    return sorted.map((titem) => ({
      id: titem.id,
      title: titem.subject || t('untitled') || 'Untitled',
      description: titem.preview,
      date: titem.last_message_at || titem.created_at || new Date().toISOString(),
      status: titem.is_auto_created && !titem.auto_created_confirmed ? 'warning' : 'default',
      icon: titem.is_auto_created ? <ExclamationTriangleIcon className="w-4 h-4" /> : <CheckBadgeIcon className="w-4 h-4" />,
    }));
  }, [items, t]);

  return (
    <div className="space-y-4">
      <TimelineView
        items={timelineItems}
        showConnectors={true}
        animated={true}
        loading={loading}
        emptyMessage={t('noThreads') || 'No threads to show'}
      />

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
