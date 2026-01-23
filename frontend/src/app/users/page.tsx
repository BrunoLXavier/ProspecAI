// User Management Page
// Admin interface for managing users
// Implements RF-09: Admin User Management
'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	PlusIcon,
	PencilIcon,
	TrashIcon,
	MagnifyingGlassIcon,
	UserCircleIcon,
	CheckIcon,
	XMarkIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';
import UserModal from '@/components/users/UserModal';

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
				// Backend returns { items, total, skip, limit }
				return response.items || response.users || response || [];
			} catch (error) {
				console.error('Failed to fetch users:', error);
				return [];
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
			closeModal();
		},
		onError: (error: any) => {
			setFormError(error.response?.data?.detail || 'Failed to delete user');
		},
	});

	const openCreateModal = () => {
		setEditingUser(null);
		setFormError(null);
		setShowModal(true);
	};

	const openEditModal = (user: User) => {
		setEditingUser(user);
		setFormError(null);
		setShowModal(true);
	};

	const closeModal = () => {
		setShowModal(false);
		setEditingUser(null);
		setFormError(null);
	};

	const handleSave = async (data: UserFormData, isEdit: boolean, userId?: string) => {
		setFormError(null);
		if (isEdit && userId) {
			const updates: Partial<UserFormData> = {
				email: data.email,
				name: data.name,
				role: data.role,
				is_active: data.is_active,
			};
			if (data.password) {
				updates.password = data.password;
			}
			await updateMutation.mutateAsync({ id: userId, updates });
		} else {
			await createMutation.mutateAsync(data);
		}
	};

	const handleDelete = async (id: string) => {
		await deleteMutation.mutateAsync(id);
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
														onClick={() => openEditModal(user)}
														className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
														title={tCommon('delete') || 'Delete'}
													>
														<TrashIcon className="w-5 h-5" />
													</button>
												</div>
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

			{/* User Modal */}
			<UserModal
				isOpen={showModal}
				onClose={closeModal}
				user={editingUser}
				onSave={handleSave}
				onDelete={handleDelete}
				saving={createMutation.isPending || updateMutation.isPending}
				deleting={deleteMutation.isPending}
				error={formError}
			/>
		</div>
	);
}
