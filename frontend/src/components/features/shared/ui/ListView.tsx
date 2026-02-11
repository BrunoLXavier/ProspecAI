/**
 * ListView Component
 * Generic list view for CRUD pages with configurable item rendering
 * Extracts the duplicated <ul>/<li> pattern found across CRM, Funding, Portfolio, etc.
 * Implements RF-04, RF-05: Consistent list view with dark mode
 */
'use client';

import { ReactNode, useMemo } from 'react';
import { useTranslations } from 'next-intl';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ListColumn<T> {
  /** Unique key for the column */
  key: string;
  /** Display label */
  label: string;
  /** Extract the value from the item */
  accessor: keyof T | ((item: T) => ReactNode);
  /** Optional className for the column cell */
  className?: string;
}

export interface ListViewProps<T extends { id: string }> {
  /** Data array */
  data: T[];
  /** Loading state */
  loading?: boolean;
  /** How to render each item's title */
  renderTitle: (item: T) => ReactNode;
  /** Optional subtitle renderer */
  renderSubtitle?: (item: T) => ReactNode;
  /** Optional detail columns rendered in a grid below the title */
  columns?: ListColumn<T>[];
  /** Optional badges/tags to display next to the title */
  renderBadges?: (item: T) => ReactNode;
  /** Optional right-side actions or content */
  renderActions?: (item: T) => ReactNode;
  /** Optional left-side avatar/icon */
  renderAvatar?: (item: T) => ReactNode;
  /** Click handler for an item */
  onItemClick?: (item: T) => void;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state icon */
  emptyIcon?: ReactNode;
  /** Additional className for the container */
  className?: string;
  /** Number of skeleton items to show while loading */
  skeletonCount?: number;
  /** Columns count for the detail grid (1-4) */
  detailColumns?: 1 | 2 | 3 | 4;
}

// ─── Column Grid Classes ─────────────────────────────────────────────────────

const gridColsMap = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

function ListItemSkeleton({ cols = 3 }: { cols?: number }) {
  return (
    <li className="p-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-48" />
            <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded-full w-16" />
          </div>
          <div className={`grid ${gridColsMap[cols as keyof typeof gridColsMap] || 'grid-cols-3'} gap-4`}>
            {Array.from({ length: cols }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-16" />
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}

// ─── Column Value Resolver ───────────────────────────────────────────────────

function resolveColumnValue<T>(item: T, accessor: keyof T | ((item: T) => ReactNode)): ReactNode {
  if (typeof accessor === 'function') {
    return accessor(item);
  }
  const value = item[accessor];
  if (value === null || value === undefined) return '—';
  return String(value);
}

// ─── ListView Component ─────────────────────────────────────────────────────

export default function ListView<T extends { id: string }>({
  data,
  loading = false,
  renderTitle,
  renderSubtitle,
  columns = [],
  renderBadges,
  renderActions,
  renderAvatar,
  onItemClick,
  emptyMessage,
  emptyIcon,
  className = '',
  skeletonCount = 5,
  detailColumns = 3,
}: ListViewProps<T>) {
  const t = useTranslations('common');
  const defaultEmptyMessage = emptyMessage || t('noResults');

  const gridCols = gridColsMap[detailColumns] || 'grid-cols-3';

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden ${className}`}>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <ListItemSkeleton key={i} cols={detailColumns} />
          ))}
        </ul>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden ${className}`}>
        <div className="p-12 text-center">
          {emptyIcon && <div className="mb-4 flex justify-center text-gray-300 dark:text-gray-600">{emptyIcon}</div>}
          <p className="text-gray-500 dark:text-gray-400">{defaultEmptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden ${className}`}>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {data.map((item) => (
          <li
            key={item.id}
            className={`
              p-6 transition-colors
              ${onItemClick
                ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50'
                : ''
              }
            `}
            onClick={() => onItemClick?.(item)}
          >
            <div className="flex items-start gap-4">
              {/* Avatar / Icon */}
              {renderAvatar && (
                <div className="shrink-0">
                  {renderAvatar(item)}
                </div>
              )}

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                {/* Title Row */}
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {renderTitle(item)}
                  </h3>
                  {renderBadges?.(item)}
                </div>

                {/* Subtitle */}
                {renderSubtitle && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {renderSubtitle(item)}
                  </p>
                )}

                {/* Detail Columns Grid */}
                {columns.length > 0 && (
                  <div className={`grid ${gridCols} gap-4 text-sm mt-3`}>
                    {columns.map((col) => (
                      <div key={col.key} className={col.className}>
                        <span className="text-gray-500 dark:text-gray-400">{col.label}:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {resolveColumnValue(item, col.accessor)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              {renderActions && (
                <div className="shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
                  {renderActions(item)}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
