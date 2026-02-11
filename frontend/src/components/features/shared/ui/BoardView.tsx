/**
 * BoardView Component (Legacy Adapter)
 * Thin wrapper around KanbanBoard for backward compatibility.
 * New code should use KanbanBoard directly with enableDragDrop prop.
 * @deprecated Use KanbanBoard instead
 */
import React from 'react';
import KanbanBoard, { KanbanColumn } from './KanbanBoard';

export type BoardItem = {
  id: string;
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
};

export type BoardColumn = {
  id: string;
  title?: React.ReactNode;
  items: BoardItem[];
};

type BoardViewProps = {
  columns: BoardColumn[];
  onItemClick?: (item: BoardItem) => void;
  renderCard?: (item: BoardItem) => React.ReactNode;
};

const BoardView: React.FC<BoardViewProps> = ({ columns, onItemClick, renderCard }) => {
  // Adapt BoardColumn[] to KanbanColumn[]
  const kanbanColumns: KanbanColumn<BoardItem>[] = columns.map((col) => ({
    key: col.id,
    label: typeof col.title === 'string' ? col.title : col.id,
    color: 'from-gray-400 to-gray-500',
    items: col.items,
  }));

  return (
    <KanbanBoard<BoardItem>
      columns={kanbanColumns}
      renderItem={(item) => {
        if (renderCard) return renderCard(item);
        return (
          <div
            onClick={() => onItemClick?.(item)}
            className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 cursor-pointer hover:shadow-sm transition-shadow"
          >
            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{item.title}</p>
            {item.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-3">{item.description}</p>
            )}
          </div>
        );
      }}
      enableDragDrop={false}
    />
  );
};

export default BoardView;
