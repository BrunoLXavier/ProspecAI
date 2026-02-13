// Communications Center Page
// Implements RF-08: Communication management and tracking
'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import FilterPanel from '@/components/features/shared/ui/FilterPanel';
import { ViewMode } from '@/components/features/shared/ui/ViewToggle';
import { CommunicationsList, CommunicationsBoard, CommunicationsTimeline, CommunicationsTable, CreateThreadModal, ThreadDetailModal } from '@/components/features/communications';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import type { CommunicationsFilters } from '@/components/features/communications/types';

export default function CommunicationsPage() {
  const t = useTranslations('communications');
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(
    urlView && ['list', 'board', 'timeline', 'table'].includes(urlView) ? urlView : 'list'
  );

  const [filters, setFilters] = useState<CommunicationsFilters>({ search: '', showAutoCreated: true });
  // Create trigger for list view only; other views use the shared modal below
  const [createTrigger, setCreateTrigger] = useState<number | null>(null);
  // Shared create modal for board/timeline/table views
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Thread detail modal for board/timeline/table views
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreate = useCallback(() => {
    if (viewMode === 'list') {
      // List view has its own embedded create modal via createTrigger
      setCreateTrigger((c) => (c ?? 0) + 1);
    } else {
      setShowCreateModal(true);
    }
  }, [viewMode]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        viewToggle={true}
        viewMode={viewMode}
        onViewChange={setViewMode}
        action={
          <button
            onClick={handleCreate}
            title={t('newThread')}
            className="inline-flex items-center justify-center p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <ConfigurableStatisticsBar module="communications" data={[]} />

      <FilterPanel
        fields={[
          { key: 'search', label: t('searchPlaceholder'), type: 'text', placeholder: t('searchPlaceholder') },
          { key: 'showAutoCreated', label: t('showAutoCreated'), type: 'checkbox', placeholder: t('showAutoCreated') },
        ]}
        values={filters}
        onChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
        onReset={() => setFilters({ search: '', showAutoCreated: true })}
      />

      {viewMode === 'list' && (
        <CommunicationsList
          filters={filters}
          createTrigger={createTrigger}
          onThreadCreated={() => { /* parent could refresh statistics etc. */ }}
        />
      )}
      {viewMode === 'board' && <CommunicationsBoard filters={filters} onThreadSelect={setSelectedThreadId} />}
      {viewMode === 'timeline' && <CommunicationsTimeline filters={filters} onThreadSelect={setSelectedThreadId} />}
      {viewMode === 'table' && <CommunicationsTable filters={filters} onThreadSelect={setSelectedThreadId} />}

      {/* Shared create modal for non-list views */}
      {viewMode !== 'list' && (
        <CreateThreadModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); setRefreshKey((k) => k + 1); }}
        />
      )}

      {/* Thread detail modal for non-list views */}
      <ThreadDetailModal
        isOpen={!!selectedThreadId}
        threadId={selectedThreadId}
        currentUserId={user?.id}
        currentUserName={user?.name}
        onClose={() => setSelectedThreadId(null)}
        onThreadUpdated={() => setRefreshKey((k) => k + 1)}
        onThreadDeleted={() => { setSelectedThreadId(null); setRefreshKey((k) => k + 1); }}
      />
    </div>
  );
}
