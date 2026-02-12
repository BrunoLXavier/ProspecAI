/**
 * AuthContext - Authentication Provider
 * Manages user authentication state with internal JWT
 * Implements RNF-02: Security with JWT tokens
 */
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setTokenRefreshFunction } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import type { User, AuthTokens, LoginCredentials, RegisterData, AuthContextType } from './auth-types';
import { STORAGE_KEYS, getStoredRefreshToken, getStoredSelectedInstitutes } from './auth-storage';

// Re-export storage utilities and types for backward compatibility
export { getStoredAccessToken, getStoredRefreshToken, getStoredUser, getStoredSelectedInstitutes } from './auth-storage';
export type { User, AuthTokens, LoginCredentials, RegisterData, AuthContextType, AuthError } from './auth-types';

// =============================================================================
// Constants
// =============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const AUTH_BASE = `${API_URL}/api/v1/auth`;

// =============================================================================
// Context
// =============================================================================

const AuthContext = createContext<AuthContextType | null>(null);

// =============================================================================
// API Helper
// =============================================================================

async function authFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${AUTH_BASE}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  return fetch(url, {
    ...options,
    headers,
  });
}



// =============================================================================
// Provider
// =============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false);
  const [selectedInstitutes, setSelectedInstitutes] = useState<string[]>(() => getStoredSelectedInstitutes());

  // Fetch current user from backend using access token (authoritative source)
  const fetchCurrentUser = async (accessToken?: string): Promise<User | null> => {
    try {
      const token = accessToken || localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) return null;

      const resp = await authFetch('/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!resp.ok) return null;
      const data = await resp.json();
      const raw = data.user || data;

      const userData: User = {
        id: raw.id,
        email: raw.email,
        username: raw.username,
        fullName: raw.full_name || raw.fullName || raw.fullname,
        tenantId: raw.tenant_id || raw.tenantId,
        roles: raw.roles || [],
        emailVerified: !!raw.email_verified,
      };

      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      setUser(userData);
      setRequiresEmailVerification(!userData.emailVerified);
      return userData;
    } catch (err) {
      console.error('Failed to fetch current user:', err);
      return null;
    }
  };

  // Load stored auth state on mount
  useEffect(() => {
    const loadStoredAuth = async () => {
      console.debug('[Auth] loadStoredAuth: starting');
      try {
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
        const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);

        if (storedUser && accessToken && refreshToken && expiresAt) {
          const expiry = parseInt(expiresAt, 10);
          
          // Check if token is still valid (with 60s buffer)
          if (Date.now() < expiry - 60000) {
            // Use the stored tokens, then fetch authoritative user from backend
            setTokens({
              accessToken,
              refreshToken,
              expiresAt: expiry,
            });

                // Attempt to fetch user from backend (authoritative roles)
                let fetched = await fetchCurrentUser(accessToken);

                // If backend rejects access token, try refreshing using refresh token
                if (!fetched && refreshToken) {
                  try {
                    const newAccess = await refreshAccessTokenInternal(refreshToken);
                    if (newAccess) {
                      fetched = await fetchCurrentUser(newAccess);
                    }
                  } catch (e) {
                    console.debug('[Auth] refresh attempt failed during loadStoredAuth', e);
                  }
                }

                if (!fetched) {
                  // If we still couldn't fetch authoritative user, clear stored auth
                  // to avoid trusting stale local data that causes redirect loops.
                  console.debug('[Auth] Stored tokens invalid - clearing stored auth');
                  clearStoredAuth();
                }
          } else {
            // Token expired, try to refresh
            await refreshAccessTokenInternal(refreshToken);
          }
        }
      } catch (error) {
        console.error('Failed to load stored auth:', error);
        clearStoredAuth();
      try {
        if (typeof window !== 'undefined') {
          delete (window as any).__PROSPECAI_ACCESS_TOKEN;
          delete (window as any).__PROSPECAI_REFRESH_TOKEN;
        }
      } catch (e) {
        console.error('[Auth] Failed clearing in-memory tokens:', e);
      }
      } finally {
        console.debug('[Auth] loadStoredAuth: finished, isLoading=false');
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_INSTITUTES, JSON.stringify(selectedInstitutes));
      try { window.dispatchEvent(new Event('prospecai:institute-selection-changed')); } catch (e) {}
    } catch (e) {
      console.debug('[Auth] Failed to persist selected institutes', e);
    }
  }, [selectedInstitutes]);

  // Persist selected institutes to backend preferences when user is authenticated
  useEffect(() => {
    const persist = async () => {
      try {
        const userId = user?.id;
        if (!userId) return;
        const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (!accessToken) return;

        await fetch(`${API_URL}/api/v1/user/preferences/institutes`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            user_id: userId,
            selectedInstitutes: selectedInstitutes,
          }),
        });
      } catch (e) {
        console.debug('[Auth] Failed saving selected institutes to backend', e);
      }
    };

    persist();
  }, [selectedInstitutes, user]);

  // Load persisted selected institutes for authenticated user on login
  useEffect(() => {
    const load = async () => {
      try {
        const userId = user?.id;
        if (!userId) return;
        const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (!accessToken) return;

        const resp = await fetch(`${API_URL}/api/v1/user/preferences/institutes?user_id=${encodeURIComponent(userId)}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (!resp.ok) return;
        const data = await resp.json();
        const list = data.selectedInstitutes || data.selected_institutes || [];
        if (Array.isArray(list) && list.length) {
          setSelectedInstitutes(list.map((s: any) => String(s)));
        }
      } catch (e) {
        console.debug('[Auth] Failed loading persisted selected institutes', e);
      }
    };

    load();
  }, [user]);

  const clearStoredAuth = () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setUser(null);
    setTokens(null);
    setRequiresEmailVerification(false);
  };

  const storeAuth = (authTokens: AuthTokens, userData: User) => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, authTokens.accessToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, authTokens.refreshToken);
      localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, String(authTokens.expiresAt));
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    } catch (e) {
      console.error('[Auth] Failed writing to localStorage in storeAuth:', e);
    }

    // Update React state regardless of localStorage success
    setTokens(authTokens);
    setUser(userData);
    setRequiresEmailVerification(!userData.emailVerified);

    // Sanity-check persistence and retry once if needed
    try {
      const persisted = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!persisted) {
        console.debug('[Auth] localStorage ACCESS_TOKEN missing after storeAuth, retrying');
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, authTokens.accessToken);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, authTokens.refreshToken);
        localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, String(authTokens.expiresAt));
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      }
    } catch (e) {
      console.error('[Auth] Retry writing to localStorage failed:', e);
    }
    // Also set an in-memory token to avoid race with localStorage reads by ApiClient
    try {
      if (typeof window !== 'undefined') {
        (window as any).__PROSPECAI_ACCESS_TOKEN = authTokens.accessToken;
        (window as any).__PROSPECAI_REFRESH_TOKEN = authTokens.refreshToken;
      }
    } catch (e) {
      console.error('[Auth] Failed to set in-memory token:', e);
    }
  };

  const refreshAccessTokenInternal = async (refreshTokenParam?: string): Promise<string | null> => {
    // Determine refresh token: prefer explicit param, then in-memory, then localStorage
    let refreshToken: string | null = null;
    if (refreshTokenParam) refreshToken = refreshTokenParam;
    try {
      if (!refreshToken && typeof window !== 'undefined' && (window as any).__PROSPECAI_REFRESH_TOKEN) {
        refreshToken = (window as any).__PROSPECAI_REFRESH_TOKEN as string;
      }
    } catch (e) {
      // ignore
    }
    
    if (!refreshToken) refreshToken = getStoredRefreshToken();

    // Debug which token will be sent (masked)
    try {
      const masked = refreshToken ? `${refreshToken.slice(0, 10)}...${refreshToken.slice(-6)}` : 'MISSING';
      console.debug('[Auth] refreshAccessTokenInternal will send refresh token:', masked);
    } catch (e) {
      // ignore
    }

    if (!refreshToken) {
      console.error('[Auth] No refresh token available for refreshAccessTokenInternal');
      clearStoredAuth();
      return null;
    }

    try {
      const response = await authFetch('/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      const authTokens: AuthTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(data.expires_at).getTime(),
      };

      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        username: data.user.username,
        fullName: data.user.full_name,
        roles: data.user.roles || [],
        emailVerified: data.user.email_verified,
      };

      storeAuth(authTokens, userData);
      return data.access_token;
    } catch (error) {
      console.error('Token refresh error:', error);
      clearStoredAuth();
      return null;
    }
  };

  const login = async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    
    console.debug('[Auth] login called');
    try {
      const response = await authFetch('/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      console.debug('[Auth] login response status', response.status);

      if (!response.ok) {
        const error = await response.json();
        throw { detail: error.detail || 'Login failed', status: response.status };
      }

      const data = await response.json();
      
      const authTokens: AuthTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(data.expires_at).getTime(),
      };

      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        username: data.user.username,
        fullName: data.user.full_name,
        roles: data.user.roles || [],
        emailVerified: data.user.email_verified,
      };

      storeAuth(authTokens, userData);
      
      // Redirect to home or email verification prompt
      if (data.requires_email_verification) {
        router.push('/auth/verify-email-prompt');
      } else {
        router.push('/');
      }
    } catch (error) {
      clearStoredAuth();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<{ message: string }> => {
    setIsLoading(true);
    
    try {
      const response = await authFetch('/register', {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          username: data.username,
          password: data.password,
          full_name: data.fullName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw { detail: error.detail || 'Registration failed', status: response.status };
      }

      const result = await response.json();
      return { message: result.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (revokeAll = false): Promise<void> => {
    try {
      if (tokens?.refreshToken) {
        await authFetch(`/logout?revoke_all=${revokeAll}`, {
          method: 'POST',
          body: JSON.stringify({ refresh_token: tokens.refreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearStoredAuth();
      router.push('/login');
    }
  };

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    
    if (!refreshToken) {
      clearStoredAuth();
      return null;
    }

    const result = await refreshAccessTokenInternal(refreshToken);
    
    if (!result) {
      console.debug('[Auth] refreshAccessToken failed — redirecting to /login');
      router.replace('/login');
    }
    
    return result;
  }, [router]);

  // Register token refresh function with ApiClient so it can refresh on 401
  useEffect(() => {
    setTokenRefreshFunction(refreshAccessToken);
    return () => {
      // clear the function on unmount
      setTokenRefreshFunction(async () => null);
    };
  }, [refreshAccessToken]);

  const requestPasswordReset = async (email: string): Promise<void> => {
    const response = await authFetch('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw { detail: error.detail || 'Request failed', status: response.status };
    }
  };

  const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    const response = await authFetch('/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw { detail: error.detail || 'Password reset failed', status: response.status };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    const response = await authFetch('/change-password', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokens?.accessToken}`,
      },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw { detail: error.detail || 'Password change failed', status: response.status };
    }
  };

  const verifyEmail = async (token: string): Promise<void> => {
    const response = await authFetch('/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw { detail: error.detail || 'Verification failed', status: response.status };
    }

    // Update user state to reflect verified email
    if (user) {
      const updatedUser = { ...user, emailVerified: true };
      setUser(updatedUser);
      setRequiresEmailVerification(false);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    }
  };

  const resendVerification = async (): Promise<void> => {
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    const response = await authFetch('/resend-verification', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw { detail: error.detail || 'Request failed', status: response.status };
    }
  };

  const checkEmailAvailable = async (email: string): Promise<boolean> => {
    const response = await authFetch(`/check-email?email=${encodeURIComponent(email)}`);
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.available;
  };

  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    const response = await authFetch(`/check-username?username=${encodeURIComponent(username)}`);
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.available;
  };

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!tokens) return;

    const refreshBuffer = 60000; // 60 seconds before expiry
    const timeUntilRefresh = tokens.expiresAt - Date.now() - refreshBuffer;

    if (timeUntilRefresh <= 0) {
      refreshAccessToken();
      return;
    }

    const refreshTimer = setTimeout(() => {
      refreshAccessToken();
    }, timeUntilRefresh);

    return () => clearTimeout(refreshTimer);
  }, [tokens, refreshAccessToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        isLoading,
        isAuthenticated: !!user && !!tokens,
        requiresEmailVerification,
        login,
        register,
        logout,
        refreshAccessToken,
        requestPasswordReset,
        resetPassword,
        changePassword,
        verifyEmail,
        resendVerification,
        checkEmailAvailable,
        checkUsernameAvailable,
        selectedInstitutes,
        setSelectedInstitutes,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
