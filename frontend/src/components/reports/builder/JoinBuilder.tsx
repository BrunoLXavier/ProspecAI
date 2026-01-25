/**
 * Join Builder Component
 * Visual interface for configuring table joins
 */
'use client';

import { useTranslations } from 'next-intl';
import { PlusIcon, TrashIcon, LinkIcon } from '@heroicons/react/24/outline';
import { useTableJoins } from '@/hooks/useReportBuilder';
import type { JoinConfig, RelationshipSchema } from '@/types/report-builder';

interface JoinBuilderProps {
  baseTable: string;
  joins: JoinConfig[];
  onJoinsChange: (joins: JoinConfig[]) => void;
}

export default function JoinBuilder({
  baseTable,
  joins,
  onJoinsChange
}: JoinBuilderProps) {
  const t = useTranslations('reports');
  const { data: availableJoins, isLoading } = useTableJoins(baseTable);

  const addJoin = (relationship: RelationshipSchema) => {
    // Check if already joined
    if (joins.some(j => j.table === relationship.target_table)) {
      return;
    }

    const newJoin: JoinConfig = {
      id: crypto.randomUUID(),
      table: relationship.target_table,
      on: {
        [`${baseTable}.${relationship.join_field}`]: `${relationship.target_table}.${relationship.target_field}`
      },
      type: 'LEFT'
    };
    onJoinsChange([...joins, newJoin]);
  };

  const updateJoinType = (id: string, type: 'LEFT' | 'INNER' | 'RIGHT') => {
    onJoinsChange(
      joins.map(j => j.id === id ? { ...j, type } : j)
    );
  };

  const removeJoin = (id: string) => {
    onJoinsChange(joins.filter(j => j.id !== id));
  };

  const getRelationshipInfo = (tableName: string): RelationshipSchema | undefined => {
    return availableJoins?.find(r => r.target_table === tableName);
  };

  // Filter out already joined tables
  const availableToJoin = availableJoins?.filter(
    r => !joins.some(j => j.table === r.target_table)
  ) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          <LinkIcon className="w-4 h-4 inline-block mr-2" />
          {t('tableJoins') || 'Table Joins'}
        </label>
        {availableToJoin.length > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {availableToJoin.length} {t('available') || 'available'}
          </span>
        )}
      </div>

      {/* Current joins */}
      {joins.length > 0 && (
        <div className="space-y-2">
          {joins.map(join => {
            const relInfo = getRelationshipInfo(join.table);
            return (
              <div
                key={join.id}
                className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <LinkIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-blue-700 dark:text-blue-300">
                    {relInfo?.target_display_name || join.table}
                  </p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                    {relInfo?.label}
                  </p>
                </div>
                
                <select
                  value={join.type}
                  onChange={(e) => updateJoinType(join.id, e.target.value as 'LEFT' | 'INNER' | 'RIGHT')}
                  className="px-2 py-1 text-sm border border-blue-200 dark:border-blue-700 rounded
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LEFT">LEFT JOIN</option>
                  <option value="INNER">INNER JOIN</option>
                  <option value="RIGHT">RIGHT JOIN</option>
                </select>

                <button
                  onClick={() => removeJoin(join.id)}
                  className="p-1.5 text-blue-400 hover:text-red-500 transition-colors"
                  title={t('removeJoin') || 'Remove join'}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Available joins */}
      {isLoading ? (
        <div className="animate-pulse h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      ) : availableToJoin.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {t('availableRelationships') || 'Available Relationships'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableToJoin.map(rel => (
              <button
                key={rel.target_table}
                onClick={() => addJoin(rel)}
                className="flex items-center gap-2 p-3 text-left border border-dashed border-gray-300 dark:border-gray-600 
                           rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 
                           transition-colors group"
              >
                <PlusIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                    {rel.target_display_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {rel.label} ({rel.type})
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : joins.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <LinkIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('noJoinsAvailable') || 'No relationships available for this table'}
          </p>
        </div>
      ) : null}

      {/* Help text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('joinHelpText') || 'Join related tables to include their fields in your report. LEFT JOIN includes all base table rows.'}
      </p>
    </div>
  );
}
