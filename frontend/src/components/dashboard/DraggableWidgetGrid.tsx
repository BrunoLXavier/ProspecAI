/**
 * DraggableWidgetGrid Component
 * Allows users to drag and drop widgets to reorder them on the Dashboard
 * Uses @dnd-kit for accessible drag and drop functionality
 */
'use client';

import React, { Suspense, useState, useCallback } from 'react';
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
import { Bars3Icon, LockClosedIcon } from '@heroicons/react/24/outline';

// =============================================================================
// Types
// =============================================================================

interface WidgetConfig {
  id: string;
  label: string;
  size: 'small' | 'medium' | 'large' | 'full';
}

interface DraggableWidgetGridProps {
  widgets: WidgetConfig[];
  widgetOrder: string[];
  onOrderChange: (newOrder: string[]) => void;
  renderWidget: (widgetId: string, isDragging?: boolean) => React.ReactNode;
  isEditMode: boolean;
  onToggleEditMode: () => void;
}

interface SortableWidgetProps {
  widget: WidgetConfig;
  children: React.ReactNode;
  isEditMode: boolean;
}

// =============================================================================
// Widget Skeleton for Overlay
// =============================================================================

function WidgetOverlaySkeleton({ size }: { size: string }) {
  const sizeClasses = {
    small: 'h-32',
    medium: 'h-48',
    large: 'h-64',
    full: 'h-48',
  };
  return (
    <div className={`bg-blue-100 rounded-xl border-2 border-blue-400 border-dashed ${sizeClasses[size as keyof typeof sizeClasses] || 'h-48'} opacity-80`} />
  );
}

// =============================================================================
// Sortable Widget Wrapper
// =============================================================================

function SortableWidget({ widget, children, isEditMode }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Grid column span based on widget size
  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-1 lg:col-span-1',
    large: 'col-span-1 lg:col-span-2',
    full: 'col-span-1 lg:col-span-2',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${sizeClasses[widget.size]} ${isEditMode ? 'cursor-move' : ''}`}
    >
      {/* Drag Handle (visible in edit mode) */}
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -top-2 -left-2 z-10 p-1.5 bg-blue-600 text-white rounded-lg shadow-lg cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          title="Arrastar para reordenar"
        >
          <Bars3Icon className="w-4 h-4" />
        </div>
      )}
      
      {/* Edit Mode Border */}
      {isEditMode && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-300 rounded-xl pointer-events-none z-0" />
      )}
      
      {/* Widget Content */}
      <div className={isEditMode ? 'pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function DraggableWidgetGrid({
  widgets,
  widgetOrder,
  onOrderChange,
  renderWidget,
  isEditMode,
  onToggleEditMode,
}: DraggableWidgetGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [columns, setColumns] = useState<number>(typeof window !== 'undefined' && window.innerWidth >= 1024 ? 2 : 1);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activation
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = sortedWidgets.findIndex(w => w.id === active.id);
      const newIndex = sortedWidgets.findIndex(w => w.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newSortedWidgets = arrayMove(sortedWidgets, oldIndex, newIndex);
        const newOrder = newSortedWidgets.map(w => w.id);
        onOrderChange(newOrder);
      }
    }
  }, [sortedWidgets, onOrderChange]);

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
              Concluir Organização
            </>
          ) : (
            <>
              <Bars3Icon className="w-4 h-4" />
              Organizar Widgets
            </>
          )}
        </button>
      </div>

      {/* Edit Mode Instructions */}
      {isEditMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Modo de Organização:</strong> Arraste os widgets para reorganizá-los. 
            Clique em "Concluir Organização" quando terminar.
          </p>
        </div>
      )}

      {/* Draggable Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortedWidgets.map(w => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sortedWidgets.map((widget) => (
              <SortableWidget key={widget.id} widget={widget} isEditMode={isEditMode}>
                {renderWidget(widget.id, activeId === widget.id)}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>

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
