/**
 * CrudPage Composable Component
 * Renders the standard CRUD page layout:
 *   PageHeader → StatisticsBar → FilterPanel → ViewSwitch → Pagination
 *
 * Consumes state from useCrudPage hook. Each feature page provides:
 * - Page title/subtitle
 * - Filter field configs
 * - Column configs for ListView/TableView
 * - Board/Timeline item mappers
 * - The modal component (rendered via renderModal slot)
 *
 * This is NOT a "magic" wrapper — it's a composable layout component.
 * Features retain full control via slots and render props.
 *
 * Implements RF-04, RF-05: Standardized CRUD page layout
 */
'use client';

import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PlusIcon } from '@heroicons/react/24/outline';
import { ViewMode } from '@/components/features/shared/ui/ViewToggle';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
import Pagination from '@/components/features/shared/ui/Pagination';
import ListView, { ListColumn, ListViewProps } from '@/components/features/shared/ui/ListView';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import { CrudPageState } from '@/hooks/use-crud-page';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CrudPageProps<TItem extends { id: string }, TFilters extends Record<string, any>> {
  /** State from useCrudPage hook */
  state: CrudPageState<TItem, TFilters>;

  // ── Header ──────────────────────────────────────────────────────────────
  /** Page title (i18n key already resolved) */
  title: string;
  /** Page subtitle */
  subtitle?: string;
  /** Custom create button label. Defaults to common.add */
  createLabel?: string;
  /** Whether to show the create button. Defaults to true */
  showCreate?: boolean;
  /** Custom header action (replaces default create button) */
  headerAction?: ReactNode;

  // ── Statistics ──────────────────────────────────────────────────────────
  /** Optional statistics bar (pass ConfigurableStatisticsBar or custom) */
  statisticsBar?: ReactNode;

  // ── Filters ─────────────────────────────────────────────────────────────
  /** Filter field configuration for FilterPanel */
  filterFields: FilterField[];

  // ── List View Config ────────────────────────────────────────────────────
  /** How to render the title in ListView */
  listRenderTitle?: ListViewProps<TItem>['renderTitle'];
  /** Optional subtitle renderer for ListView */
  listRenderSubtitle?: ListViewProps<TItem>['renderSubtitle'];
  /** Optional badges renderer for ListView */
  listRenderBadges?: ListViewProps<TItem>['renderBadges'];
  /** Detail columns for ListView (rendered as a grid below title) */
  listColumns?: ListColumn<TItem>[];
  /** Detail column count for ListView grid */
  listDetailColumns?: 1 | 2 | 3 | 4;
  /** Optional avatar renderer for ListView */
  listRenderAvatar?: ListViewProps<TItem>['renderAvatar'];
  /** Optional actions renderer for ListView */
  listRenderActions?: ListViewProps<TItem>['renderActions'];

  // ── Table View Config ───────────────────────────────────────────────────
  /** Column configuration for TableView */
  tableColumns?: TableColumn<TItem>[];

  // ── Board View Config ───────────────────────────────────────────────────
  /** Custom board view component (pass feature-specific Board) */
  renderBoard?: () => ReactNode;

  // ── Timeline View Config ────────────────────────────────────────────────
  /** Transform items to TimelineItem[] */
  mapToTimelineItems?: (items: TItem[]) => TimelineItem[];

  // ── Modal ───────────────────────────────────────────────────────────────
  /** Render the CRUD modal (create + view/edit). Receives modal state from useCrudPage. */
  renderModal?: () => ReactNode;

  // ── Extra Content ───────────────────────────────────────────────────────
  /** Content rendered between filter panel and views */
  beforeViews?: ReactNode;
  /** Content rendered after views */
  afterViews?: ReactNode;

  // ── Style ───────────────────────────────────────────────────────────────
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CrudPage<TItem extends { id: string }, TFilters extends Record<string, any>>({
  state,
  title,
  subtitle,
  createLabel,
  showCreate = true,
  headerAction,
  statisticsBar,
  filterFields,
  // List
  listRenderTitle,
  listRenderSubtitle,
  listRenderBadges,
  listColumns,
  listDetailColumns = 3,
  listRenderAvatar,
  listRenderActions,
  // Table
  tableColumns,
  // Board
  renderBoard,
  // Timeline
  mapToTimelineItems,
  // Modal
  renderModal,
  // Extra
  beforeViews,
  afterViews,
  className = '',
}: CrudPageProps<TItem, TFilters>) {
  const t = useTranslations('common');

  const {
    data,
    totalItems,
    isLoading,
    viewMode,
    setViewMode,
    availableModes,
    filters,
    setFilter,
    resetFilters,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    openCreateModal,
    openViewModal,
  } = state;

  // ── Default Create Button ───────────────────────────────────────────────
  const defaultCreateButton = showCreate ? (
    <button
      onClick={openCreateModal}
      className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition shadow-sm"
    >
      <PlusIcon className="w-5 h-5 mr-2" />
      {createLabel || t('add')}
    </button>
  ) : null;

  // ── Pagination Block ────────────────────────────────────────────────────
  const paginationBlock = totalItems > 0 && (
    <Pagination
      currentPage={currentPage}
      totalItems={totalItems}
      pageSize={pageSize}
      onPageChange={setCurrentPage}
      onPageSizeChange={setPageSize}
      persistInUrl={true}
      showTotal={true}
      showPageSizeSelector={true}
    />
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <PageHeader
        title={title}
        subtitle={subtitle}
        viewToggle={true}
        viewMode={viewMode}
        onViewChange={setViewMode}
        availableModes={availableModes}
        action={headerAction ?? defaultCreateButton}
      />

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      {renderModal?.()}

      {/* ── Statistics ─────────────────────────────────────────────────── */}
      {statisticsBar}

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <FilterPanel
        fields={filterFields}
        values={filters}
        onChange={setFilter}
        onReset={resetFilters}
        defaultExpanded={false}
      />

      {/* ── Before Views Slot ──────────────────────────────────────────── */}
      {beforeViews}

      {/* ── List View ──────────────────────────────────────────────────── */}
      {viewMode === 'list' && listRenderTitle && (
        <div className="space-y-4">
          <ListView<TItem>
            data={data}
            loading={isLoading}
            renderTitle={listRenderTitle}
            renderSubtitle={listRenderSubtitle}
            renderBadges={listRenderBadges}
            columns={listColumns}
            detailColumns={listDetailColumns}
            renderAvatar={listRenderAvatar}
            renderActions={listRenderActions}
            onItemClick={openViewModal}
          />
          {paginationBlock}
        </div>
      )}

      {/* ── Board View ─────────────────────────────────────────────────── */}
      {viewMode === 'board' && renderBoard?.()}

      {/* ── Timeline View ──────────────────────────────────────────────── */}
      {viewMode === 'timeline' && mapToTimelineItems && (
        <div className="space-y-4">
          <TimelineView
            items={mapToTimelineItems(data)}
            showConnectors={true}
            animated={true}
          />
          {paginationBlock}
        </div>
      )}

      {/* ── Table View ─────────────────────────────────────────────────── */}
      {viewMode === 'table' && tableColumns && (
        <TableView<TItem>
          data={data}
          columns={tableColumns}
          getRowKey={(row) => row.id}
          onRowClick={openViewModal}
          loading={isLoading}
          emptyMessage={t('noResults')}
          searchable={false}
          paginated={true}
          pageSize={pageSize}
          currentPage={currentPage}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          striped={true}
          hoverable={true}
        />
      )}

      {/* ── After Views Slot ───────────────────────────────────────────── */}
      {afterViews}
    </div>
  );
}
