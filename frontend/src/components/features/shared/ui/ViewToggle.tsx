// View Toggle Component
// Reusable toggle between List, Board (Kanban), Timeline, and Table views
// Used across multiple pages for consistent UX
'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  Squares2X2Icon, 
  ListBulletIcon, 
  TableCellsIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';

export type ViewMode = 'list' | 'board' | 'timeline' | 'table';

interface ViewOption {
  mode: ViewMode;
  icon: ReactNode;
  label: string;
}

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
  persistToUrl?: boolean;
  /** Which view modes to show. Defaults to all 4 */
  availableModes?: ViewMode[];
  /** Custom labels for each mode */
  labels?: Partial<Record<ViewMode, string>>;
}

const DEFAULT_VIEW_OPTIONS: ViewOption[] = [
  { mode: 'list', icon: <ListBulletIcon className="w-5 h-5" />, label: 'List View' },
  { mode: 'board', icon: <Squares2X2Icon className="w-5 h-5" />, label: 'Board View' },
  { mode: 'timeline', icon: <ClockIcon className="w-5 h-5" />, label: 'Timeline View' },
  { mode: 'table', icon: <TableCellsIcon className="w-5 h-5" />, label: 'Table View' },
];

const ALL_MODES: ViewMode[] = ['list', 'board', 'timeline', 'table'];

export default function ViewToggle({
  viewMode,
  onViewChange,
  persistToUrl = true,
  availableModes = ALL_MODES,
  labels = {},
}: ViewToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filter options based on available modes
  const viewOptions = DEFAULT_VIEW_OPTIONS.filter(opt => availableModes.includes(opt.mode));

  // Sync with URL on mount
  useEffect(() => {
    if (persistToUrl) {
      const urlView = searchParams.get('view') as ViewMode | null;
      if (urlView && availableModes.includes(urlView) && urlView !== viewMode) {
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
      {viewOptions.map((option) => (
        <button
          key={option.mode}
          onClick={() => handleViewChange(option.mode)}
          className={`${baseButtonClass} ${viewMode === option.mode ? activeClass : inactiveClass}`}
          title={labels[option.mode] || option.label}
          aria-label={labels[option.mode] || option.label}
          aria-pressed={viewMode === option.mode}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}

// Hook to manage view mode state with URL persistence
export function useViewMode(defaultMode: ViewMode = 'list', availableModes: ViewMode[] = ALL_MODES): [ViewMode, (mode: ViewMode) => void] {
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const initialMode = urlView && availableModes.includes(urlView) ? urlView : defaultMode;
  
  const [viewMode, setViewMode] = __useState<ViewMode>(initialMode);
  
  return [viewMode, setViewMode];
}

// Re-export useState to avoid import issues
import { useState as __useState } from 'react';
