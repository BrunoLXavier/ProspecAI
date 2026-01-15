/**
 * AuthContext - Authentication Provider
 * Manages user authentication state with internal JWT
 * Implements RNF-02: Security with JWT tokens
 */
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// =============================================================================
// Types
// =============================================================================

interface User {
  id: string;
  email: string;
  username: string;
  fullName?: string;
  tenantId?: string;
  roles: string[];
  emailVerified: boolean;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  fullName?: string;
}

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requiresEmailVerification: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<{ message: string }>;
  logout: (revokeAll?: boolean) => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  checkEmailAvailable: (email: string) => Promise<boolean>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
}

interface AuthError {
  detail: string;
  status: number;
}

// =============================================================================
// Constants
// =============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const AUTH_BASE = `${API_URL}/api/v1/auth`;

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'prospecai_access_token',
  REFRESH_TOKEN: 'prospecai_refresh_token',
  EXPIRES_AT: 'prospecai_expires_at',
  USER: 'prospecai_user',
};

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
            const fetched = await fetchCurrentUser(accessToken);
            if (!fetched) {
              // fallback to stored user if fetch fails
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
              setRequiresEmailVerification(!parsedUser.emailVerified);
            }
          } else {
            // Token expired, try to refresh
            await refreshAccessTokenInternal(refreshToken);
          }
        }
      } catch (error) {
        console.error('Failed to load stored auth:', error);
        clearStoredAuth();
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

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
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, authTokens.accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, authTokens.refreshToken);
    localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, authTokens.expiresAt.toString());
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    setTokens(authTokens);
    setUser(userData);
    setRequiresEmailVerification(!userData.emailVerified);
  };

  const refreshAccessTokenInternal = async (refreshToken: string): Promise<string | null> => {
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

      // Ensure admin account receives admin role locally
      if (userData.email === 'admin@prospecai.com' && !userData.roles.includes('admin')) {
        userData.roles = [...userData.roles, 'admin'];
      }

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
    
    try {
      const response = await authFetch('/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

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
      router.push('/login');
    }
    
    return result;
  }, [router]);

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
        verifyEmail,
        resendVerification,
        checkEmailAvailable,
        checkUsernameAvailable,
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

// =============================================================================
// Export utility for API client
// =============================================================================

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEYS.USER);
  return stored ? JSON.parse(stored) : null;
}
