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
 * Fields whose *values* contain domain-data keys (e.g. nav item IDs)
 * that must NOT be transformed. The field name itself IS transformed,
 * but child object keys inside these fields are preserved as-is.
 */
const VALUE_KEY_PRESERVE_FIELDS = new Set([
  'nav_parent_map', 'navParentMap',
  'visible_nav_items_by_role', 'visibleNavItemsByRole',
  'dashboard_widgets_by_role', 'dashboardWidgetsByRole',
]);

/**
 * Recursively transform all keys of an object/array using a key transform function.
 * Handles nested objects, arrays, null, and primitives safely.
 * Keys listed in VALUE_KEY_PRESERVE_FIELDS will have their name transformed but
 * their child keys preserved verbatim (to protect domain-data IDs like nav item names).
 */
function deepTransformKeys<T>(data: T, transformFn: (key: string) => string, preserveChildKeys = false): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => deepTransformKeys(item, transformFn, preserveChildKeys)) as T;
  }

  if (data instanceof Date || data instanceof File || data instanceof Blob || data instanceof FormData) {
    return data;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const newKey = preserveChildKeys ? key : transformFn(key);
    // If this field's values contain domain-data keys, preserve child keys
    if (VALUE_KEY_PRESERVE_FIELDS.has(key) && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Only transform the field name, keep inner keys as-is (just recurse values, not keys)
      const preserved: Record<string, unknown> = {};
      for (const [innerKey, innerVal] of Object.entries(value as Record<string, unknown>)) {
        preserved[innerKey] = innerVal;
      }
      result[newKey] = preserved;
    } else {
      result[newKey] = deepTransformKeys(value, transformFn, preserveChildKeys);
    }
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
