// ACL Management Page
// Admin interface for managing roles and permissions
// Implements RF-05 (resource-based ACL with granular permissions)
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
	PencilIcon,
	TrashIcon,
	PlusIcon,
	CheckIcon,
	ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';
import ACLRoleModal from '@/components/features/acl/components/ACLRoleModal';

interface Role {
	id: string;
	name: string;
	description: string;
	permissions: Record<string, string[]>;
	is_system: boolean;
	created_at: string;
	updated_at: string;
}

interface RolesResponse {
	roles: Role[];
	total: number;
	resources: string[];
	permissions: string[];
}

const PERMISSION_LABELS: Record<string, string> = {
	create: 'Create',
	read: 'Read',
	update: 'Update',
	delete: 'Delete',
	export: 'Export',
	approve: 'Approve',
	assign: 'Assign',
};

const RESOURCE_LABELS: Record<string, string> = {
	funding: 'Funding Sources',
	portfolio: 'Portfolio',
	crm: 'CRM',
	opportunities: 'Opportunities',
	proposals: 'Proposals',
	matching: 'Matching',
	reports: 'Reports',
	analytics: 'Analytics',
	settings: 'Settings',
	translations: 'Translations',
	acl: 'Access Control',
	users: 'Users',
};

export default function ACLPage() {
	const t = useTranslations('settings');
	const tCommon = useTranslations('common');
	const tNav = useTranslations('navigation');
  
	const [roles, setRoles] = useState<Role[]>([]);
	const [resources, setResources] = useState<string[]>([]);
	const [permissions, setPermissions] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
  
	// Modal state
	const [showModal, setShowModal] = useState(false);
	const [editingRole, setEditingRole] = useState<Role | null>(null);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);

	// Load roles
	const loadRoles = async () => {
		setLoading(true);
		setError(null);
    
		try {
			const response = await apiClient.get<RolesResponse>('/api/v1/acl/roles');
			setRoles(response.roles);
			setResources(response.resources);
			setPermissions(response.permissions);
		} catch (err: any) {
			setError(err.message || 'Failed to load roles');
			console.error('Failed to load roles:', err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadRoles();
	}, []);

	// Open modal for editing
	const openEditModal = (role: Role) => {
		setEditingRole(role);
		setShowModal(true);
	};

	// Open modal for creating
	const openCreateModal = () => {
		setEditingRole(null);
		setShowModal(true);
	};

	// Close modal
	const closeModal = () => {
		setShowModal(false);
		setEditingRole(null);
	};

	// Save role (create or update)
	const handleSave = async (data: { name: string; description: string; permissions: Record<string, string[]> }) => {
		setSaving(true);
		try {
			if (editingRole) {
				await apiClient.put(`/api/v1/acl/roles/${editingRole.id}`, {
					permissions: data.permissions
				});
			} else {
				await apiClient.post('/api/v1/acl/roles', data);
			}
			await loadRoles();
			closeModal();
		} catch (err: any) {
			setError(err.message || 'Failed to save role');
		} finally {
			setSaving(false);
		}
	};

	// Delete role
	const handleDelete = async (roleId: string) => {
		setDeleting(true);
		try {
			await apiClient.delete(`/api/v1/acl/roles/${roleId}`);
			await loadRoles();
			closeModal();
		} catch (err: any) {
			setError(err.message || 'Failed to delete role');
		} finally {
			setDeleting(false);
		}
	};

	// Permission matrix cell
	const PermissionCell = ({
		resource,
		permission,
		checked,
		disabled = true
	}: {
		resource: string;
		permission: string;
		checked: boolean;
		onChange?: () => void;
		disabled?: boolean;
	}) => (
		<td className="px-2 py-2 text-center">
			<div
				className={`w-6 h-6 rounded flex items-center justify-center ${
					checked
						? 'bg-primary-600 text-white'
						: 'bg-gray-200 dark:bg-gray-700 text-gray-400'
				} opacity-80`}
			>
				{checked && <CheckIcon className="w-4 h-4" />}
			</div>
		</td>
	);

	return (
		<div className="max-w-7xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						{t('acl.title') || 'Access Control'}
					</h1>
					<p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
						{t('acl.aclDesc') || 'Manage roles and permissions for system resources'}
					</p>
				</div>
        
				<button
					onClick={openCreateModal}
					title={t('acl.createRole') || 'New Role'}
					className="inline-flex items-center justify-center p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
				>
					<PlusIcon className="w-5 h-5" />
				</button>
			</div>

			{/* Error Alert */}
			{error && (
				<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
					<p className="text-red-700 dark:text-red-400">{error}</p>
					<button 
						onClick={() => setError(null)}
						className="mt-2 text-sm text-red-600 hover:text-red-800"
					>
						Dismiss
					</button>
				</div>
			)}

			{/* Roles List */}
			<div className="space-y-6">
				{loading ? (
					<div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-8 text-center text-gray-500 dark:text-gray-400">
						{t('acl.loading') || 'Loading roles...'}
					</div>
				) : roles.length === 0 ? (
					<div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-8 text-center text-gray-500 dark:text-gray-400">
						{t('acl.noRoles') || 'No roles found'}
					</div>
				) : (
					roles.map(role => (
						<div key={role.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden">
							{/* Role Header */}
							<div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
								<div className="flex items-center gap-3">
									<div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
										<ShieldCheckIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
									</div>
									<div>
										<h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
											{String(t(`users.roleTypes.${String(role.id)}`) || t(`acl.roleNames.${String(role.id)}`) || role.name || '')}
											{role.is_system && (
												<span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
													{t('acl.systemBadge') || 'System'}
												</span>
											)}
										</h3>
										<p className="text-sm text-gray-500 dark:text-gray-400">{String(t(`acl.roleDescriptions.${String(role.id)}`) || role.description || '')}</p>
									</div>
								</div>
                
								<div className="flex gap-2">
									<button
										onClick={() => openEditModal(role)}
										className="p-2 text-primary-600 hover:text-primary-800"
										title={tCommon('edit') || 'Edit'}
									>
										<PencilIcon className="w-5 h-5" />
									</button>
									{!role.is_system && (
										<button
											onClick={() => {
												setEditingRole(role);
												setShowModal(true);
											}}
											className="p-2 text-red-600 hover:text-red-800"
											title={tCommon('delete') || 'Delete'}
										>
											<TrashIcon className="w-5 h-5" />
										</button>
									)}
								</div>
							</div>
              
							{/* Permissions Matrix */}
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead className="bg-gray-50 dark:bg-slate-700">
										<tr>
											<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
												{t('acl.resource') || 'Resource'}
											</th>
											{permissions.map(perm => (
												<th key={perm} className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
													{String(t(`acl.permissions.${String(perm)}`) || PERMISSION_LABELS[perm] || perm || '')}
												</th>
											))}
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100 dark:divide-gray-700">
										{resources.map(resource => {
											const rolePerms = role.permissions[resource] || [];
                      
											return (
												<tr key={resource} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
													<td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
														{tNav(resource) || RESOURCE_LABELS[resource] || resource}
													</td>
													{permissions.map(perm => (
														<PermissionCell
															key={perm}
															resource={resource}
															permission={perm}
															checked={rolePerms.includes(perm)}
														/>
													))}
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					))
				)}
			</div>

			{/* ACL Role Modal */}
			<ACLRoleModal
				isOpen={showModal}
				onClose={closeModal}
				role={editingRole}
				resources={resources}
				permissions={permissions}
				onSave={handleSave}
				onDelete={handleDelete}
				saving={saving}
				deleting={deleting}
			/>
		</div>
	);
}
