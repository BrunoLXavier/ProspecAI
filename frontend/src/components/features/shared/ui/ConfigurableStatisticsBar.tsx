// Configurable Statistics Bar Component
// Renders statistics based on user preferences with configuration modal
'use client';

import { useState, useMemo, Fragment, useEffect } from 'react';
import { Dialog, Transition, Switch } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import {
  Cog6ToothIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Bars3Icon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import * as Icons from '@heroicons/react/24/outline';
import {
  StatisticsModule,
  StatisticItem,
  StatCategory,
  STAT_CATEGORIES,
} from '@/components/features/shared/analytics/statistics-types';
import { useStatistics, INSTITUTES_CALCULATORS, TEAMS_CALCULATORS, INFRASTRUCTURE_CALCULATORS, COMMUNICATIONS_CALCULATORS } from '@/hooks/use-statistics';

// =============================================================================
// Icon Resolver
// =============================================================================

function getIcon(iconName: string): React.ComponentType<{ className?: string }> {
  const IconComponent = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
  return IconComponent || Icons.QuestionMarkCircleIcon;
}

// =============================================================================
// Props
// =============================================================================

interface ConfigurableStatisticsBarProps {
  module: StatisticsModule;
  data: Record<string, any>[] | null;
  customCalculators?: Record<string, (data: Record<string, any>[]) => number | string>;
  className?: string;
  showConfigButton?: boolean;
}

// =============================================================================
// Statistics Configuration Modal
// =============================================================================

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  module: StatisticsModule;
  statisticsByCategory: Record<StatCategory, StatisticItem[]>;
  preferences: { visibleStatIds: string[] } | null;
  toggleStatistic: (id: string) => void;
  requiredStatIds?: string[];
}

function StatisticsConfigModal({
  isOpen,
  onClose,
  module,
  statisticsByCategory,
  preferences,
  toggleStatistic,
  requiredStatIds = [],
}: ConfigModalProps) {
  const t = useTranslations('common');
  const tStats = useTranslations('stats');
  const [expandedCategories, setExpandedCategories] = useState<Set<StatCategory>>(
    new Set(['overview', 'financial'])
  );

  const toggleCategory = (category: StatCategory) => {
    const next = new Set(expandedCategories);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    setExpandedCategories(next);
  };

  const categories = Object.entries(STAT_CATEGORIES) as [StatCategory, typeof STAT_CATEGORIES[StatCategory]][];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 dark:bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('configureStatistics')}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {t('configureStatisticsDescription')}
                </p>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {categories.map(([category, info]) => {
                    const stats = statisticsByCategory[category];
                    if (stats.length === 0) return null;

                    const isExpanded = expandedCategories.has(category);
                    const CategoryIcon = getIcon(info.icon);
                    const visibleCount = stats.filter(s => 
                      preferences?.visibleStatIds?.includes(s.definition.id)
                    ).length;

                    return (
                      <div
                        key={category}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                        >
                          <div className="flex items-center gap-3">
                            <CategoryIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {tStats(`categories.${category}`)}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              ({visibleCount}/{stats.length})
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="p-4 space-y-3">
                            {stats.map(stat => {
                              const StatIcon = getIcon(stat.definition.icon);
                              const isVisible = preferences?.visibleStatIds?.includes(stat.definition.id);
                              const isRequired = requiredStatIds.includes(stat.definition.id);

                              return (
                                <div
                                  key={stat.definition.id}
                                  className="flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-3">
                                    <StatIcon className="w-4 h-4 text-gray-400" />
                                    <div>
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {tStats(stat.definition.labelKey.replace('stats.', ''))}
                                      </p>
                                      {stat.definition.descriptionKey && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {tStats(stat.definition.descriptionKey.replace('stats.', ''))}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <Switch
                                    checked={isVisible ?? false}
                                    onChange={() => !isRequired && toggleStatistic(stat.definition.id)}
                                    disabled={isRequired}
                                    className={`${
                                      isVisible
                                        ? 'bg-primary-600'
                                        : 'bg-gray-200 dark:bg-gray-600'
                                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                      isRequired ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                  >
                                    <span
                                      className={`${
                                        isVisible ? 'translate-x-6' : 'translate-x-1'
                                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                    />
                                  </Switch>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                  >
                    {t('done')}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// =============================================================================
// Color Utilities
// =============================================================================

const colorClasses: Record<string, string> = {
  default: 'text-gray-600 dark:text-gray-300',
  primary: 'text-primary-600 dark:text-primary-400',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  danger: 'text-red-600 dark:text-red-400',
  info: 'text-blue-600 dark:text-blue-400',
};

const bgColorClasses: Record<string, string> = {
  default: 'bg-gray-100 dark:bg-gray-700',
  primary: 'bg-primary-50 dark:bg-primary-900/30',
  success: 'bg-green-50 dark:bg-green-900/30',
  warning: 'bg-yellow-50 dark:bg-yellow-900/30',
  danger: 'bg-red-50 dark:bg-red-900/30',
  info: 'bg-blue-50 dark:bg-blue-900/30',
};

// =============================================================================
// Main Component
// =============================================================================

export default function ConfigurableStatisticsBar({
  module,
  data,
  customCalculators,
  className = '',
  showConfigButton = true,
}: ConfigurableStatisticsBarProps) {
  const t = useTranslations('common');
  const tStats = useTranslations('stats');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [reorderEnabled, setReorderEnabledLocal] = useState(false);

  // Ensure we always pass an array to the statistics hook to avoid runtime
  // errors when the calling code accidentally provides an object.
  const safeData = Array.isArray(data) ? data : (data ? [] : []);

  // Provide module-specific custom calculators for nested fields like metadata/capacity
  const moduleCustomCalculators = (() => {
    switch (module) {
      case 'institutes': return INSTITUTES_CALCULATORS;
      case 'teams': return TEAMS_CALCULATORS;
      case 'infrastructure': return INFRASTRUCTURE_CALCULATORS;
      case 'communications': return COMMUNICATIONS_CALCULATORS;
      default: return {} as Record<string, (data: Record<string, any>[]) => number | string>;
    }
  })();

  const mergedCustom = { ...(customCalculators || {}), ...moduleCustomCalculators };

  const {
    visibleStatistics,
    statisticsByCategory,
    preferences,
    toggleStatistic,
    permissions,
    isLoading,
    reorderStatistics,
    setReorderEnabled: setReorderEnabledPersisted,
  } = useStatistics({
    module,
    data: safeData,
    customCalculators: mergedCustom,
  });

  useEffect(() => {
    setReorderEnabledLocal(preferences?.reorderEnabled ?? false);
  }, [preferences]);

  const moveStat = (id: string, direction: 'left' | 'right') => {
    if (!preferences) return;
    const current = visibleStatistics.map(s => s.definition.id);
    const idx = current.indexOf(id);
    if (idx === -1) return;
    const next = [...current];
    if (direction === 'left' && idx > 0) {
      const tmp = next[idx - 1];
      next[idx - 1] = next[idx];
      next[idx] = tmp;
    }
    if (direction === 'right' && idx < next.length - 1) {
      const tmp = next[idx + 1];
      next[idx + 1] = next[idx];
      next[idx] = tmp;
    }
    reorderStatistics(next);
  };

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-soft p-4 ${className}`}>
        <div className="animate-pulse flex items-center gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
              <div>
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (visibleStatistics.length === 0) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-soft p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('noStatisticsConfigured')}
          </p>
          {showConfigButton && (
            <button
              onClick={() => setIsConfigOpen(true)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              title={t('configureStatistics')}
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        <StatisticsConfigModal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          module={module}
          statisticsByCategory={statisticsByCategory}
          preferences={preferences}
          toggleStatistic={toggleStatistic}
          requiredStatIds={permissions?.requiredStatIds}
        />
      </div>
    );
  }

  return (
    <>
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-soft ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1 flex items-center divide-x divide-gray-200 dark:divide-gray-700 overflow-x-auto px-2">
            {visibleStatistics.map((stat, index) => {
              const StatIcon = getIcon(stat.definition.icon);
              const color = stat.definition.defaultColor;

              return (
                <div
                  key={stat.definition.id}
                  className="flex items-center gap-3 px-4 py-3 min-w-fit"
                >
                  <div className={`p-2 rounded-lg ${bgColorClasses[color]}`}>
                    <StatIcon className={`w-5 h-5 ${colorClasses[color]}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {tStats(stat.definition.labelKey.replace('stats.', ''))}
                    </p>
                    <p className={`text-lg font-semibold ${colorClasses[color]} whitespace-nowrap`}>
                      {stat.formattedValue}
                    </p>
                    {stat.subValue && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {stat.subValue}
                      </p>
                    )}
                    {stat.trend && (
                      <div className={`flex items-center gap-1 text-xs ${
                        stat.trend.direction === 'up' 
                          ? 'text-green-600 dark:text-green-400'
                          : stat.trend.direction === 'down'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-500'
                      }`}>
                        {stat.trend.direction === 'up' && '↑'}
                        {stat.trend.direction === 'down' && '↓'}
                        {stat.trend.percentage}%
                      </div>
                    )}
                  </div>
                  {reorderEnabled && (
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => moveStat(stat.definition.id, 'left')}
                        title={t('moveLeft')}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                        disabled={index === 0}
                        aria-hidden={!reorderEnabled}
                      >
                        <ChevronLeftIcon className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => moveStat(stat.definition.id, 'right')}
                        title={t('moveRight')}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                        disabled={index === visibleStatistics.length - 1}
                        aria-hidden={!reorderEnabled}
                      >
                        <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {showConfigButton && (
            <div className="px-3 py-2 border-l border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <button
                onClick={() => {
                  const next = !reorderEnabled;
                  setReorderEnabledPersisted(next);
                  setReorderEnabledLocal(next);
                }}
                className={`p-2 rounded-lg transition ${reorderEnabled ? 'bg-primary-50 text-primary-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-slate-700'}`}
                title={t('enableReorder')}
                aria-pressed={reorderEnabled}
              >
                <Bars3Icon className="w-5 h-5" />
              </button>

              <button
                onClick={() => setIsConfigOpen(true)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                title={t('configureStatistics')}
              >
                <Cog6ToothIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <StatisticsConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        module={module}
        statisticsByCategory={statisticsByCategory}
        preferences={preferences}
        toggleStatistic={toggleStatistic}
        requiredStatIds={permissions?.requiredStatIds}
      />
    </>
  );
}
