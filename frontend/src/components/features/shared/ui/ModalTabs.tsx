/**
 * ModalTabs - Mobile-friendly Tab Component for Modals
 * Uses prev/next navigation on mobile instead of horizontal scroll
 * No overflow-x-auto - tabs wrap or use navigation buttons
 */
'use client';

import { useState, useEffect, ReactNode, ComponentType } from 'react';
import { Tab } from '@headlessui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface TabItem {
  name: string;
  icon?: ComponentType<{ className?: string }>;
  content: ReactNode;
}

interface ModalTabsProps {
  tabs: TabItem[];
  selectedIndex?: number;
  onChange?: (index: number) => void;
  className?: string;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function ModalTabs({
  tabs,
  selectedIndex: controlledIndex,
  onChange,
  className = '',
}: ModalTabsProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const selectedIndex = controlledIndex ?? internalIndex;
  
  const handleChange = (index: number) => {
    if (onChange) {
      onChange(index);
    } else {
      setInternalIndex(index);
    }
  };

  // Reset to first tab when tabs change
  useEffect(() => {
    if (selectedIndex >= tabs.length) {
      handleChange(0);
    }
  }, [tabs.length]);

  const goToPrev = () => {
    if (selectedIndex > 0) {
      handleChange(selectedIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedIndex < tabs.length - 1) {
      handleChange(selectedIndex + 1);
    }
  };

  const currentTab = tabs[selectedIndex];

  return (
    <Tab.Group selectedIndex={selectedIndex} onChange={handleChange}>
      {/* Tab List - Mobile: show current + nav buttons, Desktop: show all */}
      <Tab.List className={`border-b border-gray-200 dark:border-gray-700 ${className}`}>
        {/* Mobile Navigation (< 640px) */}
        <div className="flex sm:hidden items-center justify-between px-4 py-2">
          <button
            type="button"
            onClick={goToPrev}
            disabled={selectedIndex === 0}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous tab"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
            {currentTab?.icon && <currentTab.icon className="w-4 h-4" />}
            <span>{currentTab?.name}</span>
            <span className="text-gray-400 text-xs">
              ({selectedIndex + 1}/{tabs.length})
            </span>
          </div>
          
          <button
            type="button"
            onClick={goToNext}
            disabled={selectedIndex === tabs.length - 1}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next tab"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop Navigation (>= 640px) - flex-wrap instead of overflow-x-auto */}
        <div className="hidden sm:flex flex-wrap px-6 gap-1">
          {tabs.map((tab, index) => (
            <Tab
              key={tab.name}
              className={({ selected }) =>
                classNames(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px outline-none transition-colors whitespace-nowrap',
                  selected
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                )
              }
            >
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.name}
            </Tab>
          ))}
        </div>

        {/* Mobile Tab Indicators (dots) */}
        <div className="flex sm:hidden justify-center gap-1.5 pb-2">
          {tabs.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleChange(index)}
              className={classNames(
                'w-2 h-2 rounded-full transition-colors',
                index === selectedIndex
                  ? 'bg-primary-600 dark:bg-primary-400'
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
              )}
              aria-label={`Go to tab ${index + 1}`}
            />
          ))}
        </div>
      </Tab.List>

      {/* Tab Panels - vertical scroll only */}
      <Tab.Panels className="overflow-y-auto overflow-x-hidden">
        {tabs.map((tab, index) => (
          <Tab.Panel key={tab.name} className="focus:outline-none">
            {tab.content}
          </Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
}

/**
 * TabPanel wrapper for consistent spacing
 */
export function TabPanelContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
    </div>
  );
}

/**
 * TabSection - Colored hint box for tab sections
 */
interface TabSectionProps {
  children: ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  className?: string;
}

const variantClasses = {
  info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  success: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
  error: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
};

export function TabHint({ children, variant = 'info', className = '' }: TabSectionProps) {
  return (
    <div className={`p-4 rounded-lg mb-4 ${variantClasses[variant]} ${className}`}>
      <p className="text-sm">{children}</p>
    </div>
  );
}
