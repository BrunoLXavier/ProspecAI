// Communications Page
'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';
import { ViewMode } from '@/components/ui/ViewToggle';
import { PlusIcon } from '@heroicons/react/24/outline';
import CommunicationModal from '@/components/entities/CommunicationModal';

export default function CommunicationsPage() {
  const t = useTranslations('communications');
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(urlView === 'board' || urlView === 'list' ? urlView : 'list');
  const [filters, setFilters] = useState({ search: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedComm, setSelectedComm] = useState<any | null>(null);

  const filterFields: FilterField[] = [
    { key: 'search', label: t('filters.search'), type: 'text', placeholder: t('filters.searchPlaceholder') },
  ];

  const items: any[] = [];

  const filtered = useMemo(() => {
    if (!filters.search) return items;
    return items.filter(i => (i.title || '').toLowerCase().includes(filters.search.toLowerCase()));
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
          <button onClick={() => { setSelectedComm(null); setModalOpen(true); }} className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <PlusIcon className="w-5 h-5 mr-2" />
            {t('new')}
          </button>
        )}
      />

      <ConfigurableStatisticsBar module={"communications" as any} data={filtered} />

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
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('noResults')}</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((it, idx) => (
                <li key={idx} className="px-6 py-4"><button onClick={() => { setSelectedComm(it); setModalOpen(true); }}>{it.title || 'Item'}</button></li>
              ))}
            </ul>
          )}
        </div>
      )}
      <CommunicationModal isOpen={modalOpen} onClose={() => setModalOpen(false)} comm={selectedComm} />
    </div>
  );
}
