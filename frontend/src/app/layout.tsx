// ProspecAI Frontend - Main Layout
// Implements RNF-05: i18n support (pt-BR, en-US, es-ES)
// Firjan SENAI Brand Identity with Modern Flat Design
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ThemeScript } from '@/components/features/shared/layout/ThemeProvider';
import LayoutShell from './layout-shell';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'ProspecAI - Intelligent R&D Project Prospecting',
  description: 'SaaS platform for strategic R&D project matching and management',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Default locale since we're not using [locale] folder structure
  const locale = 'pt-BR';
  
  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)] antialiased">
        <Providers locale={locale}>
          <LayoutShell>
            {children}
          </LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
