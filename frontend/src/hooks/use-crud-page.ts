/**
 * useCrudPage Hook
 * Composable hook that orchestrates common CRUD page patterns:
 * - View mode toggling (list, table, board, timeline) with URL persistence
 * - Filter state management with reset
 * - Server-side pagination with React Query integration
 * - Modal state (create / view-edit) management
 * - Data fetching via React Query
 *
 * Each feature page provides its own config (query key, fetch fn, filters, columns),
 * and this hook returns all the state + handlers needed by the CrudPage component.
 *
 * Implements RF-04, RF-05: Standardized CRUD page infrastructure
 */
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { ViewMode } from '@/components/features/shared/ui/ViewToggle';
import { usePagination } from '@/components/features/shared/ui/Pagination';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CrudPageConfig<TItem, TFilters extends Record<string, any>> {
  /** React Query cache key prefix (e.g., 'clients', 'funding') */
  queryKey: string;
  /** Async function that fetches data. Receives current filters and pagination. */
  fetchFn: (params: FetchParams<TFilters>) => Promise<FetchResult<TItem>>;
  /** Initial filter values */
  initialFilters: TFilters;
  /** Default view mode */
  defaultView?: ViewMode;
  /** Available view modes (defaults to all 4) */
  availableModes?: ViewMode[];
  /** Default page size */
  defaultPageSize?: number;
  /** Whether to persist pagination in URL */
  persistPagination?: boolean;
  /** Whether to persist view mode in URL */
  persistViewMode?: boolean;
  /** Stale time for React Query (ms) */
  staleTime?: number;
  /** Additional React Query options */
  queryOptions?: Partial<UseQueryOptions>;
}

export interface FetchParams<TFilters> {
  filters: TFilters;
  page: number;
  pageSize: number;
}

export interface FetchResult<TItem> {
  items: TItem[];
  total: number;
}

export interface CrudPageState<TItem, TFilters extends Record<string, any>> {
  // ── Data ────────────────────────────────────────────────────────────────
  /** Fetched items for the current page */
  data: TItem[];
  /** Total item count (for pagination) */
  totalItems: number;
  /** Whether data is loading */
  isLoading: boolean;
  /** Whether data is being refetched */
  isRefetching: boolean;
  /** Refetch data */
  refetch: () => void;

  // ── View Mode ───────────────────────────────────────────────────────────
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  availableModes: ViewMode[];

  // ── Filters ─────────────────────────────────────────────────────────────
  filters: TFilters;
  setFilter: (key: string, value: any) => void;
  setFilters: (filters: TFilters) => void;
  resetFilters: () => void;
  /** Count of active filters (non-default values) */
  activeFilterCount: number;

  // ── Pagination ──────────────────────────────────────────────────────────
  currentPage: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // ── Modal State ─────────────────────────────────────────────────────────
  /** Whether the create modal is open */
  isCreateModalOpen: boolean;
  /** Whether the view/edit modal is open */
  isViewModalOpen: boolean;
  /** The currently selected item (for view/edit) */
  selectedItem: TItem | null;
  /** Open the create modal */
  openCreateModal: () => void;
  /** Close all modals and clear selection */
  closeModal: () => void;
  /** Open view/edit modal with a specific item */
  openViewModal: (item: TItem) => void;
}

// ─── Hook Implementation ─────────────────────────────────────────────────────

export function useCrudPage<TItem, TFilters extends Record<string, any>>(
  config: CrudPageConfig<TItem, TFilters>
): CrudPageState<TItem, TFilters> {
  const {
    queryKey,
    fetchFn,
    initialFilters,
    defaultView = 'list',
    availableModes = ['list', 'board', 'timeline', 'table'],
    defaultPageSize = 20,
    persistPagination = true,
    persistViewMode = true,
    staleTime = 30_000,
  } = config;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── View Mode ───────────────────────────────────────────────────────────
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewModeState] = useState<ViewMode>(
    urlView && availableModes.includes(urlView) ? urlView : defaultView
  );

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    if (persistViewMode) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('view', mode);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [persistViewMode, searchParams, router, pathname]);

  // ── Filters ─────────────────────────────────────────────────────────────
  const [filters, setFiltersState] = useState<TFilters>(initialFilters);

  const setFilter = useCallback((key: string, value: any) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setFilters = useCallback((newFilters: TFilters) => {
    setFiltersState(newFilters);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(initialFilters);
  }, [initialFilters]);

  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      const initial = initialFilters[key as keyof TFilters];
      return value !== initial && value !== '' && value !== 'all' && value !== undefined && value !== null && value !== false;
    }).length;
  }, [filters, initialFilters]);

  // ── Pagination ──────────────────────────────────────────────────────────
  const { initialPage, initialPageSize } = usePagination(defaultPageSize, persistPagination);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1);
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // ── Data Fetching ───────────────────────────────────────────────────────
  const { data: queryResult, isLoading, isRefetching, refetch } = useQuery({
    queryKey: [queryKey, filters, currentPage, pageSize],
    queryFn: () => fetchFn({ filters, page: currentPage, pageSize }),
    staleTime,
    ...(config.queryOptions as Record<string, unknown>),
  });

  const data = (queryResult as FetchResult<TItem> | undefined)?.items ?? [];
  const totalItems = (queryResult as FetchResult<TItem> | undefined)?.total ?? 0;

  // ── Modal State ─────────────────────────────────────────────────────────
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TItem | null>(null);

  const openCreateModal = useCallback(() => {
    setSelectedItem(null);
    setIsCreateModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsCreateModalOpen(false);
    setIsViewModalOpen(false);
    setSelectedItem(null);
  }, []);

  const openViewModal = useCallback((item: TItem) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
  }, []);

  // ── Handle URL highlight param (auto-open item) ─────────────────────────
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId && data.length > 0) {
      const item = data.find((d: any) => d.id === highlightId);
      if (item) {
        openViewModal(item);
        const params = new URLSearchParams(searchParams.toString());
        params.delete('highlight');
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
    }
  }, [searchParams, data, openViewModal, router, pathname]);

  return {
    // Data
    data,
    totalItems,
    isLoading,
    isRefetching,
    refetch,
    // View Mode
    viewMode,
    setViewMode,
    availableModes,
    // Filters
    filters,
    setFilter,
    setFilters,
    resetFilters,
    activeFilterCount,
    // Pagination
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    // Modal
    isCreateModalOpen,
    isViewModalOpen,
    selectedItem,
    openCreateModal,
    closeModal,
    openViewModal,
  };
}

export default useCrudPage;
