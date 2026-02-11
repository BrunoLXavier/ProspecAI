// Ingestion shared types, helpers and constants
// Implements RF-01: Ingestão de dados multiorigem
import {
  DocumentTextIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';

// =============================================================================
// Types
// =============================================================================

export interface IngestionJob {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'validating' | 'processing' | 'pii_detection' | 'completed' | 'failed' | 'cancelled';
  source_type: string;
  total_files: number;
  processed_files: number;
  total_records: number;
  processed_records: number;
  failed_records: number;
  pii_detected_count: number;
  pii_anonymized_count: number;
  progress_percentage: number;
  current_step?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface IngestionSource {
  id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  status: string;
  total_records: number;
  processed_records: number;
  error_message?: string;
}

export interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

// =============================================================================
// Helpers
// =============================================================================

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dateStr));
}

// =============================================================================
// Status Config
// =============================================================================

export const STATUS_CONFIG = {
  pending: { key: 'pending', color: 'gray', icon: DocumentTextIcon },
  validating: { key: 'validating', color: 'blue', icon: ArrowPathIcon },
  processing: { key: 'processing', color: 'blue', icon: ArrowPathIcon },
  pii_detection: { key: 'pii_detection', color: 'yellow', icon: ShieldExclamationIcon },
  completed: { key: 'completed', color: 'green', icon: CheckCircleIcon },
  failed: { key: 'failed', color: 'red', icon: XCircleIcon },
  cancelled: { key: 'cancelled', color: 'gray', icon: XCircleIcon },
};

// Tailwind-safe mapping for status color classes. Using explicit strings
// ensures the JIT picks these utility classes up during build.
export const STATUS_CLASS_MAP: Record<string, {
  pill: string;
  iconWrapper: string;
  icon: string;
  badge: string;
}> = {
  gray: {
    pill: 'bg-gray-100 dark:bg-gray-900/30',
    iconWrapper: 'p-2 rounded-lg bg-gray-100 dark:bg-gray-900/30',
    icon: 'w-5 h-5 text-gray-600 dark:text-gray-400',
    badge: 'px-2.5 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300',
  },
  blue: {
    pill: 'bg-blue-100 dark:bg-blue-900/30',
    iconWrapper: 'p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30',
    icon: 'w-5 h-5 text-blue-600 dark:text-blue-400',
    badge: 'px-2.5 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  },
  yellow: {
    pill: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconWrapper: 'p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30',
    icon: 'w-5 h-5 text-yellow-600 dark:text-yellow-400',
    badge: 'px-2.5 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  },
  green: {
    pill: 'bg-green-100 dark:bg-green-900/30',
    iconWrapper: 'p-2 rounded-lg bg-green-100 dark:bg-green-900/30',
    icon: 'w-5 h-5 text-green-600 dark:text-green-400',
    badge: 'px-2.5 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  },
  red: {
    pill: 'bg-red-100 dark:bg-red-900/30',
    iconWrapper: 'p-2 rounded-lg bg-red-100 dark:bg-red-900/30',
    icon: 'w-5 h-5 text-red-600 dark:text-red-400',
    badge: 'px-2.5 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  },
};
