// Layout Shell Component
// Client component that wraps Sidebar, Header, and main content
// with proper context providers
'use client';

import React, { useEffect } from 'react';
import { useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { SidebarProvider, useSidebar } from '@/components/layout/Sidebar';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ChatWidget from '@/components/chat/ChatWidget';
import { FeedbackButton } from '@/components/feedback';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutProvider, useLayout } from '@/contexts/LayoutContext';
import ErrorBoundary from '@/components/ErrorBoundary';

// Inner layout that uses sidebar context
function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const { config } = useLayout();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const lastRedirectRef = useRef<number>(0);

  // Public routes that don't require authentication
  const publicRoutes = ['/login'];
  // Allow localized prefixes (e.g. /pt-BR/login) by checking suffix
  const isPublicRoute = publicRoutes.some(r => pathname === r || pathname.endsWith(r));

  useEffect(() => {
    console.debug('[LayoutShell] auth state:', { pathname, isLoading, isAuthenticated, isPublicRoute });
    // Wait for auth state to load
    if (isLoading) return;
    
    // Redirect unauthenticated users to login
    const now = Date.now();

    if (!isAuthenticated && !isPublicRoute) {
      try {
        const hasRefresh = typeof window !== 'undefined' && !!localStorage.getItem('prospecai_refresh_token');
        if (!hasRefresh) {
          if (!pathname?.endsWith('/login') && now - lastRedirectRef.current > 1000) {
            lastRedirectRef.current = now;
            router.push('/login');
          }
        } else {
          console.debug('[LayoutShell] refresh token present - delaying redirect to /login');
        }
      } catch (e) {
        if (!pathname?.endsWith('/login') && now - lastRedirectRef.current > 1000) {
          lastRedirectRef.current = now;
          router.push('/login');
        }
      }
    }

    // Redirect authenticated users away from login page
    if (isAuthenticated && isPublicRoute) {
      if (!pathname || pathname === '/login' || pathname.endsWith('/login')) {
        if (now - lastRedirectRef.current > 1000) {
          lastRedirectRef.current = now;
          router.push('/');
        }
      }
    }
  }, [isAuthenticated, isLoading, isPublicRoute, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // For login page, render without sidebar/header
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Protected routes - show full layout
  // Compute main content margin to accommodate sidebar on either side
  const sidebarWidth = isCollapsed ? 72 : (config?.sidebar_width || 260);
  const mainStyle: React.CSSProperties = {};
  if (config?.sidebar_position === 'right') {
    mainStyle.marginRight = `${sidebarWidth}px`;
  } else {
    mainStyle.marginLeft = `${sidebarWidth}px`;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-350`}
        style={mainStyle}
      >
        {/* Header */}
        <Header />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pt-16">
          <div className="container mx-auto px-4 lg:px-6 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* AI Chat Widget */}
      {/** Render these conditionally based on layout config flags **/}
      <LayoutFeatureToggle />
    </div>
  );
}

function LayoutFeatureToggle() {
  const { config } = useLayout();
  return (
    <>
      {config.ai_chat_enabled && <ChatWidget />}
      {config.feedback_button_enabled && <FeedbackButton />}
    </>
  );
}

// Layout Shell with all providers
export default function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light">
      <LayoutProvider>
        <SidebarProvider defaultCollapsed={false}>
          <LayoutContent>
            <ErrorBoundary>{children}</ErrorBoundary>
          </LayoutContent>
        </SidebarProvider>
      </LayoutProvider>
    </ThemeProvider>
  );
}
