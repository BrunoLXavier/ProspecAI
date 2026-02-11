/**
 * FormCurrencyInput Component
 * Locale-aware currency input with react-hook-form integration and dark mode
 * Uses useI18n formatCurrency for proper locale handling (pt-BR → BRL, en-US → USD, es-ES → EUR)
 * Implements RF-04, RF-05: Currency fields with i18n support
 */
'use client';

import { forwardRef, useState, useEffect, useCallback } from 'react';
import { FieldError } from 'react-hook-form';
import { cva, type VariantProps } from 'class-variance-authority';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { useI18n } from '@/hooks/use-i18n';

const formCurrencyVariants = cva(
  'block w-full rounded-lg border transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500/20',
        error:
          'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/10 text-gray-900 dark:text-white focus:border-red-500 focus:ring-red-500/20',
      },
      inputSize: {
        sm: 'pl-10 pr-3 py-1.5 text-sm',
        md: 'pl-10 pr-3 py-2 text-sm',
        lg: 'pl-12 pr-4 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'md',
    },
  }
);

export interface FormCurrencyInputProps extends VariantProps<typeof formCurrencyVariants> {
  label: string;
  error?: FieldError | { message?: string; type?: string };
  helperText?: string;
  value?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  required?: boolean;
  /** Override locale currency. If not provided, uses useI18n locale */
  currency?: string;
  className?: string;
}

const CURRENCY_MAP: Record<string, string> = {
  'pt-BR': 'BRL',
  'en-US': 'USD',
  'es-ES': 'EUR',
};

const FormCurrencyInput = forwardRef<HTMLInputElement, FormCurrencyInputProps>(
  ({ label, error, helperText, value = 0, onChange, disabled, required, currency, variant, inputSize, className = '' }, ref) => {
    const { locale } = useI18n();
    const activeCurrency = currency || CURRENCY_MAP[locale] || 'BRL';

    const formatValue = useCallback((val: number): string => {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: activeCurrency,
      }).format(val);
    }, [locale, activeCurrency]);

    const [displayValue, setDisplayValue] = useState(formatValue(value));

    useEffect(() => {
      setDisplayValue(formatValue(value));
    }, [value, formatValue]);

    const parseCurrency = (raw: string): number => {
      const cleaned = raw.replace(/[^\d]/g, '');
      return parseInt(cleaned, 10) / 100 || 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const numericValue = parseCurrency(e.target.value);
      setDisplayValue(formatValue(numericValue));
      onChange?.(numericValue);
    };

    const hasError = !!error;
    const actualVariant = hasError ? 'error' : variant;

    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 dark:text-gray-500">
            <CurrencyDollarIcon className="w-5 h-5" />
          </div>
          <input
            ref={ref}
            type="text"
            inputMode="numeric"
            value={displayValue}
            onChange={handleChange}
            disabled={disabled}
            className={formCurrencyVariants({
              variant: actualVariant,
              inputSize,
              className: `${disabled ? 'bg-gray-50 dark:bg-slate-900' : ''} ${className}`,
            })}
            aria-invalid={hasError}
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

FormCurrencyInput.displayName = 'FormCurrencyInput';

export { formCurrencyVariants };
export default FormCurrencyInput;
