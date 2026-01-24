// User Management Page
// Admin interface for managing users
// Implements RF-09: Admin User Management
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
	ClockIcon,
	UserPlusIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';
import UserModal from '@/components/users/UserModal';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import PageHeader from '@/components/ui/PageHeader';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';
import { ViewMode } from '@/components/ui/ViewToggle';
import TableView, { TableColumn } from '@/components/ui/TableView';
import TimelineView, { TimelineItem } from '@/components/ui/TimelineView';

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
	const searchParams = useSearchParams();
	const router = useRouter();
  
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedRole, setSelectedRole] = useState<string>('');
	const [showModal, setShowModal] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>('list');
	const [highlightProcessed, setHighlightProcessed] = useState(false);

	// Pagination state
	const { initialPage, initialPageSize } = usePagination(20, true);
	const [currentPage, setCurrentPage] = useState(initialPage);
	const [pageSize, setPageSize] = useState(initialPageSize);

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

	// Handle highlight param to auto-open user modal
	useEffect(() => {
		const highlightId = searchParams.get('highlight');
		if (highlightId && users.length > 0 && !highlightProcessed) {
			const userToHighlight = users.find(u => u.id === highlightId);
			if (userToHighlight) {
				setEditingUser(userToHighlight);
				setShowModal(true);
				setHighlightProcessed(true);
				// Clear the highlight param from URL
				router.replace('/users', { scroll: false });
			}
		}
	}, [searchParams, users, highlightProcessed, router]);

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

	// Paginate users for table
	const paginatedUsers = useMemo(() => {
		const start = (currentPage - 1) * pageSize;
		return filteredUsers.slice(start, start + pageSize);
	}, [filteredUsers, currentPage, pageSize]);

	// Reset to first page when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, selectedRole]);

	return (
		<div className="max-w-6xl mx-auto space-y-6">
			{/* Header */}
			<PageHeader
				title={t('users.title') || 'User Management'}
				subtitle={t('users.subtitle') || 'Manage system users and their permissions'}
				viewToggle={true}
				viewMode={viewMode}
				onViewChange={(m) => setViewMode(m)}
				action={(
					<button
						onClick={openCreateModal}
						className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
					>
						<PlusIcon className="w-5 h-5" />
						{t('users.newUser') || 'New User'}
					</button>
				)}
			/>
			
			{/* Statistics Bar */}
			<ConfigurableStatisticsBar module="users" data={users} />

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
							<option key={role.value} value={role.value}>{String(t(`users.roleTypes.${String(role.value)}`) || role.value || '')}</option>
						))}
					</select>
				</div>
			</div>

			{/* Users View */}
			{viewMode === 'board' && (
				/* Board View - Grouped by Role */
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					{ROLES.map(roleConfig => {
						const roleUsers = filteredUsers.filter(u => u.role === roleConfig.value);
						return (
							<div key={roleConfig.value} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
								<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-between">
									<span className={`px-2 py-1 text-xs font-medium rounded-full ${roleConfig.color}`}>
										{String(t(`users.roleTypes.${String(roleConfig.value)}`) || roleConfig.value || '')}
									</span>
									<span className="text-xs text-gray-500 dark:text-gray-400">{roleUsers.length}</span>
								</h3>
								<div className="space-y-3">
									{roleUsers.map(user => (
										<div 
											key={user.id} 
											onClick={() => openEditModal(user)}
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

			{viewMode === 'list' && (
				/* List View - Card-based layout */
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
						<ul className="divide-y divide-gray-200 dark:divide-gray-700">
							{paginatedUsers.map((user) => {
								const roleConfig = getRoleConfig(user.role);
								return (
									<li
										key={user.id}
										onClick={() => openEditModal(user)}
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
													{String(t(`users.roleTypes.${String(roleConfig.value)}`) || roleConfig.value || '')}
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
														onClick={(e) => { e.stopPropagation(); openEditModal(user); }}
														className="p-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
														title={tCommon('edit') || 'Edit'}
													>
														<PencilIcon className="w-5 h-5" />
													</button>
													<button
														onClick={(e) => { e.stopPropagation(); openEditModal(user); }}
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
					{/* Summary */}
					<div className="px-6 py-3 bg-gray-50 dark:bg-slate-700 border-t border-gray-200 dark:border-gray-600">
						<p className="text-sm text-gray-600 dark:text-gray-400">
							{t('users.showing') || 'Showing'} {filteredUsers.length} {t('users.of') || 'of'} {users.length} {t('users.users') || 'users'}
						</p>
					</div>
				</div>
			)}

			{viewMode === 'table' && (
				/* Table View - Using TableView component */
				<TableView<User>
					data={paginatedUsers}
					columns={[
						{
							key: 'name',
							header: t('users.user') || 'User',
							accessor: 'name',
							sortable: true,
							render: (_value, user) => (
								<div className="flex items-center">
									<div className="flex-shrink-0 h-10 w-10">
										<div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
											<UserCircleIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
										</div>
									</div>
									<div className="ml-4">
										<div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
										<div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
									</div>
								</div>
							),
						},
						{
							key: 'email',
							header: t('users.email') || 'Email',
							accessor: 'email',
							sortable: true,
							hiddenOnMobile: true,
						},
						{
							key: 'role',
							header: t('users.role') || 'Role',
							accessor: 'role',
							sortable: true,
							render: (_value, user) => {
								const roleConfig = getRoleConfig(user.role);
								return (
									<span className={`px-2 py-1 text-xs font-medium rounded-full ${roleConfig.color}`}>
										{String(t(`users.roleTypes.${String(roleConfig.value)}`) || roleConfig.value || '')}
									</span>
								);
							},
						},
						{
							key: 'status',
							header: t('users.status') || 'Status',
							accessor: 'is_active',
							render: (_value, user) => (
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
							key: 'last_login',
							header: t('users.lastLogin') || 'Last Login',
							accessor: 'last_login',
							sortable: true,
							render: (_value, user) => (
								<span className="text-sm text-gray-500 dark:text-gray-400">
									{user.last_login 
										? new Date(user.last_login).toLocaleString('pt-BR')
										: t('users.never') || 'Never'}
								</span>
							),
						},
						{
							key: 'actions',
							header: t('users.actions') || 'Actions',
							accessor: 'id',
							align: 'right',
							render: (_value, user) => (
								<div className="flex justify-end gap-2">
									<button
										onClick={(e) => { e.stopPropagation(); openEditModal(user); }}
										className="p-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
										title={tCommon('edit') || 'Edit'}
									>
										<PencilIcon className="w-5 h-5" />
									</button>
									<button
										onClick={(e) => { e.stopPropagation(); openEditModal(user); }}
										className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
										title={tCommon('delete') || 'Delete'}
									>
										<TrashIcon className="w-5 h-5" />
									</button>
								</div>
							),
						},
					] as TableColumn<User>[]}
					getRowKey={(user) => user.id}
					onRowClick={openEditModal}
					loading={isLoading}
					emptyMessage={t('users.noUsers') || 'No users found'}
					hoverable
					striped
				/>
			)}

			{viewMode === 'timeline' && (
				/* Timeline View - User activity/creation dates */
				<div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6">
					{isLoading ? (
						<div className="p-8 text-center text-gray-500 dark:text-gray-400">
							{tCommon('loading') || 'Loading...'}
						</div>
					) : filteredUsers.length === 0 ? (
						<div className="p-8 text-center text-gray-500 dark:text-gray-400">
							{t('users.noUsers') || 'No users found'}
						</div>
					) : (
						<TimelineView
							items={paginatedUsers
								.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
								.map((user): TimelineItem => {
									const roleConfig = getRoleConfig(user.role);
									return {
										id: user.id,
										title: user.name,
										description: (
											<div className="space-y-1">
												<p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
												<div className="flex items-center gap-2">
													<span className={`px-2 py-0.5 text-xs font-medium rounded-full ${roleConfig.color}`}>
														{String(t(`users.roleTypes.${String(roleConfig.value)}`) || roleConfig.value || '')}
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
										onClick: () => openEditModal(user),
									};
								})}
							size="md"
							showConnectors
							animated
							emptyMessage={t('users.noUsers') || 'No users found'}
						/>
					)}
				</div>
			)}

			{/* Pagination */}
			{filteredUsers.length > 0 && (
				<Pagination
					currentPage={currentPage}
					totalItems={filteredUsers.length}
					pageSize={pageSize}
					onPageChange={setCurrentPage}
					onPageSizeChange={(size) => {
						setPageSize(size);
						setCurrentPage(1);
					}}
					persistInUrl={true}
					showTotal={true}
					showPageSizeSelector={true}
				/>
			)}

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
