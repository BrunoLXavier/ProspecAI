/**
 * FormSelect Component
 * Reusable select dropdown with react-hook-form integration, CVA variants, and dark mode
 * Implements RF-04, RF-05: Form fields with consistent design system
 */
'use client';

import { forwardRef } from 'react';
import { FieldError } from 'react-hook-form';
import { cva, type VariantProps } from 'class-variance-authority';

const formSelectVariants = cva(
  'block w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-no-repeat bg-[length:16px_16px] bg-[right_12px_center]',
  {
    variants: {
      variant: {
        default:
          'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500/20',
        filled:
          'border-transparent bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-primary-500 focus:ring-primary-500/20',
        error:
          'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/10 text-gray-900 dark:text-white focus:border-red-500 focus:ring-red-500/20',
      },
      inputSize: {
        sm: 'px-3 py-1.5 pr-8 text-sm',
        md: 'px-3 py-2 pr-10 text-sm',
        lg: 'px-4 py-3 pr-12 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'md',
    },
  }
);

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface FormSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof formSelectVariants> {
  label: string;
  options: SelectOption[];
  error?: FieldError | { message?: string; type?: string };
  helperText?: string;
  placeholder?: string;
}

const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, options, error, helperText, placeholder, variant, inputSize, className = '', ...props }, ref) => {
    const hasError = !!error;
    const actualVariant = hasError ? 'error' : variant;

    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <select
          ref={ref}
          className={formSelectVariants({
            variant: actualVariant,
            inputSize,
            className: `${props.disabled ? 'bg-gray-50 dark:bg-slate-900' : ''} ${className}`,
          })}
          aria-invalid={hasError}
          {...props}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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

FormSelect.displayName = 'FormSelect';

export { formSelectVariants };
export default FormSelect;
