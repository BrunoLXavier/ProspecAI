// ACL Management Page
// Admin interface for managing roles and permissions
// Implements RF-05 (resource-based ACL with granular permissions)
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';

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
  
  // Edit state
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editPermissions, setEditPermissions] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  
  // New role modal
  const [showNewRoleModal, setShowNewRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState<Record<string, string[]>>({});

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

  // Start editing
  const startEditing = (role: Role) => {
    setEditingRole(role);
    setEditPermissions({ ...role.permissions });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingRole(null);
    setEditPermissions({});
  };

  // Toggle permission
  const togglePermission = (
    resource: string,
    permission: string,
    isNew: boolean = false
  ) => {
    const setter = isNew ? setNewRolePermissions : setEditPermissions;
    setter(prev => {
      const current = prev[resource] || [];
      if (current.includes(permission)) {
        return { ...prev, [resource]: current.filter(p => p !== permission) };
      } else {
        return { ...prev, [resource]: [...current, permission] };
      }
    });
  };

  // Save edits
  const saveEdits = async () => {
    if (!editingRole) return;
    
    setSaving(true);
    try {
      await apiClient.put(`/api/v1/acl/roles/${editingRole.id}`, {
        permissions: editPermissions
      });
      await loadRoles();
      cancelEditing();
    } catch (err: any) {
      setError(err.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  // Delete role
  const deleteRole = async (roleId: string) => {
    if (!confirm(t('acl.deleteConfirm'))) return;
    
    try {
      await apiClient.delete(`/api/v1/acl/roles/${roleId}`);
      await loadRoles();
    } catch (err: any) {
      setError(err.message || 'Failed to delete role');
    }
  };

  // Create new role
  const createRole = async () => {
    if (!newRoleName.trim()) return;
    
    setSaving(true);
    try {
      await apiClient.post('/api/v1/acl/roles', {
        name: newRoleName,
        description: newRoleDescription,
        permissions: newRolePermissions,
      });

      setShowNewRoleModal(false);
      setNewRoleName('');
      setNewRoleDescription('');
      setNewRolePermissions({});
      await loadRoles();
    } catch (err: any) {
      setError(err.message || 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  // Permission matrix cell
  const PermissionCell = ({
    resource,
    permission,
    checked,
    onChange,
    disabled = false
  }: {
    resource: string;
    permission: string;
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
  }) => (
    <td className="px-2 py-2 text-center">
      <button
        onClick={onChange}
        disabled={disabled}
        className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
          checked
            ? 'bg-primary-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
      >
        {checked && <CheckIcon className="w-4 h-4" />}
      </button>
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
          onClick={() => setShowNewRoleModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          {t('acl.createRole') || 'New Role'}
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
                      {t(`users.roleTypes.${role.id}`) || t(`acl.roleNames.${role.id}`) || role.name}
                      {role.is_system && (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          {t('acl.systemBadge') || 'System'}
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t(`acl.roleDescriptions.${role.id}`) || role.description}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {editingRole?.id === role.id ? (
                    <>
                        <button
                          onClick={saveEdits}
                          disabled={saving}
                          className="p-2 text-green-600 hover:text-green-800 disabled:opacity-50"
                          title={tCommon('save') || 'Save'}
                        >
                          <CheckIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-2 text-gray-600 hover:text-gray-800"
                          title={tCommon('cancel') || 'Cancel'}
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditing(role)}
                        className="p-2 text-primary-600 hover:text-primary-800"
                        title={tCommon('edit') || 'Edit'}
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      {!role.is_system && (
                        <button
                          onClick={() => deleteRole(role.id)}
                          className="p-2 text-red-600 hover:text-red-800"
                          title={tCommon('delete') || 'Delete'}
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      )}
                    </>
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
                          {t(`acl.permissions.${perm}`) || PERMISSION_LABELS[perm] || perm}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {resources.map(resource => {
                      const rolePerms = editingRole?.id === role.id
                        ? editPermissions[resource] || []
                        : role.permissions[resource] || [];
                      
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
                              onChange={() => togglePermission(resource, perm)}
                              disabled={editingRole?.id !== role.id}
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

      {/* New Role Modal */}
      {showNewRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-4xl p-6 m-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('acl.createRoleModalTitle') || t('acl.createRole') || 'Create New Role'}
            </h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('acl.roleName') || 'Role Name'}
                </label>
                <input
                  type="text"
                  placeholder={t('acl.exampleRoleName') || 'e.g., Content Manager'}
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('acl.roleDescriptionLabel') || 'Description'}
                </label>
                <input
                  type="text"
                  placeholder="Describe the role's purpose"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            {/* Permissions Matrix for New Role */}
            <div className="overflow-x-auto mb-6 border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Resource
                    </th>
                    {permissions.map(perm => (
                      <th key={perm} className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {t(`acl.permissions.${perm}`) || PERMISSION_LABELS[perm] || perm}
                        </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {resources.map(resource => (
                    <tr key={resource} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                        {RESOURCE_LABELS[resource] || resource}
                      </td>
                      {permissions.map(perm => (
                        <PermissionCell
                          key={perm}
                          resource={resource}
                          permission={perm}
                          checked={(newRolePermissions[resource] || []).includes(perm)}
                          onChange={() => togglePermission(resource, perm, true)}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewRoleModal(false);
                  setNewRoleName('');
                  setNewRoleDescription('');
                  setNewRolePermissions({});
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={createRole}
                disabled={saving || !newRoleName.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {saving ? `${t('settings.saving')}...` : t('acl.createRole')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
