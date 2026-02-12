/**
 * Auth Types
 * Shared type definitions for authentication
 * Implements RNF-02: Security with JWT tokens
 */

export interface User {
  id: string;
  email: string;
  username: string;
  fullName?: string;
  tenantId?: string;
  roles: string[];
  emailVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  fullName?: string;
}

export interface AuthContextType {
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
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  checkEmailAvailable: (email: string) => Promise<boolean>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
  selectedInstitutes: string[];
  setSelectedInstitutes: (ids: string[]) => void;
}

export interface AuthError {
  detail: string;
  status: number;
}
