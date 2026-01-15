// Client-side Providers
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { useState, useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { LocaleProvider, useLocaleContext, SupportedLocale } from '@/contexts/LocaleContext';
import ptBR from '@/locales/pt-BR.json';
import enUS from '@/locales/en-US.json';
import esES from '@/locales/es-ES.json';

const messages: Record<SupportedLocale, any> = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es-ES': esES,
};

// Inner component that uses locale context
function IntlProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLocaleContext();
  const resolvedMessages = messages[locale] || messages['pt-BR'];

  return (
    <NextIntlClientProvider 
      locale={locale} 
      messages={resolvedMessages}
      timeZone="America/Sao_Paulo"
    >
      {children}
    </NextIntlClientProvider>
  );
}

export function Providers({ 
  children, 
  locale = 'pt-BR'
}: { 
  children: React.ReactNode;
  locale?: SupportedLocale;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <LocaleProvider defaultLocale={locale}>
      <IntlProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryClientProvider>
      </IntlProvider>
    </LocaleProvider>
  );
}
