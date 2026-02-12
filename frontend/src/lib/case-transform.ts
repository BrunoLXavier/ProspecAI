/**
 * Case Transformation Utilities
 * Converts between camelCase (frontend) and snake_case (backend API)
 * Single source of truth for all API payload normalization
 * 
 * Implements RNF-03: Standardized API communication layer
 */

// ─── Core Transformers ───────────────────────────────────────────────────────

/**
 * Convert a single string from camelCase to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Convert a single string from snake_case to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

// ─── Deep Object Transformers ────────────────────────────────────────────────

/**
 * Recursively transform all keys of an object/array using a key transform function.
 * Handles nested objects, arrays, null, and primitives safely.
 */
function deepTransformKeys<T>(data: T, transformFn: (key: string) => string): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => deepTransformKeys(item, transformFn)) as T;
  }

  if (data instanceof Date || data instanceof File || data instanceof Blob || data instanceof FormData) {
    return data;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    result[transformFn(key)] = deepTransformKeys(value, transformFn);
  }
  return result as T;
}

/**
 * Convert all keys of an object from camelCase to snake_case (deep)
 * Used in request interceptor before sending data to backend
 */
export function toSnakeCaseKeys<T>(data: T): T {
  return deepTransformKeys(data, toSnakeCase);
}

/**
 * Convert all keys of an object from snake_case to camelCase (deep)
 * Used in response interceptor after receiving data from backend
 */
export function toCamelCaseKeys<T>(data: T): T {
  return deepTransformKeys(data, toCamelCase);
}

// ─── Header-Safe Check ───────────────────────────────────────────────────────

/** Keys that should NOT be transformed (HTTP headers, special fields) */
const SKIP_KEYS = new Set([
  'Content-Type', 'Authorization', 'X-Tenant-ID', 'X-User-ID',
  'X-Institute-IDs', 'Accept', 'Cache-Control',
]);

/**
 * Check if a key should be skipped during transformation
 * (e.g., HTTP headers, IDs that are already in correct format)
 */
export function shouldSkipKey(key: string): boolean {
  return SKIP_KEYS.has(key) || key.startsWith('X-') || key.startsWith('x-');
}
