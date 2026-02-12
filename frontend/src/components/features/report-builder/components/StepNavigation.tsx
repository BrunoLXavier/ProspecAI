/**
 * Step Navigation Component
 * Renders the bottom navigation buttons (Back / Next) for the report builder wizard
 * Implements RF-09: Dynamic Reports
 */
'use client';

import { useTranslations } from 'next-intl';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import type { StepId } from './StepIndicator';

interface StepNavigationProps {
  currentStep: StepId;
  currentStepIndex: number;
  totalSteps: number;
  canProceed: boolean;
  onNext: () => void;
  onPrev: () => void;
}

export default function StepNavigation({
  currentStep,
  currentStepIndex,
  totalSteps,
  canProceed,
  onNext,
  onPrev,
}: StepNavigationProps) {
  const t = useTranslations('reports');

  return (
    <div className="flex justify-between">
      <button
        onClick={onPrev}
        disabled={currentStepIndex === 0}
        className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 disabled:opacity-50"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        {t('back')}
      </button>

      {currentStep !== 'save' && (
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {t('next')}
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
