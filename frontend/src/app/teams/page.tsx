// Teams Page — Standardized via useCrudPage + EntityModal
// Implements RF-09: Team Management
'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import { useCrudPage, FetchResult } from '@/hooks/use-crud-page';
import { teamDefinition, TeamFormData } from '@/lib/form-registry/definitions/team.definition';
import EntityModal from '@/components/features/shared/ui/EntityModal';
import TeamsBoard from '@/components/features/teams/components/TeamsBoard';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import Pagination from '@/components/features/shared/ui/Pagination';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  nome: string;
  cargo: string;
  departamento: string;
  especializacao: string;
  status: string;
  vinculo_principal: string;
  experiencia_anos: number;
}

interface TeamFilters {
  search: string;
}

const initialFilters: TeamFilters = { search: '' };

// ─── Page Component ──────────────────────────────────────────────────────────

export default function TeamsPage() {
  const t = useTranslations('teams');
  const tCommon = useTranslations('common');

  const state = useCrudPage<TeamMember, TeamFilters>({
    queryKey: 'teams',
    definition: teamDefinition,
    initialFilters,
    defaultPageSize: 20,
    filterFn: (item, filters) => {
      if (!filters.search) return true;
      const search = filters.search.toLowerCase();
      return (
        item.nome?.toLowerCase().includes(search) ||
        item.cargo?.toLowerCase().includes(search) ||
        item.departamento?.toLowerCase().includes(search) ||
        item.especializacao?.toLowerCase().includes(search)
      );
    },
    searchKey: 'search',
    fetchFn: async () => {
      const res = await apiClient.get('/api/v1/teams');
      const items = Array.isArray(res) ? res : ((res as any).items ?? []);
      return { items, total: items.length } as FetchResult<TeamMember>;
    },
  });

  const filterFields: FilterField[] = [
    { key: 'search', label: t('filters.search'), type: 'text', placeholder: t('filters.searchPlaceholder') },
  ];

  const timelineItems: TimelineItem[] = useMemo(() => {
    return state.data.map((m) => ({
      id: m.id,
      title: m.nome || t('untitled'),
      description: `${m.cargo || ''} — ${m.departamento || ''}`,
      date: '',
      status: m.status === 'active' ? 'success' : m.status === 'archived' ? 'default' : 'warning',
      onClick: () => state.openViewModal(m),
    }));
  }, [state.data, t]);

  const tableColumns: TableColumn<TeamMember>[] = useMemo(() => [
    { key: 'nome', header: t('name'), accessor: 'nome', sortable: true },
    { key: 'cargo', header: t('role'), accessor: 'cargo', sortable: true },
    { key: 'departamento', header: t('department'), accessor: 'departamento', sortable: true },
    { key: 'especializacao', header: t('specialization'), accessor: 'especializacao', sortable: true },
    { key: 'vinculo_principal', header: t('bond'), accessor: 'vinculo_principal', sortable: true },
    { key: 'experiencia_anos', header: t('experience'), accessor: 'experiencia_anos', sortable: true },
  ], [t]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        viewToggle
        viewMode={state.viewMode}
        onViewChange={state.setViewMode}
        action={
          <button onClick={state.openCreateModal} title={t('new')}
            className="inline-flex items-center justify-center p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition">
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <EntityModal<TeamFormData>
        definition={teamDefinition}
        entity={state.isCreateModalOpen ? null : (state.selectedItem as any)}
        mode={state.isCreateModalOpen ? 'create' : 'edit'}
        isOpen={state.isCreateModalOpen || state.isViewModalOpen}
        onClose={state.closeModal}
        onSuccess={() => { state.closeModal(); state.refetch(); }}
        onDeleteSuccess={() => { state.closeModal(); state.refetch(); }}
        icon={<UserGroupIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
        size="2xl"
      />

      <ConfigurableStatisticsBar module="teams" data={state.allData} />

      <FilterPanel
        fields={filterFields}
        values={state.filters}
        onChange={state.setFilter}
        onReset={state.resetFilters}
        defaultExpanded={false}
      />

      {state.viewMode === 'board' && (
        <TeamsBoard items={state.allData as any[]} onItemClick={state.openViewModal as any} />
      )}

      {state.viewMode === 'timeline' && (
        <div className="space-y-4">
          <TimelineView items={timelineItems} showConnectors animated />
          {state.totalItems > 0 && (
            <Pagination currentPage={state.currentPage} totalItems={state.totalItems} pageSize={state.pageSize}
              onPageChange={state.setCurrentPage} onPageSizeChange={state.setPageSize} persistInUrl showTotal showPageSizeSelector />
          )}
        </div>
      )}

      {state.viewMode === 'table' && (
        <TableView<TeamMember>
          data={state.data} columns={tableColumns} getRowKey={(r) => r.id}
          onRowClick={state.openViewModal} loading={state.isLoading}
          emptyMessage={tCommon('noResults')} searchable={false}
          paginated pageSize={state.pageSize} currentPage={state.currentPage}
          totalItems={state.totalItems} onPageChange={state.setCurrentPage}
          onPageSizeChange={state.setPageSize} striped hoverable
        />
      )}

      {state.viewMode === 'list' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            {state.isLoading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">{tCommon('loading')}</div>
            ) : state.data.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('noResults')}</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {state.data.map((member) => (
                  <li key={member.id} onClick={() => state.openViewModal(member)}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{member.nome || t('untitled')}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {member.cargo} — {member.departamento}
                        </p>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{member.vinculo_principal}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {state.totalItems > 0 && (
            <Pagination currentPage={state.currentPage} totalItems={state.totalItems} pageSize={state.pageSize}
              onPageChange={state.setCurrentPage} onPageSizeChange={state.setPageSize} persistInUrl showTotal showPageSizeSelector />
          )}
        </div>
      )}
    </div>
  );
}
