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
import { useFeedbackStore } from '@/stores/feedbackStore';

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

      // Use stricter viewport-only capture
      const canvas = await Promise.race([
        html2canvas(element, {
          // keep ignoreElements as a second layer of protection
          ignoreElements: (el: Element) => {
            if (el.hasAttribute?.('data-feedback-ignore')) return true;
            if (el.classList?.contains('feedback-modal')) return true;
            if (el.classList?.contains('feedback-button')) return true;
            if (el.id === 'feedback-container') return true;
            return false;
          },
          allowTaint: true,
          useCORS: true,
          scale: 1,
          logging: true,
          backgroundColor: '#ffffff',
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          scrollX: -window.scrollX,
          scrollY: -window.scrollY,
          width: window.innerWidth,
          height: window.innerHeight,
          imageTimeout: 5000,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Screenshot capture timeout (20s)')), 20000)
        ),
      ]);

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

      // Attempt fallback using getDisplayMedia
      try {
        console.log('[ScreenshotCapture] Attempting fallback: getDisplayMedia');
        // @ts-ignore
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const track = stream.getVideoTracks()[0];
        const video = document.createElement('video');
        video.srcObject = stream;
        video.playsInline = true;
        await video.play();

        const canvas2 = document.createElement('canvas');
        canvas2.width = window.innerWidth;
        canvas2.height = window.innerHeight;
        const ctx = canvas2.getContext('2d');
        if (!ctx) throw new Error('Canvas context not available');
        ctx.drawImage(video, 0, 0, canvas2.width, canvas2.height);

        const base64b = canvas2.toDataURL('image/png');
        onCapture(base64b, canvas2.width, canvas2.height);
        try { document.documentElement.setAttribute('data-capture-method', 'getDisplayMedia'); } catch {}
        try { setCaptureMethod('getDisplayMedia'); } catch {}

        stream.getTracks().forEach((t) => t.stop());
        console.log('[ScreenshotCapture] Fallback capture succeeded (getDisplayMedia)');
      } catch (fbErr) {
        console.error('[ScreenshotCapture] Fallback failed:', fbErr);
      }
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

    // helper: fallback using getDisplayMedia
    async function captureWithGetDisplayMedia(): Promise<boolean> {
      try {
        console.log('[useScreenshotCapture] Attempting fallback: getDisplayMedia');
        // request screen capture
        // @ts-ignore
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const track = stream.getVideoTracks()[0];
        const video = document.createElement('video');
        video.srcObject = stream;
        video.playsInline = true;
        await video.play();

        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not available');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const base64 = canvas.toDataURL('image/png');
            setScreenshot(base64, canvas.width, canvas.height);
            document.documentElement.setAttribute('data-capture-method','getDisplayMedia');

        // stop tracks
        stream.getTracks().forEach((t) => t.stop());
        console.log('[useScreenshotCapture] Fallback capture succeeded (getDisplayMedia)');
        try { setCaptureMethod('getDisplayMedia'); } catch {}
        return true;
      } catch (err) {
        console.error('[useScreenshotCapture] Fallback failed:', err);
        return false;
      }
    }

    try {
      ignoredEls.forEach((el) => {
        previousStyles.set(el, (el as HTMLElement).style?.cssText || null);
        (el as HTMLElement).style.setProperty('display', 'none', 'important');
      });

      const canvas = await Promise.race([
        html2canvas(element, {
          ignoreElements: (el: Element) => {
            if (el.hasAttribute?.('data-feedback-ignore')) return true;
            if (el.classList?.contains('feedback-modal')) return true;
            if (el.classList?.contains('feedback-button')) return true;
            if (el.id === 'feedback-container') return true;
            return false;
          },
          allowTaint: true,
          useCORS: true,
          scale: 1,
          logging: true,
          backgroundColor: '#ffffff',
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          scrollX: -window.scrollX,
          scrollY: -window.scrollY,
          width: window.innerWidth,
          height: window.innerHeight,
          imageTimeout: 5000,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Screenshot capture timeout (20s)')), 20000)
        ),
      ]);

        const base64 = canvas.toDataURL('image/png');
        console.log('[useScreenshotCapture] Capture successful (html2canvas):', { width: canvas.width, height: canvas.height });

      setScreenshot(base64, canvas.width, canvas.height);
          try { setCaptureMethod('html2canvas'); document.documentElement.setAttribute('data-capture-method','html2canvas'); } catch {}
      return true;
    } catch (error) {
      console.error('[useScreenshotCapture] Capture failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // try fallback if available
      try {
        const fallbackOk = await captureWithGetDisplayMedia();
        if (fallbackOk) return true;
      } catch (e) {
        console.error('[useScreenshotCapture] Fallback attempt error:', e);
      }
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
