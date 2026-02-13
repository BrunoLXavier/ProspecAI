/**
 * ScreenshotCapture Component
 * Captures screenshot of current page using html2canvas
 * Excludes the feedback modal from the capture
 * Implements: User Feedback System
 */
"use client";

import { useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import html2canvas from 'html2canvas';
import { useFeedbackStore } from '@/stores/feedback-store';

// ---------------------------------------------------------------------------
// Modern CSS color sanitization helpers
// html2canvas cannot parse color(), oklch(), oklab(), lab(), lch().
// We intercept getComputedStyle on the main window to feed it rgb()/rgba().
// ---------------------------------------------------------------------------

const COLOR_FUNC_RE = /\b(?:color|oklch|oklab|lab|lch)\([^)]*\)/g;

function quickHasModernColor(s: string): boolean {
  return (
    s.includes('color(') ||
    s.includes('oklch(') ||
    s.includes('oklab(') ||
    s.includes('lab(') ||
    s.includes('lch(')
  );
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, isNaN(n) ? 0 : n));
}

function fmtRgba(r: number, g: number, b: number, a: number): string {
  if (isNaN(a) || a >= 1) return `rgb(${r},${g},${b})`;
  return `rgba(${r},${g},${b},${Math.round(a * 1000) / 1000})`;
}

function convertColorMatch(match: string): string {
  try {
    const parenIdx = match.indexOf('(');
    const fn = match.slice(0, parenIdx);
    const tokens = match
      .slice(parenIdx + 1, -1)
      .trim()
      .split(/[\s/]+/)
      .filter(Boolean);

    if (fn === 'color' && tokens.length >= 4) {
      const r = Math.round(clamp01(parseFloat(tokens[1])) * 255);
      const g = Math.round(clamp01(parseFloat(tokens[2])) * 255);
      const b = Math.round(clamp01(parseFloat(tokens[3])) * 255);
      const a = tokens.length >= 5 ? parseFloat(tokens[4]) : 1;
      return fmtRgba(r, g, b, a);
    }

    if ((fn === 'oklch' || fn === 'lch') && tokens.length >= 3) {
      let L = parseFloat(tokens[0]);
      if (tokens[0].endsWith('%')) L /= 100;
      const gray = Math.round(clamp01(L) * 255);
      const a = tokens.length >= 4 ? parseFloat(tokens[3]) : 1;
      return fmtRgba(gray, gray, gray, a);
    }

    if ((fn === 'oklab' || fn === 'lab') && tokens.length >= 3) {
      let L = parseFloat(tokens[0]);
      if (tokens[0].endsWith('%')) L /= 100;
      const gray = Math.round(clamp01(L) * 255);
      const a = tokens.length >= 4 ? parseFloat(tokens[3]) : 1;
      return fmtRgba(gray, gray, gray, a);
    }
  } catch {
    /* conversion error */
  }
  return 'transparent';
}

/**
 * Temporarily monkey-patch window.getComputedStyle so that html2canvas
 * never encounters modern CSS color functions it cannot parse.
 * Returns a restore function that MUST be called when done.
 */
function patchGetComputedStyle(): () => void {
  const origGCS = window.getComputedStyle;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).getComputedStyle = function (
    elt: Element,
    pseudoElt?: string | null,
  ): CSSStyleDeclaration {
    const cs = origGCS.call(window, elt, pseudoElt);
    return new Proxy(cs, {
      get(target, prop) {
        if (prop === 'getPropertyValue') {
          return function (name: string) {
            const val = target.getPropertyValue(name);
            if (typeof val === 'string' && quickHasModernColor(val)) {
              return val.replace(COLOR_FUNC_RE, convertColorMatch);
            }
            return val;
          };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (target as any)[prop];

        if (typeof value === 'function') {
          return value.bind(target);
        }

        if (typeof value === 'string' && quickHasModernColor(value)) {
          return value.replace(COLOR_FUNC_RE, convertColorMatch);
        }

        return value;
      },
    });
  };

  return () => {
    window.getComputedStyle = origGCS;
  };
}

/** Common html2canvas options shared by both capture paths. */
function html2canvasOptions() {
  // Pre-compute the set of portal root elements to skip so the entire
  // feedback dialog (panel + backdrop) is excluded from the screenshot.
  const portalRoots = new Set<Element>();
  document.querySelectorAll('.feedback-modal, [role="dialog"]').forEach((el) => {
    let node: Element | null = el;
    while (node && node.parentElement && node.parentElement !== document.body) {
      node = node.parentElement;
    }
    if (node && node !== document.body) portalRoots.add(node);
  });

  return {
    ignoreElements: (el: Element) => {
      if (el.hasAttribute?.('data-feedback-ignore')) return true;
      if (el.classList?.contains('feedback-modal')) return true;
      if (el.classList?.contains('feedback-button')) return true;
      if (el.id === 'feedback-container') return true;
      // Skip the entire Headless UI portal tree (includes backdrop + dialog)
      if (portalRoots.has(el)) return true;
      return false;
    },
    allowTaint: true,
    useCORS: true,
    scale: 1,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    scrollX: -window.scrollX,
    scrollY: -window.scrollY,
    width: window.innerWidth,
    height: window.innerHeight,
    imageTimeout: 5000,
  };
}

interface ScreenshotCaptureProps {
  onCapture: (base64: string, width: number, height: number) => void;
  onError: (error: string) => void;
}

export default function ScreenshotCapture({ onCapture, onError }: ScreenshotCaptureProps) {
  const setCaptureMethod = useFeedbackStore((s) => s.setCaptureMethod);
  const t = useTranslations('feedback');

  const captureScreenshot = useCallback(async () => {
    console.log('[ScreenshotCapture] Starting screenshot capture...');

    // Get the root element to capture, but use viewport dimensions only
    const element = document.body;

    if (!element) {
      onError(t('error.documentBodyNotFound'));
      return;
    }

    // Temporarily hide any elements that should be ignored to avoid html2canvas edge-cases
    const ignoredEls = Array.from(document.querySelectorAll('[data-feedback-ignore]')) as Element[];
    const previousStyles = new Map<Element, string | null>();

    try {
      ignoredEls.forEach((el) => {
        // store previous inline style
        previousStyles.set(el, (el as HTMLElement).style?.cssText || null);
        // hide the element forcibly
        (el as HTMLElement).style.setProperty('display', 'none', 'important');
      });

      // Patch getComputedStyle to handle modern CSS color functions
      const restoreGCS = patchGetComputedStyle();

      let canvas: HTMLCanvasElement;
      try {
        canvas = await Promise.race([
          html2canvas(element, html2canvasOptions()),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Screenshot capture timeout (20s)')), 20000)
          ),
        ]);
      } finally {
        restoreGCS();
      }

      console.log('[ScreenshotCapture] Canvas created successfully');

      // Convert to base64
      const base64 = canvas.toDataURL('image/png');
      const width = canvas.width;
      const height = canvas.height;

      console.log('[ScreenshotCapture] Screenshot captured:', { width, height, base64Length: base64.length });

      onCapture(base64, width, height);
      try { document.documentElement.setAttribute('data-capture-method', 'html2canvas'); } catch {}
      try { setCaptureMethod('html2canvas'); } catch {}
    } catch (error) {
      console.error('[ScreenshotCapture] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError(`${t('error.captureFailed')} ${errorMessage}`);
    } finally {
      // restore hidden elements
      ignoredEls.forEach((el) => {
        const prev = previousStyles.get(el);
        if (prev === null || prev === undefined) {
          (el as HTMLElement).style.cssText = '';
        } else {
          (el as HTMLElement).style.cssText = prev;
        }
      });
    }
  }, [onCapture, onError]);
  
  // Auto-capture on mount
  useEffect(() => {
    console.log('[ScreenshotCapture] Component mounted, scheduling capture...');
    // Delay to ensure DOM is ready
    const timer = setTimeout(() => {
      console.log('[ScreenshotCapture] Executing capture...');
      captureScreenshot();
    }, 200);
    
    return () => clearTimeout(timer);
  }, [captureScreenshot]);

  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300">
          {t('capture.title')}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {t('capture.description')}
        </p>
      </div>
    </div>
  );
}

/**
 * Hook for triggering screenshot capture
 */
export function useScreenshotCapture() {
  const t = useTranslations('feedback');
  const setScreenshot = useFeedbackStore((state) => state.setScreenshot);
  const setError = useFeedbackStore((state) => state.setError);
  const setCaptureMethod = useFeedbackStore((state) => state.setCaptureMethod);
  
  const capture = useCallback(async (): Promise<boolean> => {
    console.log('[useScreenshotCapture] Starting capture...');

    const element = document.body;

    if (!element) {
      setError(t('error.documentBodyNotFound'));
      return false;
    }

    // Temporarily hide any elements that should be ignored to avoid html2canvas edge-cases
    const ignoredEls = Array.from(document.querySelectorAll('[data-feedback-ignore]')) as Element[];
    const previousStyles = new Map<Element, string | null>();

    try {
      ignoredEls.forEach((el) => {
        previousStyles.set(el, (el as HTMLElement).style?.cssText || null);
        (el as HTMLElement).style.setProperty('display', 'none', 'important');
      });

      // Patch getComputedStyle to handle modern CSS color functions
      const restoreGCS = patchGetComputedStyle();

      let canvas: HTMLCanvasElement;
      try {
        canvas = await Promise.race([
          html2canvas(element, html2canvasOptions()),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Screenshot capture timeout (20s)')), 20000)
          ),
        ]);
      } finally {
        restoreGCS();
      }

        const base64 = canvas.toDataURL('image/png');
        console.log('[useScreenshotCapture] Capture successful (html2canvas):', { width: canvas.width, height: canvas.height });

      setScreenshot(base64, canvas.width, canvas.height);
          try { setCaptureMethod('html2canvas'); document.documentElement.setAttribute('data-capture-method','html2canvas'); } catch {}
      return true;
    } catch (error) {
      console.error('[useScreenshotCapture] Capture failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`${t('error.captureFailed')} ${errorMessage}`);
      return false;
    } finally {
      ignoredEls.forEach((el) => {
        const prev = previousStyles.get(el);
        if (prev === null || prev === undefined) {
          (el as HTMLElement).style.cssText = '';
        } else {
          (el as HTMLElement).style.cssText = prev;
        }
      });
    }
  }, [setScreenshot, setError]);
  
  return { capture };
}
