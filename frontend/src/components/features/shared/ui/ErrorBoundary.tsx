"use client";

import React from 'react';
import { useTranslations } from 'next-intl';

interface State {
  hasError: boolean;
  error: Error | null;
  info: React.ErrorInfo | null;
}

interface ErrorBoundaryTranslations {
  clientError: string;
  unexpectedRenderError: string;
  showErrorDetails: string;
}

type Props = React.PropsWithChildren<{
  translations?: ErrorBoundaryTranslations;
}>;

class ErrorBoundaryClass extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Store locally and report to console so container logs capture it
    this.setState({ hasError: true, error, info });
    // Log full details for debugging (will appear in browser console and server logs if forwarded)
    // eslint-disable-next-line no-console
    console.error('Client-side error caught by ErrorBoundary:', { error, info });

    try {
      // Attempt to POST the error to backend debugging endpoint (best-effort)
      fetch('/api/debug/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: error.message, stack: error.stack, info }),
      }).catch(() => {});
    } catch (e) {
      // ignore
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-white dark:bg-slate-900 rounded shadow">
          <h2 className="text-lg font-semibold text-red-600">{this.props.translations?.clientError ?? 'Application error (client)'}</h2>
          <p className="mt-2 text-sm text-gray-600">{this.props.translations?.unexpectedRenderError ?? 'An unexpected error occurred while rendering this page.'}</p>
          <details className="mt-4 text-xs text-gray-500">
            <summary className="cursor-pointer">{this.props.translations?.showErrorDetails ?? 'Show error details'}</summary>
            <pre className="whitespace-pre-wrap mt-2">{String(this.state.error && this.state.error.stack)}</pre>
            <pre className="whitespace-pre-wrap mt-2">{String(this.state.info && this.state.info.componentStack)}</pre>
          </details>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

/**
 * Functional wrapper that provides i18n translations to the class-based ErrorBoundary.
 * Implements RF-07 – internationalized error UI.
 */
export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const t = useTranslations('errors');
  return (
    <ErrorBoundaryClass
      translations={{
        clientError: t('clientError'),
        unexpectedRenderError: t('unexpectedRenderError'),
        showErrorDetails: t('showErrorDetails'),
      }}
    >
      {children}
    </ErrorBoundaryClass>
  );
}
