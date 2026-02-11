/**
 * Filter Builder Component
 * Visual interface for building query filters
 */
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PlusIcon, TrashIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { useTableSchema } from '@/hooks/use-report-builder';
import { FILTER_OPERATORS, getOperatorsForType } from '@/components/features/report-builder/types';
import type { FilterConfig, FilterOperator, FieldSchema } from '@/components/features/report-builder/types';

interface FilterBuilderProps {
  baseTable: string;
  filters: FilterConfig[];
  onFiltersChange: (filters: FilterConfig[]) => void;
}

export default function FilterBuilder({
  baseTable,
  filters,
  onFiltersChange
}: FilterBuilderProps) {
  const t = useTranslations('reports');
  const { data: schema } = useTableSchema(baseTable);

  const addFilter = () => {
    const defaultField = schema?.fields[0]?.name || '';
    const newFilter: FilterConfig = {
      id: crypto.randomUUID(),
      field: defaultField,
      operator: 'eq',
      value: ''
    };
    onFiltersChange([...filters, newFilter]);
  };

  const updateFilter = (id: string, updates: Partial<FilterConfig>) => {
    onFiltersChange(
      filters.map(f => f.id === id ? { ...f, ...updates } : f)
    );
  };

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter(f => f.id !== id));
  };

  const getFieldSchema = (fieldName: string): FieldSchema | undefined => {
    return schema?.fields.find(f => f.name === fieldName);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          <FunnelIcon className="w-4 h-4 inline-block mr-2" />
          {t('filters') || 'Filters'}
        </label>
        <button
          onClick={addFilter}
          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          <PlusIcon className="w-4 h-4" />
          {t('addFilter') || 'Add Filter'}
        </button>
      </div>

      {filters.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <FunnelIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('noFiltersAdded') || 'No filters added yet'}
          </p>
          <button
            onClick={addFilter}
            className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t('addFirstFilter') || 'Add your first filter'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filters.map((filter, index) => (
            <FilterRow
              key={filter.id}
              filter={filter}
              index={index}
              fields={schema?.fields || []}
              fieldSchema={getFieldSchema(filter.field)}
              onUpdate={(updates) => updateFilter(filter.id, updates)}
              onRemove={() => removeFilter(filter.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FilterRowProps {
  filter: FilterConfig;
  index: number;
  fields: FieldSchema[];
  fieldSchema?: FieldSchema;
  onUpdate: (updates: Partial<FilterConfig>) => void;
  onRemove: () => void;
}

function FilterRow({
  filter,
  index,
  fields,
  fieldSchema,
  onUpdate,
  onRemove
}: FilterRowProps) {
  const t = useTranslations('reports');
  const applicableOperators: FilterOperator[] = fieldSchema ? getOperatorsForType(fieldSchema.type) : ['eq'];
  const needsValue = !['is_null', 'is_not_null'].includes(filter.operator);

  const handleFieldChange = (fieldName: string) => {
    const newField = fields.find(f => f.name === fieldName);
    const newOperators = newField ? getOperatorsForType(newField.type) : ['eq' as FilterOperator];
    
    // Reset operator if current one is not applicable
    const newOperator: FilterOperator = newOperators.includes(filter.operator as FilterOperator) 
      ? (filter.operator as FilterOperator)
      : newOperators[0];
    
    onUpdate({ 
      field: fieldName, 
      operator: newOperator,
      value: '' 
    });
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      {index > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400 px-2">AND</span>
      )}
      
      {/* Field selector */}
      <select
        value={filter.field}
        onChange={(e) => handleFieldChange(e.target.value)}
        className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {fields.map(field => (
          <option key={field.name} value={field.name}>
            {field.display_name}
          </option>
        ))}
      </select>

      {/* Operator selector */}
      <select
        value={filter.operator}
        onChange={(e) => onUpdate({ operator: e.target.value as FilterOperator })}
        className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {applicableOperators.map((op: FilterOperator) => (
          <option key={op} value={op}>
            {FILTER_OPERATORS[op]}
          </option>
        ))}
      </select>

      {/* Value input */}
      {needsValue && (
        <ValueInput
          type={fieldSchema?.type || 'string'}
          value={filter.value}
          operator={filter.operator}
          onChange={(value) => onUpdate({ value })}
        />
      )}

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
        title={t('removeFilter') || 'Remove filter'}
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

interface ValueInputProps {
  type: FieldSchema['type'];
  value: FilterConfig['value'];
  operator: string;
  onChange: (value: FilterConfig['value']) => void;
}

function ValueInput({ type, value, operator, onChange }: ValueInputProps) {
  // Handle 'between' operator with two inputs
  if (operator === 'between') {
    const values = Array.isArray(value) ? value : ['', ''];
    return (
      <div className="flex items-center gap-1">
        <input
          type={type === 'datetime' ? 'date' : type === 'integer' || type === 'decimal' ? 'number' : 'text'}
          value={values[0] || ''}
          onChange={(e) => onChange([e.target.value, values[1] || ''])}
          placeholder="From"
          className="w-24 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <span className="text-gray-500 text-sm">to</span>
        <input
          type={type === 'datetime' ? 'date' : type === 'integer' || type === 'decimal' ? 'number' : 'text'}
          value={values[1] || ''}
          onChange={(e) => onChange([values[0] || '', e.target.value])}
          placeholder="To"
          className="w-24 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    );
  }

  // Handle 'in' and 'not_in' operators with comma-separated values
  if (operator === 'in' || operator === 'not_in') {
    const stringValue = Array.isArray(value) ? value.join(', ') : String(value || '');
    return (
      <input
        type="text"
        value={stringValue}
        onChange={(e) => onChange(e.target.value.split(',').map(v => v.trim()))}
        placeholder="Value1, Value2, Value3"
        className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    );
  }

  // Standard single value input
  const inputType = (() => {
    switch (type) {
      case 'integer':
      case 'decimal':
        return 'number';
      case 'datetime':
        return 'date';
      case 'boolean':
        return 'checkbox';
      default:
        return 'text';
    }
  })();

  if (type === 'boolean') {
    return (
      <select
        value={value === true ? 'true' : value === false ? 'false' : ''}
        onChange={(e) => onChange(e.target.value === 'true')}
        className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Select...</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  return (
    <input
      type={inputType}
      value={String(value || '')}
      onChange={(e) => onChange(inputType === 'number' ? Number(e.target.value) : e.target.value)}
      placeholder="Value..."
      step={type === 'decimal' ? '0.01' : undefined}
      className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  );
}
