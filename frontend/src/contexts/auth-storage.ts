/**
 * Auth Storage Utilities
 * Safe localStorage helpers for authentication state
 * Used by both AuthContext and ApiClient
 * Implements RNF-02: Security with JWT tokens
 */
import type { User } from './auth-types';

// =============================================================================
// Constants
// =============================================================================

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'prospecai_access_token',
  REFRESH_TOKEN: 'prospecai_refresh_token',
  EXPIRES_AT: 'prospecai_expires_at',
  USER: 'prospecai_user',
  SELECTED_INSTITUTES: 'prospecai_selected_institutes',
} as const;

// =============================================================================
// Storage Getters
// =============================================================================

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEYS.USER);
  return stored ? JSON.parse(stored) : null;
}

export function getStoredSelectedInstitutes(): string[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEYS.SELECTED_INSTITUTES);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (typeof raw === 'string' && raw.trim().length) return raw.split(',').map(s => s.trim()).filter(Boolean);
  } catch (e) {
    if (typeof raw === 'string' && raw.trim().length) return raw.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}
