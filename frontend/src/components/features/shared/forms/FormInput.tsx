/**
 * FormInput Component
 * Reusable text input with react-hook-form integration, CVA variants, and dark mode
 * Implements RF-04, RF-05: Form fields with consistent design system
 */
'use client';

import { forwardRef } from 'react';
import { FieldError } from 'react-hook-form';
import { cva, type VariantProps } from 'class-variance-authority';

const formInputVariants = cva(
  'block w-full rounded-lg border transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
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

export interface FormInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof formInputVariants> {
  label: string;
  error?: FieldError | { message?: string; type?: string };
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, helperText, variant, inputSize, leftIcon, rightIcon, className = '', ...props }, ref) => {
    const hasError = !!error;
    const actualVariant = hasError ? 'error' : variant;

    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 dark:text-gray-500">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={formInputVariants({
              variant: actualVariant,
              inputSize,
              className: `${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${props.disabled ? 'bg-gray-50 dark:bg-slate-900' : ''} ${className}`,
            })}
            aria-invalid={hasError}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400 dark:text-gray-500">
              {rightIcon}
            </div>
          )}
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

FormInput.displayName = 'FormInput';

export { formInputVariants };
export default FormInput;
