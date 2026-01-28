/**
 * ProtectedRoute Component
 * Wrapper that requires authentication to access children
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export default function ProtectedRoute({ children, requiredRoles = [] }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // If there's a refresh token stored, allow background refresh to complete before redirecting
      try {
        const hasRefresh = typeof window !== 'undefined' && !!localStorage.getItem('prospecai_refresh_token');
        if (hasRefresh) {
          console.debug('[ProtectedRoute] refresh token present - delaying redirect');
          return;
        }
      } catch (e) {
        // ignore
      }

      console.debug('[ProtectedRoute] redirecting to /login');
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Check role requirements
  useEffect(() => {
    if (!isLoading && isAuthenticated && requiredRoles.length > 0 && user) {
      const hasRequiredRole = requiredRoles.some(role => user.roles.includes(role));
      if (!hasRequiredRole) {
        console.debug('[ProtectedRoute] redirecting to /unauthorized');
        router.replace('/unauthorized');
      }
    }
  }, [isLoading, isAuthenticated, user, requiredRoles, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  // Role check failed
  if (requiredRoles.length > 0 && user) {
    const hasRequiredRole = requiredRoles.some(role => user.roles.includes(role));
    if (!hasRequiredRole) {
      return null; // Will redirect in useEffect
    }
  }

  return <>{children}</>;
}
