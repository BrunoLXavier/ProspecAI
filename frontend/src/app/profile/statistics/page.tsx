// User Statistics Preferences Page
// Allows users to configure which statistics are visible in each module
'use client';

import { useState, useMemo, Fragment } from 'react';
import { useTranslations } from 'next-intl';
import { Tab } from '@headlessui/react';
import {
  Cog6ToothIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  FolderOpenIcon,
  UsersIcon,
  LightBulbIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  ShieldExclamationIcon,
  BuildingOffice2Icon,
  BuildingLibraryIcon,
  InboxIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import * as Icons from '@heroicons/react/24/outline';
import {
  StatisticsModule,
  StatCategory,
  ALL_MODULES,
  STAT_CATEGORIES,
  getModuleStatistics,
  StatisticDefinition,
} from '@/types/statistics';
import PageHeader from '@/components/ui/PageHeader';

// =============================================================================
// Module Info
// =============================================================================

const MODULE_INFO: Record<StatisticsModule, { labelKey: string; icon: React.ComponentType<{ className?: string }> }> = {
  'funding': { labelKey: 'modules.funding', icon: CurrencyDollarIcon },
  'portfolio': { labelKey: 'modules.portfolio', icon: FolderOpenIcon },
  'crm': { labelKey: 'modules.crm', icon: UsersIcon },
  'opportunities': { labelKey: 'modules.opportunities', icon: LightBulbIcon },
  'proposals': { labelKey: 'modules.proposals', icon: DocumentTextIcon },
  'ingestion': { labelKey: 'modules.ingestion', icon: CloudArrowUpIcon },
  'pii-analysis': { labelKey: 'modules.piiAnalysis', icon: ShieldExclamationIcon },
  'reports': { labelKey: 'modules.reports', icon: ChartBarIcon },
  'translations': { labelKey: 'modules.translations', icon: DocumentTextIcon },
  'institutes': { labelKey: 'modules.institutes', icon: BuildingOffice2Icon as any },
  'teams': { labelKey: 'modules.teams', icon: UsersIcon },
  'infrastructure': { labelKey: 'modules.infrastructure', icon: BuildingLibraryIcon as any },
  'communications': { labelKey: 'modules.communications', icon: InboxIcon as any },
};

// =============================================================================
// Helpers
// =============================================================================

function getIcon(iconName: string): React.ComponentType<{ className?: string }> {
  return (Icons as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || Icons.QuestionMarkCircleIcon;
}

const STORAGE_KEY_PREFIX = 'prospecai_stat_prefs_';

function loadAllPreferences(userId: string): Record<StatisticsModule, string[]> {
  const result: Partial<Record<StatisticsModule, string[]>> = {};
  
  if (typeof window === 'undefined') {
    ALL_MODULES.forEach(module => {
      result[module] = getModuleStatistics(module)
        .filter(d => d.defaultVisible)
        .map(d => d.id);
    });
    return result as Record<StatisticsModule, string[]>;
  }
  
  ALL_MODULES.forEach(module => {
    const key = `${STORAGE_KEY_PREFIX}${userId}_${module}`;
    const stored = localStorage.getItem(key);
    
    if (stored) {
      try {
        const prefs = JSON.parse(stored);
        result[module] = prefs.visibleStatIds || [];
      } catch {
        result[module] = getModuleStatistics(module)
          .filter(d => d.defaultVisible)
          .map(d => d.id);
      }
    } else {
      result[module] = getModuleStatistics(module)
        .filter(d => d.defaultVisible)
        .map(d => d.id);
    }
  });
  
  return result as Record<StatisticsModule, string[]>;
}

function saveModulePreferences(userId: string, module: StatisticsModule, visibleIds: string[]): void {
  if (typeof window === 'undefined') return;
  
  const key = `${STORAGE_KEY_PREFIX}${userId}_${module}`;
  localStorage.setItem(key, JSON.stringify({
    userId,
    module,
    visibleStatIds: visibleIds,
    updatedAt: new Date().toISOString(),
  }));
}

// =============================================================================
// Statistics List Component
// =============================================================================

interface StatisticsListProps {
  module: StatisticsModule;
  visibleIds: string[];
  onToggle: (statId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onResetDefaults: () => void;
}

function StatisticsList({
  module,
  visibleIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onResetDefaults,
}: StatisticsListProps) {
  const t = useTranslations('common');
  const tStats = useTranslations('stats');
  
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
  
  const visibleCount = visibleIds.length;
  const totalCount = definitions.length;
  
  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {visibleCount} de {totalCount} estatísticas visíveis
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSelectAll}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <EyeIcon className="w-4 h-4 inline mr-1" />
            Mostrar Todas
          </button>
          <button
            onClick={onDeselectAll}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <EyeSlashIcon className="w-4 h-4 inline mr-1" />
            Ocultar Todas
          </button>
          <button
            onClick={onResetDefaults}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <ArrowPathIcon className="w-4 h-4 inline mr-1" />
            Restaurar Padrões
          </button>
        </div>
      </div>
      
      {/* Categories */}
      <div className="space-y-4">
        {(Object.entries(STAT_CATEGORIES) as [StatCategory, typeof STAT_CATEGORIES[StatCategory]][]).map(
          ([category, info]) => {
            const stats = groupedStats[category];
            if (stats.length === 0) return null;
            
            const CategoryIcon = getIcon(info.icon);
            const categoryVisibleCount = stats.filter(s => visibleIds.includes(s.id)).length;
            
            return (
              <div
                key={category}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden"
              >
                <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <CategoryIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {tStats(`categories.${category}`)}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({categoryVisibleCount}/{stats.length})
                    </span>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {stats.map(stat => {
                    const StatIcon = getIcon(stat.icon);
                    const isVisible = visibleIds.includes(stat.id);
                    
                    return (
                      <div
                        key={stat.id}
                        className={`px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/30 transition cursor-pointer ${
                          isVisible ? '' : 'opacity-50'
                        }`}
                        onClick={() => onToggle(stat.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700`}>
                            <StatIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {tStats(stat.labelKey.replace('stats.', ''))}
                            </p>
                            {stat.descriptionKey && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {tStats(stat.descriptionKey.replace('stats.', ''))}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                stat.valueType === 'currency'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : stat.valueType === 'percentage'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {stat.valueType}
                              </span>
                              {stat.defaultVisible && (
                                <span className="text-xs text-gray-400">
                                  (padrão)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          isVisible
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-600'
                        }`}>
                          {isVisible && <CheckIcon className="w-4 h-4" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function StatisticsPreferencesPage() {
  const t = useTranslations('common');
  const tStats = useTranslations('stats');
  
  // Mock user ID (replace with actual auth)
  const userId = 'current-user';
  
  const [preferences, setPreferences] = useState<Record<StatisticsModule, string[]>>(() => 
    loadAllPreferences(userId)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  
  const handleToggle = (module: StatisticsModule, statId: string) => {
    setPreferences(prev => {
      const current = new Set(prev[module]);
      if (current.has(statId)) {
        current.delete(statId);
      } else {
        current.add(statId);
      }
      const newIds = Array.from(current);
      
      // Auto-save
      saveModulePreferences(userId, module, newIds);
      
      return {
        ...prev,
        [module]: newIds,
      };
    });
  };
  
  const handleSelectAll = (module: StatisticsModule) => {
    const allIds = getModuleStatistics(module).map(d => d.id);
    setPreferences(prev => {
      saveModulePreferences(userId, module, allIds);
      return { ...prev, [module]: allIds };
    });
  };
  
  const handleDeselectAll = (module: StatisticsModule) => {
    setPreferences(prev => {
      saveModulePreferences(userId, module, []);
      return { ...prev, [module]: [] };
    });
  };
  
  const handleResetDefaults = (module: StatisticsModule) => {
    const defaultIds = getModuleStatistics(module)
      .filter(d => d.defaultVisible)
      .map(d => d.id);
    setPreferences(prev => {
      saveModulePreferences(userId, module, defaultIds);
      return { ...prev, [module]: defaultIds };
    });
  };
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Preferências de Estatísticas"
        subtitle="Configure quais estatísticas são exibidas em cada módulo do sistema"
      />
      
      {/* Save Message */}
      {saveMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
          <CheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          <p className="text-green-700 dark:text-green-300">{saveMessage}</p>
        </div>
      )}
      
      {/* Module Tabs */}
      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 dark:bg-slate-700/50 p-1 overflow-x-auto">
          {ALL_MODULES.map(module => {
            const info = MODULE_INFO[module];
            const ModuleIcon = info.icon;
            const visibleCount = preferences[module]?.length || 0;
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
                <span className="text-xs text-gray-400">
                  {visibleCount}/{totalCount}
                </span>
              </Tab>
            );
          })}
        </Tab.List>
        
        <Tab.Panels className="mt-6">
          {ALL_MODULES.map(module => (
            <Tab.Panel key={module}>
              <StatisticsList
                module={module}
                visibleIds={preferences[module] || []}
                onToggle={(statId) => handleToggle(module, statId)}
                onSelectAll={() => handleSelectAll(module)}
                onDeselectAll={() => handleDeselectAll(module)}
                onResetDefaults={() => handleResetDefaults(module)}
              />
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
