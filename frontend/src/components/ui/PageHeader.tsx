// Page Header Component
// Standardized header for all list pages with title, subtitle, view toggle, and actions
// Follows the Opportunities page layout pattern
'use client';

import { ReactNode } from 'react';
import ViewToggle, { ViewMode } from './ViewToggle';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  viewToggle?: boolean;
  viewMode?: ViewMode;
  onViewChange?: (mode: ViewMode) => void;
  listLabel?: string;
  listIcon?: React.ReactNode;
  action?: ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  viewToggle = false,
  viewMode = 'list',
  onViewChange,
  listLabel,
  listIcon,
  action,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${className}`}>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {viewToggle && onViewChange && (
          <ViewToggle
            viewMode={viewMode}
            onViewChange={onViewChange}
            persistToUrl={true}
            listLabel={listLabel}
            listIcon={listIcon}
          />
        )}
        {action}
      </div>
    </div>
  );
}
