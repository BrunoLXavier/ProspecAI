/**
 * useI18n Hook
 * Wrapper around next-intl for consistent i18n usage
 * Implements RNF-05: i18n support (pt-BR, en-US, es-ES)
 */
'use client';

import { useTranslations, useLocale } from 'next-intl';

export interface I18nHook {
  t: ReturnType<typeof useTranslations>;
  locale: string;
  formatDate: (date: Date | string) => string;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
}

export function useI18n(namespace?: string): I18nHook {
  const t = useTranslations(namespace);
  const locale = useLocale();

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  };

  const formatCurrency = (value: number): string => {
    const currencyMap: Record<string, string> = {
      'pt-BR': 'BRL',
      'en-US': 'USD',
      'es-ES': 'EUR',
    };
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyMap[locale] || 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat(locale).format(value);
  };

  return {
    t,
    locale,
    formatDate,
    formatCurrency,
    formatNumber,
  };
}
