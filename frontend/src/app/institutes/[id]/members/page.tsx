/**
 * Institute Members Management Page
 * Implements RF-03: Portfólio Institucional - Gestão de Membros
 * Allows adding/removing users as members of an institute
 */
'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
  MagnifyingGlassIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import PageHeader from '@/components/features/shared/ui/PageHeader';

interface Member {
  id: string;
  user_id: string;
  institute_id: string;
  role: string;
  joined_at: string;
  user?: {
    id: string;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

const roleOptions = [
  { value: 'member', label: 'Membro' },
  { value: 'coordinator', label: 'Coordenador' },
  { value: 'researcher', label: 'Pesquisador' },
  { value: 'admin', label: 'Administrador' },
];

export default function InstituteMembersPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations('institutes');
  const tCommon = useTranslations('common');
  const instituteId = params.id as string;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Fetch institute details
  const { data: institute, isLoading: loadingInstitute } = useQuery({
    queryKey: ['institute', instituteId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/portfolio/institutes/${instituteId}`);
      return res.data || res;
    },
    enabled: !!instituteId,
  });

  // Fetch members of this institute
  const { data: members = [], isLoading: loadingMembers } = useQuery<Member[]>({
    queryKey: ['institute-members', instituteId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/portfolio/institutes/${instituteId}/members`);
      return res.data?.items || res.items || res.data || res || [];
    },
    enabled: !!instituteId,
  });

  // Fetch all users (for adding new members)
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['users', 'all'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/users');
      return res.data?.items || res.items || res.data || res || [];
    },
    enabled: showAddPanel,
  });

  // Filter out users who are already members
  const availableUsers = useMemo(() => {
    const memberUserIds = new Set(members.map((m: Member) => m.user_id));
    let filtered = allUsers.filter((u: User) => !memberUserIds.has(u.id));
    if (userSearchQuery) {
      const q = userSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (u: User) =>
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.first_name?.toLowerCase().includes(q) ||
          u.last_name?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [allUsers, members, userSearchQuery]);

  // Filter members by search
  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m: Member) =>
        m.user?.username?.toLowerCase().includes(q) ||
        m.user?.email?.toLowerCase().includes(q) ||
        m.user?.first_name?.toLowerCase().includes(q) ||
        m.user?.last_name?.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiClient.post(`/api/v1/portfolio/institutes/${instituteId}/members`, {
        user_id: userId,
        role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institute-members', instituteId] });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return apiClient.delete(
        `/api/v1/portfolio/institutes/${instituteId}/members/${memberId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institute-members', instituteId] });
    },
  });

  // Update member role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      return apiClient.patch(
        `/api/v1/portfolio/institutes/${instituteId}/members/${memberId}`,
        { role }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institute-members', instituteId] });
    },
  });

  const handleAddMember = (userId: string) => {
    addMemberMutation.mutate({ userId, role: selectedRole });
  };

  const handleRemoveMember = (memberId: string) => {
    if (confirm(t('confirmRemoveMember') || 'Deseja remover este membro?')) {
      removeMemberMutation.mutate(memberId);
    }
  };

  const handleRoleChange = (memberId: string, newRole: string) => {
    updateRoleMutation.mutate({ memberId, role: newRole });
  };

  const getUserDisplayName = (user?: User) => {
    if (!user) return 'Unknown User';
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.username || user.email || 'Unknown User';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'coordinator':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'researcher':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (loadingInstitute) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <PageHeader
            title={t('membersTitle') || `Membros - ${institute?.nome || institute?.name || ''}`}
            subtitle={t('membersSubtitle') || 'Gerencie os membros deste instituto'}
            action={
              <button
                onClick={() => setShowAddPanel(!showAddPanel)}
                className={`inline-flex items-center px-4 py-2 rounded-lg transition ${
                  showAddPanel
                    ? 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-300'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                {t('addMember') || 'Adicionar Membro'}
              </button>
            }
          />
        </div>
      </div>

      {/* Add Member Panel */}
      {showAddPanel && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border border-primary-200 dark:border-primary-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('addNewMember') || 'Adicionar Novo Membro'}
          </h3>

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* User Search */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('searchUser') || 'Buscar Usuário'}
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder={t('searchUserPlaceholder') || 'Nome, email ou username...'}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Role Selector */}
            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('role') || 'Função'}
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {String(t(`roles.${String(opt.value)}`) || opt.label || '')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Available Users List */}
          <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            {availableUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                {t('noAvailableUsers') || 'Nenhum usuário disponível'}
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {availableUsers.slice(0, 20).map((user: User) => (
                  <li
                    key={user.id}
                    className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-slate-600 rounded-full flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {getUserDisplayName(user)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddMember(user.id)}
                      disabled={addMemberMutation.isPending}
                      className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg disabled:opacity-50"
                    >
                      <PlusIcon className="w-5 h-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Search Current Members */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchMembers') || 'Buscar membros...'}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
        {loadingMembers ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {tCommon('loading') || 'Carregando...'}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {t('noMembers') || 'Nenhum membro encontrado'}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('memberName') || 'Membro'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('email') || 'Email'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('role') || 'Função'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('joinedAt') || 'Desde'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('actions') || 'Ações'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMembers.map((member: Member) => (
                <tr
                  key={member.id}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-slate-600 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {getUserDisplayName(member.user)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          @{member.user?.username || 'unknown'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {member.user?.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      className={`text-xs font-medium px-3 py-1 rounded-full border-0 ${getRoleBadgeColor(
                        member.role
                      )}`}
                    >
                      {roleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {String(t(`roles.${String(opt.value)}`) || opt.label || '')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {member.joined_at
                      ? new Date(member.joined_at).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removeMemberMutation.isPending}
                      className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
                      title={t('removeMember') || 'Remover membro'}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
          <span>
            {t('totalMembers') || 'Total de membros'}: <strong>{members.length}</strong>
          </span>
          <span>
            {t('coordinators') || 'Coordenadores'}:{' '}
            <strong>{members.filter((m: Member) => m.role === 'coordinator').length}</strong>
          </span>
          <span>
            {t('researchers') || 'Pesquisadores'}:{' '}
            <strong>{members.filter((m: Member) => m.role === 'researcher').length}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
