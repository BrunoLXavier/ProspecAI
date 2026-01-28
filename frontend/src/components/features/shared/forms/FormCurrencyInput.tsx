/**
 * FormCurrencyInput Component
 * Currency input with Brazilian Real formatting
 */
'use client';

import { forwardRef, useState } from 'react';
import { FieldError } from 'react-hook-form';

interface FormCurrencyInputProps {
  label: string;
  error?: FieldError;
  helperText?: string;
  value?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  required?: boolean;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) / 100 || 0;
};

const FormCurrencyInput = forwardRef<HTMLInputElement, FormCurrencyInputProps>(
  ({ label, error, helperText, value = 0, onChange, disabled, required }, ref) => {
    const [displayValue, setDisplayValue] = useState(formatCurrency(value));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const numericValue = parseCurrency(rawValue);
      setDisplayValue(formatCurrency(numericValue));
      onChange?.(numericValue);
    };

    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          ref={ref}
          type="text"
          value={displayValue}
          onChange={handleChange}
          disabled={disabled}
          className={`
            block w-full rounded-md border px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
              : 'border-gray-300 focus:border-blue-500'
            }
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          `}
        />
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

FormCurrencyInput.displayName = 'FormCurrencyInput';

export default FormCurrencyInput;
