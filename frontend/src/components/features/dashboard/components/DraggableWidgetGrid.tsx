/**
 * DraggableWidgetGrid Component
 * Allows users to drag and drop widgets to reorder them on the Dashboard
 * Uses @dnd-kit for accessible drag and drop functionality
 */
'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { EyeIcon, EyeSlashIcon, Bars3Icon, LockClosedIcon } from '@heroicons/react/24/outline';
import type { MouseEvent } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// =============================================================================
// Types
// =============================================================================

interface WidgetConfig {
  id: string;
  label?: string;
  size?: 'small' | 'medium' | 'large' | 'full';
}

interface DraggableWidgetGridProps {
  widgets: WidgetConfig[];
  widgetOrder: string[];
  onOrderChange: (newOrder: string[]) => void;
  renderWidget: (widgetId: string, isDragging?: boolean) => React.ReactNode;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onToggleWidget?: (id: string, enable: boolean) => Promise<void> | void;
  disabledWidgets?: string[];
}

interface SortableWidgetProps {
  widget: WidgetConfig;
  children: React.ReactNode;
  isEditMode: boolean;
  overlay?: React.ReactNode;
}

// =============================================================================
// Widget Skeleton for Overlay
// =============================================================================

function WidgetOverlaySkeleton({ size = 'medium' }: { size?: string }) {
  const sizeClasses: Record<string, string> = {
    small: 'h-32',
    medium: 'h-48',
    large: 'h-64',
    full: 'h-48',
  };

  return (
    <div
      className={`bg-blue-100 rounded-xl border-2 border-blue-400 border-dashed ${
        sizeClasses[size] ?? 'h-48'
      } opacity-80`}
    />
  );
}

// =============================================================================
// Sortable Widget Wrapper
// =============================================================================

function SortableWidget({ widget, children, isEditMode, overlay }: SortableWidgetProps) {
  const t = useTranslations('dashboard');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
    disabled: !isEditMode,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const sizeClasses: Record<string, string> = {
    small: 'col-span-1',
    medium: 'col-span-1 lg:col-span-1',
    large: 'col-span-1 lg:col-span-2',
    full: 'col-span-1 lg:col-span-2',
  };

  const spanClass = sizeClasses[widget.size ?? 'medium'];

  return (
    <div ref={setNodeRef} style={style} className={`relative group ${spanClass} ${isEditMode ? 'cursor-move' : ''}`}>
      {overlay && <div className="absolute top-2 right-2 z-40 pointer-events-auto">{overlay}</div>}

      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -top-2 -left-2 z-10 p-1.5 bg-blue-600 text-white rounded-lg shadow-lg cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          title={t('dragToReorder')}
        >
          <Bars3Icon className="w-4 h-4" />
        </div>
      )}

      {isEditMode && <div className="absolute inset-0 border-2 border-dashed border-blue-300 rounded-xl pointer-events-none z-0" />}

      <div className={isEditMode ? 'pointer-events-none' : ''}>{children}</div>
    </div>
  );

    }

    export default function DraggableWidgetGrid({
  widgets,
  widgetOrder,
  onOrderChange,
  renderWidget,
  isEditMode,
  onToggleEditMode,
  onToggleWidget,
  disabledWidgets,
}: DraggableWidgetGridProps) {
  const t = useTranslations('dashboard');
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sort widgets by user's custom order
  const sortedWidgets = [...widgets].sort((a, b) => {
    const orderA = widgetOrder.indexOf(a.id);
    const orderB = widgetOrder.indexOf(b.id);
    // If not in order array, maintain original position
    if (orderA === -1 && orderB === -1) return 0;
    if (orderA === -1) return 1;
    if (orderB === -1) return -1;
    return orderA - orderB;
  });

  

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    // Log event for debugging
    try {
      // eslint-disable-next-line no-console
      console.debug('[DraggableWidgetGrid] dragstart', { id: event.active.id, data: event.active.data });
    } catch (e) {}
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    try {
      // eslint-disable-next-line no-console
      console.debug('[DraggableWidgetGrid] dragend', { active: active?.id, over: over?.id });
    } catch (e) {}

    // If there's no target (dropped on empty space) move to end
    const activeId = active.id as string;
    const overId = over?.id as string | undefined;

    const oldIndex = sortedWidgets.findIndex(w => w.id === activeId);
    let newIndex = -1;

    if (overId) {
      newIndex = sortedWidgets.findIndex(w => w.id === overId);
    } else {
      // dropped on empty area - place at end
      newIndex = sortedWidgets.length - 1;
    }

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const newSortedWidgets = arrayMove(sortedWidgets, oldIndex, newIndex);
      const newOrder = newSortedWidgets.map(w => w.id);
      try {
        // eslint-disable-next-line no-console
        console.debug('[DraggableWidgetGrid] newOrder', newOrder);
      } catch (e) {}
      onOrderChange(newOrder);
    }
  }, [sortedWidgets, onOrderChange]);

  const handleDragCancel = useCallback(() => {
    try {
      // eslint-disable-next-line no-console
      console.debug('[DraggableWidgetGrid] dragcancel');
    } catch (e) {}
    setActiveId(null);
  }, []);

  const activeWidget = activeId ? widgets.find(w => w.id === activeId) : null;

  return (
    <div className="space-y-4">
      {/* Edit Mode Toggle Button */}
      <div className="flex justify-end">
        <button
          onClick={onToggleEditMode}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            isEditMode
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {isEditMode ? (
            <>
              <LockClosedIcon className="w-4 h-4" />
              {t('finishOrganization')}
            </>
          ) : (
            <>
              <Bars3Icon className="w-4 h-4" />
              {t('organizeWidgets')}
            </>
          )}
        </button>
      </div>

      {/* Edit Mode Instructions */}
      {isEditMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>{t('organizationMode')}:</strong> {t('dragInstructions')}{' '}
            {t('clickDoneWhenFinished')}
          </p>
        </div>
      )}

      {/* Draggable Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={sortedWidgets.map(w => w.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sortedWidgets.map((widget) => (
                  <SortableWidget
                    key={widget.id}
                    widget={widget}
                    isEditMode={isEditMode}
                    overlay={isEditMode && onToggleWidget ? (
                      <button
                        onClick={async (e: MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          try {
                            await onToggleWidget(widget.id, false);
                          } catch (err) {
                            // eslint-disable-next-line no-console
                            console.warn('toggle widget failed', err);
                          }
                        }}
                        title={t('hideThisWidget')}
                        className="bg-white dark:bg-slate-800 border rounded p-1 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        <EyeSlashIcon className="w-4 h-4 text-gray-600 dark:text-gray-200" />
                      </button>
                    ) : undefined}
                  >
                    {renderWidget(widget.id, activeId === widget.id)}
                  </SortableWidget>
                ))}
              </div>
        </SortableContext>

          {/* Disabled widgets panel (only in edit mode) */}
          {isEditMode && disabledWidgets && disabledWidgets.length > 0 && (
            <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('disabledWidgets')}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {disabledWidgets.map(id => (
                  <div key={id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <span className="text-sm">{id}</span>
                    <button
                      className="px-2 py-1 text-xs bg-primary-600 text-white rounded"
                      onClick={async () => { try { if (onToggleWidget) await onToggleWidget(id, true); } catch (e) { console.warn('enable widget failed', e); } }}
                    >
                      <EyeIcon className="w-4 h-4 inline-block mr-1" />
                      {t('activate')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drag Overlay */}
        <DragOverlay>
          {activeWidget ? (
            <WidgetOverlaySkeleton size={activeWidget.size} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
