/**
 * User Management Page — Standardized via useCrudPage
 * Admin interface for managing users
 * Implements RF-09: Admin User Management
 */
'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserCircleIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';
import { useCrudPage, FetchResult } from '@/hooks/use-crud-page';
import { userDefinition } from '@/lib/form-registry/definitions';
import UserModal from '@/components/features/users/components/UserModal';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
import Pagination from '@/components/features/shared/ui/Pagination';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';

// ─── Types ───────────────────────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  tenant_id?: string;
}

interface UserFormData {
  email: string;
  name: string;
  role: string;
  password?: string;
  is_active: boolean;
}

interface UserFilters {
  search: string;
  role: string;
  status: string;
}

const initialFilters: UserFilters = { search: '', role: '', status: '' };

const ROLES = [
  { value: 'admin', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'manager', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'analyst', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'viewer', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
];

const getRoleConfig = (role: string) => ROLES.find(r => r.value === role) || ROLES[3];

// ─── Page Component ──────────────────────────────────────────────────────────

export default function UsersPage() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  // ── useCrudPage — replaces ~20 manual useState + useQuery + URL handling ──
  const state = useCrudPage<User, UserFilters>({
    queryKey: 'users',
    definition: userDefinition,
    initialFilters,
    defaultPageSize: 20,
    filterFn: (item, filters) => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (!item.name?.toLowerCase().includes(s) && !item.email?.toLowerCase().includes(s)) return false;
      }
      if (filters.role && item.role !== filters.role) return false;
      if (filters.status === 'active' && !item.is_active) return false;
      if (filters.status === 'inactive' && item.is_active) return false;
      return true;
    },
    fetchFn: async () => {
      try {
        const response: any = await apiClient.get('/api/v1/admin/users', { skip: 0, limit: 500 });
        const items = response.items || response.users || (Array.isArray(response) ? response : []);
        return { items, total: response.total ?? items.length } as FetchResult<User>;
      } catch (error) {
        console.error('Failed to fetch users:', error);
        return { items: [], total: 0 };
      }
    },
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: UserFormData) => apiClient.post('/api/v1/admin/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      state.closeModal();
      setFormError(null);
    },
    onError: (error: any) => {
      setFormError(error.response?.data?.detail || 'Failed to create user');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; updates: Partial<UserFormData> }) =>
      apiClient.put(`/api/v1/admin/users/${data.id}`, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      state.closeModal();
      setFormError(null);
    },
    onError: (error: any) => {
      setFormError(error.response?.data?.detail || 'Failed to update user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/admin/users/${id}`),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['users'] });
      state.closeModal();
      setFormError(null);
    },
    onError: (error: any) => {
      setFormError(error.response?.data?.detail || 'Failed to delete user');
    },
  });

  const handleSave = async (data: UserFormData, isEdit: boolean, userId?: string) => {
    setFormError(null);
    if (isEdit && userId) {
      const updates: Partial<UserFormData> = {
        email: data.email, name: data.name, role: data.role, is_active: data.is_active,
      };
      if (data.password) updates.password = data.password;
      await updateMutation.mutateAsync({ id: userId, updates });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  // ── Filter Panel Fields ───────────────────────────────────────────────────

  const filterFields: FilterField[] = useMemo(() => [
    {
      key: 'search', label: t('users.searchPlaceholder') || 'Search...',
      type: 'text', placeholder: t('users.searchPlaceholder') || 'Search by name or email...',
    },
    {
      key: 'role', label: t('users.role') || 'Role', type: 'select',
      options: [
        { value: '', label: t('users.allRoles') || 'All Roles' },
        ...ROLES.map(r => ({ value: r.value, label: String(t(`users.roleTypes.${r.value}`) || r.value) })),
      ],
    },
    {
      key: 'status', label: t('users.status') || 'Status', type: 'select',
      options: [
        { value: '', label: tCommon('all') || 'All' },
        { value: 'active', label: t('users.active') || 'Active' },
        { value: 'inactive', label: t('users.inactive') || 'Inactive' },
      ],
    },
  ], [t, tCommon]);

  // ── Table Columns ─────────────────────────────────────────────────────────

  const tableColumns: TableColumn<User>[] = useMemo(() => [
    {
      key: 'name', header: t('users.user') || 'User', accessor: 'name', sortable: true,
      render: (_value: unknown, user: User) => (
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <UserCircleIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'email', header: t('users.email') || 'Email', accessor: 'email',
      sortable: true, hiddenOnMobile: true,
    },
    {
      key: 'role', header: t('users.role') || 'Role', accessor: 'role', sortable: true,
      render: (_value: unknown, user: User) => {
        const rc = getRoleConfig(user.role);
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${rc.color}`}>
            {String(t(`users.roleTypes.${rc.value}`) || rc.value)}
          </span>
        );
      },
    },
    {
      key: 'status', header: t('users.status') || 'Status', accessor: 'is_active',
      render: (_value: unknown, user: User) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
          user.is_active
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        }`}>
          {user.is_active ? <CheckIcon className="w-3 h-3" /> : <XMarkIcon className="w-3 h-3" />}
          {user.is_active ? (t('users.active') || 'Active') : (t('users.inactive') || 'Inactive')}
        </span>
      ),
    },
    {
      key: 'last_login', header: t('users.lastLogin') || 'Last Login', accessor: 'last_login', sortable: true,
      render: (_value: unknown, user: User) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {user.last_login ? new Date(user.last_login).toLocaleString('pt-BR') : t('users.never') || 'Never'}
        </span>
      ),
    },
    {
      key: 'actions', header: t('users.actions') || 'Actions', accessor: 'id', align: 'right' as const,
      render: (_value: unknown, user: User) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); state.openViewModal(user); }}
            className="p-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
            title={tCommon('edit') || 'Edit'}
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(user.id); }}
            className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            title={tCommon('delete') || 'Delete'}
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ], [t, tCommon, state, handleDelete]);

  // ── Timeline Items ────────────────────────────────────────────────────────

  const timelineItems: TimelineItem[] = useMemo(() => {
    return [...state.data]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((user): TimelineItem => {
        const rc = getRoleConfig(user.role);
        return {
          id: user.id,
          title: user.name,
          description: (
            <div className="space-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${rc.color}`}>
                  {String(t(`users.roleTypes.${rc.value}`) || rc.value)}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                  user.is_active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                }`}>
                  {user.is_active ? <CheckIcon className="w-3 h-3" /> : <XMarkIcon className="w-3 h-3" />}
                  {user.is_active ? (t('users.active') || 'Active') : (t('users.inactive') || 'Inactive')}
                </span>
              </div>
              {user.last_login && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('users.lastLogin') || 'Last login'}: {new Date(user.last_login).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          ),
          date: user.created_at,
          status: user.is_active ? 'success' : 'error',
          icon: <UserPlusIcon className="w-4 h-4" />,
          onClick: () => state.openViewModal(user),
        };
      });
  }, [state.data, t, state.openViewModal]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title={t('users.title') || 'User Management'}
        subtitle={t('users.subtitle') || 'Manage system users and their permissions'}
        viewToggle
        viewMode={state.viewMode}
        onViewChange={state.setViewMode}
        action={
          <button
            onClick={state.openCreateModal}
            title={t('users.newUser') || 'New User'}
            className="inline-flex items-center justify-center p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <ConfigurableStatisticsBar module="users" data={state.allData} />

      <FilterPanel
        fields={filterFields}
        values={state.filters}
        onChange={state.setFilter}
        onReset={state.resetFilters}
      />

      {/* Board View — Grouped by Role */}
      {state.viewMode === 'board' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ROLES.map(roleConfig => {
            const roleUsers = state.data.filter(u => u.role === roleConfig.value);
            return (
              <div key={roleConfig.value} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-between">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleConfig.color}`}>
                    {String(t(`users.roleTypes.${roleConfig.value}`) || roleConfig.value)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{roleUsers.length}</span>
                </h3>
                <div className="space-y-3">
                  {roleUsers.map(user => (
                    <div
                      key={user.id}
                      onClick={() => state.openViewModal(user)}
                      className="p-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-600 rounded-lg cursor-pointer hover:shadow"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                          <UserCircleIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                        </div>
                        <span className={`flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full ${
                          user.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {user.is_active ? <CheckIcon className="w-3 h-3" /> : <XMarkIcon className="w-3 h-3" />}
                        </span>
                      </div>
                    </div>
                  ))}
                  {roleUsers.length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                      {t('users.noUsers') || 'No users'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {state.viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden">
          {state.isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {tCommon('loading') || 'Loading...'}
            </div>
          ) : state.data.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {t('users.noUsers') || 'No users found'}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {state.data.map((user) => {
                const roleConfig = getRoleConfig(user.role);
                return (
                  <li
                    key={user.id}
                    onClick={() => state.openViewModal(user)}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                          <UserCircleIcon className="h-7 w-7 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{user.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleConfig.color}`}>
                          {String(t(`users.roleTypes.${roleConfig.value}`) || roleConfig.value)}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          user.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {user.is_active ? <CheckIcon className="w-3 h-3" /> : <XMarkIcon className="w-3 h-3" />}
                          {user.is_active ? (t('users.active') || 'Active') : (t('users.inactive') || 'Inactive')}
                        </span>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          <ClockIcon className="w-4 h-4 inline mr-1" />
                          {user.last_login
                            ? new Date(user.last_login).toLocaleDateString('pt-BR')
                            : t('users.never') || 'Never'}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); state.openViewModal(user); }}
                            className="p-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                            title={tCommon('edit') || 'Edit'}
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(user.id); }}
                            className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            title={tCommon('delete') || 'Delete'}
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Table View */}
      {state.viewMode === 'table' && (
        <TableView<User>
          data={state.data}
          columns={tableColumns}
          getRowKey={(user) => user.id}
          onRowClick={(user) => state.openViewModal(user)}
          loading={state.isLoading}
          paginated
          pageSize={state.pageSize}
          currentPage={state.currentPage}
          totalItems={state.totalItems}
          onPageChange={state.setCurrentPage}
          onPageSizeChange={state.setPageSize}
          emptyMessage={t('users.noUsers') || 'No users found'}
          hoverable
          striped
        />
      )}

      {/* Timeline View */}
      {state.viewMode === 'timeline' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6">
          {state.isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {tCommon('loading') || 'Loading...'}
            </div>
          ) : state.data.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {t('users.noUsers') || 'No users found'}
            </div>
          ) : (
            <TimelineView
              items={timelineItems}
              size="md"
              showConnectors
              animated
              emptyMessage={t('users.noUsers') || 'No users found'}
            />
          )}
        </div>
      )}

      {/* Pagination (non-table views — TableView has built-in pagination) */}
      {state.viewMode !== 'table' && state.totalItems > 0 && (
        <Pagination
          currentPage={state.currentPage}
          totalItems={state.totalItems}
          pageSize={state.pageSize}
          onPageChange={state.setCurrentPage}
          onPageSizeChange={state.setPageSize}
          persistInUrl
          showTotal
          showPageSizeSelector
        />
      )}

      {/* User Modal — Bespoke modal with custom save/delete workflow */}
      <UserModal
        isOpen={state.isCreateModalOpen || state.isViewModalOpen}
        onClose={state.closeModal}
        user={state.selectedItem}
        onSave={handleSave}
        onDelete={handleDelete}
        saving={createMutation.isPending || updateMutation.isPending}
        deleting={deleteMutation.isPending}
        error={formError}
      />
    </div>
  );
}
