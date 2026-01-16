// Admin Statistics Permissions Page
// Allows admins to configure which statistics are available for each user role
'use client';

import { useState, useMemo, Fragment } from 'react';
import { useTranslations } from 'next-intl';
import { Tab, Dialog, Transition, Switch } from '@headlessui/react';
import {
  ShieldCheckIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  FolderOpenIcon,
  UsersIcon,
  LightBulbIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  ShieldExclamationIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
  LockClosedIcon,
  LockOpenIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import * as Icons from '@heroicons/react/24/outline';
import {
  StatisticsModule,
  StatCategory,
  UserRole,
  ALL_MODULES,
  STAT_CATEGORIES,
  getModuleStatistics,
  StatisticDefinition,
  ProfileStatisticsPermissions,
} from '@/types/statistics';
import PageHeader from '@/components/ui/PageHeader';

// =============================================================================
// Types
// =============================================================================

interface RolePermissions {
  role: UserRole;
  name: string;
  description: string;
  modules: Record<StatisticsModule, {
    allowedStatIds: string[];
    requiredStatIds: string[];
  }>;
}

// =============================================================================
// Constants
// =============================================================================

const ROLES: { role: UserRole; labelKey: string; descriptionKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { role: 'admin', labelKey: 'roles.admin', descriptionKey: 'roles.adminDesc', icon: ShieldCheckIcon },
  { role: 'manager', labelKey: 'roles.manager', descriptionKey: 'roles.managerDesc', icon: UserGroupIcon },
  { role: 'analyst', labelKey: 'roles.analyst', descriptionKey: 'roles.analystDesc', icon: ChartBarIcon },
  { role: 'viewer', labelKey: 'roles.viewer', descriptionKey: 'roles.viewerDesc', icon: UsersIcon },
];

const MODULE_INFO: Record<StatisticsModule, { labelKey: string; icon: React.ComponentType<{ className?: string }> }> = {
  'funding': { labelKey: 'modules.funding', icon: CurrencyDollarIcon },
  'portfolio': { labelKey: 'modules.portfolio', icon: FolderOpenIcon },
  'crm': { labelKey: 'modules.crm', icon: UsersIcon },
  'opportunities': { labelKey: 'modules.opportunities', icon: LightBulbIcon },
  'proposals': { labelKey: 'modules.proposals', icon: DocumentTextIcon },
  'ingestion': { labelKey: 'modules.ingestion', icon: CloudArrowUpIcon },
  'pii-analysis': { labelKey: 'modules.piiAnalysis', icon: ShieldExclamationIcon },
  'translations': { labelKey: 'modules.translations', icon: DocumentTextIcon },
};

// =============================================================================
// Helpers
// =============================================================================

function getIcon(iconName: string): React.ComponentType<{ className?: string }> {
  return (Icons as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || Icons.QuestionMarkCircleIcon;
}

const STORAGE_KEY = 'prospecai_admin_stat_permissions';

function loadPermissions(): RolePermissions[] {
  if (typeof window === 'undefined') {
    return getDefaultPermissions();
  }
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return getDefaultPermissions();
    }
  }
  return getDefaultPermissions();
}

function savePermissions(permissions: RolePermissions[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(permissions));
}

function getDefaultPermissions(): RolePermissions[] {
  return ROLES.map(({ role }) => {
    const modules: RolePermissions['modules'] = {} as RolePermissions['modules'];
    
    ALL_MODULES.forEach(module => {
      const allStats = getModuleStatistics(module);
      
      // Admin sees all, others have restrictions
      if (role === 'admin') {
        modules[module] = {
          allowedStatIds: allStats.map(s => s.id),
          requiredStatIds: [],
        };
      } else if (role === 'manager') {
        // Managers see most, but not some AI metrics
        modules[module] = {
          allowedStatIds: allStats
            .filter(s => s.category !== 'ai' || s.defaultVisible)
            .map(s => s.id),
          requiredStatIds: allStats.filter(s => s.category === 'overview' && s.defaultVisible).map(s => s.id),
        };
      } else if (role === 'analyst') {
        // Analysts see overview, performance, and some financial
        modules[module] = {
          allowedStatIds: allStats
            .filter(s => ['overview', 'performance', 'timeline'].includes(s.category) || s.defaultVisible)
            .map(s => s.id),
          requiredStatIds: [],
        };
      } else {
        // Viewers see only defaults
        modules[module] = {
          allowedStatIds: allStats.filter(s => s.defaultVisible).map(s => s.id),
          requiredStatIds: allStats.filter(s => s.defaultVisible).map(s => s.id),
        };
      }
    });
    
    return {
      role,
      name: role.charAt(0).toUpperCase() + role.slice(1),
      description: `${role} role`,
      modules,
    };
  });
}

// =============================================================================
// Module Permission Editor
// =============================================================================

interface ModuleEditorProps {
  module: StatisticsModule;
  permissions: RolePermissions['modules'][StatisticsModule];
  onChange: (newPermissions: RolePermissions['modules'][StatisticsModule]) => void;
  isAdmin: boolean;
}

function ModulePermissionEditor({
  module,
  permissions,
  onChange,
  isAdmin,
}: ModuleEditorProps) {
  const t = useTranslations('common');
  const tStats = useTranslations('stats');
  const tSettings = useTranslations('settings');
  
  const definitions = useMemo(() => getModuleStatistics(module), [module]);
  
  const groupedStats = useMemo(() => {
    const groups: Record<StatCategory, StatisticDefinition[]> = {
      overview: [],
      financial: [],
      performance: [],
      timeline: [],
      distribution: [],
      risk: [],
      ai: [],
    };
    
    definitions.forEach(def => {
      groups[def.category].push(def);
    });
    
    return groups;
  }, [definitions]);
  
  const handleToggleAllowed = (statId: string) => {
    const newAllowed = permissions.allowedStatIds.includes(statId)
      ? permissions.allowedStatIds.filter(id => id !== statId)
      : [...permissions.allowedStatIds, statId];
    
    // If removed from allowed, also remove from required
    const newRequired = permissions.requiredStatIds.filter(id => newAllowed.includes(id));
    
    onChange({
      allowedStatIds: newAllowed,
      requiredStatIds: newRequired,
    });
  };
  
  const handleToggleRequired = (statId: string) => {
    if (!permissions.allowedStatIds.includes(statId)) return;
    
    const newRequired = permissions.requiredStatIds.includes(statId)
      ? permissions.requiredStatIds.filter(id => id !== statId)
      : [...permissions.requiredStatIds, statId];
    
    onChange({
      ...permissions,
      requiredStatIds: newRequired,
    });
  };
  
  const handleAllowAll = () => {
    onChange({
      ...permissions,
      allowedStatIds: definitions.map(d => d.id),
    });
  };
  
  const handleDenyAll = () => {
    onChange({
      allowedStatIds: [],
      requiredStatIds: [],
    });
  };
  
  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {permissions.allowedStatIds.length} {tSettings('statistics.allowed')}, {permissions.requiredStatIds.length} {tSettings('statistics.required')}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAllowAll}
            className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition"
          >
            <LockOpenIcon className="w-4 h-4 inline mr-1" />
            {tSettings('statistics.allowAll')}
          </button>
          <button
            onClick={handleDenyAll}
            disabled={isAdmin}
            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition disabled:opacity-50"
          >
            <LockClosedIcon className="w-4 h-4 inline mr-1" />
            {tSettings('statistics.denyAll')}
          </button>
        </div>
      </div>
      
      {/* Stats Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-gray-700">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Estatística
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-32">
                Permitida
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-32">
                Obrigatória
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {(Object.entries(STAT_CATEGORIES) as [StatCategory, typeof STAT_CATEGORIES[StatCategory]][]).map(
              ([category, info]) => {
                const stats = groupedStats[category];
                if (stats.length === 0) return null;
                
                const CategoryIcon = getIcon(info.icon);
                
                return (
                  <Fragment key={category}>
                    {/* Category Header */}
                    <tr className="bg-gray-50/50 dark:bg-slate-700/30">
                      <td colSpan={3} className="px-6 py-2">
                        <div className="flex items-center gap-2">
                          <CategoryIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {tStats(`categories.${category}`)}
                          </span>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Stats */}
                    {stats.map(stat => {
                      const StatIcon = getIcon(stat.icon);
                      const isAllowed = permissions.allowedStatIds.includes(stat.id);
                      const isRequired = permissions.requiredStatIds.includes(stat.id);
                      
                      return (
                        <tr key={stat.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <StatIcon className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {tStats(stat.labelKey.replace('stats.', ''))}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {stat.id}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <Switch
                              checked={isAllowed}
                              onChange={() => !isAdmin && handleToggleAllowed(stat.id)}
                              disabled={isAdmin}
                              className={`${
                                isAllowed
                                  ? 'bg-green-600'
                                  : 'bg-gray-200 dark:bg-gray-600'
                              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                isAdmin ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              <span
                                className={`${
                                  isAllowed ? 'translate-x-6' : 'translate-x-1'
                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                              />
                            </Switch>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <Switch
                              checked={isRequired}
                              onChange={() => handleToggleRequired(stat.id)}
                              disabled={!isAllowed}
                              className={`${
                                isRequired
                                  ? 'bg-primary-600'
                                  : 'bg-gray-200 dark:bg-gray-600'
                              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                !isAllowed ? 'opacity-30 cursor-not-allowed' : ''
                              }`}
                            >
                              <span
                                className={`${
                                  isRequired ? 'translate-x-6' : 'translate-x-1'
                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                              />
                            </Switch>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function AdminStatisticsPermissionsPage() {
  const t = useTranslations('common');
  const tStats = useTranslations('stats');
  const tSettings = useTranslations('settings');
  
  const [permissions, setPermissions] = useState<RolePermissions[]>(() => loadPermissions());
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const selectedRole = permissions[selectedRoleIndex];
  
  const handleModuleChange = (
    module: StatisticsModule, 
    newModulePermissions: RolePermissions['modules'][StatisticsModule]
  ) => {
    setPermissions(prev => {
      const updated = [...prev];
      updated[selectedRoleIndex] = {
        ...updated[selectedRoleIndex],
        modules: {
          ...updated[selectedRoleIndex].modules,
          [module]: newModulePermissions,
        },
      };
      return updated;
    });
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Save to API
      savePermissions(permissions);
      setSaveMessage({ type: 'success', text: 'Permissões salvas com sucesso!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Erro ao salvar permissões.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleReset = () => {
    const defaults = getDefaultPermissions();
    setPermissions(defaults);
    savePermissions(defaults);
    setSaveMessage({ type: 'success', text: 'Permissões restauradas para o padrão.' });
    setTimeout(() => setSaveMessage(null), 3000);
  };
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('statistics.title')}
        subtitle={t('statistics.subtitle')}
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
            >
              {t('statistics.reset')}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
            >
              {isSaving ? t('statistics.saving') : t('statistics.save')}
            </button>
          </div>
        }
      />
      
      {/* Save Message */}
      {saveMessage && (
        <div className={`border rounded-lg p-4 flex items-center gap-3 ${
          saveMessage.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          {saveMessage.type === 'success' ? (
            <CheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
          )}
          <p className={saveMessage.type === 'success' 
            ? 'text-green-700 dark:text-green-300'
            : 'text-red-700 dark:text-red-300'
          }>
            {saveMessage.text}
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-12 gap-6">
        {/* Role Selector */}
        <div className="col-span-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Perfis de Usuário
              </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {permissions.map((perm, index) => {
                const roleInfo = ROLES.find(r => r.role === perm.role);
                const RoleIcon = roleInfo?.icon || UsersIcon;
                const isSelected = index === selectedRoleIndex;
                
                return (
                  <button
                    key={perm.role}
                    onClick={() => setSelectedRoleIndex(index)}
                    className={`w-full px-4 py-3 flex items-center gap-3 text-left transition ${
                      isSelected
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-600'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <RoleIcon className={`w-5 h-5 ${
                      isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
                    }`} />
                    <div>
                      <p className={`font-medium ${
                        isSelected 
                          ? 'text-primary-700 dark:text-primary-300' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {t(roleInfo?.labelKey || perm.role)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t(roleInfo?.descriptionKey || '')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Warning for Admin */}
          {selectedRole?.role === 'admin' && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Perfil Administrador
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Administradores sempre têm acesso a todas as estatísticas. Esta configuração não pode ser alterada.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Module Permissions */}
        <div className="col-span-9">
          <Tab.Group>
            <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 dark:bg-slate-700/50 p-1 overflow-x-auto">
              {ALL_MODULES.map(module => {
                const info = MODULE_INFO[module];
                const ModuleIcon = info.icon;
                const modulePerms = selectedRole?.modules[module];
                const allowedCount = modulePerms?.allowedStatIds.length || 0;
                const totalCount = getModuleStatistics(module).length;
                
                return (
                  <Tab
                    key={module}
                    className={({ selected }) =>
                      `flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium leading-5 transition whitespace-nowrap ${
                        selected
                          ? 'bg-white dark:bg-slate-800 text-primary-700 dark:text-primary-400 shadow'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-slate-600/50 hover:text-gray-800 dark:hover:text-gray-200'
                      }`
                    }
                  >
                    <ModuleIcon className="w-4 h-4" />
                    {t(info.labelKey)}
                    <span className={`text-xs ${
                      allowedCount === totalCount 
                        ? 'text-green-600 dark:text-green-400'
                        : allowedCount === 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-400'
                    }`}>
                      {allowedCount}/{totalCount}
                    </span>
                  </Tab>
                );
              })}
            </Tab.List>
            
            <Tab.Panels className="mt-6">
              {ALL_MODULES.map(module => (
                <Tab.Panel key={module}>
                  {selectedRole && (
                    <ModulePermissionEditor
                      module={module}
                      permissions={selectedRole.modules[module]}
                      onChange={(newPerms) => handleModuleChange(module, newPerms)}
                      isAdmin={selectedRole.role === 'admin'}
                    />
                  )}
                </Tab.Panel>
              ))}
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>
    </div>
  );
}
