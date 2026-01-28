/**
 * FormSlider Component
 * Range slider with percentage display
 */
'use client';

import { forwardRef } from 'react';
import { FieldError } from 'react-hook-form';

interface FormSliderProps {
  label: string;
  value?: number;
  onChange?: (value: number) => void;
  error?: FieldError;
  helperText?: string;
  min?: number;
  max?: number;
  step?: number;
  showValue?: boolean;
  disabled?: boolean;
  required?: boolean;
}

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
    disabled,
    required 
  }, ref) => {
    return (
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {showValue && (
            <span className="text-sm font-semibold text-blue-600">
              {value}%
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
            ${disabled ? 'bg-gray-200' : 'bg-gray-200'}
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-blue-600
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-md
          `}
        />
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>{min}</span>
          <span>{max}</span>
        </div>
        
        {error && (
          <p className="text-sm text-red-600">{error.message}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

FormSlider.displayName = 'FormSlider';

export default FormSlider;
