/**
 * ComboBox Component
 * Searchable dropdown using Headless UI Combobox
 * Supports single and multi-select with dark mode
 * Implements RF-04, RF-05: Interactive form components
 */
'use client';

import { Fragment, useState, useMemo } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import {
  CheckIcon,
  ChevronUpDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { cva, type VariantProps } from 'class-variance-authority';

// ComboBox input variants
const comboBoxVariants = cva(
  `
    relative w-full cursor-default overflow-hidden
    rounded-lg border transition-all duration-200
    bg-white dark:bg-slate-700
    text-left text-sm
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
    dark:focus-visible:ring-offset-slate-800
  `,
  {
    variants: {
      variant: {
        default: `
          border-gray-300 dark:border-gray-600
          focus-visible:ring-primary-500 focus-visible:border-primary-500
        `,
        error: `
          border-red-500 dark:border-red-400
          focus-visible:ring-red-500 focus-visible:border-red-500
        `,
        success: `
          border-green-500 dark:border-green-400
          focus-visible:ring-green-500 focus-visible:border-green-500
        `,
      },
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
      disabled: {
        true: 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-slate-800',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      disabled: false,
    },
  }
);

// Input padding based on size
const inputPadding = {
  sm: 'py-1.5 pl-3 pr-8',
  md: 'py-2 pl-3 pr-10',
  lg: 'py-2.5 pl-4 pr-12',
};

export interface ComboBoxOption {
  value: string | number;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  group?: string;
}

export interface ComboBoxProps extends VariantProps<typeof comboBoxVariants> {
  /** Available options */
  options: ComboBoxOption[];
  /** Selected value(s) */
  value: ComboBoxOption | ComboBoxOption[] | null;
  /** Change handler */
  onChange: (value: ComboBoxOption | ComboBoxOption[] | null) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Enable multi-select */
  multiple?: boolean;
  /** Enable search filtering */
  searchable?: boolean;
  /** Clear button */
  clearable?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Label text */
  label?: string;
  /** Error message */
  error?: string;
  /** Help text */
  helpText?: string;
  /** Required indicator */
  required?: boolean;
  /** Maximum visible items in dropdown */
  maxItems?: number;
  /** Custom filter function */
  filterFn?: (option: ComboBoxOption, query: string) => boolean;
  /** No results message */
  noResultsMessage?: string;
  /** Loading state */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Input name attribute */
  name?: string;
  /** Input id attribute */
  id?: string;
}

// Default filter function
const defaultFilter = (option: ComboBoxOption, query: string): boolean => {
  return option.label.toLowerCase().includes(query.toLowerCase()) ||
    (option.description?.toLowerCase().includes(query.toLowerCase()) ?? false);
};

export default function ComboBox({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  multiple = false,
  searchable = true,
  clearable = true,
  disabled = false,
  label,
  error,
  helpText,
  required = false,
  maxItems = 8,
  filterFn = defaultFilter,
  noResultsMessage = 'No results found',
  loading = false,
  className = '',
  variant = 'default',
  size = 'md',
  name,
  id,
}: ComboBoxProps) {
  const [query, setQuery] = useState('');

  // Determine variant based on error
  const currentVariant = error ? 'error' : variant;

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!query || !searchable) return options;
    return options.filter(option => filterFn(option, query));
  }, [options, query, searchable, filterFn]);

  // Group options if any have group property
  const groupedOptions = useMemo(() => {
    const hasGroups = options.some(opt => opt.group);
    if (!hasGroups) return { '': filteredOptions };

    return filteredOptions.reduce((acc, option) => {
      const group = option.group || '';
      if (!acc[group]) acc[group] = [];
      acc[group].push(option);
      return acc;
    }, {} as Record<string, ComboBoxOption[]>);
  }, [filteredOptions, options]);

  // Display value for input
  const displayValue = useMemo(() => {
    if (multiple) {
      const selected = value as ComboBoxOption[] | null;
      if (!selected || selected.length === 0) return '';
      return selected.map(v => v.label).join(', ');
    }
    return (value as ComboBoxOption | null)?.label || '';
  }, [value, multiple]);

  // Handle clear
  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(multiple ? [] : null);
    setQuery('');
  };

  // Check if option is selected
  const isSelected = (option: ComboBoxOption) => {
    if (multiple) {
      return (value as ComboBoxOption[])?.some(v => v.value === option.value) ?? false;
    }
    return (value as ComboBoxOption | null)?.value === option.value;
  };

  // Handle value change for proper typing
  const handleChange = (newValue: ComboBoxOption | ComboBoxOption[] | null) => {
    onChange(newValue);
    if (!multiple) {
      setQuery('');
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <Combobox
        value={value}
        onChange={handleChange}
        disabled={disabled}
        multiple={multiple as any}
        name={name}
      >
        <div className="relative">
          <div className={comboBoxVariants({ variant: currentVariant, size, disabled })}>
            <Combobox.Input
              id={id}
              className={`
                w-full border-none bg-transparent
                text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:ring-0
                ${inputPadding[size || 'md']}
                ${disabled ? 'cursor-not-allowed' : ''}
              `}
              displayValue={() => displayValue}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              autoComplete="off"
            />

            {/* Clear button */}
            {clearable && value && (multiple ? (value as ComboBoxOption[]).length > 0 : true) && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className={`
                  absolute inset-y-0 right-8 flex items-center
                  text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                `}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}

            {/* Dropdown button */}
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              {loading ? (
                <svg
                  className="animate-spin h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <ChevronUpDownIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              )}
            </Combobox.Button>
          </div>

          {/* Dropdown panel */}
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options
              className={`
                absolute z-50 mt-1 w-full overflow-auto
                rounded-lg border border-gray-200 dark:border-gray-600
                bg-white dark:bg-slate-700
                shadow-lg
                focus:outline-none
                py-1
              `}
              style={{ maxHeight: `${maxItems * 44}px` }}
            >
              {filteredOptions.length === 0 && query !== '' ? (
                <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                  {noResultsMessage}
                </div>
              ) : (
                Object.entries(groupedOptions).map(([group, groupOptions]) => (
                  <Fragment key={group}>
                    {/* Group label */}
                    {group && (
                      <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-600/50">
                        {group}
                      </div>
                    )}

                    {/* Options */}
                    {groupOptions.map((option) => (
                      <Combobox.Option
                        key={option.value}
                        value={option}
                        disabled={option.disabled}
                        className={({ active, disabled }) => `
                          relative cursor-pointer select-none py-2 pl-10 pr-4
                          transition-colors duration-150
                          ${active ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100' : 'text-gray-900 dark:text-gray-100'}
                          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        {({ selected, active }) => (
                          <>
                            {/* Check icon */}
                            <span
                              className={`
                                absolute inset-y-0 left-0 flex items-center pl-3
                                ${isSelected(option) ? 'text-primary-600 dark:text-primary-400' : 'text-transparent'}
                              `}
                            >
                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                            </span>

                            {/* Option content */}
                            <div className="flex items-center gap-2">
                              {option.icon && (
                                <span className="flex-shrink-0 w-5 h-5 text-gray-500 dark:text-gray-400">
                                  {option.icon}
                                </span>
                              )}
                              <div className="flex-1 min-w-0">
                                <span
                                  className={`block truncate ${isSelected(option) ? 'font-semibold' : 'font-normal'}`}
                                >
                                  {option.label}
                                </span>
                                {option.description && (
                                  <span
                                    className={`block text-xs truncate ${active ? 'text-primary-600 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400'}`}
                                  >
                                    {option.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </Combobox.Option>
                    ))}
                  </Fragment>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {/* Help text */}
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helpText}</p>
      )}
    </div>
  );
}
