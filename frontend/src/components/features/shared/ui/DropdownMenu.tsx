/**
 * DropdownMenu Component
 * Accessible dropdown menu using Headless UI Menu
 * With icons, keyboard navigation, and dark mode support
 * Implements RF-05: Standardized UI components
 */
'use client';

import { Fragment, ReactNode } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { cva, type VariantProps } from 'class-variance-authority';

// Menu button variants
const menuButtonVariants = cva(
  `
    inline-flex items-center justify-center gap-2
    font-medium rounded-lg transition-all duration-200
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
    dark:focus-visible:ring-offset-slate-800
  `,
  {
    variants: {
      variant: {
        primary: `
          bg-primary-600 dark:bg-primary-500
          text-white
          hover:bg-primary-700 dark:hover:bg-primary-600
          focus-visible:ring-primary-500
        `,
        secondary: `
          bg-gray-100 dark:bg-slate-700
          text-gray-700 dark:text-gray-200
          hover:bg-gray-200 dark:hover:bg-slate-600
          focus-visible:ring-gray-500
        `,
        outline: `
          border border-gray-300 dark:border-gray-600
          bg-white dark:bg-slate-700
          text-gray-700 dark:text-gray-200
          hover:bg-gray-50 dark:hover:bg-slate-600
          focus-visible:ring-gray-500
        `,
        ghost: `
          text-gray-700 dark:text-gray-200
          hover:bg-gray-100 dark:hover:bg-slate-700
          focus-visible:ring-gray-500
        `,
        danger: `
          bg-red-600 dark:bg-red-500
          text-white
          hover:bg-red-700 dark:hover:bg-red-600
          focus-visible:ring-red-500
        `,
      },
      size: {
        sm: 'px-2.5 py-1.5 text-xs',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-2.5 text-base',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  }
);

export interface DropdownMenuItem {
  /** Unique key */
  key: string;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: ReactNode;
  /** Optional description */
  description?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Danger/destructive action styling */
  danger?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Optional href for link items */
  href?: string;
  /** Divider before this item */
  dividerBefore?: boolean;
  /** Divider after this item */
  dividerAfter?: boolean;
}

export interface DropdownMenuGroup {
  /** Group label */
  label?: string;
  /** Items in the group */
  items: DropdownMenuItem[];
}

export interface DropdownMenuProps extends VariantProps<typeof menuButtonVariants> {
  /** Menu items or groups */
  items: DropdownMenuItem[] | DropdownMenuGroup[];
  /** Trigger button content */
  trigger?: ReactNode;
  /** Button label if no custom trigger */
  label?: string;
  /** Show chevron icon */
  showChevron?: boolean;
  /** Icon before label */
  icon?: ReactNode;
  /** Menu position */
  position?: 'left' | 'right';
  /** Menu width */
  width?: 'auto' | 'sm' | 'md' | 'lg' | 'full';
  /** Disabled state */
  disabled?: boolean;
  /** Additional button classes */
  buttonClassName?: string;
  /** Additional menu classes */
  menuClassName?: string;
}

// Width classes
const widthClasses = {
  auto: 'min-w-[160px]',
  sm: 'w-48',
  md: 'w-56',
  lg: 'w-64',
  full: 'w-full',
};

// Check if items are grouped
function isGrouped(items: DropdownMenuItem[] | DropdownMenuGroup[]): items is DropdownMenuGroup[] {
  return items.length > 0 && 'items' in items[0];
}

// Flatten groups to items with separators
function flattenItems(items: DropdownMenuItem[] | DropdownMenuGroup[]): (DropdownMenuItem | 'divider')[] {
  if (!isGrouped(items)) {
    const result: (DropdownMenuItem | 'divider')[] = [];
    items.forEach((item, index) => {
      if (item.dividerBefore) result.push('divider');
      result.push(item);
      if (item.dividerAfter && index < items.length - 1) result.push('divider');
    });
    return result;
  }

  const result: (DropdownMenuItem | 'divider')[] = [];
  items.forEach((group, groupIndex) => {
    if (groupIndex > 0) result.push('divider');
    group.items.forEach((item, itemIndex) => {
      if (item.dividerBefore) result.push('divider');
      result.push(item);
      if (item.dividerAfter && itemIndex < group.items.length - 1) result.push('divider');
    });
  });
  return result;
}

export default function DropdownMenu({
  items,
  trigger,
  label = 'Options',
  showChevron = true,
  icon,
  position = 'right',
  width = 'auto',
  variant = 'secondary',
  size = 'md',
  disabled = false,
  buttonClassName = '',
  menuClassName = '',
}: DropdownMenuProps) {
  const flatItems = flattenItems(items);

  // Icon size based on button size
  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      {/* Trigger button */}
      <Menu.Button
        disabled={disabled}
        className={`
          ${menuButtonVariants({ variant, size })}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${buttonClassName}
        `}
      >
        {trigger || (
          <>
            {icon && (
              <span className={iconSizes[size || 'md']}>
                {icon}
              </span>
            )}
            <span>{label}</span>
            {showChevron && (
              <ChevronDownIcon
                className={`${iconSizes[size || 'md']} transition-transform ui-open:rotate-180`}
                aria-hidden="true"
              />
            )}
          </>
        )}
      </Menu.Button>

      {/* Dropdown panel */}
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          className={`
            absolute z-50 mt-2 origin-top-right
            ${position === 'right' ? 'right-0' : 'left-0'}
            ${widthClasses[width]}
            rounded-lg border border-gray-200 dark:border-gray-600
            bg-white dark:bg-slate-700
            shadow-lg
            focus:outline-none
            divide-y divide-gray-100 dark:divide-gray-600
            ${menuClassName}
          `}
        >
          <div className="py-1">
            {flatItems.map((item, index) => {
              if (item === 'divider') {
                return (
                  <div
                    key={`divider-${index}`}
                    className="h-px my-1 bg-gray-200 dark:bg-gray-600"
                  />
                );
              }

              return (
                <Menu.Item key={item.key} disabled={item.disabled}>
                  {({ active, disabled: itemDisabled }) => {
                    const content = (
                      <>
                        {item.icon && (
                          <span
                            className={`
                              flex-shrink-0 w-5 h-5
                              ${item.danger
                                ? 'text-red-500 dark:text-red-400'
                                : active
                                  ? 'text-primary-600 dark:text-primary-400'
                                  : 'text-gray-500 dark:text-gray-400'
                              }
                            `}
                          >
                            {item.icon}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <span
                            className={`
                              block text-sm font-medium
                              ${item.danger
                                ? 'text-red-600 dark:text-red-400'
                                : ''
                              }
                            `}
                          >
                            {item.label}
                          </span>
                          {item.description && (
                            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                              {item.description}
                            </span>
                          )}
                        </div>
                      </>
                    );

                    const itemClasses = `
                      flex items-center gap-3 w-full px-4 py-2
                      text-left transition-colors duration-150
                      ${active && !itemDisabled
                        ? 'bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white'
                        : 'text-gray-700 dark:text-gray-200'
                      }
                      ${itemDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer'
                      }
                    `;

                    if (item.href && !itemDisabled) {
                      return (
                        <a href={item.href} className={itemClasses}>
                          {content}
                        </a>
                      );
                    }

                    return (
                      <button
                        type="button"
                        onClick={() => !itemDisabled && item.onClick?.()}
                        className={itemClasses}
                      >
                        {content}
                      </button>
                    );
                  }}
                </Menu.Item>
              );
            })}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
