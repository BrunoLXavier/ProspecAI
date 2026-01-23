/**
 * TableView Component
 * Standardized data table with sorting, filtering, and pagination
 * Implements RF-05, RF-07: Data visualization and management
 */
'use client';

import { useState, useMemo, useCallback, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Pagination from './Pagination';

export type SortDirection = 'asc' | 'desc' | null;

export interface TableColumn<T> {
  /** Unique key for the column */
  key: string;
  /** Column header text */
  header: string | ReactNode;
  /** Data accessor - can be key of T or a function */
  accessor: keyof T | ((row: T) => ReactNode);
  /** Whether column is sortable */
  sortable?: boolean;
  /** Whether column is filterable */
  filterable?: boolean;
  /** Custom sort function */
  sortFn?: (a: T, b: T, direction: SortDirection) => number;
  /** Column width (Tailwind class or CSS) */
  width?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Whether column is hidden on mobile */
  hiddenOnMobile?: boolean;
  /** Custom cell renderer */
  render?: (value: unknown, row: T, index: number) => ReactNode;
  /** Header cell className */
  headerClassName?: string;
  /** Cell className */
  cellClassName?: string;
}

export interface TableViewProps<T> {
  /** Table data */
  data: T[];
  /** Column definitions */
  columns: TableColumn<T>[];
  /** Row key accessor */
  getRowKey: (row: T) => string | number;
  /** Enable row selection */
  selectable?: boolean;
  /** Selected row keys */
  selectedKeys?: Set<string | number>;
  /** Selection change handler */
  onSelectionChange?: (keys: Set<string | number>) => void;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Enable global search */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** External search value (controlled) */
  searchValue?: string;
  /** Search change handler (controlled) */
  onSearchChange?: (value: string) => void;
  /** Enable pagination */
  paginated?: boolean;
  /** Items per page */
  pageSize?: number;
  /** Page size options */
  pageSizeOptions?: number[];
  /** Current page (controlled) */
  currentPage?: number;
  /** Total items for server-side pagination */
  totalItems?: number;
  /** Page change handler */
  onPageChange?: (page: number) => void;
  /** Page size change handler */
  onPageSizeChange?: (size: number) => void;
  /** Server-side sorting - disable client-side */
  serverSideSorting?: boolean;
  /** Sort change handler */
  onSortChange?: (column: string, direction: SortDirection) => void;
  /** Current sort column */
  sortColumn?: string;
  /** Current sort direction */
  sortDirection?: SortDirection;
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state icon */
  emptyIcon?: ReactNode;
  /** Striped rows */
  striped?: boolean;
  /** Hoverable rows */
  hoverable?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Sticky header */
  stickyHeader?: boolean;
  /** Max height for scroll */
  maxHeight?: string;
  /** Additional table className */
  className?: string;
  /** Header actions (buttons, etc.) */
  headerActions?: ReactNode;
}

// Loading skeleton row
function SkeletonRow({ columns, compact }: { columns: number; compact: boolean }) {
  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className={cellPadding}>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export default function TableView<T>({
  data,
  columns,
  getRowKey,
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  onRowClick,
  searchable = false,
  searchPlaceholder,
  searchValue: controlledSearchValue,
  onSearchChange,
  paginated = false,
  pageSize: initialPageSize = 20,
  pageSizeOptions = [10, 20, 50, 100],
  currentPage: controlledPage,
  totalItems: serverTotalItems,
  onPageChange,
  onPageSizeChange,
  serverSideSorting = false,
  onSortChange,
  sortColumn: controlledSortColumn,
  sortDirection: controlledSortDirection,
  loading = false,
  emptyMessage,
  emptyIcon,
  striped = true,
  hoverable = true,
  compact = false,
  stickyHeader = false,
  maxHeight,
  className = '',
  headerActions,
}: TableViewProps<T>) {
  const t = useTranslations('common');

  // Internal state for uncontrolled mode
  const [internalSearch, setInternalSearch] = useState('');
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(initialPageSize);
  const [internalSortColumn, setInternalSortColumn] = useState<string | null>(null);
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>(null);

  // Use controlled or internal state
  const searchValue = controlledSearchValue ?? internalSearch;
  const currentPage = controlledPage ?? internalPage;
  const pageSize = initialPageSize;
  const sortColumn = controlledSortColumn ?? internalSortColumn;
  const sortDirection = controlledSortDirection ?? internalSortDirection;

  // Cell padding based on compact mode
  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';
  const headerPadding = compact ? 'px-3 py-2' : 'px-4 py-3';

  // Handle search change
  const handleSearchChange = useCallback((value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setInternalSearch(value);
      setInternalPage(1); // Reset to first page on search
    }
  }, [onSearchChange]);

  // Handle sort change
  const handleSortChange = useCallback((columnKey: string) => {
    const newDirection: SortDirection = 
      sortColumn === columnKey
        ? sortDirection === 'asc'
          ? 'desc'
          : sortDirection === 'desc'
            ? null
            : 'asc'
        : 'asc';

    if (onSortChange) {
      onSortChange(columnKey, newDirection);
    } else {
      setInternalSortColumn(newDirection ? columnKey : null);
      setInternalSortDirection(newDirection);
    }
  }, [sortColumn, sortDirection, onSortChange]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    if (onPageChange) {
      onPageChange(page);
    } else {
      setInternalPage(page);
    }
  }, [onPageChange]);

  // Handle page size change
  const handlePageSizeChange = useCallback((size: number) => {
    if (onPageSizeChange) {
      onPageSizeChange(size);
    } else {
      setInternalPageSize(size);
      setInternalPage(1);
    }
  }, [onPageSizeChange]);

  // Handle row selection
  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    
    const allKeys = data.map(getRowKey);
    const allSelected = allKeys.every(key => selectedKeys.has(key));
    
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allKeys));
    }
  }, [data, getRowKey, selectedKeys, onSelectionChange]);

  const handleSelectRow = useCallback((key: string | number) => {
    if (!onSelectionChange) return;
    
    const newSelection = new Set(selectedKeys);
    if (newSelection.has(key)) {
      newSelection.delete(key);
    } else {
      newSelection.add(key);
    }
    onSelectionChange(newSelection);
  }, [selectedKeys, onSelectionChange]);

  // Filter data based on search (client-side only if not server-side)
  const filteredData = useMemo(() => {
    if (!searchValue || serverSideSorting) return data;

    const lowerSearch = searchValue.toLowerCase();
    return data.filter(row => {
      return columns.some(col => {
        if (!col.filterable && col.filterable !== undefined) return false;
        
        const value = typeof col.accessor === 'function'
          ? col.accessor(row)
          : row[col.accessor];
        
        if (value == null) return false;
        return String(value).toLowerCase().includes(lowerSearch);
      });
    });
  }, [data, searchValue, columns, serverSideSorting]);

  // Sort data (client-side only if not server-side)
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection || serverSideSorting) return filteredData;

    const column = columns.find(c => c.key === sortColumn);
    if (!column) return filteredData;

    return [...filteredData].sort((a, b) => {
      if (column.sortFn) {
        return column.sortFn(a, b, sortDirection);
      }

      const aValue = typeof column.accessor === 'function'
        ? column.accessor(a)
        : a[column.accessor];
      const bValue = typeof column.accessor === 'function'
        ? column.accessor(b)
        : b[column.accessor];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

      const comparison = String(aValue).localeCompare(String(bValue), undefined, { numeric: true });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection, columns, serverSideSorting]);

  // Paginate data (client-side only if no server-side total)
  const totalItems = serverTotalItems ?? sortedData.length;
  const paginatedData = useMemo(() => {
    if (!paginated || serverTotalItems !== undefined) return sortedData;
    
    const start = (currentPage - 1) * internalPageSize;
    return sortedData.slice(start, start + internalPageSize);
  }, [sortedData, paginated, currentPage, internalPageSize, serverTotalItems]);

  // Alignment classes
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  // Get sort icon
  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <ChevronUpDownIcon className="w-4 h-4 text-gray-400" />;
    }
    if (sortDirection === 'asc') {
      return <ChevronUpIcon className="w-4 h-4 text-primary-500" />;
    }
    if (sortDirection === 'desc') {
      return <ChevronDownIcon className="w-4 h-4 text-primary-500" />;
    }
    return <ChevronUpDownIcon className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Header with search and actions */}
      {(searchable || headerActions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Search */}
          {searchable && (
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder || t('table.search') || 'Search...'}
                className="
                  w-full pl-10 pr-10 py-2 text-sm
                  rounded-lg border border-gray-300 dark:border-gray-600
                  bg-white dark:bg-slate-700
                  text-gray-900 dark:text-white
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                "
              />
              {searchValue && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          {headerActions && (
            <div className="flex items-center gap-2">
              {headerActions}
            </div>
          )}
        </div>
      )}

      {/* Table container */}
      <div
        className={`
          overflow-auto rounded-lg border border-gray-200 dark:border-gray-700
          bg-white dark:bg-slate-800
        `}
        style={{ maxHeight: maxHeight }}
      >
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          {/* Header */}
          <thead className={`
            bg-gray-50 dark:bg-slate-700
            ${stickyHeader ? 'sticky top-0 z-10' : ''}
          `}>
            <tr>
              {/* Selection checkbox */}
              {selectable && (
                <th className={`${headerPadding} w-12`}>
                  <input
                    type="checkbox"
                    checked={data.length > 0 && data.every(row => selectedKeys.has(getRowKey(row)))}
                    onChange={handleSelectAll}
                    className="
                      w-4 h-4 rounded border-gray-300 dark:border-gray-600
                      text-primary-600 focus:ring-primary-500
                      bg-white dark:bg-slate-600
                    "
                  />
                </th>
              )}

              {/* Data columns */}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    ${headerPadding}
                    text-xs font-semibold uppercase tracking-wider
                    text-gray-600 dark:text-gray-300
                    ${alignClasses[column.align || 'left']}
                    ${column.hiddenOnMobile ? 'hidden md:table-cell' : ''}
                    ${column.sortable ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-slate-600' : ''}
                    ${column.headerClassName || ''}
                  `}
                  style={{ width: column.width }}
                  onClick={column.sortable ? () => handleSortChange(column.key) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow
                  key={i}
                  columns={columns.length + (selectable ? 1 : 0)}
                  compact={compact}
                />
              ))
            ) : paginatedData.length === 0 ? (
              // Empty state
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="py-12 text-center"
                >
                  <div className="flex flex-col items-center gap-3">
                    {emptyIcon || (
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <AdjustmentsHorizontalIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {emptyMessage || t('table.empty') || 'No data available'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data rows
              paginatedData.map((row, rowIndex) => {
                const rowKey = getRowKey(row);
                const isSelected = selectedKeys.has(rowKey);

                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick?.(row)}
                    className={`
                      transition-colors duration-150
                      ${striped && rowIndex % 2 === 1 ? 'bg-gray-50/50 dark:bg-slate-700/30' : ''}
                      ${hoverable ? 'hover:bg-gray-100 dark:hover:bg-slate-700' : ''}
                      ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''}
                      ${onRowClick ? 'cursor-pointer' : ''}
                    `}
                  >
                    {/* Selection checkbox */}
                    {selectable && (
                      <td className={cellPadding} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(rowKey)}
                          className="
                            w-4 h-4 rounded border-gray-300 dark:border-gray-600
                            text-primary-600 focus:ring-primary-500
                            bg-white dark:bg-slate-600
                          "
                        />
                      </td>
                    )}

                    {/* Data cells */}
                    {columns.map((column) => {
                      const rawValue = typeof column.accessor === 'function'
                        ? column.accessor(row)
                        : row[column.accessor];

                      const displayValue = column.render
                        ? column.render(rawValue, row, rowIndex)
                        : rawValue as React.ReactNode;

                      return (
                        <td
                          key={column.key}
                          className={`
                            ${cellPadding}
                            text-sm text-gray-900 dark:text-gray-100
                            ${alignClasses[column.align || 'left']}
                            ${column.hiddenOnMobile ? 'hidden md:table-cell' : ''}
                            ${column.cellClassName || ''}
                          `}
                        >
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {paginated && !loading && totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={internalPageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={pageSizeOptions}
          showTotal
          showPageSizeSelector
          showFirstLast
        />
      )}
    </div>
  );
}
