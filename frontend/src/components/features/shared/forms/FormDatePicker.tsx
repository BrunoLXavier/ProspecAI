/**
 * FormDatePicker Component
 * Date input with react-hook-form integration, CVA variants, and dark mode
 * Implements RF-02, RF-05: Date fields with consistent design system
 */
'use client';

import { forwardRef } from 'react';
import { FieldError } from 'react-hook-form';
import { cva, type VariantProps } from 'class-variance-authority';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';

const formDateVariants = cva(
  'block w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500/20 [color-scheme:light] dark:[color-scheme:dark]',
        filled:
          'border-transparent bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-primary-500 focus:ring-primary-500/20 [color-scheme:light] dark:[color-scheme:dark]',
        error:
          'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/10 text-gray-900 dark:text-white focus:border-red-500 focus:ring-red-500/20 [color-scheme:light] dark:[color-scheme:dark]',
      },
      inputSize: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'md',
    },
  }
);

export interface FormDatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'>,
    VariantProps<typeof formDateVariants> {
  label: string;
  error?: FieldError | { message?: string; type?: string };
  helperText?: string;
  /** Use datetime-local instead of date */
  includeTime?: boolean;
  showIcon?: boolean;
}

const FormDatePicker = forwardRef<HTMLInputElement, FormDatePickerProps>(
  ({ label, error, helperText, variant, inputSize, includeTime = false, showIcon = true, className = '', ...props }, ref) => {
    const hasError = !!error;
    const actualVariant = hasError ? 'error' : variant;

    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="relative">
          {showIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 dark:text-gray-500">
              <CalendarDaysIcon className="w-5 h-5" />
            </div>
          )}
          <input
            ref={ref}
            type={includeTime ? 'datetime-local' : 'date'}
            className={formDateVariants({
              variant: actualVariant,
              inputSize,
              className: `${showIcon ? 'pl-10' : ''} ${props.disabled ? 'bg-gray-50 dark:bg-slate-900' : ''} ${className}`,
            })}
            aria-invalid={hasError}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error.message}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

FormDatePicker.displayName = 'FormDatePicker';

export { formDateVariants };
export default FormDatePicker;
