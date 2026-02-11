/**
 * FormCheckbox Component
 * Checkbox with react-hook-form integration, dark mode, and accessible labels
 * Implements RF-04, RF-05: Form fields with consistent design system
 */
'use client';

import { forwardRef } from 'react';
import { FieldError } from 'react-hook-form';

export interface FormCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: string;
  description?: string;
  error?: FieldError | { message?: string; type?: string };
  /** Size variant */
  checkboxSize?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

const labelSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, description, error, checkboxSize = 'md', className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        <label className="relative flex items-start gap-3 cursor-pointer group">
          <input
            ref={ref}
            type="checkbox"
            className={`
              ${sizeClasses[checkboxSize]}
              rounded border-gray-300 dark:border-slate-600
              text-primary-600 dark:text-primary-500
              bg-white dark:bg-slate-800
              focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-0
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
              ${error ? 'border-red-500 dark:border-red-400' : ''}
              ${className}
            `}
            aria-invalid={!!error}
            {...props}
          />
          <div className="flex-1 min-w-0">
            <span className={`${labelSizes[checkboxSize]} font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors`}>
              {label}
            </span>
            {description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
            )}
          </div>
        </label>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 ml-7">{error.message}</p>
        )}
      </div>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox';

export default FormCheckbox;
