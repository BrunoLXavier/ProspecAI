/**
 * FeedbackButton Component
 * Floating button for triggering feedback modal
 * Similar style to ChatWidget button
 * Implements: User Feedback System
 */
'use client';

import { useTranslations } from 'next-intl';
import { useFeedbackStore } from '@/stores/feedbackStore';
import { ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';
import FeedbackModal from './FeedbackModal';

export default function FeedbackButton() {
  const t = useTranslations('feedback');
  const { isOpen, openFeedback } = useFeedbackStore();
  
  return (
    <>
      {/* Floating Button - positioned to the left of ChatWidget */}
      {!isOpen && (
        <button
          onClick={openFeedback}
          className="feedback-button fixed bottom-6 right-24 w-14 h-14 bg-amber-500 dark:bg-amber-600 text-white rounded-full shadow-lg hover:bg-amber-600 dark:hover:bg-amber-700 transition-all duration-150 ease-in-out hover:scale-105 hover:shadow-2xl transform-gpu flex items-center justify-center z-50 ring-2 ring-transparent hover:ring-amber-300 focus:outline-none focus:ring-4 focus:ring-amber-200/30"
          aria-label={t('button.label')}
          title={t('button.title')}
          data-feedback-ignore
        >
          <ChatBubbleBottomCenterTextIcon className="h-6 w-6" />
        </button>
      )}
      
      {/* Feedback Modal */}
      <FeedbackModal />
    </>
  );
}
