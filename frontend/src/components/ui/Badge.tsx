'use client';

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  // Base styles
  'inline-flex items-center font-medium rounded-full transition-colors duration-200',
  {
    variants: {
      variant: {
        default:
          'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300',
        primary:
          'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
        secondary:
          'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-400',
        success:
          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        warning:
          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        danger:
          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        info:
          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        // Confidence badges for AI scores (RNF-04)
        'confidence-high':
          'bg-confidence-green text-white',
        'confidence-medium':
          'bg-confidence-yellow text-white',
        'confidence-low':
          'bg-confidence-red text-white',
        // Outline variants
        'outline-default':
          'border border-gray-300 text-gray-700 dark:border-slate-600 dark:text-gray-300',
        'outline-primary':
          'border border-primary-500 text-primary-500',
        'outline-success':
          'border border-green-500 text-green-600 dark:text-green-400',
      },
      size: {
        xs: 'px-2 py-0.5 text-xs',
        sm: 'px-2.5 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
        lg: 'px-4 py-1.5 text-sm',
      },
      dot: {
        true: '',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
      dot: false,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dotColor?: string;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dot, dotColor, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={badgeVariants({ variant, size, dot, className })}
        {...props}
      >
        {dot && (
          <span
            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColor || 'bg-current'}`}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Confidence Badge with automatic coloring based on score
interface ConfidenceBadgeProps extends Omit<BadgeProps, 'variant'> {
  score: number;
  showPercentage?: boolean;
}

const ConfidenceBadge = forwardRef<HTMLSpanElement, ConfidenceBadgeProps>(
  ({ score, showPercentage = true, className, ...props }, ref) => {
    const getVariant = (score: number) => {
      if (score >= 80) return 'confidence-high';
      if (score >= 60) return 'confidence-medium';
      return 'confidence-low';
    };

    const getLabel = (score: number) => {
      if (score >= 80) return 'Alto';
      if (score >= 60) return 'Médio';
      return 'Baixo';
    };

    return (
      <Badge
        ref={ref}
        variant={getVariant(score)}
        className={className}
        {...props}
      >
        {showPercentage ? `${score}%` : getLabel(score)}
      </Badge>
    );
  }
);

ConfidenceBadge.displayName = 'ConfidenceBadge';

// Status Badge for pipeline stages
type StatusType = 'intelligence' | 'validation' | 'approach' | 'registration' | 'conversion' | 'post-sale';

interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: StatusType;
}

const statusConfig: Record<StatusType, { label: string; variant: BadgeProps['variant'] }> = {
  intelligence: { label: 'Inteligência', variant: 'info' },
  validation: { label: 'Validação', variant: 'warning' },
  approach: { label: 'Abordagem', variant: 'primary' },
  registration: { label: 'Registro', variant: 'secondary' },
  conversion: { label: 'Conversão', variant: 'success' },
  'post-sale': { label: 'Pós-venda', variant: 'default' },
};

const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, className, ...props }, ref) => {
    const config = statusConfig[status];
    
    return (
      <Badge
        ref={ref}
        variant={config.variant}
        dot
        className={className}
        {...props}
      >
        {config.label}
      </Badge>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

// Notification Badge (for icons)
interface NotificationBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  count?: number;
  max?: number;
  show?: boolean;
}

const NotificationBadge = forwardRef<HTMLSpanElement, NotificationBadgeProps>(
  ({ count = 0, max = 99, show = true, children, className, ...props }, ref) => {
    if (!show && count === 0) return <>{children}</>;

    const displayCount = count > max ? `${max}+` : count;

    return (
      <span ref={ref} className={`relative inline-flex ${className || ''}`} {...props}>
        {children}
        {(show || count > 0) && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-primary-500 rounded-full">
            {count > 0 ? displayCount : ''}
          </span>
        )}
      </span>
    );
  }
);

NotificationBadge.displayName = 'NotificationBadge';

export { Badge, ConfidenceBadge, StatusBadge, NotificationBadge, badgeVariants };
