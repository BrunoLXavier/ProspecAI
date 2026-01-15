/**
 * Verify Email Page
 * Handles email verification token processing
 * Implements i18n support
 */
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useI18n } from '@/hooks/useI18n';

type VerificationState = 'loading' | 'success' | 'error' | 'no-token';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const { verifyEmail } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  
  const [state, setState] = useState<VerificationState>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setState('no-token');
      return;
    }

    const verify = async () => {
      try {
        await verifyEmail(token);
        setState('success');
      } catch (err: any) {
        setState('error');
        if (err.detail?.includes('expired')) {
          setError(t('auth.verifyEmail.errors.tokenExpired'));
        } else if (err.detail?.includes('already') || err.detail?.includes('used')) {
          setError(t('auth.verifyEmail.errors.alreadyVerified'));
        } else if (err.detail?.includes('invalid') || err.detail?.includes('not found')) {
          setError(t('auth.verifyEmail.errors.tokenInvalid'));
        } else {
          setError(err.detail || t('auth.verifyEmail.errors.generic'));
        }
      }
    };

    verify();
  }, [searchParams, verifyEmail, t]);

  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto h-16 w-16 flex items-center justify-center">
              <svg className="animate-spin h-12 w-12 text-primary-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {t('auth.verifyEmail.verifying')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('auth.verifyEmail.pleaseWait')}
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('auth.verifyEmail.success')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('auth.verifyEmail.successMessage')}
            </p>
            <Link
              href="/login"
              className="inline-block w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-secondary-600 hover:from-primary-600 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all text-center"
            >
              {t('auth.verifyEmail.goToLogin')}
            </Link>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('auth.verifyEmail.error')}
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
            <div className="space-y-3">
              <Link
                href="/auth/verify-email-prompt"
                className="inline-block w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-secondary-600 hover:from-primary-600 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all text-center"
              >
                {t('auth.verifyEmail.requestNewLink')}
              </Link>
              <Link
                href="/login"
                className="inline-block w-full py-3 px-4 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all text-center"
              >
                {t('auth.verifyEmail.backToLogin')}
              </Link>
            </div>
          </div>
        );

      case 'no-token':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto h-16 w-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('auth.verifyEmail.noToken')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('auth.verifyEmail.noTokenMessage')}
            </p>
            <div className="space-y-3">
              <Link
                href="/auth/verify-email-prompt"
                className="inline-block w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-secondary-600 hover:from-primary-600 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all text-center"
              >
                {t('auth.verifyEmail.requestNewLink')}
              </Link>
              <Link
                href="/login"
                className="inline-block w-full py-3 px-4 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all text-center"
              >
                {t('auth.verifyEmail.backToLogin')}
              </Link>
            </div>
          </div>
        );
    }
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
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            {t('auth.verifyEmail.title')}
          </h2>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
