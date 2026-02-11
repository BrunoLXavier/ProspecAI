/**
 * Feedback Store
 * Zustand store for managing feedback state during capture flow
 * Implements: User Feedback System
 */
import { create } from 'zustand';

export type FeedbackType = 'bug_report' | 'feature_request' | 'ui_feedback' | 'performance' | 'usability' | 'other';
export type FeedbackSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FeedbackStep = 'capture' | 'annotate' | 'comment' | 'submitting' | 'success' | 'error';

export interface AnnotationStroke {
  paths: Array<{ x: number; y: number }>;
  strokeWidth: number;
  strokeColor: string;
}

export interface FeedbackState {
  // Modal state
  isOpen: boolean;
  currentStep: FeedbackStep;
  
  // Screenshot data
  screenshotBase64: string | null;
  screenshotWidth: number | null;
  screenshotHeight: number | null;
  
  // Annotation data
  annotationImageBase64: string | null;
  annotationData: AnnotationStroke[] | null;
  
  // Form data
  feedbackType: FeedbackType;
  severity: FeedbackSeverity;
  description: string;
  
  // Page context
  pageUrl: string;
  pageTitle: string;
  entityType: string | null;
  entityId: string | null;
  
  // Error state
  error: string | null;
  // Capture method used for last screenshot
  captureMethod: 'html2canvas' | 'getDisplayMedia' | null;
  
  // Actions
  openFeedback: () => void;
  closeFeedback: () => void;
  setStep: (step: FeedbackStep) => void;
  setScreenshot: (base64: string, width: number, height: number) => void;
  setAnnotation: (imageBase64: string, data: AnnotationStroke[]) => void;
  setFeedbackType: (type: FeedbackType) => void;
  setSeverity: (severity: FeedbackSeverity) => void;
  setDescription: (description: string) => void;
  setPageContext: (url: string, title: string, entityType?: string, entityId?: string) => void;
  setError: (error: string | null) => void;
  setCaptureMethod: (method: 'html2canvas' | 'getDisplayMedia' | null) => void;
  reset: () => void;
}

const initialState = {
  isOpen: false,
  currentStep: 'capture' as FeedbackStep,
  screenshotBase64: null,
  screenshotWidth: null,
  screenshotHeight: null,
  annotationImageBase64: null,
  annotationData: null,
  feedbackType: 'ui_feedback' as FeedbackType,
  severity: 'medium' as FeedbackSeverity,
  description: '',
  pageUrl: '',
  pageTitle: '',
  entityType: null,
  entityId: null,
  error: null,
  captureMethod: null,
};

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  ...initialState,
  
  openFeedback: () => {
    // Capture current page context
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = typeof document !== 'undefined' ? document.title : '';
    
    set({
      isOpen: true,
      currentStep: 'capture',
      pageUrl: url,
      pageTitle: title,
      error: null,
    });
  },
  
  closeFeedback: () => {
    set({ isOpen: false });
    // Reset after animation completes
    setTimeout(() => {
      set(initialState);
    }, 300);
  },
  
  setStep: (step) => set({ currentStep: step }),
  
  setScreenshot: (base64, width, height) => set({
    screenshotBase64: base64,
    screenshotWidth: width,
    screenshotHeight: height,
    currentStep: 'annotate',
  }),
  
  setAnnotation: (imageBase64, data) => set({
    annotationImageBase64: imageBase64,
    annotationData: data,
    currentStep: 'comment',
  }),
  
  setFeedbackType: (type) => set({ feedbackType: type }),
  
  setSeverity: (severity) => set({ severity }),
  
  setDescription: (description) => {
    // Enforce 500 character limit
    if (description.length <= 500) {
      set({ description });
    }
  },
  
  setPageContext: (url, title, entityType, entityId) => set({
    pageUrl: url,
    pageTitle: title,
    entityType: entityType || null,
    entityId: entityId || null,
  }),
  
  setError: (error) => set({ error }),
  setCaptureMethod: (method) => set({ captureMethod: method }),
  
  reset: () => set(initialState),
}));
