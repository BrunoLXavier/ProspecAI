/**
 * ScrollArea Component
 * Custom scrollable container with styled scrollbars for dark/light themes
 * Implements RF-05: Standardized UI components
 */
'use client';

import { forwardRef, ReactNode, useRef, useEffect, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

// ScrollArea variants
const scrollAreaVariants = cva(
  'relative overflow-hidden',
  {
    variants: {
      size: {
        sm: 'scrollbar-thin',
        md: 'scrollbar-default',
        lg: 'scrollbar-thick',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface ScrollAreaProps extends VariantProps<typeof scrollAreaVariants> {
  /** Content to scroll */
  children: ReactNode;
  /** Maximum height */
  maxHeight?: string | number;
  /** Maximum width */
  maxWidth?: string | number;
  /** Enable horizontal scrolling */
  horizontal?: boolean;
  /** Enable vertical scrolling (default) */
  vertical?: boolean;
  /** Hide scrollbar until hover */
  hideScrollbar?: boolean;
  /** Show scrollbar shadow/fade at edges */
  showFade?: boolean;
  /** Fade positions */
  fadePosition?: 'top' | 'bottom' | 'both' | 'none';
  /** Custom scrollbar color (Tailwind color) */
  scrollbarColor?: 'default' | 'primary' | 'dark';
  /** Additional CSS classes */
  className?: string;
  /** Content wrapper className */
  contentClassName?: string;
  /** On scroll event */
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  /** Ref for programmatic scrolling */
  scrollRef?: React.RefObject<HTMLDivElement>;
}

// Scrollbar color classes
const scrollbarColors = {
  default: `
    scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600
    scrollbar-track-gray-100 dark:scrollbar-track-gray-800
    hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500
  `,
  primary: `
    scrollbar-thumb-primary-300 dark:scrollbar-thumb-primary-600
    scrollbar-track-primary-50 dark:scrollbar-track-primary-900/20
    hover:scrollbar-thumb-primary-400 dark:hover:scrollbar-thumb-primary-500
  `,
  dark: `
    scrollbar-thumb-gray-500 dark:scrollbar-thumb-gray-400
    scrollbar-track-gray-200 dark:scrollbar-track-gray-700
    hover:scrollbar-thumb-gray-600 dark:hover:scrollbar-thumb-gray-300
  `,
};

const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(({
  children,
  maxHeight,
  maxWidth,
  horizontal = false,
  vertical = true,
  hideScrollbar = false,
  showFade = false,
  fadePosition = 'none',
  scrollbarColor = 'default',
  size = 'md',
  className = '',
  contentClassName = '',
  onScroll,
  scrollRef,
}, ref) => {
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = scrollRef || internalRef;
  
  // Track scroll position for fade effects
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  // Calculate fade visibility on scroll
  useEffect(() => {
    const element = containerRef.current;
    if (!element || !showFade) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const isScrollable = scrollHeight > clientHeight;
      
      if (!isScrollable) {
        setShowTopFade(false);
        setShowBottomFade(false);
        return;
      }

      const shouldShowTop = fadePosition === 'top' || fadePosition === 'both';
      const shouldShowBottom = fadePosition === 'bottom' || fadePosition === 'both';

      setShowTopFade(shouldShowTop && scrollTop > 10);
      setShowBottomFade(shouldShowBottom && scrollTop < scrollHeight - clientHeight - 10);
    };

    handleScroll(); // Initial check
    element.addEventListener('scroll', handleScroll);
    return () => element.removeEventListener('scroll', handleScroll);
  }, [containerRef, showFade, fadePosition]);

  // Overflow classes
  const overflowClasses = [
    vertical ? (hideScrollbar ? 'overflow-y-auto scrollbar-hidden' : 'overflow-y-auto') : 'overflow-y-hidden',
    horizontal ? (hideScrollbar ? 'overflow-x-auto scrollbar-hidden' : 'overflow-x-auto') : 'overflow-x-hidden',
  ].join(' ');

  // Size-based scrollbar width
  const scrollbarSizeClasses = {
    sm: 'scrollbar-thin',
    md: '',
    lg: 'scrollbar-thick',
  };

  return (
    <div
      ref={ref}
      className={`${scrollAreaVariants({ size })} ${className}`}
      style={{
        maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
        maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
      }}
    >
      {/* Top fade */}
      {showFade && showTopFade && (
        <div
          className="
            absolute top-0 left-0 right-0 h-8 z-10 pointer-events-none
            bg-gradient-to-b from-white dark:from-slate-800 to-transparent
          "
        />
      )}

      {/* Scrollable content */}
      <div
        ref={containerRef}
        className={`
          h-full w-full
          ${overflowClasses}
          ${scrollbarSizeClasses[size || 'md']}
          ${scrollbarColors[scrollbarColor]}
          scrollbar scrollbar-rounded
          ${contentClassName}
        `}
        onScroll={(e) => {
          onScroll?.(e);
        }}
        style={{
          maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
          maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
        }}
      >
        {children}
      </div>

      {/* Bottom fade */}
      {showFade && showBottomFade && (
        <div
          className="
            absolute bottom-0 left-0 right-0 h-8 z-10 pointer-events-none
            bg-gradient-to-t from-white dark:from-slate-800 to-transparent
          "
        />
      )}
    </div>
  );
});

ScrollArea.displayName = 'ScrollArea';

export default ScrollArea;

/**
 * CSS to add to global styles for scrollbar customization:
 * 
 * .scrollbar {
 *   scrollbar-width: thin;
 * }
 * 
 * .scrollbar::-webkit-scrollbar {
 *   width: 8px;
 *   height: 8px;
 * }
 * 
 * .scrollbar-thin::-webkit-scrollbar {
 *   width: 4px;
 *   height: 4px;
 * }
 * 
 * .scrollbar-thick::-webkit-scrollbar {
 *   width: 12px;
 *   height: 12px;
 * }
 * 
 * .scrollbar::-webkit-scrollbar-track {
 *   @apply bg-gray-100 dark:bg-gray-800 rounded-full;
 * }
 * 
 * .scrollbar::-webkit-scrollbar-thumb {
 *   @apply bg-gray-300 dark:bg-gray-600 rounded-full border-2 border-solid border-gray-100 dark:border-gray-800;
 * }
 * 
 * .scrollbar::-webkit-scrollbar-thumb:hover {
 *   @apply bg-gray-400 dark:bg-gray-500;
 * }
 * 
 * .scrollbar-hidden {
 *   scrollbar-width: none;
 *   -ms-overflow-style: none;
 * }
 * 
 * .scrollbar-hidden::-webkit-scrollbar {
 *   display: none;
 * }
 */
