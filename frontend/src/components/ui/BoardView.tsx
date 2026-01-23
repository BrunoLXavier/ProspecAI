import React from 'react'

export type BoardItem = {
  id: string
  title?: string
  description?: string
  metadata?: Record<string, any>
}

export type BoardColumn = {
  id: string
  title?: React.ReactNode
  items: BoardItem[]
}

type BoardViewProps = {
  columns: BoardColumn[]
  onItemClick?: (item: BoardItem) => void
  renderCard?: (item: BoardItem) => React.ReactNode
}

const BoardView: React.FC<BoardViewProps> = ({ columns, onItemClick, renderCard }) => {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-4 items-start">
        {columns.map((col) => (
          <div key={col.id} className="min-w-[260px] bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{col.title}</h3>
            <div className="space-y-3">
              {col.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onItemClick && onItemClick(item)}
                  className="cursor-pointer"
                >
                  {renderCard ? (
                    renderCard(item)
                  ) : (
                    <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-md border border-gray-100 dark:border-slate-600">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{item.title}</p>
                      {item.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-3">{item.description}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BoardView
