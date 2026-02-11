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

const FEEDBACK_TYPES: Record<string, { label: string; emoji: string }> = {
  bug_report: { label: 'Bug / Erro', emoji: '🐛' },
  feature_request: { label: 'Sugestão', emoji: '💡' },
  ui_feedback: { label: 'Interface', emoji: '🎨' },
  usability: { label: 'Usabilidade', emoji: '👆' },
  performance: { label: 'Performance', emoji: '⚡' },
  other: { label: 'Outro', emoji: '📝' },
};

const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  critical: { label: 'Crítico', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  high: { label: 'Alto', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  medium: { label: 'Médio', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  low: { label: 'Baixo', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
};

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: 'Aberto', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: ExclamationCircleIcon },
  in_review: { label: 'Em análise', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: EyeIcon },
  acknowledged: { label: 'Reconhecido', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300', icon: CheckCircleIcon },
  in_progress: { label: 'Em progresso', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: ArrowPathIcon },
  resolved: { label: 'Resolvido', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircleIcon },
  closed: { label: 'Fechado', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: XMarkIcon },
  wont_fix: { label: 'Não será corrigido', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: XMarkIcon },
};

// =============================================================================
// Feedback Detail Modal
// =============================================================================
function FeedbackDetailModal({
  feedback,
  onClose,
  onRespond,
  onUpdateStatus,
  onDelete,
}: {
  feedback: Feedback;
  onClose: () => void;
  onRespond: (response: string) => void;
  onUpdateStatus: (status: string) => void;
  onDelete?: () => void;
}) {
  const [response, setResponse] = useState(feedback.response || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations();

  const handleSubmitResponse = async () => {
    if (!response.trim()) return;
    setIsSubmitting(true);
    await onRespond(response);
    setIsSubmitting(false);
  };

  const typeInfo = FEEDBACK_TYPES[feedback.feedback_type] || { emoji: '📝' };
  const severityInfo = SEVERITY_LABELS[feedback.severity] || SEVERITY_LABELS.medium;
  const statusInfo = STATUS_LABELS[feedback.status] || STATUS_LABELS.open;
  const StatusIcon = statusInfo.icon;

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={String(t(`feedback.types.${String(feedback.feedback_type)}`) || feedback.feedback_type || '')}
      size="lg"
      showCloseButton={true}
    >
      <div className="p-0">
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${statusInfo.color}`}>
              <StatusIcon className="h-4 w-4" />
              {statusInfo.label}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm ${severityInfo.color}`}>{String(t('feedback.admin.priority') || 'Priority')}: {String(t(`feedback.severity.${String(feedback.severity)}`) || '')}</span>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('feedback.admin.page')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700 px-3 py-2 rounded-lg break-all">{feedback.page_url}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('feedback.admin.userComment')}</h3>
            <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700 px-3 py-2 rounded-lg whitespace-pre-wrap">{feedback.description}</p>
          </div>

          {(feedback.annotation_image_url || feedback.screenshot_url) && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('feedback.admin.screenshot')}</h3>
              <div className="border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden">
                <img src={feedback.annotation_image_url || feedback.screenshot_url || ''} alt="Screenshot do feedback" className="w-full" />
              </div>
            </div>
          )}

          {feedback.response && (
            <div className="border-l-4 border-primary-500 pl-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('feedback.admin.previousResponse')}</h3>
              <p className="text-gray-600 dark:text-gray-400">{feedback.response}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{t('feedback.admin.respondedAt')}: {feedback.responded_at ? new Date(feedback.responded_at).toLocaleString() : 'N/A'}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{feedback.response ? t('feedback.admin.updateResponse') : t('feedback.admin.addResponse')}</h3>
            <textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder={t('feedback.admin.responsePlaceholder')} rows={4} maxLength={2000} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{response.length}/2000 {t('common.chars')}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('feedback.admin.updateStatus')}</h3>
            <div className="flex flex-wrap gap-2">
              {['in_review', 'in_progress', 'resolved', 'wont_fix'].map((status) => {
                const info = STATUS_LABELS[status];
                const Icon = info.icon;
                return (
                  <button key={status} onClick={() => onUpdateStatus(status)} disabled={feedback.status === status} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${feedback.status === status ? 'bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-gray-400 cursor-not-allowed' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                    <Icon className="h-4 w-4" />
                    {String(t(`feedback.status.${String(status)}`) || info.label || '')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-slate-700">
          <div>
            {onDelete && (
              <button onClick={() => { if (confirm(String(t('feedback.admin.confirmDelete') || 'Confirm delete?'))) onDelete(); }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">{t('feedback.admin.delete') || 'Deletar'}</button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">{t('modal.close')}</button>
            <button onClick={handleSubmitResponse} disabled={!response.trim() || isSubmitting} className="px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{isSubmitting ? t('feedback.admin.sending') : t('feedback.admin.sendResponse')}</button>
          </div>
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
    return feedbackData.items.filter((f) =>
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
      label: 'Buscar',
      type: 'text',
      placeholder: 'Buscar feedbacks...'
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: Object.entries(STATUS_LABELS).map(([value, info]) => ({
        value,
        label: info.label,
      })),
    },
    {
      key: 'feedback_type',
      label: 'Tipo',
      type: 'select',
      options: Object.entries(FEEDBACK_TYPES).map(([value, info]) => ({
        value,
        label: `${info.emoji} ${info.label}`,
      })),
    },
    {
      key: 'severity',
      label: 'Prioridade',
      type: 'select',
      options: Object.entries(SEVERITY_LABELS).map(([value, info]) => ({
        value,
        label: info.label,
      })),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Feedback dos Usuários"
        subtitle="Revise e responda aos feedbacks enviados pelos usuários"
        viewToggle={true}
        viewMode={viewMode}
        onViewChange={(m) => setViewMode(m)}
        action={(
          <button
            onClick={() => openFeedback()}
            title={t('feedback.send') || 'Enviar feedback'}
            className="inline-flex items-center justify-center p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
          >
            <PencilSquareIcon className="h-5 w-5" />
          </button>
        )}
      />

      {/* Feedback Capture Modal */}
      <FeedbackModal />

      {/* Configurable Statistics Bar - use same component as other pages */}
      <ConfigurableStatisticsBar module="proposals" data={feedbackData?.items || []} />

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
          <p className="text-gray-500 dark:text-gray-400">Nenhum feedback encontrado</p>
        </div>
      ) : viewMode === 'board' ? (
        /* Board View - Grouped by status */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(STATUS_LABELS).map(([statusKey, statusInfo]) => (
            <div key={statusKey} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <statusInfo.icon className="h-4 w-4" />
                {statusInfo.label}
                <span className="ml-auto text-xs bg-gray-200 dark:bg-slate-600 px-2 py-0.5 rounded-full">
                  {filteredFeedbacks.filter(f => f.status === statusKey).length}
                </span>
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredFeedbacks.filter(f => f.status === statusKey).map((fb) => {
                  const typeInfo = FEEDBACK_TYPES[fb.feedback_type] || { label: fb.feedback_type, emoji: '📝' };
                  const severityInfo = SEVERITY_LABELS[fb.severity] || SEVERITY_LABELS.medium;
                  return (
                    <div
                      key={fb.id}
                      className="p-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-600 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedFeedback(fb)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-lg">{typeInfo.emoji}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${severityInfo.color}`}>{severityInfo.label}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{typeInfo.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{fb.description}</p>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{new Date(fb.created_at).toLocaleDateString('pt-BR')}</div>
                    </div>
                  );
                })}
                {filteredFeedbacks.filter(f => f.status === statusKey).length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">Nenhum item</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'timeline' ? (
        /* Timeline View */
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <TimelineView
            items={paginatedFeedbacks.map((fb): TimelineItem => {
              const typeInfo = FEEDBACK_TYPES[fb.feedback_type] || { label: fb.feedback_type, emoji: '📝' };
              const severityInfo = SEVERITY_LABELS[fb.severity] || SEVERITY_LABELS.medium;
              const statusInfo = STATUS_LABELS[fb.status] || STATUS_LABELS.open;
              const StatusIcon = statusInfo.icon;

              // Map feedback status to timeline status
              const timelineStatus: TimelineItem['status'] =
                fb.status === 'resolved' || fb.status === 'closed' ? 'success' :
                fb.status === 'in_progress' || fb.status === 'in_review' ? 'pending' :
                fb.severity === 'critical' || fb.severity === 'high' ? 'error' :
                fb.severity === 'medium' ? 'warning' : 'info';

              return {
                id: fb.id,
                title: `${typeInfo.emoji} ${typeInfo.label}`,
                description: fb.description,
                date: fb.created_at,
                status: timelineStatus,
                icon: <StatusIcon className="h-4 w-4" />,
                tags: [
                  { label: severityInfo.label, color: severityInfo.color },
                  { label: statusInfo.label, color: statusInfo.color },
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
            emptyMessage="Nenhum feedback encontrado"
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
                header: 'Tipo',
                accessor: 'feedback_type',
                render: (value, row) => {
                  const typeInfo = FEEDBACK_TYPES[row.feedback_type] || { label: row.feedback_type, emoji: '📝' };
                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{typeInfo.emoji}</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{typeInfo.label}</span>
                    </div>
                  );
                },
              },
              {
                key: 'severity',
                header: 'Prioridade',
                accessor: 'severity',
                render: (value, row) => {
                  const severityInfo = SEVERITY_LABELS[row.severity] || SEVERITY_LABELS.medium;
                  return <span className={`px-2 py-1 rounded-full text-xs ${severityInfo.color}`}>{severityInfo.label}</span>;
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
                  const statusInfo = STATUS_LABELS[row.status] || STATUS_LABELS.open;
                  const StatusIcon = statusInfo.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusInfo.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.label}
                    </span>
                  );
                },
              },
            ] as TableColumn<Feedback>[]}
            hoverable={true}
            striped={true}
            emptyMessage="Nenhum feedback encontrado"
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
          {paginatedFeedbacks.map((feedback) => {
            const typeInfo = FEEDBACK_TYPES[feedback.feedback_type] || { label: feedback.feedback_type, emoji: '📝' };
            const severityInfo = SEVERITY_LABELS[feedback.severity] || SEVERITY_LABELS.medium;
            const statusInfo = STATUS_LABELS[feedback.status] || STATUS_LABELS.open;
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={feedback.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedFeedback(feedback)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Icon and type */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-2xl">
                      {typeInfo.emoji}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <h3 className="text-base font-medium text-gray-900 dark:text-white">{typeInfo.label}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${severityInfo.color}`}>{severityInfo.label}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusInfo.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
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
                          <span className="font-medium text-primary-600 dark:text-primary-400">Resposta:</span> {feedback.response.slice(0, 100)}...
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
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
