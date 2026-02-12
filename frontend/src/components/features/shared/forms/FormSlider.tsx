/**
 * FormSlider Component
 * Range slider with CVA, dark mode, and configurable display
 * Implements RF-06: Matching score and weight configuration
 */
'use client';

import { forwardRef } from 'react';
import { FieldError } from 'react-hook-form';

export interface FormSliderProps {
  label: string;
  value?: number;
  onChange?: (value: number) => void;
  error?: FieldError | { message?: string; type?: string };
  helperText?: string;
  min?: number;
  max?: number;
  step?: number;
  showValue?: boolean;
  /** Format the displayed value */
  formatValue?: (value: number) => string;
  disabled?: boolean;
  required?: boolean;
  /** Color variant for the slider thumb and track */
  colorVariant?: 'primary' | 'info' | 'success' | 'warning' | 'danger';
}

const thumbColors = {
  primary: '[&::-webkit-slider-thumb]:bg-primary-600 [&::-moz-range-thumb]:bg-primary-600',
  info: '[&::-webkit-slider-thumb]:bg-blue-500 [&::-moz-range-thumb]:bg-blue-500',
  success: '[&::-webkit-slider-thumb]:bg-green-600 [&::-moz-range-thumb]:bg-green-600',
  warning: '[&::-webkit-slider-thumb]:bg-amber-500 [&::-moz-range-thumb]:bg-amber-500',
  danger: '[&::-webkit-slider-thumb]:bg-red-600 [&::-moz-range-thumb]:bg-red-600',
};

const valueColors = {
  primary: 'text-primary-600 dark:text-primary-400',
  info: 'text-blue-500 dark:text-blue-400',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
};

const FormSlider = forwardRef<HTMLInputElement, FormSliderProps>(
  ({ 
    label, 
    value = 50, 
    onChange, 
    error, 
    helperText, 
    min = 0, 
    max = 100, 
    step = 1,
    showValue = true,
    formatValue,
    disabled,
    required,
    colorVariant = 'primary',
  }, ref) => {
    const displayValue = formatValue ? formatValue(value) : `${value}%`;

    return (
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {showValue && (
            <span className={`text-sm font-semibold ${valueColors[colorVariant]}`}>
              {displayValue}
            </span>
          )}
        </div>
        
        <input
          ref={ref}
          type="range"
          value={value}
          onChange={(e) => onChange?.(parseInt(e.target.value, 10))}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={`
            w-full h-2 rounded-lg appearance-none cursor-pointer
            bg-gray-200 dark:bg-slate-700
            disabled:opacity-50 disabled:cursor-not-allowed
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:shadow-md
            ${thumbColors[colorVariant]}
          `}
        />
        
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>{min}</span>
          <span>{max}</span>
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

FormSlider.displayName = 'FormSlider';

export default FormSlider;
