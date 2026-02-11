/**
 * Step Indicator Component
 * Renders the wizard step navigation bar for the report builder
 * Implements RF-09: Dynamic Reports
 */
'use client';

import React from 'react';
import {
  CheckIcon,
  TableCellsIcon,
  DocumentTextIcon,
  LinkIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  PlayIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

// =============================================================================
// Types
// =============================================================================

export type StepId = 'table' | 'fields' | 'joins' | 'filters' | 'order' | 'preview' | 'save';

export interface StepConfig {
  id: StepId;
  label: string;
  icon: React.ReactNode;
}

export const STEPS: StepConfig[] = [
  { id: 'table', label: 'Select Table', icon: <TableCellsIcon className="w-5 h-5" /> },
  { id: 'fields', label: 'Choose Fields', icon: <DocumentTextIcon className="w-5 h-5" /> },
  { id: 'joins', label: 'Add Joins', icon: <LinkIcon className="w-5 h-5" /> },
  { id: 'filters', label: 'Add Filters', icon: <FunnelIcon className="w-5 h-5" /> },
  { id: 'order', label: 'Sort & Limit', icon: <ArrowsUpDownIcon className="w-5 h-5" /> },
  { id: 'preview', label: 'Preview', icon: <PlayIcon className="w-5 h-5" /> },
  { id: 'save', label: 'Save Template', icon: <Cog6ToothIcon className="w-5 h-5" /> },
];

interface StepIndicatorProps {
  currentStep: StepId;
  currentStepIndex: number;
  onStepClick: (stepId: StepId) => void;
}

// =============================================================================
// Component
// =============================================================================

export default function StepIndicator({
  currentStep,
  currentStepIndex,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <nav className="mb-8">
      <ol className="flex items-center justify-between overflow-x-auto">
        {STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = index < currentStepIndex;
          const isClickable = index <= currentStepIndex + 1;

          return (
            <li key={step.id} className="flex items-center">
              <button
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isCompleted
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                } ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}`}
              >
                {isCompleted ? <CheckIcon className="w-5 h-5" /> : step.icon}
                <span className="hidden sm:inline text-sm font-medium">{step.label}</span>
              </button>
              {index < STEPS.length - 1 && (
                <div className="w-8 h-0.5 bg-gray-200 dark:bg-gray-700 mx-1" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
