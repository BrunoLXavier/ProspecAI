/**
 * Locale Context
 * Manages the current locale and provides locale switching functionality
 * Implements RNF-05: i18n support (pt-BR, en-US, es-ES)
 */
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type SupportedLocale = 'pt-BR' | 'en-US' | 'es-ES';

export interface LocaleContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  availableLocales: readonly SupportedLocale[];
  localeNames: Record<SupportedLocale, string>;
}

const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['pt-BR', 'en-US', 'es-ES'] as const;

const LOCALE_NAMES: Record<SupportedLocale, string> = {
  'pt-BR': 'Português (Brasil)',
  'en-US': 'English (US)',
  'es-ES': 'Español',
};

const LOCALE_FLAGS: Record<SupportedLocale, string> = {
  'pt-BR': '🇧🇷',
  'en-US': '🇺🇸',
  'es-ES': '🇪🇸',
};

const STORAGE_KEY = 'prospecai-locale';

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ 
  children,
  defaultLocale = 'pt-BR'
}: { 
  children: React.ReactNode;
  defaultLocale?: SupportedLocale;
}) {
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved locale from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
      if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale)) {
        setLocaleState(savedLocale);
      }
      setIsInitialized(true);
    }
  }, []);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    if (!SUPPORTED_LOCALES.includes(newLocale)) {
      console.warn(`Unsupported locale: ${newLocale}`);
      return;
    }
    
    setLocaleState(newLocale);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLocale);
    }
    
    // Update document lang attribute
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale;
    }
  }, []);

  const value: LocaleContextType = {
    locale,
    setLocale,
    availableLocales: SUPPORTED_LOCALES,
    localeNames: LOCALE_NAMES,
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocaleContext(): LocaleContextType {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocaleContext must be used within a LocaleProvider');
  }
  return context;
}

export { SUPPORTED_LOCALES, LOCALE_NAMES, LOCALE_FLAGS };
