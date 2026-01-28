/**
 * Contact / Request Access Page
 * Dynamic form based on admin configuration
 * Implements i18n support
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/components/features/shared/layout/ThemeProvider';
import { useI18n } from '@/hooks/useI18n';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation_regex?: string;
}

interface ContactFormConfig {
  enabled: boolean;
  fields: FormField[];
  require_captcha: boolean;
  rate_limit_per_email: number;
  rate_limit_window_minutes: number;
}

interface RateLimitStatus {
  remaining_submissions: number;
  reset_at: string | null;
}

export default function ContactPage() {
  const { theme, toggleTheme } = useTheme();
  const { t, locale } = useI18n();
  
  const [config, setConfig] = useState<ContactFormConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${API_URL}/contact/config`);
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
          
          // Initialize form data with empty values
          const initialData: Record<string, string> = {};
          data.fields.forEach((field: FormField) => {
            initialData[field.name] = '';
          });
          setFormData(initialData);
        } else {
          setError(t('auth.contact.errors.loadFailed'));
        }
      } catch (err) {
        setError(t('auth.contact.errors.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [API_URL, t]);

  const checkRateLimit = async (email: string) => {
    try {
      const response = await fetch(`${API_URL}/contact/rate-limit-status?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        setRateLimitStatus(data);
        return data.remaining_submissions > 0;
      }
      return true;
    } catch {
      return true;
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!config) return false;

    for (const field of config.fields) {
      const value = formData[field.name]?.trim() || '';
      
      if (field.required && !value) {
        setError(t('auth.contact.errors.requiredField').replace('{field}', field.label));
        return false;
      }

      if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          setError(t('auth.contact.errors.invalidEmail'));
          return false;
        }
      }

      if (field.validation_regex && value) {
        const regex = new RegExp(field.validation_regex);
        if (!regex.test(value)) {
          setError(t('auth.contact.errors.invalidFormat').replace('{field}', field.label));
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    // Check rate limit before submitting
    const email = formData.email;
    if (email) {
      const withinLimit = await checkRateLimit(email);
      if (!withinLimit) {
        setError(t('auth.contact.errors.tooManyRequests'));
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/contact/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        setReferenceId(data.reference_id || '');
      } else if (response.status === 429) {
        setError(t('auth.contact.errors.tooManyRequests'));
        if (data.reset_at) {
          setRateLimitStatus({
            remaining_submissions: 0,
            reset_at: data.reset_at
          });
        }
      } else if (response.status === 503) {
        setError(t('auth.contact.errors.serviceUnavailable'));
      } else {
        setError(data.detail || t('auth.contact.errors.generic'));
      }
    } catch (err) {
      setError(t('auth.contact.errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const commonClasses = "mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500";

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            id={field.name}
            name={field.name}
            required={field.required}
            value={formData[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            className={`${commonClasses} min-h-[120px] resize-y`}
            placeholder={field.placeholder}
            rows={4}
          />
        );

      case 'select':
        return (
          <select
            id={field.name}
            name={field.name}
            required={field.required}
            value={formData[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            className={commonClasses}
          >
            <option value="">{field.placeholder || t('auth.contact.selectOption')}</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            id={field.name}
            name={field.name}
            type={field.type}
            required={field.required}
            value={formData[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            className={commonClasses}
            placeholder={field.placeholder}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
        <div className="animate-spin h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!config?.enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 px-4">
        <div className="max-w-md w-full p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl text-center">
          <div className="mx-auto h-16 w-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
            {t('auth.contact.formDisabled')}
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('auth.contact.formDisabledMessage')}
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            {t('auth.contact.backToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 px-4 py-8">
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

      <div className="max-w-lg w-full space-y-8 p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/20">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            {t('auth.contact.title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('auth.contact.subtitle')}
          </p>
        </div>

        {isSuccess ? (
          /* Success State */
          <div className="text-center space-y-6">
            <div className="mx-auto h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('auth.contact.success')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('auth.contact.successMessage')}
            </p>
            {referenceId && (
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('auth.contact.referenceId')}
                </p>
                <p className="font-mono text-lg font-bold text-primary-600 dark:text-primary-400">
                  {referenceId}
                </p>
              </div>
            )}
            <Link
              href="/login"
              className="inline-block w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-secondary-600 hover:from-primary-600 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all text-center"
            >
              {t('auth.contact.backToLogin')}
            </Link>
          </div>
        ) : (
          /* Form */
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {rateLimitStatus && rateLimitStatus.remaining_submissions === 0 && rateLimitStatus.reset_at && (
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-lg text-sm">
                {t('auth.contact.rateLimitMessage').replace(
                  '{time}',
                  new Date(rateLimitStatus.reset_at).toLocaleTimeString(locale)
                )}
              </div>
            )}

            <div className="space-y-4">
              {config.fields.map((field) => (
                <div key={field.name}>
                  <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderField(field)}
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-secondary-600 hover:from-primary-600 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('auth.contact.submitting')}
                </span>
              ) : (
                t('auth.contact.submit')
              )}
            </button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {t('auth.contact.backToLogin')}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
