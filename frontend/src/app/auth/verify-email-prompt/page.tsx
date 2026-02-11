/**
 * Verify Email Prompt Page
 * Shown when user needs to verify email
 * Allows resending verification email
 * Implements i18n support
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/features/shared/layout/ThemeProvider';
import { useI18n } from '@/hooks/use-i18n';

export default function VerifyEmailPromptPage() {
  const router = useRouter();
  const { user, isAuthenticated, resendVerification, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    // If user is verified, redirect to dashboard
    if (isAuthenticated && user?.emailVerified) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    // Cooldown timer
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResendVerification = async () => {
    if (cooldown > 0) return;
    
    setError('');
    setResendSuccess(false);
    setIsResending(true);

    try {
      await resendVerification();
      setResendSuccess(true);
      setCooldown(60); // 60 second cooldown
    } catch (err: any) {
      if (err.detail?.includes('rate') || err.detail?.includes('many')) {
        setError(t('auth.verifyEmailPrompt.errors.tooManyRequests'));
      } else if (err.detail?.includes('already')) {
        setError(t('auth.verifyEmailPrompt.errors.alreadyVerified'));
        // Redirect after showing message
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        setError(err.detail || t('auth.verifyEmailPrompt.errors.generic'));
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      // Force redirect even if logout fails
      router.push('/login');
    }
  };

  const handleContinueAnyway = () => {
    // User can continue but with limited functionality
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 px-4">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg bg-white/80 dark:bg-slate-700/80 hover:bg-white dark:hover:bg-slate-600 transition-colors shadow-lg"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>

      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/20">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            {t('auth.verifyEmailPrompt.title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('auth.verifyEmailPrompt.subtitle')}
          </p>
        </div>

        {/* User Email Info */}
        {user?.email && (
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.verifyEmailPrompt.emailSentTo')}
            </p>
            <p className="font-medium text-gray-900 dark:text-white mt-1">
              {user.email}
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 h-6 w-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-600 dark:text-primary-400">1</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.verifyEmailPrompt.instruction1')}
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 h-6 w-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-600 dark:text-primary-400">2</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.verifyEmailPrompt.instruction2')}
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 h-6 w-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-600 dark:text-primary-400">3</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.verifyEmailPrompt.instruction3')}
            </p>
          </div>
        </div>

        {/* Success Message */}
        {resendSuccess && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg text-sm flex items-center">
            <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {t('auth.verifyEmailPrompt.resendSuccess')}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {/* Resend Verification Button */}
          <button
            onClick={handleResendVerification}
            disabled={isResending || cooldown > 0}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-secondary-600 hover:from-primary-600 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isResending ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('auth.verifyEmailPrompt.resending')}
              </span>
            ) : cooldown > 0 ? (
              t('auth.verifyEmailPrompt.resendCooldown').replace('{seconds}', String(cooldown))
            ) : (
              t('auth.verifyEmailPrompt.resendButton')
            )}
          </button>

          {/* Continue Anyway Button */}
          <button
            onClick={handleContinueAnyway}
            className="w-full flex justify-center py-3 px-4 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
          >
            {t('auth.verifyEmailPrompt.continueAnyway')}
          </button>

          {/* Warning for continue anyway */}
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            {t('auth.verifyEmailPrompt.continueWarning')}
          </p>
        </div>

        {/* Logout and Change Account */}
        <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('auth.verifyEmailPrompt.wrongAccount')}
            </p>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
            >
              {t('auth.verifyEmailPrompt.logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
