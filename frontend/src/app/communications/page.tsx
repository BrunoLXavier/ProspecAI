// Communications Center Page
// Implements RF-08: Communication management and tracking
'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import FilterPanel from '@/components/features/shared/ui/FilterPanel';
import { ViewMode } from '@/components/features/shared/ui/ViewToggle';
import { CommunicationsList, CommunicationsBoard, CommunicationsTimeline, CommunicationsTable } from '@/components/features/communications';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function CommunicationsPage() {
  const t = useTranslations('communications');
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(
    urlView && ['list', 'board', 'timeline', 'table'].includes(urlView) ? urlView : 'list'
  );

  // Minimal filters placeholder to keep consistent layout (advanced filters can be added later)
  const [filters, setFilters] = useState<Record<string, any>>({ search: '', showAutoCreated: true });
  const [createTrigger, setCreateTrigger] = useState<number | null>(null);

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
            onClick={() => setCreateTrigger((c) => (c ?? 0) + 1)}
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
      {viewMode === 'board' && <CommunicationsBoard />}
      {viewMode === 'timeline' && <CommunicationsTimeline />}
      {viewMode === 'table' && <CommunicationsTable />}
    </div>
  );
}
