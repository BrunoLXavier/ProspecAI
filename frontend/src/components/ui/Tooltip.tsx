/**
 * Tooltip Component
 * Accessible tooltip with positioning and dark mode support
 * Uses CSS-based positioning for lightweight implementation
 * Implements RF-05: Standardized UI components
 */
'use client';

import { ReactNode, useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cva, type VariantProps } from 'class-variance-authority';

// Tooltip variants
const tooltipVariants = cva(
  `
    absolute z-[9999] px-2.5 py-1.5 text-xs font-medium
    rounded-lg shadow-lg pointer-events-none
    whitespace-nowrap max-w-xs
    animate-fadeIn
  `,
  {
    variants: {
      variant: {
        dark: 'bg-gray-900 dark:bg-gray-700 text-white',
        light: 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-500',
        primary: 'bg-primary-600 dark:bg-primary-500 text-white',
      },
    },
    defaultVariants: {
      variant: 'dark',
    },
  }
);

// Arrow variants matching tooltip
const arrowVariants = cva(
  'absolute w-2 h-2 rotate-45',
  {
    variants: {
      variant: {
        dark: 'bg-gray-900 dark:bg-gray-700',
        light: 'bg-white dark:bg-slate-600 border border-gray-200 dark:border-gray-500',
        primary: 'bg-primary-600 dark:bg-primary-500',
      },
    },
    defaultVariants: {
      variant: 'dark',
    },
  }
);

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps extends VariantProps<typeof tooltipVariants> {
  /** Tooltip content */
  content: ReactNode;
  /** Trigger element */
  children: ReactNode;
  /** Position relative to trigger */
  position?: TooltipPosition;
  /** Delay before showing (ms) */
  delay?: number;
  /** Delay before hiding (ms) */
  hideDelay?: number;
  /** Disable tooltip */
  disabled?: boolean;
  /** Show arrow */
  showArrow?: boolean;
  /** Offset from trigger (px) */
  offset?: number;
  /** Additional CSS classes for tooltip */
  className?: string;
  /** Additional CSS classes for trigger wrapper */
  triggerClassName?: string;
  /** Allow wrapping for long content */
  wrap?: boolean;
}

// Calculate position with viewport boundary checks
function calculatePosition(
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  position: TooltipPosition,
  offset: number
): { top: number; left: number; actualPosition: TooltipPosition } {
  const padding = 8; // Minimum distance from viewport edge
  let top = 0;
  let left = 0;
  let actualPosition = position;

  // Calculate initial position
  switch (position) {
    case 'top':
      top = triggerRect.top - tooltipRect.height - offset;
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      break;
    case 'bottom':
      top = triggerRect.bottom + offset;
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      break;
    case 'left':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
      left = triggerRect.left - tooltipRect.width - offset;
      break;
    case 'right':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
      left = triggerRect.right + offset;
      break;
  }

  // Flip if out of viewport
  if (top < padding && position === 'top') {
    top = triggerRect.bottom + offset;
    actualPosition = 'bottom';
  } else if (top + tooltipRect.height > window.innerHeight - padding && position === 'bottom') {
    top = triggerRect.top - tooltipRect.height - offset;
    actualPosition = 'top';
  }

  if (left < padding && position === 'left') {
    left = triggerRect.right + offset;
    actualPosition = 'right';
  } else if (left + tooltipRect.width > window.innerWidth - padding && position === 'right') {
    left = triggerRect.left - tooltipRect.width - offset;
    actualPosition = 'left';
  }

  // Clamp horizontal position
  left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

  return { top: top + window.scrollY, left: left + window.scrollX, actualPosition };
}

// Arrow position styles
const arrowPositionStyles = {
  top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-r-0 border-t-0',
  bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-l-0 border-b-0',
  left: 'right-[-4px] top-1/2 -translate-y-1/2 border-b-0 border-l-0',
  right: 'left-[-4px] top-1/2 -translate-y-1/2 border-t-0 border-r-0',
};

export default function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  hideDelay = 0,
  disabled = false,
  showArrow = true,
  offset = 8,
  variant = 'dark',
  className = '',
  triggerClassName = '',
  wrap = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [actualPosition, setActualPosition] = useState(position);
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout>();
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  // Ensure we're on client side
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Update position when visible
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    const { top, left, actualPosition: newPosition } = calculatePosition(
      triggerRect,
      tooltipRect,
      position,
      offset
    );

    setCoords({ top, left });
    setActualPosition(newPosition);
  }, [position, offset]);

  // Update position when visible
  useEffect(() => {
    if (isVisible) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(updatePosition);
    }
  }, [isVisible, updatePosition]);

  // Show tooltip
  const show = useCallback(() => {
    if (disabled) return;
    
    clearTimeout(hideTimeoutRef.current);
    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [disabled, delay]);

  // Hide tooltip
  const hide = useCallback(() => {
    clearTimeout(showTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, hideDelay);
  }, [hideDelay]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      clearTimeout(showTimeoutRef.current);
      clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // Don't render portal on server
  if (!mounted) {
    return (
      <div
        ref={triggerRef}
        className={`inline-block ${triggerClassName}`}
      >
        {children}
      </div>
    );
  }

  return (
    <>
      {/* Trigger */}
      <div
        ref={triggerRef}
        className={`inline-block ${triggerClassName}`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </div>

      {/* Tooltip (rendered in portal) */}
      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`
            ${tooltipVariants({ variant })}
            ${wrap ? 'whitespace-normal' : ''}
            ${className}
          `}
          style={{
            top: coords.top,
            left: coords.left,
          }}
        >
          {content}
          
          {/* Arrow */}
          {showArrow && (
            <div
              className={`
                ${arrowVariants({ variant })}
                ${arrowPositionStyles[actualPosition]}
              `}
            />
          )}
        </div>,
        document.body
      )}
    </>
  );
}
