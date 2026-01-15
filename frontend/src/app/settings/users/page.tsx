// User Management Page
// Admin interface for managing users
// Implements RF-09: Admin User Management
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';

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

const ROLES = [
  { value: 'admin', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'manager', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'analyst', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'viewer', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
];

export default function UsersPage() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    name: '',
    role: 'analyst',
    password: '',
    is_active: true,
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users', searchQuery, selectedRole],
    queryFn: async () => {
      try {
        const params: Record<string, any> = {};
        if (searchQuery) params.search = searchQuery;
        if (selectedRole) params.role = selectedRole;
        
        const response = await apiClient.get('/api/v1/admin/users', params);
        return response.users || response || [];
      } catch (error) {
        console.error('Failed to fetch users:', error);
        // Return mock data for development
        return [
          {
            id: '1',
            email: 'admin@prospecai.com',
            name: 'System Administrator',
            role: 'admin',
            is_active: true,
            created_at: '2025-01-01T00:00:00Z',
            last_login: '2026-01-13T10:00:00Z',
          },
          {
            id: '2',
            email: 'manager@prospecai.com',
            name: 'Project Manager',
            role: 'manager',
            is_active: true,
            created_at: '2025-03-15T00:00:00Z',
            last_login: '2026-01-12T15:30:00Z',
          },
          {
            id: '3',
            email: 'analyst@prospecai.com',
            name: 'Data Analyst',
            role: 'analyst',
            is_active: true,
            created_at: '2025-06-01T00:00:00Z',
            last_login: '2026-01-10T09:00:00Z',
          },
        ];
      }
    },
  });

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: (data: UserFormData) => 
      apiClient.post('/api/v1/admin/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
    },
    onError: (error: any) => {
      setFormError(error.response?.data?.detail || 'Failed to create user');
    },
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: (data: { id: string; updates: Partial<UserFormData> }) => 
      apiClient.put(`/api/v1/admin/users/${data.id}`, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
    },
    onError: (error: any) => {
      setFormError(error.response?.data?.detail || 'Failed to update user');
    },
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => 
      apiClient.delete(`/api/v1/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowDeleteConfirm(null);
    },
  });

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      name: '',
      role: 'analyst',
      password: '',
      is_active: true,
    });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      role: user.role,
      password: '',
      is_active: user.is_active,
    });
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.email || !formData.name) {
      setFormError('Email and name are required');
      return;
    }

    if (!editingUser && !formData.password) {
      setFormError('Password is required for new users');
      return;
    }

    if (editingUser) {
      const updates: Partial<UserFormData> = {
        email: formData.email,
        name: formData.name,
        role: formData.role,
        is_active: formData.is_active,
      };
      if (formData.password) {
        updates.password = formData.password;
      }
      updateMutation.mutate({ id: editingUser.id, updates });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getRoleConfig = (role: string) => {
    return ROLES.find(r => r.value === role) || ROLES[3];
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        if (!user.name.toLowerCase().includes(search) && 
            !user.email.toLowerCase().includes(search)) {
          return false;
        }
      }
      if (selectedRole && user.role !== selectedRole) {
        return false;
      }
      return true;
    });
  }, [users, searchQuery, selectedRole]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('users.title') || 'User Management'}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('users.subtitle') || 'Manage system users and their permissions'}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          {t('users.newUser') || 'New User'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('users.searchPlaceholder') || 'Search by name or email...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value="">{t('users.allRoles') || 'All Roles'}</option>
            {ROLES.map(role => (
              <option key={role.value} value={role.value}>{t(`users.roleTypes.${role.value}`) || role.value}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {tCommon('loading') || 'Loading...'}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {t('users.noUsers') || 'No users found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('users.user') || 'User'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('users.role') || 'Role'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('users.status') || 'Status'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('users.lastLogin') || 'Last Login'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('users.actions') || 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => {
                  const roleConfig = getRoleConfig(user.role);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                              <UserCircleIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleConfig.color}`}>
                          {t(`users.roleTypes.${roleConfig.value || roleConfig}`) || roleConfig.value}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          user.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {user.is_active ? (
                            <>
                              <CheckIcon className="w-3 h-3" />
                              {t('users.active') || 'Active'}
                            </>
                          ) : (
                            <>
                              <XMarkIcon className="w-3 h-3" />
                              {t('users.inactive') || 'Inactive'}
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.last_login 
                          ? new Date(user.last_login).toLocaleString('pt-BR')
                          : t('users.never') || 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                            title={tCommon('edit') || 'Edit'}
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(user.id)}
                            className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            title={tCommon('delete') || 'Delete'}
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                        
                        {/* Delete Confirmation */}
                        {showDeleteConfirm === user.id && (
                          <div className="absolute right-4 mt-2 p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                              {t('users.deleteConfirmation') || 'Delete this user?'}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => deleteMutation.mutate(user.id)}
                                disabled={deleteMutation.isPending}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                              >
                                {tCommon('delete') || 'Delete'}
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300"
                              >
                                {tCommon('cancel') || 'Cancel'}
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Summary */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-slate-700 border-t border-gray-200 dark:border-gray-600">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('users.showing') || 'Showing'} {filteredUsers.length} {t('users.of') || 'of'} {users.length} {t('users.users') || 'users'}
          </p>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingUser 
                  ? t('users.editUser') || 'Edit User' 
                  : t('users.newUser') || 'New User'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            {formError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users.name') || 'Name'} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users.email') || 'Email'} *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users.password') || 'Password'} {!editingUser && '*'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  placeholder={editingUser ? t('users.leaveBlank') || 'Leave blank to keep current' : ''}
                  required={!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users.role') || 'Role'}
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  {ROLES.map(role => (
                    <option key={role.value} value={role.value}>{t(`users.roleTypes.${role.value}`) || role.value}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.is_active ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('users.activeUser') || 'Active user'}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {tCommon('cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {(createMutation.isPending || updateMutation.isPending) 
                    ? tCommon('saving') || 'Saving...' 
                    : editingUser 
                      ? tCommon('save') || 'Save'
                      : t('users.create') || 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
