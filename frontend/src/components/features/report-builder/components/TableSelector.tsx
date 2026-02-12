/**
 * Table Selector Component
 * Allows users to select a base table for their report
 */
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TableCellsIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useReportableTables } from '@/hooks/use-report-builder';
import type { TableSummary } from '@/components/features/report-builder/types';

interface TableSelectorProps {
  selectedTable: string | null;
  onSelect: (tableName: string) => void;
}

export default function TableSelector({ selectedTable, onSelect }: TableSelectorProps) {
  const t = useTranslations('reports');
  const { data: tables, isLoading, error } = useReportableTables();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTables = tables?.filter((table: TableSummary) =>
    table.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>{t('errorLoadingTables') || 'Failed to load tables'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('selectBaseTable') || 'Select Base Table'}
        </label>
        <input
          type="text"
          placeholder={t('searchTables') || 'Search tables...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid gap-3 max-h-96 overflow-y-auto">
        {filteredTables.map((table: TableSummary) => (
          <TableCard
            key={table.table_name}
            table={table}
            isSelected={selectedTable === table.table_name}
            onSelect={() => onSelect(table.table_name)}
          />
        ))}
        
        {filteredTables.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <TableCellsIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t('noTablesFound') || 'No tables found'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface TableCardProps {
  table: TableSummary;
  isSelected: boolean;
  onSelect: () => void;
}

function TableCard({ table, isSelected, onSelect }: TableCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left p-4 rounded-lg border-2 transition-all
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`
            p-2 rounded-lg
            ${isSelected 
              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }
          `}>
            <TableCellsIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
              {table.display_name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {table.description || table.table_name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
            {table.field_count} fields
          </span>
          {isSelected && (
            <CheckCircleIcon className="w-6 h-6 text-blue-500" />
          )}
        </div>
      </div>
    </button>
  );
}
