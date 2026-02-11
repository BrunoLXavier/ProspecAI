/**
 * FormSwitch Component
 * Toggle switch with react-hook-form integration using Headless UI
 * Implements RF-04, RF-05: Form fields with consistent design system
 */
'use client';

import { Switch } from '@headlessui/react';
import { FieldError } from 'react-hook-form';

export interface FormSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: FieldError | { message?: string; type?: string };
  disabled?: boolean;
  /** Size variant */
  switchSize?: 'sm' | 'md' | 'lg';
  /** Color variant when enabled */
  colorVariant?: 'primary' | 'success' | 'warning';
}

const sizeConfig = {
  sm: {
    track: 'h-5 w-9',
    thumb: 'h-3.5 w-3.5',
    translate: 'translate-x-4',
  },
  md: {
    track: 'h-6 w-11',
    thumb: 'h-4 w-4',
    translate: 'translate-x-5',
  },
  lg: {
    track: 'h-7 w-14',
    thumb: 'h-5 w-5',
    translate: 'translate-x-7',
  },
};

const colorMap = {
  primary: 'bg-primary-600',
  success: 'bg-green-600',
  warning: 'bg-amber-500',
};

export default function FormSwitch({
  label,
  description,
  checked,
  onChange,
  error,
  disabled = false,
  switchSize = 'md',
  colorVariant = 'primary',
}: FormSwitchProps) {
  const config = sizeConfig[switchSize];
  const activeColor = colorMap[colorVariant];

  return (
    <div className="space-y-1">
      <Switch.Group>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Switch.Label className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              {label}
            </Switch.Label>
            {description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
            )}
          </div>
          <Switch
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className={`
              ${config.track}
              relative inline-flex shrink-0 cursor-pointer rounded-full
              border-2 border-transparent transition-colors duration-200 ease-in-out
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 focus-visible:ring-offset-2
              dark:focus-visible:ring-offset-slate-800
              disabled:opacity-50 disabled:cursor-not-allowed
              ${checked ? activeColor : 'bg-gray-200 dark:bg-slate-600'}
            `}
          >
            <span
              aria-hidden="true"
              className={`
                ${config.thumb}
                pointer-events-none inline-block rounded-full bg-white shadow-lg ring-0
                transition duration-200 ease-in-out
                ${checked ? config.translate : 'translate-x-0.5'}
              `}
            />
          </Switch>
        </div>
      </Switch.Group>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error.message}</p>
      )}
    </div>
  );
}
