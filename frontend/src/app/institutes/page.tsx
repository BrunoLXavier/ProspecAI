// Institutes Page
'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';
import SafeRender from '@/components/ui/SafeRender';
import { ViewMode } from '@/components/ui/ViewToggle';
import { PlusIcon } from '@heroicons/react/24/outline';
import InstituteModal from '@/components/entities/InstituteModal';

export default function InstitutesPage() {
  const t = useTranslations('institutes');
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(urlView === 'board' || urlView === 'list' ? urlView : 'list');
  const [filters, setFilters] = useState({ search: '', city: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInstitute, setSelectedInstitute] = useState<any | null>(null);

  const filterFields: FilterField[] = [
    { key: 'search', label: t('filters.search'), type: 'text', placeholder: t('filters.searchPlaceholder') },
    { key: 'city', label: t('filters.city') || 'City', type: 'text', placeholder: t('filters.cityPlaceholder') || '' },
  ];

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['institutes', 'page'],
    queryFn: async () => {
      try {
        const resp = await apiClient.get('/api/v1/institutes');
        return resp?.items ?? resp ?? [];
      } catch (e) {
        console.debug('[Institutes] Failed to load institutes', e);
        return [];
      }
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    let res = items;
    if (filters.search) res = res.filter((i: any) => (i.name || '').toLowerCase().includes(filters.search.toLowerCase()));
    if (filters.city) res = res.filter((i: any) => { const m = i.metadata || {}; return (m.city || '').toLowerCase().includes(filters.city.toLowerCase()); });
    return res;
  }, [items, filters.search, filters.city]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        viewToggle
        viewMode={viewMode}
        onViewChange={setViewMode}
        action={(
          <button onClick={() => { setSelectedInstitute(null); setModalOpen(true); }} className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <PlusIcon className="w-5 h-5 mr-2" />
            {t('new')}
          </button>
        )}
      />

      <SafeRender fallback={<div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-4"><div className="text-sm text-gray-500 dark:text-gray-400">{t('statsUnavailable') || 'Statistics unavailable'}</div></div>}>
        <ConfigurableStatisticsBar module={"institutes" as any} data={filtered} />
      </SafeRender>

      <FilterPanel
        fields={filterFields}
        values={filters}
        onChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
        onReset={() => setFilters({ search: '', city: '' })}
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
              {filtered.map((it: any) => (
                <li key={it.id} className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{it.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{it.description || ''}</p>
                      {it.metadata?.city && <p className="text-xs text-gray-400 mt-1">{t('city') || 'City'}: {it.metadata.city}</p>}
                      {it.metadata?.area_m2 && <p className="text-xs text-gray-400 mt-1">{t('area') || 'Area'}: {it.metadata.area_m2} m²</p>}
                    </div>
                    <div className="text-xs text-gray-400">{it.member_ids ? (it.member_ids.length) : (it.member_count ?? '')}</div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <a href={`/institutes/${it.id}/members`} className="text-sm text-primary-600 hover:underline">Manage members</a>
                    <button onClick={() => { setSelectedInstitute(it); setModalOpen(true); }} className="ml-auto text-sm text-gray-500">Details</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <InstituteModal isOpen={modalOpen} onClose={() => setModalOpen(false)} institute={selectedInstitute} />
    </div>
  );
}
