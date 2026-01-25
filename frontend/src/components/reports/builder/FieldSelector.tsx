/**
 * Field Selector Component
 * Allows users to select fields from the base table and joined tables
 */
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  CheckIcon, 
  ChevronDownIcon, 
  ChevronRightIcon,
  HashtagIcon,
  DocumentTextIcon,
  CalendarIcon,
  IdentificationIcon,
  CheckCircleIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import { useTableSchema, useTableJoins } from '@/hooks/useReportBuilder';
import type { FieldSchema, TableSchema, RelationshipSchema } from '@/types/report-builder';

interface FieldSelectorProps {
  baseTable: string;
  selectedFields: string[];
  onFieldsChange: (fields: string[]) => void;
  joins?: { table: string }[];
}

export default function FieldSelector({
  baseTable,
  selectedFields,
  onFieldsChange,
  joins = []
}: FieldSelectorProps) {
  const t = useTranslations('reports');
  const { data: schema, isLoading } = useTableSchema(baseTable);
  const { data: availableJoins } = useTableJoins(baseTable);
  
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set([baseTable]));

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const toggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      onFieldsChange(selectedFields.filter(f => f !== field));
    } else {
      onFieldsChange([...selectedFields, field]);
    }
  };

  const toggleAllFields = (tableName: string, fields: FieldSchema[]) => {
    const prefix = tableName === baseTable ? '' : `${tableName}.`;
    const tableFields = fields.map(f => `${prefix}${f.name}`);
    
    const allSelected = tableFields.every(f => selectedFields.includes(f));
    
    if (allSelected) {
      onFieldsChange(selectedFields.filter(f => !tableFields.includes(f)));
    } else {
      const newFields = [...selectedFields];
      tableFields.forEach(f => {
        if (!newFields.includes(f)) {
          newFields.push(f);
        }
      });
      onFieldsChange(newFields);
    }
  };

  if (isLoading || !schema) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        ))}
      </div>
    );
  }

  // Get joined table schemas
  const joinedTables = joins.map(j => {
    const rel = availableJoins?.find(r => r.target_table === j.table);
    return rel ? { ...rel, isJoined: true } : null;
  }).filter(Boolean) as (RelationshipSchema & { isJoined: boolean })[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('selectFields') || 'Select Fields'}
        </label>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {selectedFields.length} {t('selected') || 'selected'}
        </span>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
        {/* Base table */}
        <TableFieldGroup
          tableName={baseTable}
          displayName={schema.display_name}
          fields={schema.fields}
          selectedFields={selectedFields}
          isExpanded={expandedTables.has(baseTable)}
          onToggleExpand={() => toggleTable(baseTable)}
          onToggleField={toggleField}
          onToggleAll={() => toggleAllFields(baseTable, schema.fields)}
          isBaseTable
        />

        {/* Joined tables */}
        {joinedTables.map(rel => (
          <TableFieldGroup
            key={rel.target_table}
            tableName={rel.target_table}
            displayName={rel.target_display_name}
            fields={rel.target_fields || []}
            selectedFields={selectedFields}
            isExpanded={expandedTables.has(rel.target_table)}
            onToggleExpand={() => toggleTable(rel.target_table)}
            onToggleField={(field) => toggleField(`${rel.target_table}.${field.split('.').pop()}`)}
            onToggleAll={() => toggleAllFields(rel.target_table, rel.target_fields || [])}
            prefix={`${rel.target_table}.`}
          />
        ))}
      </div>

      {selectedFields.length === 0 && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          {t('selectAtLeastOneField') || 'Please select at least one field'}
        </p>
      )}
    </div>
  );
}

interface TableFieldGroupProps {
  tableName: string;
  displayName: string;
  fields: FieldSchema[];
  selectedFields: string[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleField: (field: string) => void;
  onToggleAll: () => void;
  prefix?: string;
  isBaseTable?: boolean;
}

function TableFieldGroup({
  tableName,
  displayName,
  fields,
  selectedFields,
  isExpanded,
  onToggleExpand,
  onToggleField,
  onToggleAll,
  prefix = '',
  isBaseTable = false
}: TableFieldGroupProps) {
  const fieldNames = fields.map(f => `${prefix}${f.name}`);
  const selectedCount = fieldNames.filter(f => selectedFields.includes(f)).length;
  const allSelected = selectedCount === fields.length && fields.length > 0;

  return (
    <div>
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-gray-500" />
          )}
          <span className="font-medium text-gray-900 dark:text-white">{displayName}</span>
          {isBaseTable && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
              Base
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {selectedCount}/{fields.length}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleAll(); }}
            className={`
              text-xs px-2 py-1 rounded transition-colors
              ${allSelected 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 grid grid-cols-2 md:grid-cols-3 gap-2">
          {fields.map(field => {
            const fieldPath = `${prefix}${field.name}`;
            const isSelected = selectedFields.includes(fieldPath);

            return (
              <button
                key={field.name}
                onClick={() => onToggleField(fieldPath)}
                className={`
                  flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors
                  ${isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-gray-800 border border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <div className={`
                  w-4 h-4 rounded flex items-center justify-center flex-shrink-0
                  ${isSelected 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-600'
                  }
                `}>
                  {isSelected && <CheckIcon className="w-3 h-3" />}
                </div>
                <FieldTypeIcon type={field.type} />
                <span className={`truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                  {field.display_name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FieldTypeIcon({ type }: { type: FieldSchema['type'] }) {
  const className = "w-4 h-4 text-gray-400 flex-shrink-0";
  
  switch (type) {
    case 'integer':
    case 'decimal':
      return <HashtagIcon className={className} />;
    case 'string':
    case 'text':
      return <DocumentTextIcon className={className} />;
    case 'datetime':
      return <CalendarIcon className={className} />;
    case 'uuid':
      return <IdentificationIcon className={className} />;
    case 'boolean':
      return <CheckCircleIcon className={className} />;
    default:
      return <CubeIcon className={className} />;
  }
}
