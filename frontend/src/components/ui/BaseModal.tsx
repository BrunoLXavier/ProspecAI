/**
 * BaseModal - Reusable Modal Component
 * Standardized Dialog + Transition pattern with no horizontal scroll
 * Used as base for all modals in the application
 */
'use client';

import { Fragment, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  size?: ModalSize;
  children: ReactNode;
  footer?: ReactNode;
  showCloseButton?: boolean;
  className?: string;
  /** When true, content area won't have max-height constraint */
  noContentScroll?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  full: 'max-w-full mx-4',
};

export default function BaseModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = '2xl',
  children,
  footer,
  showCloseButton = true,
  className = '',
  noContentScroll = false,
}: BaseModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 dark:bg-black/50" />
        </Transition.Child>

        {/* Modal container - vertical scroll only */}
        <div className="fixed inset-0 overflow-y-auto overflow-x-hidden">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={`w-full ${sizeClasses[size]} transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-xl transition-all ${className}`}
              >
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {icon && (
                      <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg shrink-0">
                        {icon}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {title}
                      </Dialog.Title>
                      {subtitle && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition shrink-0 ml-2"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Content - no horizontal scroll, vertical scroll with max height */}
                <div className={`p-6 overflow-x-hidden ${noContentScroll ? '' : 'overflow-y-auto max-h-[60vh]'}`}>
                  {children}
                </div>

                {/* Footer */}
                {footer && (
                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/50">
                    {footer}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

/**
 * ModalFooter - Standard footer layout for modals
 */
interface ModalFooterProps {
  onCancel: () => void;
  onSubmit?: () => void;
  onDelete?: () => void;
  isSubmitting?: boolean;
  isDeleting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  deleteLabel?: string;
  showDelete?: boolean;
}

export function ModalFooter({
  onCancel,
  onSubmit,
  onDelete,
  isSubmitting = false,
  isDeleting = false,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  deleteLabel = 'Excluir',
  showDelete = false,
}: ModalFooterProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        {showDelete && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Excluindo...' : deleteLabel}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          {cancelLabel}
        </button>
        {onSubmit && (
          <button
            type="submit"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Salvando...' : submitLabel}
          </button>
        )}
      </div>
    </div>
  );
}
