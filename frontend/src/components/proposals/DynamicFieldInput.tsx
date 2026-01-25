/**
 * DynamicFieldInput Component
 * Renders form fields dynamically based on field template type
 * Implements RF-08: Dynamic form fields for proposals
 */
'use client';

import { useState } from 'react';
import { UseFormRegister, FieldErrors, Control, Controller } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import {
  ExclamationCircleIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

// Field type enum matching backend
export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'date' 
  | 'select' 
  | 'multiselect'
  | 'array' 
  | 'object' 
  | 'currency' 
  | 'trl' 
  | 'percentage' 
  | 'file' 
  | 'richtext';

export interface FieldTemplate {
  field_key: string;
  label: string;
  field_type: FieldType;
  order: number;
  required: boolean;
  help_text?: string;
  placeholder?: string;
  validation_rules?: Record<string, unknown>;
  options?: Array<{ value: string; label: string }>;
  auto_fill_prompt?: string;
}

export interface AutoFillSuggestion {
  id: string;
  field_key: string;
  suggested_value: unknown;
  confidence_score: number;
  source_text?: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface DynamicFieldInputProps {
  field: FieldTemplate;
  register: UseFormRegister<Record<string, unknown>>;
  control: Control<Record<string, unknown>>;
  errors: FieldErrors;
  value?: unknown;
  suggestion?: AutoFillSuggestion;
  onAcceptSuggestion?: (suggestionId: string, value: unknown) => void;
  onRejectSuggestion?: (suggestionId: string) => void;
  disabled?: boolean;
}

/**
 * Get confidence badge color based on score
 */
function getConfidenceBadge(score: number): { color: string; label: string } {
  if (score >= 0.8) {
    return { color: 'bg-green-100 text-green-800 border-green-300', label: 'Alta' };
  } else if (score >= 0.6) {
    return { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Média' };
  }
  return { color: 'bg-red-100 text-red-800 border-red-300', label: 'Baixa' };
}

/**
 * Format currency value for display
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export default function DynamicFieldInput({
  field,
  register,
  control,
  errors,
  value,
  suggestion,
  onAcceptSuggestion,
  onRejectSuggestion,
  disabled = false,
}: DynamicFieldInputProps) {
  const t = useTranslations('proposals');
  const [showSuggestion, setShowSuggestion] = useState(!!suggestion);
  
  const error = errors[field.field_key];
  const hasError = !!error;
  const hasSuggestion = suggestion && suggestion.status === 'pending';
  
  const baseInputClasses = `
    block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset 
    focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6
    ${hasError 
      ? 'ring-red-300 focus:ring-red-500 text-red-900 placeholder:text-red-300' 
      : 'ring-gray-300 focus:ring-blue-600 text-gray-900 placeholder:text-gray-400'
    }
    ${hasSuggestion ? 'ring-amber-300' : ''}
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
  `;

  // Render suggestion banner if available
  const renderSuggestionBanner = () => {
    if (!hasSuggestion || !showSuggestion) return null;
    
    const badge = getConfidenceBadge(suggestion!.confidence_score);
    
    return (
      <div className="mt-1 p-3 bg-amber-50 border border-amber-200 rounded-md">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <SparklesIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-amber-800">
                  {t('auto_fill.suggestion_label')}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.color}`}>
                  {Math.round(suggestion!.confidence_score * 100)}% {badge.label}
                </span>
              </div>
              <p className="text-sm text-amber-700">
                {typeof suggestion!.suggested_value === 'object' 
                  ? JSON.stringify(suggestion!.suggested_value, null, 2)
                  : String(suggestion!.suggested_value)
                }
              </p>
              {suggestion!.source_text && (
                <p className="text-xs text-amber-600 mt-1 italic">
                  "{suggestion!.source_text}"
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-1 ml-2">
            <button
              type="button"
              onClick={() => {
                onAcceptSuggestion?.(suggestion!.id, suggestion!.suggested_value);
                setShowSuggestion(false);
              }}
              className="p-1 text-green-600 hover:bg-green-100 rounded"
              title={t('auto_fill.accept')}
            >
              <CheckCircleIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                onRejectSuggestion?.(suggestion!.id);
                setShowSuggestion(false);
              }}
              className="p-1 text-red-600 hover:bg-red-100 rounded"
              title={t('auto_fill.reject')}
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render input based on field type
  const renderInput = () => {
    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            {...register(field.field_key, { required: field.required })}
            placeholder={field.placeholder}
            disabled={disabled}
            className={baseInputClasses}
          />
        );
      
      case 'textarea':
      case 'richtext':
        return (
          <textarea
            {...register(field.field_key, { required: field.required })}
            placeholder={field.placeholder}
            disabled={disabled}
            rows={field.field_type === 'richtext' ? 8 : 4}
            className={baseInputClasses}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            {...register(field.field_key, { 
              required: field.required,
              valueAsNumber: true,
              min: field.validation_rules?.min as number | undefined,
              max: field.validation_rules?.max as number | undefined,
            })}
            placeholder={field.placeholder}
            disabled={disabled}
            className={baseInputClasses}
          />
        );
      
      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
            <input
              type="number"
              step="0.01"
              {...register(field.field_key, { 
                required: field.required,
                valueAsNumber: true,
              })}
              placeholder={field.placeholder || '0,00'}
              disabled={disabled}
              className={`${baseInputClasses} pl-10`}
            />
          </div>
        );
      
      case 'date':
        return (
          <input
            type="date"
            {...register(field.field_key, { required: field.required })}
            disabled={disabled}
            className={baseInputClasses}
          />
        );
      
      case 'select':
        return (
          <select
            {...register(field.field_key, { required: field.required })}
            disabled={disabled}
            className={baseInputClasses}
          >
            <option value="">{field.placeholder || t('select_option')}</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      
      case 'multiselect':
        return (
          <Controller
            name={field.field_key}
            control={control}
            rules={{ required: field.required }}
            render={({ field: controlField }) => (
              <select
                multiple
                value={(controlField.value as string[]) || []}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
                  controlField.onChange(selected);
                }}
                disabled={disabled}
                className={`${baseInputClasses} h-32`}
              >
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          />
        );
      
      case 'trl':
        return (
          <Controller
            name={field.field_key}
            control={control}
            rules={{ required: field.required }}
            render={({ field: controlField }) => (
              <div className="space-y-2">
                <input
                  type="range"
                  min={1}
                  max={9}
                  value={(controlField.value as number) || 1}
                  onChange={(e) => controlField.onChange(parseInt(e.target.value, 10))}
                  disabled={disabled}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <span 
                      key={n}
                      className={n === (controlField.value as number) ? 'font-bold text-blue-600' : ''}
                    >
                      {n}
                    </span>
                  ))}
                </div>
                <div className="text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    TRL {(controlField.value as number) || 1}
                  </span>
                </div>
              </div>
            )}
          />
        );
      
      case 'percentage':
        return (
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              {...register(field.field_key, { 
                required: field.required,
                valueAsNumber: true,
                min: 0,
                max: 100,
              })}
              placeholder={field.placeholder || '0'}
              disabled={disabled}
              className={`${baseInputClasses} pr-8`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
          </div>
        );
      
      case 'array':
        return (
          <Controller
            name={field.field_key}
            control={control}
            rules={{ required: field.required }}
            render={({ field: controlField }) => (
              <ArrayFieldInput
                value={(controlField.value as string[]) || []}
                onChange={controlField.onChange}
                placeholder={field.placeholder}
                disabled={disabled}
              />
            )}
          />
        );
      
      case 'object':
        return (
          <Controller
            name={field.field_key}
            control={control}
            rules={{ required: field.required }}
            render={({ field: controlField }) => (
              <textarea
                value={JSON.stringify(controlField.value || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    controlField.onChange(parsed);
                  } catch {
                    // Invalid JSON, keep raw value
                  }
                }}
                placeholder={field.placeholder || '{}'}
                disabled={disabled}
                rows={6}
                className={`${baseInputClasses} font-mono text-sm`}
              />
            )}
          />
        );
      
      default:
        return (
          <input
            type="text"
            {...register(field.field_key)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={baseInputClasses}
          />
        );
    }
  };

  return (
    <div className="space-y-1">
      <label 
        htmlFor={field.field_key}
        className="block text-sm font-medium text-gray-700"
      >
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
        {field.auto_fill_prompt && (
          <SparklesIcon 
            className="inline-block h-4 w-4 ml-1 text-amber-500" 
            title={t('auto_fill.supported')}
          />
        )}
      </label>
      
      {renderInput()}
      
      {field.help_text && (
        <p className="text-xs text-gray-500">{field.help_text}</p>
      )}
      
      {hasError && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <ExclamationCircleIcon className="h-4 w-4" />
          {error?.message as string || t('field_required')}
        </p>
      )}
      
      {renderSuggestionBanner()}
    </div>
  );
}

/**
 * Array field input component for handling list values
 */
interface ArrayFieldInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

function ArrayFieldInput({ value, onChange, placeholder, disabled }: ArrayFieldInputProps) {
  const t = useTranslations('proposals');
  const [inputValue, setInputValue] = useState('');

  const addItem = () => {
    if (inputValue.trim()) {
      onChange([...value, inputValue.trim()]);
      setInputValue('');
    }
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 block rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={disabled || !inputValue.trim()}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {t('add')}
        </button>
      </div>
      
      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((item, index) => (
            <li
              key={index}
              className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded-md text-sm"
            >
              <span>{item}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <XCircleIcon className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
