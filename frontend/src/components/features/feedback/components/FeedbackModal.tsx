/**
 * FeedbackModal Component
 * 3-step modal for capturing and submitting user feedback
 * Steps: 1. Capture screenshot, 2. Annotate, 3. Add comment and submit
 * Implements: User Feedback System
 */
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  XMarkIcon,
  CameraIcon,
  PencilSquareIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { useFeedbackStore, FeedbackType, FeedbackSeverity } from '@/stores/feedback-store';
import { useScreenshotCapture } from './ScreenshotCapture';
import AnnotationCanvas from './AnnotationCanvas';
import apiClient from '@/lib/api-client';
import BaseModal, { ModalFooter } from '@/components/features/shared/ui/BaseModal';

// =============================================================================
// Types
// =============================================================================

interface FeedbackSubmitData {
  feedback_type: FeedbackType;
  severity: FeedbackSeverity;
  description: string;
  page_url: string;
  page_title: string | null;
  entity_type: string | null;
  entity_id: string | null;
  screenshot_base64: string | null;
  annotation_image_base64: string | null;
  annotation_data: any | null;
  screen_width: number | null;
  screen_height: number | null;
}

// =============================================================================
// Step Indicator Component
// =============================================================================

function StepIndicator({ currentStep, t }: { currentStep: string; t: ReturnType<typeof useTranslations> }) {
  const steps = [
    { id: 'capture', labelKey: 'steps.capture', icon: CameraIcon },
    { id: 'annotate', labelKey: 'steps.annotate', icon: PencilSquareIcon },
    { id: 'comment', labelKey: 'steps.comment', icon: ChatBubbleBottomCenterTextIcon },
  ];
  
  const currentIndex = steps.findIndex(s => s.id === currentStep);
  
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = step.id === currentStep;
        const isCompleted = index < currentIndex;
        
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                isActive
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : isCompleted
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t(step.labelKey)}</span>
            </div>
            {index < steps.length - 1 && (
              <div className="w-8 h-0.5 bg-gray-200 dark:bg-slate-600 mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Feedback Type Selector
// =============================================================================

function FeedbackTypeSelector({
  value,
  onChange,
  t,
}: {
  value: FeedbackType;
  onChange: (type: FeedbackType) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const types: { value: FeedbackType; labelKey: string; emoji: string }[] = [
    { value: 'bug_report', labelKey: 'types.bug_report', emoji: '🐛' },
    { value: 'feature_request', labelKey: 'types.feature_request', emoji: '💡' },
    { value: 'ui_feedback', labelKey: 'types.ui_feedback', emoji: '🎨' },
    { value: 'usability', labelKey: 'types.usability', emoji: '👆' },
    { value: 'performance', labelKey: 'types.performance', emoji: '⚡' },
    { value: 'other', labelKey: 'types.other', emoji: '📝' },
  ];
  
  return (
    <div className="grid grid-cols-3 gap-2">
      {types.map((type) => (
        <button
          key={type.value}
          onClick={() => onChange(type.value)}
          className={`p-3 rounded-lg border-2 text-sm transition-all ${
            value === type.value
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
          }`}
        >
          <span className="text-xl">{type.emoji}</span>
          <p className="mt-1 text-gray-700 dark:text-gray-300">{t(type.labelKey)}</p>
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// Severity Selector
// =============================================================================

function SeveritySelector({
  value,
  onChange,
  t,
}: {
  value: FeedbackSeverity;
  onChange: (severity: FeedbackSeverity) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const severities: { value: FeedbackSeverity; labelKey: string; color: string }[] = [
    { value: 'low', labelKey: 'severity.low', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300' },
    { value: 'medium', labelKey: 'severity.medium', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300' },
    { value: 'high', labelKey: 'severity.high', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300' },
    { value: 'critical', labelKey: 'severity.critical', color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300' },
  ];
  
  return (
    <div className="flex gap-2">
      {severities.map((severity) => (
        <button
          key={severity.value}
          onClick={() => onChange(severity.value)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            value === severity.value
              ? `${severity.color} ring-2 ring-offset-2 ring-current dark:ring-offset-slate-800`
              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
          }`}
        >
          {t(severity.labelKey)}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// Main FeedbackModal Component
// =============================================================================

export default function FeedbackModal() {
  const t = useTranslations('feedback');
  
  const {
    isOpen,
    currentStep,
    screenshotBase64,
    screenshotWidth,
    screenshotHeight,
    annotationImageBase64,
    annotationData,
    feedbackType,
    severity,
    description,
    pageUrl,
    pageTitle,
    entityType,
    entityId,
    captureMethod,
    error,
    setStep,
    setAnnotation,
    setFeedbackType,
    setSeverity,
    setDescription,
    setError,
    closeFeedback,
    reset,
  } = useFeedbackStore();
  
  const { capture } = useScreenshotCapture();
  const capturingRef = useRef(false);
  
  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: FeedbackSubmitData) => {
      // Send local_kw via axios params only (avoid duplicating in URL)
      const response = await apiClient.post('/api/v1/feedback', data, {
        params: { local_kw: '' },
      });
      return response;
    },
    onSuccess: () => {
      setStep('success');
    },
    onError: (err: any) => {
      // Prefer server-provided validation details when available
      let message = t('error.description');
      try {
        if (err?.response?.data) {
          // FastAPI validation errors usually provide a 'detail' field
          if (err.response.data.detail) {
            message = typeof err.response.data.detail === 'string'
              ? err.response.data.detail
              : JSON.stringify(err.response.data.detail);
          } else {
            message = JSON.stringify(err.response.data);
          }
        } else if (err?.message) {
          message = err.message;
        }
      } catch (e) {
        message = String(err);
      }

      console.error('[FeedbackModal] submit error:', err);
      setError(message);
      setStep('error');
    },
  });
  
  // Auto-capture screenshot when modal opens
  useEffect(() => {
    // Global error handler for debugging capture issues
    function onError(e: ErrorEvent) {
      try {
        const msg = e.message || 'error';
        const stack = (e.error && e.error.stack) ? e.error.stack : String(e.filename) + ':' + String(e.lineno);
        document.documentElement.setAttribute('data-capture-error', `${msg} | ${stack}`);
      } catch (_) {}
    }
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', (ev) => {
      try { document.documentElement.setAttribute('data-capture-error', 'unhandledrejection|' + String(ev.reason)); } catch (_) {}
    });

    if (isOpen && currentStep === 'capture' && !screenshotBase64 && !capturingRef.current) {
      capturingRef.current = true;
      console.log('[FeedbackModal] Auto-capturing screenshot...');

      // html2canvas's ignoreElements already excludes .feedback-modal,
      // .feedback-button, [data-feedback-ignore] and #feedback-container,
      // so we don't need to manually hide/restore DOM elements.
      const timer = setTimeout(async () => {
        try {
          const success = await capture();
          if (!success) {
            console.error('[FeedbackModal] Capture failed, showing error');
            try { document.documentElement.setAttribute('data-capture-debug', 'failed'); } catch {}
          } else {
            console.log('[FeedbackModal] Capture succeeded');
            try { document.documentElement.setAttribute('data-capture-debug', 'ok'); } catch {}
          }
        } catch (err) {
          console.error('[FeedbackModal] Capture exception:', err);
          setError(t('error.captureFailed'));
          setStep('error');
          try { document.documentElement.setAttribute('data-capture-debug', 'exception'); } catch {}
        } finally {
          capturingRef.current = false;
        }
      }, 150);
      return () => {
        clearTimeout(timer);
        capturingRef.current = false;
      };
    }
    return () => {
      window.removeEventListener('error', onError);
    };
  }, [isOpen, currentStep, screenshotBase64, capture, setError]);
  
  // Handle annotation complete
  const handleAnnotationComplete = useCallback((imageBase64: string, paths: any[]) => {
    setAnnotation(imageBase64, paths);
  }, [setAnnotation]);
  
  // Handle annotation skip
  const handleSkipAnnotation = useCallback(() => {
    // Use original screenshot as annotation image; send empty object for annotation_data
    if (screenshotBase64) {
      setAnnotation(screenshotBase64, {} as any);
    }
  }, [screenshotBase64, setAnnotation]);
  
  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!description.trim()) {
      setError(t('error.noComment'));
      return;
    }
    
    setStep('submitting');
    
    const data: FeedbackSubmitData = {
      feedback_type: feedbackType,
      severity,
      description: description.trim(),
      page_url: pageUrl,
      page_title: pageTitle || null,
      entity_type: entityType,
      entity_id: entityId && typeof entityId === 'string' && entityId.trim() !== '' ? entityId : null,
      screenshot_base64: screenshotBase64,
      annotation_image_base64: annotationImageBase64,
      annotation_data: (annotationData && typeof annotationData === 'object' && !Array.isArray(annotationData)) ? annotationData : {},
      screen_width: typeof window !== 'undefined' ? window.innerWidth : null,
      screen_height: typeof window !== 'undefined' ? window.innerHeight : null,
    };
    
    submitMutation.mutate(data);
  }, [
    description,
    feedbackType,
    severity,
    pageUrl,
    pageTitle,
    entityType,
    entityId,
    screenshotBase64,
    annotationImageBase64,
    annotationData,
    setStep,
    setError,
    submitMutation,
  ]);
  
  // Handle close after success
  const handleSuccessClose = useCallback(() => {
    closeFeedback();
  }, [closeFeedback]);

  // Render standardized footer for BaseModal
  const renderFooter = useCallback(() => {
    // Comment step: show reset on left and standard cancel/submit on right
    if (currentStep === 'comment') {
      return (
        <div className="flex items-center justify-between gap-4">
          <div>
            <button
              onClick={() => {
                if (confirm(String(t('modal.confirmReset') || 'Resetar feedback?'))) {
                  reset();
                  setStep('capture');
                }
              }}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {String(t('modal.reset') || 'Reset')}
            </button>
          </div>
          <div className="flex-1">
            <ModalFooter
              onCancel={() => setStep('annotate')}
              onSubmit={handleSubmit}
              isSubmitting={submitMutation.isPending}
              submitLabel={String(t('modal.submit') || '')}
              cancelLabel={String(t('comment.back') || '')}
            />
          </div>
        </div>
      );
    }

    // Success step: single close button
    if (currentStep === 'success') {
      return (
        <div className="flex items-center justify-end">
          <button
            onClick={handleSuccessClose}
            className="px-6 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
          >
            {t('success.close')}
          </button>
        </div>
      );
    }

    // Error step: cancel + retry
    if (currentStep === 'error') {
      return (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={closeFeedback}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {t('modal.cancel')}
          </button>
          <button
            onClick={() => { setError(null); setStep('comment'); }}
            className="px-6 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
          >
            {t('error.retry')}
          </button>
        </div>
      );
    }

    return null;
  }, [currentStep, t, reset, setStep, handleSubmit, submitMutation.isPending, handleSuccessClose, closeFeedback, setError]);
  
  // Don't render if not open
  if (!isOpen) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={closeFeedback}
      title={String(t('modal.title') || '')}
      size="3xl"
      noContentScroll={currentStep === 'annotate'}
      footer={renderFooter()}
      className="feedback-modal"
    >
        {/* Content */}
        <div>
          {/* Step Indicator - hide for success/error/submitting */}
          {!['success', 'error', 'submitting'].includes(currentStep) && (
            <StepIndicator currentStep={currentStep} t={t} />
          )}
          
          {/* Step: Capture */}
          {currentStep === 'capture' && (
            <div className="text-center py-8">
              {error ? (
                <>
                  <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600 dark:text-red-400 font-semibold mb-2">{error}</p>
                  <button
                    onClick={() => {
                      setError(null);
                      setStep('capture');
                    }}
                    className="mt-4 px-6 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                  >
                    {t('error.retry')}
                  </button>
                </>
              ) : (
                <>
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">
                    {t('capture.title')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {t('capture.description')}
                  </p>
                  
                  <div className="mt-3">
                    <button
                      id="feedback-capture-button"
                      onClick={async () => {
                        try {
                          document.documentElement.setAttribute('data-capture-debug', 'manual-start');
                          const ok = await capture();
                          document.documentElement.setAttribute('data-capture-debug', ok ? 'manual-ok' : 'manual-failed');
                        } catch (e) {
                          try { document.documentElement.setAttribute('data-capture-debug', 'manual-exception'); } catch {}
                        }
                      }}
                      className="mt-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 transition-colors"
                    >
                      {t('capture.buttonLabel')}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Step: Annotate */}
          {currentStep === 'annotate' && screenshotBase64 && (
            <div>
              <AnnotationCanvas
                backgroundImage={screenshotBase64}
                width={screenshotWidth || 800}
                height={screenshotHeight || 600}
                onComplete={handleAnnotationComplete}
                onCancel={closeFeedback}
              />
              {/* Skip button removed per UI decision */}
            </div>
          )}
          
          {/* Step: Comment */}
          {currentStep === 'comment' && (
            <div className="space-y-6">
              {/* Preview thumbnail */}
              {annotationImageBase64 && (
                <div className="flex justify-center">
                  <div className="relative">
                    <img
                      src={annotationImageBase64}
                      alt={t('admin.screenshot')}
                      className="max-w-xs max-h-32 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm"
                    />
                    <button
                      onClick={() => setStep('annotate')}
                      className="absolute -top-2 -right-2 p-1 bg-white dark:bg-slate-700 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-slate-600"
                      title={t('comment.editAnnotations')}
                    >
                      <PencilSquareIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Feedback Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('comment.typeLabel')}
                </label>
                <FeedbackTypeSelector value={feedbackType} onChange={setFeedbackType} t={t} />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('comment.commentLabel')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('comment.placeholder')}
                  rows={4}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('comment.charCount', { count: description.length })}
                  </span>
                  {description.length >= 450 && (
                    <span className="text-xs text-orange-500">
                      {t('comment.charLimitWarning')}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Error message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                  {error}
                </div>
              )}
              
              {/* Footer handled via BaseModal `footer` prop for consistency */}
            </div>
          )}
          
          {/* Step: Submitting */}
          {currentStep === 'submitting' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">
                {t('modal.submitting')}
              </p>
            </div>
          )}
          
          {/* Step: Success */}
          {currentStep === 'success' && (
            <div className="text-center py-12">
              <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('success.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t('success.description')}
              </p>
            </div>
          )}
          
          {/* Step: Error */}
          {currentStep === 'error' && (
            <div className="text-center py-12">
              <ExclamationCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('error.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {error || t('error.description')}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={closeFeedback}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {t('modal.cancel')}
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    setStep('comment');
                  }}
                  className="px-6 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                >
                  {t('error.retry')}
                </button>
              </div>
            </div>
          )}
        </div>
      </BaseModal>
  );
}
