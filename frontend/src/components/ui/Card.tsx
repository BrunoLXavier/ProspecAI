'use client';

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import Link from 'next/link';

const cardVariants = cva(
  // Base styles
  'bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 transition-all duration-250',
  {
    variants: {
      elevation: {
        flat: 'shadow-none',
        soft: 'shadow-soft',
        elevated: 'shadow-elevated',
        floating: 'shadow-floating',
      },
      hover: {
        none: '',
        lift: 'hover:shadow-elevated hover:-translate-y-1',
        glow: 'hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700',
        subtle: 'hover:shadow-md',
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
    },
    defaultVariants: {
      elevation: 'soft',
      hover: 'none',
      padding: 'md',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevation, hover, padding, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cardVariants({ elevation, hover, padding, className })}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header Component
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, action, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-start justify-between gap-4 ${className || ''}`}
        {...props}
      >
        {(title || subtitle) ? (
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
        ) : children}
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// Card Content Component
const CardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={`${className || ''}`} {...props}>
      {children}
    </div>
  );
});

CardContent.displayName = 'CardContent';

// Card Footer Component
const CardFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-slate-700 ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  );
});

CardFooter.displayName = 'CardFooter';

// Stat Card Component for Dashboard
interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  change?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  href?: string;
}

const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, change, icon, href, className, ...props }, ref) => {
    const trendColors = {
      up: 'text-confidence-green',
      down: 'text-confidence-red',
      neutral: 'text-gray-500 dark:text-gray-400',
    };

    const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'neutral' }) => {
      if (trend === 'up') {
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        );
      }
      if (trend === 'down') {
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        );
      }
      return null;
    };

    const cardContent = (
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
            {label}
          </dt>
          <dd className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {value}
            </span>
            {change && (
              <span className={`flex items-center text-sm font-medium ${trendColors[change.trend]}`}>
                <TrendIcon trend={change.trend} />
                <span className="ml-1">{change.value}</span>
              </span>
            )}
          </dd>
        </div>
        {icon && (
          <div className="flex-shrink-0 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
            <div className="w-6 h-6 text-primary-500">{icon}</div>
          </div>
        )}
      </div>
    );

    if (href) {
      return (
        <Link href={href} className="block">
          <Card
            ref={ref}
            elevation="soft"
            hover="lift"
            padding="lg"
            className={`cursor-pointer ${className || ''}`}
            {...props}
          >
            {cardContent}
          </Card>
        </Link>
      );
    }

    return (
      <Card
        ref={ref}
        elevation="soft"
        hover="lift"
        padding="lg"
        className={className}
        {...props}
      >
        {cardContent}
      </Card>
    );
  }
);

StatCard.displayName = 'StatCard';

export { Card, CardHeader, CardContent, CardFooter, StatCard, cardVariants };
