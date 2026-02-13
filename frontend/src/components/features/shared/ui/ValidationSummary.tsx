/**
 * ValidationSummary — Cross-Tab Error Summary Banner
 * Renders above the modal footer when validation errors exist.
 * Shows total error count and clickable chips to jump to errored steps.
 *
 * Implements RF-01 through RF-09: Cross-tab validation visibility
 */
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface TabErrorInfo {
  /** Tab display name */
  name: string;
  /** Number of errors in this tab */
  errorCount: number;
  /** Tab index for navigation */
  index: number;
}

interface ValidationSummaryProps {
  /** Total error count across all tabs */
  totalErrors: number;
  /** Tabs that have errors */
  tabErrors: TabErrorInfo[];
  /** Callback to navigate to a specific tab */
  onNavigateToTab: (index: number) => void;
  /** Additional CSS class */
  className?: string;
}

export default function ValidationSummary({
  totalErrors,
  tabErrors,
  onNavigateToTab,
  className = '',
}: ValidationSummaryProps) {
  const t = useTranslations('validation');

  if (totalErrors === 0 || tabErrors.length === 0) return null;

  return (
    <div
      className={`mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <ExclamationTriangleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            {t('fieldsNeedAttention', { count: totalErrors, tabs: tabErrors.length })}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tabErrors.map((tab) => (
              <button
                key={tab.index}
                type="button"
                onClick={() => onNavigateToTab(tab.index)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 rounded-full hover:bg-red-200 dark:hover:bg-red-800/60 transition-colors"
              >
                <span className="font-semibold">{tab.index + 1}.</span>
                <span>{tab.name}</span>
                <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
                  {tab.errorCount}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
