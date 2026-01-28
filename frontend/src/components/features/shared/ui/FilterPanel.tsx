// Collapsible Filter Panel Component
// Reusable component for advanced filtering on list pages
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDownIcon, ChevronUpIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface FilterField {
  key: string;
  label: string;
  type: 'select' | 'text' | 'date' | 'number' | 'range' | 'checkbox';
  options?: { value: string; label: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
  // For range type fields
  minKey?: string;
  maxKey?: string;
  inputType?: 'text' | 'number' | 'date';
}

interface FilterPanelProps {
  fields: FilterField[];
  values: Record<string, any>;
  onChange: (key: string, value: string | boolean) => void;
  onReset: () => void;
  title?: string;
  defaultExpanded?: boolean;
}

export default function FilterPanel({
  fields,
  values,
  onChange,
  onReset,
  title,
  defaultExpanded = false,
}: FilterPanelProps) {
  const t = useTranslations('common');
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  // Count active filters (excluding 'all' values and empty strings)
  const activeFiltersCount = Object.entries(values).filter(([_, v]) => 
    v !== '' && v !== 'all' && v !== undefined && v !== null && v !== false
  ).length;
  
  const renderField = (field: FilterField) => {
    const inputClassName = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent";
    
    switch (field.type) {
      case 'select':
        return (
          <select
            value={values[field.key] ?? ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={inputClassName}
          >
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
        
      case 'text':
        return (
          <input
            type="text"
            value={values[field.key] ?? ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className={inputClassName}
          />
        );
        
      case 'date':
        return (
          <input
            type="date"
            value={values[field.key] ?? ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={inputClassName}
          />
        );
        
      case 'number':
        return (
          <input
            type="number"
            value={values[field.key] ?? ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            className={inputClassName}
          />
        );
        
      case 'range':
        const minKey = field.minKey || `${field.key}Min`;
        const maxKey = field.maxKey || `${field.key}Max`;
        const inputType = field.inputType || 'number';
        
        return (
          <div className="flex items-center gap-2">
            <input
              type={inputType}
              value={values[minKey] ?? ''}
              onChange={(e) => onChange(minKey, e.target.value)}
              placeholder={t('min')}
              min={field.min}
              max={field.max}
              className={inputClassName}
            />
            <span className="text-gray-400 flex-shrink-0">-</span>
            <input
              type={inputType}
              value={values[maxKey] ?? ''}
              onChange={(e) => onChange(maxKey, e.target.value)}
              placeholder={t('max')}
              min={field.min}
              max={field.max}
              className={inputClassName}
            />
          </div>
        );
        
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={values[field.key] === true}
              onChange={(e) => onChange(field.key, e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{field.placeholder}</span>
          </label>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        aria-expanded={expanded}
        aria-label={expanded ? t('collapseFilters') : t('expandFilters')}
      >
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-white">
            {title || t('filters')}
          </span>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full">
              {activeFiltersCount} {t('activeFilters')}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUpIcon className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
        )}
      </button>
      
      {/* Filter Fields */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
            {fields.map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {field.label}
                </label>
                {renderField(field)}
              </div>
            ))}
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
              {t('resetFilters')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
