// View Toggle Component
// Reusable toggle between Board (Kanban) and Table views
// Used across multiple pages for consistent UX
'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';

export type ViewMode = 'board' | 'list';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
  persistToUrl?: boolean;
  boardLabel?: string;
  listLabel?: string;
  listIcon?: ReactNode;
}

export default function ViewToggle({
  viewMode,
  onViewChange,
  persistToUrl = true,
  boardLabel = 'Board View',
  listLabel = 'List View',
  listIcon,
}: ViewToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Sync with URL on mount
  useEffect(() => {
    if (persistToUrl) {
      const urlView = searchParams.get('view') as ViewMode | null;
      if (urlView && (urlView === 'board' || urlView === 'list') && urlView !== viewMode) {
        onViewChange(urlView);
      }
    }
  }, []);

  const handleViewChange = (mode: ViewMode) => {
    onViewChange(mode);

    if (persistToUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('view', mode);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

  const baseButtonClass = 'p-2 transition-colors duration-150';
  const activeClass = 'bg-primary-600 text-white';
  const inactiveClass = 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600';

  return (
    <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      <button
        onClick={() => handleViewChange('board')}
        className={`${baseButtonClass} ${viewMode === 'board' ? activeClass : inactiveClass}`}
        title={boardLabel}
        aria-label={boardLabel}
        aria-pressed={viewMode === 'board'}
      >
        <Squares2X2Icon className="w-5 h-5" />
      </button>
      <button
        onClick={() => handleViewChange('list')}
        className={`${baseButtonClass} ${viewMode === 'list' ? activeClass : inactiveClass}`}
        title={listLabel}
        aria-label={listLabel}
        aria-pressed={viewMode === 'list'}
      >
        {listIcon ? listIcon : <ListBulletIcon className="w-5 h-5" />}
      </button>
    </div>
  );
}

// Hook to manage view mode state with URL persistence
export function useViewMode(defaultMode: ViewMode = 'list'): [ViewMode, (mode: ViewMode) => void] {
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const initialMode = urlView === 'board' || urlView === 'list' ? urlView : defaultMode;
  
  const [viewMode, setViewMode] = __useState<ViewMode>(initialMode);
  
  return [viewMode, setViewMode];
}

// Re-export useState to avoid import issues
import { useState as __useState } from 'react';
