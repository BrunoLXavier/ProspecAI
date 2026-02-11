/**
 * FormTagInput Component
 * Tag input for arrays (keywords, focus areas, etc.) with CVA, dark mode, and i18n
 * Implements RF-04, RF-05: Tag fields with consistent design system
 */
'use client';

import { useState, KeyboardEvent } from 'react';
import { FieldError } from 'react-hook-form';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

export interface FormTagInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  error?: FieldError | { message?: string; type?: string };
  helperText?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  maxTags?: number;
  /** Tag color variant */
  tagVariant?: 'primary' | 'secondary' | 'neutral';
}

const tagColors = {
  primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300',
  secondary: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  neutral: 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-300',
};

export default function FormTagInput({
  label,
  value = [],
  onChange,
  error,
  helperText,
  placeholder,
  disabled,
  required,
  maxTags = 10,
  tagVariant = 'primary',
}: FormTagInputProps) {
  const t = useTranslations('common');
  const [inputValue, setInputValue] = useState('');

  const defaultPlaceholder = placeholder || t('tagInputPlaceholder');

  const addTag = () => {
    const tag = inputValue.trim();
    if (tag && !value.includes(tag) && value.length < maxTags) {
      onChange([...value, tag]);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div
        className={`
          flex flex-wrap gap-2 p-2 rounded-lg border min-h-[42px] transition-all duration-200
          focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500
          ${error
            ? 'border-red-500 dark:border-red-400'
            : 'border-gray-300 dark:border-slate-600'
          }
          ${disabled
            ? 'bg-gray-50 dark:bg-slate-900 opacity-50 cursor-not-allowed'
            : 'bg-white dark:bg-slate-800'
          }
        `}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm ${tagColors[tagVariant]}`}
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:opacity-75 transition-opacity"
                aria-label={`${t('remove')} ${tag}`}
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        ))}
        
        {!disabled && value.length < maxTags && (
          <div className="flex items-center gap-1 flex-1 min-w-[120px]">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={defaultPlaceholder}
              className="flex-1 border-0 p-0 text-sm focus:ring-0 focus:outline-none bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <button
              type="button"
              onClick={addTag}
              className="text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              aria-label={t('add')}
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      
      <div className="flex justify-between">
        <div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error.message}</p>
          )}
          {helperText && !error && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
          )}
        </div>
        {maxTags < Infinity && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {value.length}/{maxTags}
          </span>
        )}
      </div>
    </div>
  );
}
