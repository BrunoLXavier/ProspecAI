/**
 * FormRadio Component
 * Radio button group with react-hook-form integration and dark mode
 * Implements RF-04, RF-05: Form fields with consistent design system
 */
'use client';

import { forwardRef } from 'react';
import { FieldError } from 'react-hook-form';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface FormRadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: string;
  options: RadioOption[];
  error?: FieldError | { message?: string; type?: string };
  helperText?: string;
  /** Layout direction */
  direction?: 'horizontal' | 'vertical';
  /** Size variant */
  radioSize?: 'sm' | 'md' | 'lg';
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

const FormRadio = forwardRef<HTMLInputElement, FormRadioProps>(
  ({ label, options, error, helperText, direction = 'vertical', radioSize = 'md', required, ...props }, ref) => {
    return (
      <fieldset className="space-y-2">
        <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </legend>

        <div className={`${direction === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-2'}`}>
          {options.map((option) => (
            <label
              key={option.value}
              className={`
                relative flex items-start gap-3 cursor-pointer group
                ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input
                ref={ref}
                type="radio"
                value={option.value}
                disabled={option.disabled}
                className={`
                  ${sizeClasses[radioSize]}
                  border-gray-300 dark:border-slate-600
                  text-primary-600 dark:text-primary-500
                  bg-white dark:bg-slate-800
                  focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-0
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                  ${error ? 'border-red-500 dark:border-red-400' : ''}
                `}
                aria-invalid={!!error}
                {...props}
              />
              <div className="flex-1 min-w-0">
                <span className={`${labelSizes[radioSize]} font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors`}>
                  {option.label}
                </span>
                {option.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{option.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error.message}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </fieldset>
    );
  }
);

FormRadio.displayName = 'FormRadio';

export default FormRadio;
