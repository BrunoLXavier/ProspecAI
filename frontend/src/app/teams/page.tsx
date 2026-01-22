// Teams Page
'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';
import { ViewMode } from '@/components/ui/ViewToggle';
import { PlusIcon } from '@heroicons/react/24/outline';
import TeamModal from '@/components/entities/TeamModal';

export default function TeamsPage() {
  const t = useTranslations('teams');
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(urlView === 'board' || urlView === 'list' ? urlView : 'list');
  const [filters, setFilters] = useState({ search: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

  const filterFields: FilterField[] = [
    { key: 'search', label: t('filters.search'), type: 'text', placeholder: t('filters.searchPlaceholder') },
  ];

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['teams', 'page'],
    queryFn: async () => {
      try {
        const resp = await apiClient.get('/api/v1/teams');
        return resp?.items ?? resp ?? [];
      } catch (e) {
        console.debug('[Teams] Failed to load teams', e);
        return [];
      }
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!filters.search) return items;
    return items.filter((i: any) => (i.name || '').toLowerCase().includes(filters.search.toLowerCase()));
  }, [items, filters.search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        viewToggle
        viewMode={viewMode}
        onViewChange={setViewMode}
        action={(
          <button onClick={() => { setSelectedTeam(null); setModalOpen(true); }} className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <PlusIcon className="w-5 h-5 mr-2" />
            {t('new')}
          </button>
        )}
      />

      <ConfigurableStatisticsBar module={"teams" as any} data={filtered} />

      <FilterPanel
        fields={filterFields}
        values={filters}
        onChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
        onReset={() => setFilters({ search: '' })}
      />

      {viewMode === 'board' ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6">{t('boardPlaceholder')}</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('noResults')}</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((it: any, idx: number) => (
                <li key={it.id || idx} className="px-6 py-4 flex items-center justify-between">
                  <button onClick={() => { setSelectedTeam(it); setModalOpen(true); }} className="text-left">{it.name || 'Team'}</button>
                  <div className="text-xs text-gray-400">{it.member_ids ? it.member_ids.length : ''}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <TeamModal isOpen={modalOpen} onClose={() => setModalOpen(false)} team={selectedTeam} />
    </div>
  );
}
