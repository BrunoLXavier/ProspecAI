/**
 * Order By Builder Component
 * Visual interface for configuring result ordering
 */
'use client';

import { useTranslations } from 'next-intl';
import { 
  PlusIcon, 
  TrashIcon, 
  ArrowsUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';
import { useTableSchema } from '@/hooks/use-report-builder';
import type { OrderByConfig, FieldSchema } from '@/components/features/report-builder/types';

interface OrderByBuilderProps {
  baseTable: string;
  selectedFields: string[];
  orderBy: OrderByConfig[];
  onOrderByChange: (orderBy: OrderByConfig[]) => void;
}

export default function OrderByBuilder({
  baseTable,
  selectedFields,
  orderBy,
  onOrderByChange
}: OrderByBuilderProps) {
  const t = useTranslations('reports');
  const { data: schema } = useTableSchema(baseTable);

  // Only allow ordering by sortable selected fields
  const sortableFields = (schema?.fields || []).filter(
    (f: FieldSchema) => f.sortable && selectedFields.includes(f.name)
  );

  const addOrderBy = () => {
    const availableFields = sortableFields.filter(
      (f: FieldSchema) => !orderBy.some(o => o.field === f.name)
    );
    
    if (availableFields.length === 0) return;

    const newOrder: OrderByConfig = {
      id: crypto.randomUUID(),
      field: availableFields[0].name,
      direction: 'asc'
    };
    onOrderByChange([...orderBy, newOrder]);
  };

  const updateOrderBy = (id: string, updates: Partial<OrderByConfig>) => {
    onOrderByChange(
      orderBy.map(o => o.id === id ? { ...o, ...updates } : o)
    );
  };

  const removeOrderBy = (id: string) => {
    onOrderByChange(orderBy.filter(o => o.id !== id));
  };

  const moveOrderBy = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...orderBy];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    onOrderByChange(newOrder);
  };

  const getFieldDisplayName = (fieldName: string): string => {
    return schema?.fields.find((f: FieldSchema) => f.name === fieldName)?.display_name || fieldName;
  };

  const availableForAdd = sortableFields.filter(
    (f: FieldSchema) => !orderBy.some(o => o.field === f.name)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          <ArrowsUpDownIcon className="w-4 h-4 inline-block mr-2" />
          {t('orderBy') || 'Order By'}
        </label>
        {availableForAdd.length > 0 && (
          <button
            onClick={addOrderBy}
            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <PlusIcon className="w-4 h-4" />
            {t('addSorting') || 'Add Sorting'}
          </button>
        )}
      </div>

      {orderBy.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <ArrowsUpDownIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('noSortingAdded') || 'No sorting applied'}
          </p>
          {availableForAdd.length > 0 && (
            <button
              onClick={addOrderBy}
              className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t('addSorting') || 'Add sorting'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {orderBy.map((order, index) => (
            <div
              key={order.id}
              className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              {/* Reorder handle */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveOrderBy(index, 'up')}
                  disabled={index === 0}
                  className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                >
                  <ArrowUpIcon className="w-3 h-3" />
                </button>
                <button
                  onClick={() => moveOrderBy(index, 'down')}
                  disabled={index === orderBy.length - 1}
                  className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                >
                  <ArrowDownIcon className="w-3 h-3" />
                </button>
              </div>

              <span className="text-xs text-gray-500 dark:text-gray-400 w-6 text-center">
                {index + 1}.
              </span>

              {/* Field selector */}
              <select
                value={order.field}
                onChange={(e) => updateOrderBy(order.id, { field: e.target.value })}
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sortableFields.map((field: FieldSchema) => (
                  <option 
                    key={field.name} 
                    value={field.name}
                    disabled={orderBy.some(o => o.field === field.name && o.id !== order.id)}
                  >
                    {field.display_name}
                  </option>
                ))}
              </select>

              {/* Direction toggle */}
              <button
                onClick={() => updateOrderBy(order.id, { 
                  direction: order.direction === 'asc' ? 'desc' : 'asc' 
                })}
                className={`
                  flex items-center gap-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                  ${order.direction === 'asc'
                    ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                  }
                `}
              >
                {order.direction === 'asc' ? (
                  <>
                    <ArrowUpIcon className="w-4 h-4" />
                    ASC
                  </>
                ) : (
                  <>
                    <ArrowDownIcon className="w-4 h-4" />
                    DESC
                  </>
                )}
              </button>

              {/* Remove button */}
              <button
                onClick={() => removeOrderBy(order.id)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title={t('removeSorting') || 'Remove sorting'}
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedFields.length === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {t('selectFieldsFirst') || 'Select fields first to enable sorting'}
        </p>
      )}
    </div>
  );
}
