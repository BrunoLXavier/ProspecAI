/**
 * Pagination Component
 * Standardized pagination with dark mode, URL persistence, and React Query integration
 * Implements RF-05: List views with pagination
 */
'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline';

export interface PaginationProps {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Total number of items */
  totalItems: number;
  /** Items per page */
  pageSize: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange?: (size: number) => void;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Whether to persist pagination in URL */
  persistInUrl?: boolean;
  /** Show page size selector */
  showPageSizeSelector?: boolean;
  /** Show first/last buttons */
  showFirstLast?: boolean;
  /** Show total items count */
  showTotal?: boolean;
  /** Maximum page numbers to show */
  maxVisiblePages?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  persistInUrl = false,
  showPageSizeSelector = true,
  showFirstLast = true,
  showTotal = true,
  maxVisiblePages = 5,
  size = 'md',
  disabled = false,
  className = '',
}: PaginationProps) {
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);
  
  // Current page info
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Size classes
  const sizeClasses = {
    sm: {
      button: 'px-2 py-1 text-xs',
      icon: 'w-3.5 h-3.5',
      select: 'px-2 py-1 text-xs',
      text: 'text-xs',
    },
    md: {
      button: 'px-3 py-1.5 text-sm',
      icon: 'w-4 h-4',
      select: 'px-3 py-1.5 text-sm',
      text: 'text-sm',
    },
    lg: {
      button: 'px-4 py-2 text-base',
      icon: 'w-5 h-5',
      select: 'px-4 py-2 text-base',
      text: 'text-base',
    },
  };

  const classes = sizeClasses[size];

  // Update URL with pagination params
  const updateUrl = useCallback((page: number, size: number) => {
    if (!persistInUrl) return;
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    params.set('limit', String(size));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [persistInUrl, searchParams, router, pathname]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    if (page < 1 || page > totalPages || page === currentPage || disabled) return;
    onPageChange(page);
    updateUrl(page, pageSize);
  }, [totalPages, currentPage, disabled, onPageChange, updateUrl, pageSize]);

  // Handle page size change
  const handlePageSizeChange = useCallback((newSize: number) => {
    if (disabled || !onPageSizeChange) return;
    onPageSizeChange(newSize);
    // Reset to page 1 when changing page size
    onPageChange(1);
    updateUrl(1, newSize);
  }, [disabled, onPageSizeChange, onPageChange, updateUrl]);

  // Generate visible page numbers
  const visiblePages = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      // Calculate range around current page
      const halfVisible = Math.floor((maxVisiblePages - 2) / 2);
      let start = Math.max(2, currentPage - halfVisible);
      let end = Math.min(totalPages - 1, currentPage + halfVisible);
      
      // Adjust if at the beginning or end
      if (currentPage <= halfVisible + 1) {
        end = maxVisiblePages - 1;
      } else if (currentPage >= totalPages - halfVisible) {
        start = totalPages - maxVisiblePages + 2;
      }
      
      // Add ellipsis if needed before
      if (start > 2) {
        pages.push('ellipsis');
      }
      
      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Add ellipsis if needed after
      if (end < totalPages - 1) {
        pages.push('ellipsis');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  }, [totalPages, currentPage, maxVisiblePages]);

  // Base button classes
  const baseButtonClass = `
    inline-flex items-center justify-center font-medium rounded-lg
    transition-all duration-200
    border border-gray-300 dark:border-gray-600
    bg-white dark:bg-slate-700
    text-gray-700 dark:text-gray-200
    hover:bg-gray-50 dark:hover:bg-slate-600
    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-slate-700
  `.trim();

  const activeButtonClass = `
    bg-primary-600 dark:bg-primary-500
    border-primary-600 dark:border-primary-500
    text-white
    hover:bg-primary-700 dark:hover:bg-primary-600
  `.trim();

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Left side: Total items info */}
      {showTotal && (
        <div className={`${classes.text} text-gray-600 dark:text-gray-400`}>
          {t('pagination.showing') || 'Showing'}{' '}
          <span className="font-medium text-gray-900 dark:text-white">{startItem}</span>
          {' '}{t('pagination.to') || 'to'}{' '}
          <span className="font-medium text-gray-900 dark:text-white">{endItem}</span>
          {' '}{t('pagination.of') || 'of'}{' '}
          <span className="font-medium text-gray-900 dark:text-white">{totalItems}</span>
          {' '}{t('pagination.items') || 'items'}
        </div>
      )}

      {/* Right side: Controls */}
      <div className="flex items-center gap-2">
        {/* Page size selector */}
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className={`${classes.text} text-gray-600 dark:text-gray-400 hidden sm:inline`}>
              {t('pagination.perPage') || 'Per page'}:
            </span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              disabled={disabled}
              className={`
                ${classes.select}
                rounded-lg border border-gray-300 dark:border-gray-600
                bg-white dark:bg-slate-700
                text-gray-700 dark:text-gray-200
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation buttons */}
        <nav className="flex items-center gap-1" aria-label="Pagination">
          {/* First page button */}
          {showFirstLast && (
            <button
              onClick={() => handlePageChange(1)}
              disabled={disabled || currentPage === 1}
              className={`${baseButtonClass} ${classes.button}`}
              aria-label={t('pagination.first') || 'First page'}
            >
              <ChevronDoubleLeftIcon className={classes.icon} />
            </button>
          )}

          {/* Previous button */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={disabled || currentPage === 1}
            className={`${baseButtonClass} ${classes.button}`}
            aria-label={t('pagination.previous') || 'Previous page'}
          >
            <ChevronLeftIcon className={classes.icon} />
          </button>

          {/* Page numbers */}
          <div className="hidden sm:flex items-center gap-1">
            {visiblePages.map((page, index) => {
              if (page === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className={`${classes.button} text-gray-400 dark:text-gray-500`}
                  >
                    ...
                  </span>
                );
              }
              
              const isActive = page === currentPage;
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  disabled={disabled}
                  className={`
                    ${classes.button}
                    ${isActive ? activeButtonClass : baseButtonClass}
                    min-w-[2.5rem]
                  `}
                  aria-label={`${t('pagination.page') || 'Page'} ${page}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* Mobile page indicator */}
          <span className={`sm:hidden ${classes.text} text-gray-600 dark:text-gray-400 px-2`}>
            {currentPage} / {totalPages}
          </span>

          {/* Next button */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={disabled || currentPage === totalPages}
            className={`${baseButtonClass} ${classes.button}`}
            aria-label={t('pagination.next') || 'Next page'}
          >
            <ChevronRightIcon className={classes.icon} />
          </button>

          {/* Last page button */}
          {showFirstLast && (
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={disabled || currentPage === totalPages}
              className={`${baseButtonClass} ${classes.button}`}
              aria-label={t('pagination.last') || 'Last page'}
            >
              <ChevronDoubleRightIcon className={classes.icon} />
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}

/**
 * Hook for pagination state management
 * Integrates with URL params and provides ready-to-use pagination state
 */
export function usePagination(
  defaultPageSize: number = 20,
  persistInUrl: boolean = true
) {
  const searchParams = useSearchParams();
  
  // Get initial values from URL or defaults
  const initialPage = persistInUrl
    ? Number(searchParams.get('page')) || 1
    : 1;
  const initialPageSize = persistInUrl
    ? Number(searchParams.get('limit')) || defaultPageSize
    : defaultPageSize;

  return {
    initialPage,
    initialPageSize,
    // Helper to calculate skip for API calls
    getSkip: (page: number, size: number) => (page - 1) * size,
  };
}
