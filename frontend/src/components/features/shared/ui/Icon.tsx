/**
 * Icon Component
 * Standardized icon wrapper with light/dark theme support
 * Following StatCard pattern: bg-{color}-50 dark:bg-{color}-900/20 + text-{color}-500
 * Implements RF-07: Consistent iconography across the system
 */
'use client';

import { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

// Icon container variants (background wrapper)
const iconContainerVariants = cva(
  'flex items-center justify-center rounded-lg transition-all duration-200',
  {
    variants: {
      color: {
        primary: 'bg-primary-50 dark:bg-primary-900/20 text-primary-500',
        secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
        success: 'bg-green-50 dark:bg-green-900/20 text-green-500',
        warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-500',
        error: 'bg-red-50 dark:bg-red-900/20 text-red-500',
        info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-500',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-500',
        cyan: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-500',
        orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-500',
        pink: 'bg-pink-50 dark:bg-pink-900/20 text-pink-500',
        indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500',
        teal: 'bg-teal-50 dark:bg-teal-900/20 text-teal-500',
        none: '', // No background, just text color
      },
      size: {
        xs: 'p-1',
        sm: 'p-1.5',
        md: 'p-2',
        lg: 'p-2.5',
        xl: 'p-3',
      },
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full',
      },
      interactive: {
        true: 'cursor-pointer hover:opacity-80 active:scale-95',
        false: '',
      },
    },
    defaultVariants: {
      color: 'primary',
      size: 'md',
      rounded: 'lg',
      interactive: false,
    },
  }
);

// Icon element size variants
const iconSizeVariants = cva('flex-shrink-0', {
  variants: {
    size: {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-7 h-7',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface IconProps extends VariantProps<typeof iconContainerVariants> {
  /** Icon content (Heroicon component or SVG) */
  children: ReactNode;
  /** Whether to show container background */
  withBackground?: boolean;
  /** Custom container className */
  containerClassName?: string;
  /** Custom icon className */
  iconClassName?: string;
  /** Click handler */
  onClick?: () => void;
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Title for hover tooltip */
  title?: string;
}

// Color to text-only class mapping
const textOnlyColors: Record<string, string> = {
  primary: 'text-primary-500',
  secondary: 'text-gray-500 dark:text-gray-400',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  purple: 'text-purple-500',
  cyan: 'text-cyan-500',
  orange: 'text-orange-500',
  pink: 'text-pink-500',
  indigo: 'text-indigo-500',
  teal: 'text-teal-500',
  none: '',
};

export default function Icon({
  children,
  color = 'primary',
  size = 'md',
  rounded = 'lg',
  interactive = false,
  withBackground = true,
  containerClassName = '',
  iconClassName = '',
  onClick,
  ariaLabel,
  title,
}: IconProps) {
  const iconContent = (
    <span className={`${iconSizeVariants({ size })} ${iconClassName}`}>
      {children}
    </span>
  );

  if (!withBackground) {
    // Render just the icon with text color
    const colorClass = textOnlyColors[color || 'primary'];
    
    if (interactive) {
      return (
        <button
          type="button"
          onClick={onClick}
          className={`
            inline-flex items-center justify-center
            ${colorClass}
            cursor-pointer hover:opacity-80 active:scale-95
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
            dark:focus:ring-offset-slate-800
            ${containerClassName}
          `}
          aria-label={ariaLabel}
          title={title}
        >
          {iconContent}
        </button>
      );
    }

    return (
      <span
        className={`inline-flex items-center justify-center ${colorClass} ${containerClassName}`}
        aria-label={ariaLabel}
        title={title}
        role={ariaLabel ? 'img' : undefined}
      >
        {iconContent}
      </span>
    );
  }

  // Render with background container
  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`
          ${iconContainerVariants({ color, size, rounded, interactive })}
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
          dark:focus:ring-offset-slate-800
          ${containerClassName}
        `}
        aria-label={ariaLabel}
        title={title}
      >
        {iconContent}
      </button>
    );
  }

  return (
    <span
      className={`${iconContainerVariants({ color, size, rounded, interactive })} ${containerClassName}`}
      aria-label={ariaLabel}
      title={title}
      role={ariaLabel ? 'img' : undefined}
    >
      {iconContent}
    </span>
  );
}

/**
 * IconBadge - Icon with notification badge
 * Useful for showing counts or status indicators
 */
export interface IconBadgeProps extends IconProps {
  /** Badge content (number or string) */
  badge?: number | string;
  /** Badge position */
  badgePosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Badge color */
  badgeColor?: 'red' | 'green' | 'blue' | 'yellow' | 'gray';
  /** Maximum number to show before using "+" */
  maxBadgeCount?: number;
}

const badgePositions = {
  'top-right': '-top-1 -right-1',
  'top-left': '-top-1 -left-1',
  'bottom-right': '-bottom-1 -right-1',
  'bottom-left': '-bottom-1 -left-1',
};

const badgeColors = {
  red: 'bg-red-500 text-white',
  green: 'bg-green-500 text-white',
  blue: 'bg-blue-500 text-white',
  yellow: 'bg-yellow-500 text-white',
  gray: 'bg-gray-500 text-white',
};

export function IconBadge({
  badge,
  badgePosition = 'top-right',
  badgeColor = 'red',
  maxBadgeCount = 99,
  ...iconProps
}: IconBadgeProps) {
  const displayBadge = typeof badge === 'number' && badge > maxBadgeCount
    ? `${maxBadgeCount}+`
    : badge;

  return (
    <div className="relative inline-flex">
      <Icon {...iconProps} />
      {badge !== undefined && badge !== 0 && (
        <span
          className={`
            absolute ${badgePositions[badgePosition]}
            flex items-center justify-center
            min-w-[16px] h-4 px-1
            text-[10px] font-bold rounded-full
            ${badgeColors[badgeColor]}
          `}
        >
          {displayBadge}
        </span>
      )}
    </div>
  );
}
