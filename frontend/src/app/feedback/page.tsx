// Admin Feedback Dashboard
// Admin page for reviewing and responding to user feedback
// Implements: User Feedback System - Admin Dashboard
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  ChatBubbleBottomCenterTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  EyeIcon,
  XMarkIcon,
  ChartBarIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  StarIcon,
  UserIcon,
  CalendarIcon,
  PlusIcon,
  BugAntIcon,
  LightBulbIcon,
  PaintBrushIcon,
  HandRaisedIcon,
  BoltIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
import StatCard from '@/components/features/shared/ui/StatCard';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import FeedbackModal from '@/components/features/feedback/components/FeedbackModal';
import { useFeedbackStore } from '@/stores/feedback-store';
import { ViewMode } from '@/components/features/shared/ui/ViewToggle';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import apiClient from '@/lib/api-client';
import BaseModal from '@/components/features/shared/ui/BaseModal';
import Pagination from '@/components/features/shared/ui/Pagination';

// =============================================================================
// Types
// =============================================================================

interface Feedback {
  id: string;
  user_id: string;
  feedback_type: string;
  severity: string;
  description: string;
  page_url: string;
  page_title: string | null;
  entity_type: string | null;
  entity_id: string | null;
  screenshot_url: string | null;
  annotation_image_url: string | null;
  annotation_data: any | null;
  status: string;
  response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface FeedbackListResponse {
  items: Feedback[];
  total: number;
  skip: number;
  limit: number;
}

interface FeedbackStatistics {
  total_feedbacks: number;
  open_feedbacks: number;
  in_progress_feedbacks: number;
  resolved_feedbacks: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  avg_resolution_time_hours: number | null;
}

// =============================================================================
// Constants
// =============================================================================

// Feedback type → icon mapping (Heroicons instead of emojis for consistent rendering)
const FEEDBACK_TYPE_ICONS: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  bug_report:      { icon: BugAntIcon,               color: 'text-red-500' },
  feature_request: { icon: LightBulbIcon,             color: 'text-yellow-500' },
  ui_feedback:     { icon: PaintBrushIcon,             color: 'text-purple-500' },
  usability:       { icon: HandRaisedIcon,             color: 'text-blue-500' },
  performance:     { icon: BoltIcon,                   color: 'text-orange-500' },
  improvement:     { icon: WrenchScrewdriverIcon,      color: 'text-teal-500' },
  other:           { icon: DocumentTextIcon,            color: 'text-gray-500' },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

const STATUS_ICONS: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  open:         { icon: ExclamationCircleIcon, color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  in_review:    { icon: EyeIcon,               color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  acknowledged: { icon: CheckCircleIcon,        color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
  in_progress:  { icon: ArrowPathIcon,          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  resolved:     { icon: CheckCircleIcon,        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  closed:       { icon: XMarkIcon,              color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  wont_fix:     { icon: XMarkIcon,              color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
};

const ALL_SEVERITY_KEYS = ['critical', 'high', 'medium', 'low'] as const;
const ALL_FEEDBACK_TYPES = ['bug_report', 'feature_request', 'ui_feedback', 'usability', 'performance', 'improvement', 'other'] as const;
const ALL_STATUS_KEYS = Object.keys(STATUS_ICONS);

// =============================================================================
// Feedback Detail Modal
// =============================================================================
function FeedbackDetailModal({
  feedback,
  onClose,
  onRespond,
  onUpdateStatus,
  onUpdateSeverity,
  onDelete,
}: {
  feedback: Feedback;
  onClose: () => void;
  onRespond: (response: string) => void;
  onUpdateStatus: (status: string) => void;
  onUpdateSeverity: (severity: string) => void;
  onDelete?: () => void;
}) {
  const [response, setResponse] = useState(feedback.response || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshotError, setScreenshotError] = useState(false);
  const t = useTranslations();

  const handleSubmitResponse = async () => {
    if (!response.trim()) return;
    setIsSubmitting(true);
    await onRespond(response);
    setIsSubmitting(false);
  };

  const typeIconInfo = FEEDBACK_TYPE_ICONS[feedback.feedback_type] || FEEDBACK_TYPE_ICONS.other;
  const TypeIcon = typeIconInfo.icon;
  const severityColor = SEVERITY_COLORS[feedback.severity] || SEVERITY_COLORS.medium;
  const statusIconInfo = STATUS_ICONS[feedback.status] || STATUS_ICONS.open;
  const StatusIcon = statusIconInfo.icon;

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={String(t(`feedback.types.${String(feedback.feedback_type)}`) || feedback.feedback_type || t('feedback.types.other'))}
      icon={<TypeIcon className={`h-6 w-6 ${typeIconInfo.color}`} />}
      size="lg"
      showCloseButton={true}
    >
      <div className="space-y-6">
        {/* Status + Severity badges */}
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${statusIconInfo.color}`}>
            <StatusIcon className="h-4 w-4" />
            {String(t(`feedback.status.${String(feedback.status)}`) || feedback.status)}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm ${severityColor}`}>
            {String(t('feedback.admin.priority') || 'Priority')}: {String(t(`feedback.severity.${String(feedback.severity)}`) || feedback.severity)}
          </span>
        </div>

        {/* Page URL */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('feedback.admin.page')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700 px-3 py-2 rounded-lg break-all">{feedback.page_url}</p>
        </div>

        {/* User Comment */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('feedback.admin.userComment')}</h3>
          <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700 px-3 py-2 rounded-lg whitespace-pre-wrap">{feedback.description}</p>
        </div>

        {/* Screenshot with error fallback */}
        {(feedback.annotation_image_url || feedback.screenshot_url) && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('feedback.admin.screenshot')}</h3>
            {screenshotError ? (
              <div className="flex items-center justify-center gap-2 py-8 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700">
                <PhotoIcon className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('feedback.admin.screenshotUnavailable') || 'Screenshot unavailable'}</span>
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden">
                <img
                  src={feedback.annotation_image_url || feedback.screenshot_url || ''}
                  alt={t('feedback.admin.screenshot')}
                  className="w-full"
                  onError={() => setScreenshotError(true)}
                />
              </div>
            )}
          </div>
        )}

        {/* Previous Response */}
        {feedback.response && (
          <div className="border-l-4 border-primary-500 pl-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('feedback.admin.previousResponse')}</h3>
            <p className="text-gray-600 dark:text-gray-400">{feedback.response}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{t('feedback.admin.respondedAt')}: {feedback.responded_at ? new Date(feedback.responded_at).toLocaleString() : 'N/A'}</p>
          </div>
        )}

        {/* Response textarea */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{feedback.response ? t('feedback.admin.updateResponse') : t('feedback.admin.addResponse')}</h3>
          <textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder={t('feedback.admin.responsePlaceholder')} rows={4} maxLength={2000} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{response.length}/2000 {t('common.chars')}</p>
        </div>

        {/* Update Priority */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('feedback.admin.updatePriority') || 'Update Priority'}</h3>
          <div className="flex flex-wrap gap-2">
            {ALL_SEVERITY_KEYS.map((sev) => (
              <button
                key={sev}
                onClick={() => onUpdateSeverity(sev)}
                disabled={feedback.severity === sev}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${feedback.severity === sev ? `${SEVERITY_COLORS[sev]} font-semibold ring-2 ring-offset-1 ring-current cursor-default` : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
              >
                {String(t(`feedback.severity.${sev}`) || sev)}
              </button>
            ))}
          </div>
        </div>

        {/* Update Status */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('feedback.admin.updateStatus')}</h3>
          <div className="flex flex-wrap gap-2">
            {['in_review', 'in_progress', 'resolved', 'wont_fix'].map((status) => {
              const info = STATUS_ICONS[status];
              const Icon = info.icon;
              return (
                <button key={status} onClick={() => onUpdateStatus(status)} disabled={feedback.status === status} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${feedback.status === status ? 'bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-gray-400 cursor-not-allowed' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                  <Icon className="h-4 w-4" />
                  {String(t(`feedback.status.${String(status)}`) || status)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-slate-700">
        <div>
          {onDelete && (
            <button onClick={() => { if (confirm(String(t('feedback.admin.confirmDelete') || 'Confirm delete?'))) onDelete(); }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">{t('feedback.admin.delete') || 'Delete'}</button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">{t('modal.close')}</button>
          <button onClick={handleSubmitResponse} disabled={!response.trim() || isSubmitting} className="px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{isSubmitting ? t('feedback.admin.sending') : t('feedback.admin.sendResponse')}</button>
        </div>
      </div>
    </BaseModal>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function AdminFeedbackPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const openFeedback = useFeedbackStore((s) => s.openFeedback);
  const [filters, setFilters] = useState<{
    status?: string;
    feedback_type?: string;
    severity?: string;
    search?: string;
  }>({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);


  // Fetch feedback list
  const { data: feedbackData, isLoading, refetch } = useQuery<FeedbackListResponse>({
    queryKey: ['admin-feedback', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.feedback_type) params.append('feedback_type', filters.feedback_type);
      if (filters.severity) params.append('severity', filters.severity);

      const response = await apiClient.get(`/api/v1/feedback/?${params.toString()}`);
      return response;
    },
  });

  // Fetch statistics
  const { data: statistics } = useQuery<FeedbackStatistics>({
    queryKey: ['admin-feedback-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/feedback/statistics');
      return response;
    },
  });

  // Respond mutation
  const respondMutation = useMutation({
    mutationFn: async ({ feedbackId, response }: { feedbackId: string; response: string }) => {
      await apiClient.post(`/api/v1/feedback/${feedbackId}/respond`, { response });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['admin-feedback-stats'] });
      setSelectedFeedback(null);
    },
  });

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: async ({ feedbackId, status }: { feedbackId: string; status: string }) => {
      await apiClient.patch(`/api/v1/feedback/${feedbackId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['admin-feedback-stats'] });
    },
  });

  // Severity update mutation
  const severityMutation = useMutation({
    mutationFn: async ({ feedbackId, severity }: { feedbackId: string; severity: string }) => {
      await apiClient.patch(`/api/v1/feedback/${feedbackId}/severity`, { severity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['admin-feedback-stats'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ feedbackId }: { feedbackId: string }) => {
      await apiClient.delete(`/api/v1/feedback/${feedbackId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['admin-feedback-stats'] });
      setSelectedFeedback(null);
    },
  });

  // Handle respond
  const handleRespond = useCallback(async (response: string) => {
    if (!selectedFeedback) return;
    await respondMutation.mutateAsync({ feedbackId: selectedFeedback.id, response });
  }, [selectedFeedback, respondMutation]);

  // Handle status update
  const handleUpdateStatus = useCallback(async (status: string) => {
    if (!selectedFeedback) return;
    await statusMutation.mutateAsync({ feedbackId: selectedFeedback.id, status });
    setSelectedFeedback((prev) => prev ? { ...prev, status } : null);
  }, [selectedFeedback, statusMutation]);

  // Handle severity update
  const handleUpdateSeverity = useCallback(async (severity: string) => {
    if (!selectedFeedback) return;
    await severityMutation.mutateAsync({ feedbackId: selectedFeedback.id, severity });
    setSelectedFeedback((prev) => prev ? { ...prev, severity } : null);
  }, [selectedFeedback, severityMutation]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!selectedFeedback) return;
    try {
      await deleteMutation.mutateAsync({ feedbackId: selectedFeedback.id });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete feedback', e);
    }
  }, [selectedFeedback, deleteMutation]);

  // Filter feedbacks by search (uses `filters.search` now)
  const filteredFeedbacks = useMemo(() => {
    if (!feedbackData?.items) return [];
    const searchQ = (filters.search || '').trim();
    if (!searchQ) return feedbackData.items;

    const query = searchQ.toLowerCase();
    return feedbackData.items.filter((f: Feedback) =>
      f.description.toLowerCase().includes(query) ||
      f.page_url.toLowerCase().includes(query) ||
      (f.page_title && f.page_title.toLowerCase().includes(query))
    );
  }, [feedbackData, filters.search]);

  // Paginated feedbacks
  const paginatedFeedbacks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFeedbacks.slice(start, start + pageSize);
  }, [filteredFeedbacks, currentPage, pageSize]);

  // Reset pagination when filters change
  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Filter fields for FilterPanel
  const filterFields: FilterField[] = [
    {
      key: 'search',
      label: t('feedback.admin.search') || 'Search',
      type: 'text',
      placeholder: t('feedback.admin.searchPlaceholder') || 'Search feedbacks...'
    },
    {
      key: 'status',
      label: t('feedback.admin.filterStatus') || 'Status',
      type: 'select',
      options: ALL_STATUS_KEYS.map((value) => ({
        value,
        label: String(t(`feedback.status.${value}`) || value),
      })),
    },
    {
      key: 'feedback_type',
      label: t('feedback.admin.filterType') || 'Type',
      type: 'select',
      options: ALL_FEEDBACK_TYPES.map((value) => ({
        value,
        label: String(t(`feedback.types.${value}`) || value),
      })),
    },
    {
      key: 'severity',
      label: t('feedback.admin.filterPriority') || 'Priority',
      type: 'select',
      options: ALL_SEVERITY_KEYS.map((value) => ({
        value,
        label: String(t(`feedback.severity.${value}`) || value),
      })),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('feedback.admin.title') || 'User Feedback'}
        subtitle={t('feedback.admin.subtitle') || 'Review and respond to user feedback'}
        viewToggle={true}
        viewMode={viewMode}
        onViewChange={(m) => setViewMode(m)}
        action={(
          <button
            onClick={() => openFeedback()}
            title={t('feedback.send') || 'Send feedback'}
            className="inline-flex items-center justify-center p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        )}
      />

      {/* Feedback Capture Modal */}
      <FeedbackModal />

      {/* Configurable Statistics Bar - use same component as other pages */}
      <ConfigurableStatisticsBar module="feedback" data={feedbackData?.items || []} />

      {/* Actions Bar removed - refresh now available via other controls */}

      {/* Filter Panel - collapsed by default */}
      <FilterPanel
        fields={filterFields}
        values={filters}
        onChange={handleFilterChange}
        onReset={() => setFilters({})}
        defaultExpanded={false}
      />

      {/* Feedback Views - List, Board, Timeline, Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <ChatBubbleBottomCenterTextIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('feedback.admin.noFeedback') || 'No feedback found'}</p>
        </div>
      ) : viewMode === 'board' ? (
        /* Board View - Grouped by status */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(STATUS_ICONS).map(([statusKey, statusInfo]) => {
            const SIcon = statusInfo.icon;
            return (
            <div key={statusKey} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <SIcon className="h-4 w-4" />
                {String(t(`feedback.status.${statusKey}`) || statusKey)}
                <span className="ml-auto text-xs bg-gray-200 dark:bg-slate-600 px-2 py-0.5 rounded-full">
                  {filteredFeedbacks.filter((f: Feedback) => f.status === statusKey).length}
                </span>
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredFeedbacks.filter((f: Feedback) => f.status === statusKey).map((fb: Feedback) => {
                  const typeIconInf = FEEDBACK_TYPE_ICONS[fb.feedback_type] || FEEDBACK_TYPE_ICONS.other;
                  const FbTypeIcon = typeIconInf.icon;
                  const sevColor = SEVERITY_COLORS[fb.severity] || SEVERITY_COLORS.medium;
                  return (
                    <div
                      key={fb.id}
                      className="p-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-600 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedFeedback(fb)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <FbTypeIcon className={`h-5 w-5 ${typeIconInf.color}`} />
                        <span className={`text-xs px-2 py-0.5 rounded-full ${sevColor}`}>{String(t(`feedback.severity.${fb.severity}`) || fb.severity)}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{String(t(`feedback.types.${fb.feedback_type}`) || fb.feedback_type)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{fb.description}</p>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{new Date(fb.created_at).toLocaleDateString('pt-BR')}</div>
                    </div>
                  );
                })}
                {filteredFeedbacks.filter((f: Feedback) => f.status === statusKey).length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">{t('feedback.admin.noItems') || 'No items'}</p>
                )}
              </div>
            </div>
            );
          })}
        </div>
      ) : viewMode === 'timeline' ? (
        /* Timeline View */
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <TimelineView
            items={paginatedFeedbacks.map((fb: Feedback): TimelineItem => {
              const typeIconInf = FEEDBACK_TYPE_ICONS[fb.feedback_type] || FEEDBACK_TYPE_ICONS.other;
              const TlTypeIcon = typeIconInf.icon;
              const sevColor = SEVERITY_COLORS[fb.severity] || SEVERITY_COLORS.medium;
              const stIconInf = STATUS_ICONS[fb.status] || STATUS_ICONS.open;
              const TlStatusIcon = stIconInf.icon;

              const timelineStatus: TimelineItem['status'] =
                fb.status === 'resolved' || fb.status === 'closed' ? 'success' :
                fb.status === 'in_progress' || fb.status === 'in_review' ? 'pending' :
                fb.severity === 'critical' || fb.severity === 'high' ? 'error' :
                fb.severity === 'medium' ? 'warning' : 'info';

              return {
                id: fb.id,
                title: String(t(`feedback.types.${fb.feedback_type}`) || fb.feedback_type),
                description: fb.description,
                date: fb.created_at,
                status: timelineStatus,
                icon: <TlStatusIcon className="h-4 w-4" />,
                tags: [
                  { label: String(t(`feedback.severity.${fb.severity}`) || fb.severity), color: sevColor },
                  { label: String(t(`feedback.status.${fb.status}`) || fb.status), color: stIconInf.color },
                ],
                onClick: () => setSelectedFeedback(fb),
                footer: fb.page_url ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">📄 {fb.page_url}</p>
                ) : undefined,
              };
            })}
            size="md"
            showConnectors={true}
            animated={true}
            emptyMessage={t('feedback.admin.noFeedback') || 'No feedback found'}
          />
          <Pagination
            currentPage={currentPage}
            totalItems={filteredFeedbacks.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            persistInUrl={true}
          />
        </div>
      ) : viewMode === 'table' ? (
        /* Table View - Full table with columns */
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <TableView<Feedback>
            data={paginatedFeedbacks}
            getRowKey={(row) => row.id}
            onRowClick={(row) => setSelectedFeedback(row)}
            columns={[
              {
                key: 'user_id',
                header: 'Usuário',
                accessor: 'user_id',
                render: (value) => (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[100px]">{String(value).slice(0, 8)}...</span>
                  </div>
                ),
              },
              {
                key: 'feedback_type',
                header: t('feedback.admin.filterType') || 'Type',
                accessor: 'feedback_type',
                render: (value, row) => {
                  const typeIconInf = FEEDBACK_TYPE_ICONS[row.feedback_type] || FEEDBACK_TYPE_ICONS.other;
                  const TbTypeIcon = typeIconInf.icon;
                  return (
                    <div className="flex items-center gap-2">
                      <TbTypeIcon className={`h-5 w-5 ${typeIconInf.color}`} />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{String(t(`feedback.types.${row.feedback_type}`) || row.feedback_type)}</span>
                    </div>
                  );
                },
              },
              {
                key: 'severity',
                header: t('feedback.admin.filterPriority') || 'Priority',
                accessor: 'severity',
                render: (value, row) => {
                  const sevColor = SEVERITY_COLORS[row.severity] || SEVERITY_COLORS.medium;
                  return <span className={`px-2 py-1 rounded-full text-xs ${sevColor}`}>{String(t(`feedback.severity.${row.severity}`) || row.severity)}</span>;
                },
              },
              {
                key: 'description',
                header: 'Mensagem',
                accessor: 'description',
                render: (value) => (
                  <p className="text-sm text-gray-900 dark:text-white line-clamp-2 max-w-xs">{String(value)}</p>
                ),
              },
              {
                key: 'created_at',
                header: 'Data',
                accessor: 'created_at',
                render: (value) => (
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <CalendarIcon className="h-4 w-4" />
                    {new Date(String(value)).toLocaleDateString('pt-BR')}
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                accessor: 'status',
                render: (value, row) => {
                  const stIconInf = STATUS_ICONS[row.status] || STATUS_ICONS.open;
                  const TbStatusIcon = stIconInf.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${stIconInf.color}`}>
                      <TbStatusIcon className="h-3 w-3" />
                      {String(t(`feedback.status.${row.status}`) || row.status)}
                    </span>
                  );
                },
              },
            ] as TableColumn<Feedback>[]}
            hoverable={true}
            striped={true}
            emptyMessage={t('feedback.admin.noFeedback') || 'No feedback found'}
          />
          <Pagination
            currentPage={currentPage}
            totalItems={filteredFeedbacks.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            persistInUrl={true}
          />
        </div>
      ) : (
        /* List View - Card-based layout (default) */
        <div className="space-y-4">
          {paginatedFeedbacks.map((feedback: Feedback) => {
            const typeIconInf = FEEDBACK_TYPE_ICONS[feedback.feedback_type] || FEEDBACK_TYPE_ICONS.other;
            const ListTypeIcon = typeIconInf.icon;
            const sevColor = SEVERITY_COLORS[feedback.severity] || SEVERITY_COLORS.medium;
            const stIconInf = STATUS_ICONS[feedback.status] || STATUS_ICONS.open;
            const ListStatusIcon = stIconInf.icon;

            return (
              <div
                key={feedback.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedFeedback(feedback)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Icon and type */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                      <ListTypeIcon className={`h-6 w-6 ${typeIconInf.color}`} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <h3 className="text-base font-medium text-gray-900 dark:text-white">{String(t(`feedback.types.${feedback.feedback_type}`) || feedback.feedback_type)}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${sevColor}`}>{String(t(`feedback.severity.${feedback.severity}`) || feedback.severity)}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${stIconInf.color}`}>
                          <ListStatusIcon className="h-3 w-3" />
                          {String(t(`feedback.status.${feedback.status}`) || feedback.status)}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">{feedback.description}</p>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {new Date(feedback.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      {feedback.page_url && (
                        <span className="truncate max-w-[200px]">📄 {feedback.page_url}</span>
                      )}
                    </div>

                    {feedback.response && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-medium text-primary-600 dark:text-primary-400">{t('feedback.admin.responseLabel') || 'Response'}:</span> {feedback.response.slice(0, 100)}...
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action button */}
                  <div className="flex-shrink-0 self-start">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedFeedback(feedback); }}
                      className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <Pagination
            currentPage={currentPage}
            totalItems={filteredFeedbacks.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            persistInUrl={true}
          />
        </div>
      )}

      {/* Detail Modal */}
      {selectedFeedback && (
        <FeedbackDetailModal
          feedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          onRespond={handleRespond}
          onUpdateStatus={handleUpdateStatus}
          onUpdateSeverity={handleUpdateSeverity}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
