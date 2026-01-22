// Infrastructure Page
'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';
import { ViewMode } from '@/components/ui/ViewToggle';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function InfrastructurePage() {
  const t = useTranslations('infrastructure');
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(urlView === 'board' || urlView === 'list' ? urlView : 'list');
  const [filters, setFilters] = useState({ search: '' });

  const filterFields: FilterField[] = [
    { key: 'search', label: t('filters.search'), type: 'text', placeholder: t('filters.searchPlaceholder') },
  ];

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['infrastructure', 'page'],
    queryFn: async () => {
      try {
        const resp = await apiClient.get('/api/v1/infrastructures');
        return resp?.items ?? resp ?? [];
      } catch (e) {
        console.debug('[Infrastructure] Failed to load resources', e);
        return [];
      }
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!filters.search) return items;
    return items.filter((r: any) => (r.name || '').toLowerCase().includes(filters.search.toLowerCase()));
  }, [items, filters.search]);

  const { selectedInstitutes = [], user } = useAuth();
  const canCreateResource = (user?.roles || []).includes('admin') || (selectedInstitutes && selectedInstitutes.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        viewToggle
        viewMode={viewMode}
        onViewChange={setViewMode}
        action={(
          canCreateResource ? (
            <button className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              <PlusIcon className="w-5 h-5 mr-2" />
              {t('newResource')}
            </button>
          ) : null
        )}
      />

      <ConfigurableStatisticsBar module={"infrastructure" as any} data={filtered} />

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
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {filtered.map((r: any) => (
                <li key={r.id} className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{r.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{r.location || r.type || ''}</p>
                      <p className="text-xs text-gray-400 mt-2">{r.description || ''}</p>
                    </div>
                    <div className="text-xs text-gray-400">{r.capacity ?? ''}</div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    {(
                      (user?.roles || []).includes('admin') ||
                      selectedInstitutes.includes(String(r.institute_id))
                    ) && (
                      <a href={`/infrastructure/${r.id}/booking`} className="text-sm text-primary-600 hover:underline">Book</a>
                    )}
                    <a href={`/infrastructure/${r.id}`} className="ml-auto text-sm text-gray-500">Details</a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
