/**
 * TimelineView Component
 * Vertical timeline with connections for activity/history visualization
 * Implements RF-07: Activity tracking and visualization
 */
'use client';

import { ReactNode, useMemo } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { useTranslations } from 'next-intl';

// Timeline item status variants
const timelineItemVariants = cva(
  'relative flex gap-4',
  {
    variants: {
      status: {
        default: '',
        success: '',
        warning: '',
        error: '',
        info: '',
        pending: '',
      },
    },
    defaultVariants: {
      status: 'default',
    },
  }
);

// Dot/icon variants based on status
const dotVariants = cva(
  'flex-shrink-0 flex items-center justify-center rounded-full z-10 transition-all duration-200',
  {
    variants: {
      status: {
        default: 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400',
        success: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
        error: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
        info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
        pending: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      },
      size: {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-10 h-10',
      },
    },
    defaultVariants: {
      status: 'default',
      size: 'md',
    },
  }
);

// Connector line variants
const connectorVariants = cva(
  'absolute left-1/2 -translate-x-1/2 w-0.5 transition-all duration-200',
  {
    variants: {
      status: {
        default: 'bg-gray-200 dark:bg-gray-600',
        success: 'bg-green-200 dark:bg-green-800',
        warning: 'bg-yellow-200 dark:bg-yellow-800',
        error: 'bg-red-200 dark:bg-red-800',
        info: 'bg-blue-200 dark:bg-blue-800',
        pending: 'bg-purple-200 dark:bg-purple-800',
      },
      dashed: {
        true: 'border-l-2 border-dashed bg-transparent',
        false: '',
      },
    },
    defaultVariants: {
      status: 'default',
      dashed: false,
    },
  }
);

export interface TimelineItem {
  /** Unique identifier */
  id: string | number;
  /** Title/header of the item */
  title: string;
  /** Optional description/content */
  description?: string | ReactNode;
  /** Timestamp or date string */
  date: string | Date;
  /** Status for styling */
  status?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'pending';
  /** Custom icon (Heroicon component) */
  icon?: ReactNode;
  /** Optional metadata tags */
  tags?: Array<{ label: string; color?: string }>;
  /** Optional user/author info */
  author?: {
    name: string;
    avatar?: string;
  };
  /** Click handler for the item */
  onClick?: () => void;
  /** Whether to show dashed connector */
  dashedConnector?: boolean;
  /** Custom content to render below description */
  footer?: ReactNode;
}

export interface TimelineViewProps extends VariantProps<typeof timelineItemVariants> {
  /** Timeline items to display */
  items: TimelineItem[];
  /** Size variant for dots/icons */
  size?: 'sm' | 'md' | 'lg';
  /** Show connector lines between items */
  showConnectors?: boolean;
  /** Animate items on load */
  animated?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Loading state */
  loading?: boolean;
  /** Loading skeleton count */
  loadingCount?: number;
  /** Date format function */
  formatDate?: (date: string | Date) => string;
  /** Additional CSS classes */
  className?: string;
}

// Default date formatter
const defaultFormatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Default dot icon (circle)
const DefaultDot = ({ size }: { size: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };
  return <div className={`${sizeClasses[size]} rounded-full bg-current`} />;
};

export default function TimelineView({
  items,
  size = 'md',
  showConnectors = true,
  animated = true,
  emptyMessage,
  loading = false,
  loadingCount = 5,
  formatDate = defaultFormatDate,
  className = '',
}: TimelineViewProps) {
  const t = useTranslations('common');

  // Dot container size offset for connector positioning
  const dotSizeOffset = useMemo(() => ({
    sm: 12, // w-6 = 24px / 2
    md: 16, // w-8 = 32px / 2
    lg: 20, // w-10 = 40px / 2
  }), []);

  // Icon size classes
  const iconSizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: loadingCount }).map((_, index) => (
          <div key={index} className="flex gap-4 animate-pulse">
            <div className={`${dotVariants({ size })} bg-gray-200 dark:bg-gray-700`} />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          {emptyMessage || t('timeline.empty') || 'No activity to display'}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {items.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === items.length - 1;
        const status = item.status || 'default';

        // Determine connector color classes based on status
        const connectorColorMap: Record<string, string> = {
          default: 'bg-gray-200 dark:bg-gray-600',
          success: 'bg-green-200 dark:bg-green-800',
          warning: 'bg-yellow-200 dark:bg-yellow-800',
          error: 'bg-red-200 dark:bg-red-800',
          info: 'bg-blue-200 dark:bg-blue-800',
          pending: 'bg-purple-200 dark:bg-purple-800',
        };

        return (
          <div
            key={item.id}
            className={`
              ${timelineItemVariants({ status })}
              ${animated ? 'animate-fadeIn' : ''}
              ${item.onClick ? 'cursor-pointer' : ''}
            `}
            style={{
              animationDelay: animated ? `${index * 50}ms` : undefined,
            }}
            onClick={item.onClick}
          >
            {/* Dot/Icon column with continuous line */}
            <div className="relative flex flex-col items-center" style={{ minWidth: size === 'sm' ? '24px' : size === 'lg' ? '40px' : '32px' }}>
              {/* Continuous vertical line behind the dot */}
              {showConnectors && !isFirst && (
                <div
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-0.5 ${connectorColorMap[status] || connectorColorMap.default} ${items[index - 1]?.dashedConnector ? 'border-l-2 border-dashed bg-transparent' : ''}`}
                  style={{ height: size === 'sm' ? '12px' : size === 'lg' ? '20px' : '16px' }}
                />
              )}

              {/* Dot/Icon */}
              <div className={`${dotVariants({ status, size })} relative z-10`}>
                {item.icon ? (
                  <div className={iconSizeClasses[size]}>{item.icon}</div>
                ) : (
                  <DefaultDot size={size} />
                )}
              </div>

              {/* Bottom connector line that stretches to fill remaining height */}
              {showConnectors && !isLast && (
                <div
                  className={`w-0.5 flex-1 ${connectorColorMap[items[index + 1]?.status || 'default'] || connectorColorMap.default} ${item.dashedConnector ? 'border-l-2 border-dashed bg-transparent' : ''}`}
                  style={{ minHeight: '24px' }}
                />
              )}
            </div>

            {/* Content */}
            <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-6'} min-w-0`}>
              {/* Header with title and date */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.title}
                </h4>
                <time className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                  {formatDate(item.date)}
                </time>
              </div>

              {/* Author */}
              {item.author && (
                <div className="flex items-center gap-2 mb-2">
                  {item.author.avatar ? (
                    <img
                      src={item.author.avatar}
                      alt={item.author.name}
                      className="w-5 h-5 rounded-full"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300">
                      {item.author.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {item.author.name}
                  </span>
                </div>
              )}

              {/* Description */}
              {item.description && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {item.description}
                </div>
              )}

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {item.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className={`
                        inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                        ${tag.color || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}
                      `}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Custom footer */}
              {item.footer && <div className="mt-2">{item.footer}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Add animation keyframes to global styles or tailwind config
// @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
// .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
