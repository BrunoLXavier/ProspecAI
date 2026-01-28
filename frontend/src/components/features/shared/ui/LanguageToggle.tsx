/**
 * Language Toggle Component
 * Allows users to switch between supported languages
 * Implements RNF-05: i18n support (pt-BR, en-US, es-ES)
 */
'use client';

import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { GlobeAltIcon, CheckIcon } from '@heroicons/react/24/outline';
import { 
  useLocaleContext, 
  SupportedLocale, 
  LOCALE_FLAGS,
  LOCALE_NAMES 
} from '@/contexts/LocaleContext';

interface LanguageToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function LanguageToggle({ className = '', showLabel = false }: LanguageToggleProps) {
  const { locale, setLocale, availableLocales } = useLocaleContext();

  return (
    <Menu as="div" className={`relative ${className}`}>
      <Menu.Button className="header-icon-btn flex items-center gap-2">
        <GlobeAltIcon className="w-5 h-5" />
        {showLabel && (
          <span className="hidden lg:inline text-sm">
            {LOCALE_FLAGS[locale]}
          </span>
        )}
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-150"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-white dark:bg-slate-800 shadow-elevated border border-gray-200 dark:border-slate-700 focus:outline-none overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Idioma / Language
            </h3>
          </div>
          
          <div className="py-1">
            {availableLocales.map((loc) => (
              <Menu.Item key={loc}>
                {({ active }) => (
                  <button
                    onClick={() => setLocale(loc)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-gray-50 dark:bg-slate-700/50'
                        : ''
                    } ${
                      locale === loc
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-lg">{LOCALE_FLAGS[loc]}</span>
                      <span>{LOCALE_NAMES[loc]}</span>
                    </span>
                    {locale === loc && (
                      <CheckIcon className="w-4 h-4 text-primary-500" />
                    )}
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

export default LanguageToggle;
