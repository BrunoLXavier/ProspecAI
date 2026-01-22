// Institutes List View - based on Portfolio list view
import React from 'react';
import { useTranslations } from 'next-intl';

interface Institute {
  id: string;
  name: string;
  description?: string;
  metadata?: any;
  member_ids?: string[];
  member_count?: number;
}

interface Props {
  items: Institute[];
  isLoading: boolean;
  onItemClick?: (it: Institute) => void;
}

export default function InstitutesListView({ items, isLoading, onItemClick }: Props) {
  const t = useTranslations('institutes');
  const tCommon = useTranslations('common');

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">{tCommon('loading')}</div>;
  }

  if (!items || items.length === 0) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('noResults')}</div>;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {items.map((it) => (
          <li
            key={it.id}
            className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer"
            onClick={() => onItemClick?.(it)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{it.name}</h3>
                  <div className="text-xs text-gray-400">{it.member_ids ? it.member_ids.length : (it.member_count ?? '')}</div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('city') || 'City'}:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{it.metadata?.city || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('area') || 'Area'}:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{it.metadata?.area_m2 ?? '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('members') || 'Members'}:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{it.member_ids ? it.member_ids.length : (it.member_count ?? '-')}</p>
                  </div>
                </div>

                {it.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">{it.description}</p>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
