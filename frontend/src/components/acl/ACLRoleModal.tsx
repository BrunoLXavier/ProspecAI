/**
 * ACLRoleModal Component
 * Standardized Create/Edit modal for ACL roles
 * Implements RF-05: Resource-based ACL with granular permissions
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { ShieldCheckIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

import { BaseModal, DeleteConfirmation, type TabItem } from '@/components/ui';
import { FormInput, FormTextarea } from '@/components/forms';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Record<string, string[]>;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

interface ACLRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role?: Role | null;
  resources: string[];
  permissions: string[];
  onSave: (data: { name: string; description: string; permissions: Record<string, string[]> }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  saving?: boolean;
  deleting?: boolean;
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

export default function ACLRoleModal({
  isOpen,
  onClose,
  role,
  resources,
  permissions,
  onSave,
  onDelete,
  saving = false,
  deleting = false,
}: ACLRoleModalProps) {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('navigation');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});

  const isEditMode = !!role?.id;
  const isSystemRole = role?.is_system ?? false;

  // Reset form when role changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (role) {
        setName(role.name || '');
        setDescription(role.description || '');
        setRolePermissions({ ...role.permissions });
      } else {
        setName('');
        setDescription('');
        setRolePermissions({});
      }
      setShowDeleteConfirm(false);
    }
  }, [isOpen, role]);

  const togglePermission = (resource: string, permission: string) => {
    setRolePermissions(prev => {
      const current = prev[resource] || [];
      if (current.includes(permission)) {
        return { ...prev, [resource]: current.filter(p => p !== permission) };
      } else {
        return { ...prev, [resource]: [...current, permission] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onSave({
      name,
      description,
      permissions: rolePermissions,
    });
  };

  const handleDelete = async () => {
    if (role?.id && onDelete) {
      await onDelete(role.id);
    }
  };

  // Permission matrix cell component
  const PermissionCell = ({
    resource,
    permission,
    checked,
    disabled = false,
  }: {
    resource: string;
    permission: string;
    checked: boolean;
    disabled?: boolean;
  }) => (
    <td className="px-2 py-2 text-center">
      <button
        type="button"
        onClick={() => togglePermission(resource, permission)}
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

  // Footer content
  const footerContent = (
    <div className="flex items-center justify-between">
      <div>
        {isEditMode && !isSystemRole && onDelete && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
          >
            {tCommon('delete')}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600"
        >
          {tCommon('cancel')}
        </button>
        <button
          type="submit"
          form="acl-role-form"
          disabled={saving || !name.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {saving
            ? tCommon('saving')
            : isEditMode
            ? tCommon('save')
            : t('acl.createRole') || 'Create Role'}
        </button>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? (t('acl.editRole') || 'Edit Role') : (t('acl.createRole') || 'New Role')}
      icon={<ShieldCheckIcon className="w-6 h-6" />}
      size="2xl"
      footer={footerContent}
    >
      <form id="acl-role-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Delete Confirmation */}
        <DeleteConfirmation
          isVisible={showDeleteConfirm && isEditMode && !isSystemRole}
          message={t('acl.deleteConfirm') || 'Are you sure you want to delete this role?'}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          isDeleting={deleting}
        />

        {/* Basic Info Section */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-5 bg-primary-500 rounded-full" />
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {t('acl.basicInfo') || 'Informações Básicas'}
            </h3>
          </div>
          
          <FormInput
            label={t('acl.roleName') || 'Role Name'}
            placeholder={t('acl.exampleRoleName') || 'e.g., Content Manager'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isSystemRole}
          />

          <FormTextarea
            label={t('acl.roleDescriptionLabel') || 'Description'}
            placeholder={t('acl.descriptionPlaceholder') || "Describe the role's purpose"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            disabled={isSystemRole}
          />
        </div>

        {/* Permissions Matrix Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-slate-700 dark:to-slate-600 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {t('acl.permissionsMatrix') || 'Permissions Matrix'}
              </h3>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-100 dark:bg-slate-600 min-w-[140px]">
                    {t('acl.resource') || 'Resource'}
                  </th>
                  {permissions.map(perm => (
                    <th key={perm} className="px-3 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider min-w-[80px]">
                      {t(`acl.permissions.${perm}`) || PERMISSION_LABELS[perm] || perm}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-slate-800">
                {resources.map((resource, idx) => {
                  const resourcePerms = rolePermissions[resource] || [];
                  return (
                    <tr key={resource} className={`hover:bg-primary-50 dark:hover:bg-slate-700/50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50 dark:bg-slate-750'}`}>
                      <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-300 sticky left-0 bg-inherit">
                        <span className="flex items-center gap-2">
                          {tNav(resource) || RESOURCE_LABELS[resource] || resource}
                        </span>
                      </td>
                      {permissions.map(perm => (
                        <PermissionCell
                          key={perm}
                          resource={resource}
                          permission={perm}
                          checked={resourcePerms.includes(perm)}
                          disabled={isSystemRole}
                        />
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Role Warning */}
        {isSystemRole && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {t('acl.systemRoleWarning') || 'System roles cannot be modified or deleted.'}
            </p>
          </div>
        )}
      </form>
    </BaseModal>
  );
}
