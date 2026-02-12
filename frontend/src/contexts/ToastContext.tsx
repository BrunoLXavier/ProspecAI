/**
 * ToastContext — Centralized Notification System
 * Single source of truth for all toast/notification messages.
 * Replaces 50+ ad-hoc patterns (setSaveMessage, setError, inline banners).
 *
 * Usage:
 *   const { success, error, warning, info } = useToast();
 *   success('toast.createSuccess');          // i18n key
 *   error('toast.error', { entity: 'Client' }); // with interpolation
 *
 * Implements RNF-05: i18n notifications
 */
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  /** i18n key or raw text */
  messageKey: string;
  /** Interpolation params for i18n */
  messageParams?: Record<string, string | number>;
  /** Auto-dismiss timeout in ms (0 = manual dismiss only) */
  duration: number;
  /** Timestamp for ordering */
  createdAt: number;
}

interface ToastContextType {
  /** Show a success toast */
  success: (messageKey: string, messageParams?: Record<string, string | number>, duration?: number) => void;
  /** Show an error toast */
  error: (messageKey: string, messageParams?: Record<string, string | number>, duration?: number) => void;
  /** Show a warning toast */
  warning: (messageKey: string, messageParams?: Record<string, string | number>, duration?: number) => void;
  /** Show an info toast */
  info: (messageKey: string, messageParams?: Record<string, string | number>, duration?: number) => void;
  /** Dismiss a specific toast */
  dismiss: (id: string) => void;
  /** Dismiss all toasts */
  dismissAll: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 4000,
  error: 8000,
  warning: 6000,
  info: 5000,
};

const MAX_TOASTS = 5;

const VARIANT_CONFIG: Record<
  ToastVariant,
  {
    icon: React.ComponentType<{ className?: string }>;
    containerClass: string;
    iconClass: string;
    progressClass: string;
  }
> = {
  success: {
    icon: CheckCircleIcon,
    containerClass: 'bg-white dark:bg-slate-800 border-green-500',
    iconClass: 'text-green-500',
    progressClass: 'bg-green-500',
  },
  error: {
    icon: XCircleIcon,
    containerClass: 'bg-white dark:bg-slate-800 border-red-500',
    iconClass: 'text-red-500',
    progressClass: 'bg-red-500',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    containerClass: 'bg-white dark:bg-slate-800 border-amber-500',
    iconClass: 'text-amber-500',
    progressClass: 'bg-amber-500',
  },
  info: {
    icon: InformationCircleIcon,
    containerClass: 'bg-white dark:bg-slate-800 border-blue-500',
    iconClass: 'text-blue-500',
    progressClass: 'bg-blue-500',
  },
};

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const addToast = useCallback(
    (variant: ToastVariant, messageKey: string, messageParams?: Record<string, string | number>, duration?: number) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const actualDuration = duration ?? DEFAULT_DURATIONS[variant];

      const toast: ToastMessage = {
        id,
        variant,
        messageKey,
        messageParams,
        duration: actualDuration,
        createdAt: Date.now(),
      };

      setToasts((prev) => {
        const next = [...prev, toast];
        // Trim oldest if exceeding max
        return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
      });

      if (actualDuration > 0) {
        const timer = setTimeout(() => dismiss(id), actualDuration);
        timersRef.current.set(id, timer);
      }
    },
    [dismiss]
  );

  const success = useCallback(
    (messageKey: string, messageParams?: Record<string, string | number>, duration?: number) =>
      addToast('success', messageKey, messageParams, duration),
    [addToast]
  );

  const error = useCallback(
    (messageKey: string, messageParams?: Record<string, string | number>, duration?: number) =>
      addToast('error', messageKey, messageParams, duration),
    [addToast]
  );

  const warning = useCallback(
    (messageKey: string, messageParams?: Record<string, string | number>, duration?: number) =>
      addToast('warning', messageKey, messageParams, duration),
    [addToast]
  );

  const info = useCallback(
    (messageKey: string, messageParams?: Record<string, string | number>, duration?: number) =>
      addToast('info', messageKey, messageParams, duration),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ success, error, warning, info, dismiss, dismissAll }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Toast Container (renders at layout root) ────────────────────────────────

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  const t = useTranslations('toast');

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const config = VARIANT_CONFIG[toast.variant];
        const Icon = config.icon;

        // Resolve message: try t() with namespace, fallback to raw key
        let message: string;
        try {
          message = t(toast.messageKey, toast.messageParams as any);
        } catch {
          message = toast.messageKey;
        }

        return (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-start gap-3 p-4 rounded-xl border-l-4 shadow-lg
              animate-in slide-in-from-right-5 duration-300
              ${config.containerClass}
            `}
            role="alert"
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconClass}`} />
            <p className="flex-1 text-sm text-gray-800 dark:text-gray-200">
              {message}
            </p>
            <button
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              aria-label="Dismiss"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastProvider;
