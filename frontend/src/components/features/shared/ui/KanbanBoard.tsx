// Generic Kanban Board Component
// Reusable kanban board with optional drag-and-drop support
// Used for Board views across multiple pages
'use client';

import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader } from '@/components/features/shared/ui/Card';

export interface KanbanColumn<T = any> {
  key: string;
  label: string;
  color: string; // Tailwind gradient classes like 'from-blue-500 to-blue-600'
  items: T[];
}

interface KanbanBoardProps<T> {
  title?: string;
  columns: KanbanColumn<T>[];
  renderItem: (item: T) => ReactNode;
  emptyMessage?: string;
  onDragEnd?: (itemId: string, fromColumn: string, toColumn: string) => void;
  enableDragDrop?: boolean;
  className?: string;
}

export default function KanbanBoard<T extends { id: string }>({
  title,
  columns,
  renderItem,
  emptyMessage,
  onDragEnd,
  enableDragDrop = false,
  className = '',
}: KanbanBoardProps<T>) {
  const t = useTranslations('common');
  const handleDragStart = (e: React.DragEvent, itemId: string, columnKey: string) => {
    if (!enableDragDrop) return;
    e.dataTransfer.setData('itemId', itemId);
    e.dataTransfer.setData('fromColumn', columnKey);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!enableDragDrop) return;
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, toColumn: string) => {
    if (!enableDragDrop || !onDragEnd) return;
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    const fromColumn = e.dataTransfer.getData('fromColumn');
    if (fromColumn !== toColumn) {
      onDragEnd(itemId, fromColumn, toColumn);
    }
  };

  return (
    <Card padding="lg" hover="subtle" className={className}>
      {title && (
        <CardHeader title={title} className="mb-6" />
      )}

      <div className="flex space-x-4 overflow-x-auto pb-4 -mx-2 px-2">
        {columns.map((column) => (
          <div
            key={column.key}
            className="flex-shrink-0 w-64 bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.key)}
          >
            {/* Column Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${column.color}`} />
              <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex-1">
                {column.label}
              </h3>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full shadow-sm">
                {column.items.length}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-2 min-h-[100px]">
              {column.items.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-400 dark:text-gray-500">
                  {emptyMessage || t('noItems')}
                </div>
              ) : (
                column.items.map((item) => (
                  <div
                    key={item.id}
                    draggable={enableDragDrop}
                    onDragStart={(e) => handleDragStart(e, item.id, column.key)}
                    className={enableDragDrop ? 'cursor-grab active:cursor-grabbing' : ''}
                  >
                    {renderItem(item)}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
