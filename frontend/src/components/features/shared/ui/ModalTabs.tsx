/**
 * ModalTabs — Vertical Sidebar Stepper for Modals
 * Desktop (≥640px): left sidebar with numbered steps, labels, error/complete badges.
 * Mobile (<640px): compact prev/next navigation with step indicator strip.
 *
 * Steps are freely clickable — not locked sequential.
 * Supports error counts and completion indicators per step.
 *
 * Implements RF-01 through RF-09: Stepper-based modal tab navigation
 */
'use client';

import { useState, useEffect, ReactNode, ComponentType } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

export interface TabItem {
  name: string;
  icon?: ComponentType<{ className?: string }>;
  content: ReactNode;
  /** Number of validation errors in this tab (0 = no errors) */
  errorCount?: number;
  /** Whether all required fields in this tab are filled and valid */
  isComplete?: boolean;
}

interface ModalTabsProps {
  tabs: TabItem[];
  selectedIndex?: number;
  onChange?: (index: number) => void;
  className?: string;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function ModalTabs({
  tabs,
  selectedIndex: controlledIndex,
  onChange,
  className = '',
}: ModalTabsProps) {
  const t = useTranslations('modal');
  const tValidation = useTranslations('validation');
  const [internalIndex, setInternalIndex] = useState(0);
  const selectedIndex = controlledIndex ?? internalIndex;

  const handleChange = (index: number) => {
    if (onChange) {
      onChange(index);
    } else {
      setInternalIndex(index);
    }
  };

  // Reset to first tab when tabs change
  useEffect(() => {
    if (selectedIndex >= tabs.length) {
      handleChange(0);
    }
  }, [tabs.length]);

  const goToPrev = () => {
    if (selectedIndex > 0) handleChange(selectedIndex - 1);
  };

  const goToNext = () => {
    if (selectedIndex < tabs.length - 1) handleChange(selectedIndex + 1);
  };

  const currentTab = tabs[selectedIndex];

  return (
    <div className={`flex flex-col sm:flex-row ${className}`}>
      {/* ─── Mobile Navigation (<640px) ─────────────────────────────────── */}
      <div className="sm:hidden">
        {/* Prev / Current / Next bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={goToPrev}
            disabled={selectedIndex === 0}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label={t('previousStep')}
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
            {currentTab?.icon && <currentTab.icon className="w-4 h-4" />}
            <span>{currentTab?.name}</span>
            <span className="text-gray-400 text-xs">
              {t('stepOf', { current: selectedIndex + 1, total: tabs.length })}
            </span>
            {(currentTab?.errorCount ?? 0) > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                {currentTab!.errorCount}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={goToNext}
            disabled={selectedIndex === tabs.length - 1}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label={t('nextStep')}
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator circles */}
        <div className="flex justify-center gap-2 py-2 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab, index) => {
            const hasError = (tab.errorCount ?? 0) > 0;
            const isActive = index === selectedIndex;
            const isComplete = tab.isComplete && !hasError;
            return (
              <button
                key={index}
                type="button"
                onClick={() => handleChange(index)}
                className={classNames(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                  isActive
                    ? 'bg-primary-600 text-white ring-2 ring-primary-300 dark:ring-primary-700'
                    : hasError
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    : isComplete
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
                )}
                aria-label={t('step', { index: index + 1, name: tab.name })}
              >
                {isComplete && !isActive ? (
                  <CheckIcon className="w-3.5 h-3.5" />
                ) : hasError && !isActive ? (
                  <ExclamationCircleIcon className="w-3.5 h-3.5" />
                ) : (
                  index + 1
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Desktop Sidebar (≥640px) ───────────────────────────────────── */}
      <nav
        className="hidden sm:flex flex-col w-56 shrink-0 border-r border-gray-200 dark:border-gray-700 py-4 pr-0 pl-2 overflow-y-auto"
        aria-label="Form steps"
      >
        {tabs.map((tab, index) => {
          const isActive = index === selectedIndex;
          const hasError = (tab.errorCount ?? 0) > 0;
          const isComplete = tab.isComplete && !hasError;
          const isLast = index === tabs.length - 1;

          return (
            <div key={tab.name} className="relative">
              {/* Connector line */}
              {!isLast && (
                <div
                  className={classNames(
                    'absolute left-[19px] top-[40px] w-0.5 h-[calc(100%-16px)]',
                    isComplete
                      ? 'bg-green-300 dark:bg-green-700'
                      : 'bg-gray-200 dark:bg-gray-700',
                  )}
                />
              )}

              <button
                type="button"
                onClick={() => handleChange(index)}
                className={classNames(
                  'relative flex items-start gap-3 w-full text-left px-3 py-3 rounded-l-xl transition-all group',
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-r-2 border-primary-600 dark:border-primary-400'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-700/50',
                )}
              >
                {/* Step number circle */}
                <div
                  className={classNames(
                    'relative z-10 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-all',
                    isActive
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-200 dark:shadow-primary-900/50'
                      : hasError
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 ring-2 ring-red-200 dark:ring-red-800'
                      : isComplete
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-600',
                  )}
                >
                  {isComplete && !isActive ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : hasError && !isActive ? (
                    <ExclamationCircleIcon className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Label + error badge */}
                <div className="flex flex-col min-w-0 pt-1">
                  <span
                    className={classNames(
                      'text-sm font-medium truncate',
                      isActive
                        ? 'text-primary-700 dark:text-primary-300'
                        : hasError
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-700 dark:text-gray-300',
                    )}
                  >
                    {tab.name}
                  </span>

                  {hasError && (
                    <span className="inline-flex items-center gap-1 mt-0.5 text-xs text-red-500 dark:text-red-400">
                      <ExclamationCircleIcon className="w-3 h-3" />
                      {tab.errorCount} {tab.errorCount === 1 ? tValidation('error') : tValidation('errors')}
                    </span>
                  )}
                  {isComplete && !hasError && !isActive && (
                    <span className="inline-flex items-center gap-1 mt-0.5 text-xs text-green-500 dark:text-green-400">
                      <CheckIcon className="w-3 h-3" />
                      {tValidation('complete')}
                    </span>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </nav>

      {/* ─── Content Panel ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 sm:p-6">
        {tabs.map((tab, index) => (
          <div
            key={tab.name}
            className={index === selectedIndex ? 'block' : 'hidden'}
            role="tabpanel"
            aria-label={tab.name}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * TabPanel wrapper for consistent spacing
 */
export function TabPanelContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`space-y-5 ${className}`}>
      {children}
    </div>
  );
}

/**
 * TabHint — Colored hint box for tab sections
 */
interface TabSectionProps {
  children: ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  className?: string;
}

const variantClasses = {
  info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  success: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
  error: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
};

export function TabHint({ children, variant = 'info', className = '' }: TabSectionProps) {
  return (
    <div className={`p-4 rounded-lg mb-4 ${variantClasses[variant]} ${className}`}>
      <p className="text-sm">{children}</p>
    </div>
  );
}
