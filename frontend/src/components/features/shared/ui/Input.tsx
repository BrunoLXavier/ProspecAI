'use client';

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const inputVariants = cva(
  // Base styles
  'block w-full rounded-lg border transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-slate-800',
  {
    variants: {
      variant: {
        default:
          'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500/20',
        filled:
          'border-transparent bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-primary-500 focus:ring-primary-500/20',
        ghost:
          'border-transparent bg-transparent text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-primary-500 focus:ring-primary-500/20',
        error:
          'border-red-500 bg-red-50 dark:bg-red-900/10 text-gray-900 dark:text-white focus:border-red-500 focus:ring-red-500/20',
      },
      inputSize: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-4 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'md',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      inputSize,
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;
    const actualVariant = hasError ? 'error' : variant;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        
        <div className="relative flex">
          {leftAddon && (
            <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-100 dark:bg-slate-700 dark:text-gray-400 border border-r-0 border-gray-300 dark:border-slate-600 rounded-l-lg">
              {leftAddon}
            </span>
          )}
          
          <div className="relative flex-1">
            {leftIcon && (
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                {leftIcon}
              </div>
            )}
            
            <input
              ref={ref}
              id={inputId}
              className={inputVariants({
                variant: actualVariant,
                inputSize,
                className: `${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${leftAddon ? 'rounded-l-none' : ''} ${rightAddon ? 'rounded-r-none' : ''} ${className || ''}`,
              })}
              aria-invalid={hasError}
              aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
              {...props}
            />
            
            {rightIcon && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                {rightIcon}
              </div>
            )}
          </div>
          
          {rightAddon && (
            <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-100 dark:bg-slate-700 dark:text-gray-400 border border-l-0 border-gray-300 dark:border-slate-600 rounded-r-lg">
              {rightAddon}
            </span>
          )}
        </div>
        
        {(error || helperText) && (
          <p
            id={error ? `${inputId}-error` : `${inputId}-helper`}
            className={`mt-1.5 text-sm ${error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Search Input Component
interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
  onSearch?: (value: string) => void;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, onKeyDown, className, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearch) {
        onSearch((e.target as HTMLInputElement).value);
      }
      onKeyDown?.(e);
    };

    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
        onKeyDown={handleKeyDown}
        className={className}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

export { Input, SearchInput, inputVariants };
