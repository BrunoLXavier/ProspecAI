/**
 * Login Page
 * Authentication form with internal JWT
 * Implements i18n and dark mode support
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/features/shared/layout/ThemeProvider';
import { useI18n } from '@/hooks/use-i18n';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login({ email, password });
    } catch (err: any) {
      if (err.status === 429) {
        setError(t('auth.login.errors.accountLocked'));
      } else if (err.status === 401) {
        setError(t('auth.login.errors.invalidCredentials'));
      } else {
        setError(err.detail || t('auth.login.errors.generic'));
      }
    } finally {
      setIsSubmitting(false);
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            ProspecAI
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('auth.login.subtitle')}
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('auth.login.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder={t('auth.login.emailPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('auth.login.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  aria-label={showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" fillRule="evenodd" />
                      <path d="M15.171 13.576l1.471 1.47a1 1 0 001.414-1.414l-14-14a1 1 0 00-1.414 1.414l1.473 1.474A10.014 10.014 0 00.458 10C1.732 14.057 5.522 17 10 17a9.958 9.958 0 004.512-1.074l1.78 1.781a1 1 0 001.414-1.414zm-5.171-2.576a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd" fillRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                {t('auth.login.rememberMe')}
              </label>
            </div>

            <Link 
              href="/auth/forgot-password" 
              className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
            >
              {t('auth.login.forgotPassword')}
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-secondary-600 hover:from-primary-600 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('auth.login.submitting')}
              </span>
            ) : (
              t('auth.login.submit')
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            {t('auth.login.noAccount')}{' '}
            <Link 
              href="/auth/contact" 
              className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
            >
              {t('auth.login.requestAccess')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
