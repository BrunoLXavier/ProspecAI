// PII Analysis and Review Page
// Human-in-the-loop review for PII detection and anonymization
// Implements RF-01: LGPD Agent with manual approval workflow
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { getStoredAccessToken } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import {
  ShieldExclamationIcon,
  XCircleIcon,
  EyeIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import { ViewMode } from '@/components/features/shared/ui/ViewToggle';
import FilterPanel from '@/components/features/shared/ui/FilterPanel';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import Pagination, { usePagination } from '@/components/features/shared/ui/Pagination';
import {
  PIIDetection,
  PIIStatistics,
  APIDetection,
  APIStatistics,
  PII_CUSTOM_CALCULATORS,
  RISK_COLORS,
  STATUS_CONFIG,
  PII_TYPE_LABELS,
  formatDate,
  transformAPIDetection,
  transformAPIStatistics,
} from '@/components/features/pii-analysis/components/types';
import PIIDetectionTableView from '@/components/features/pii-analysis/components/PIIDetectionTableView';
import PIIDetectionTimelineView from '@/components/features/pii-analysis/components/PIIDetectionTimelineView';
import PIIReviewModal from '@/components/features/pii-analysis/components/PIIReviewModal';
import { usePIIFilterFields } from '@/components/features/pii-analysis/components/usePIIFilterFields';

// =============================================================================
// Component
// =============================================================================

export default function PIIAnalysisPage() {
  const t = useTranslations('common');
  const tp = useTranslations('pii');
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const validModes: ViewMode[] = ['list', 'board', 'timeline', 'table'];
  const [viewMode, setViewMode] = useState<ViewMode>(
    urlView && validModes.includes(urlView) ? urlView : 'list'
  );
  
  // State
  const [detections, setDetections] = useState<PIIDetection[]>([]);
  const [statistics, setStatistics] = useState<PIIStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const { initialPage, initialPageSize } = usePagination(20, true);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  
  // Filters
  const [filters, setFilters] = useState<{ status: string; risk: string; search: string }>({
    status: 'pending_review',
    risk: 'all',
    search: '',
  });
  
  // Selected items for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Modal state
  const [reviewModal, setReviewModal] = useState<PIIDetection | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState('mask');
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter fields
  const filterFields = usePIIFilterFields();
  
  // ==========================================================================
  // Data Loading
  // ==========================================================================
  
  const fetchDetections = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.risk !== 'all') params.set('risk_level', filters.risk);
      
      const token = getStoredAccessToken() || (typeof window !== 'undefined' ? (window as any).__PROSPECAI_ACCESS_TOKEN : null);
      const response = await fetch(`/api/v1/lgpd/detections?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch PII detections');

      const apiData: APIDetection[] = await response.json();
      const transformedData = apiData.map(transformAPIDetection);
      setDetections(transformedData);
    } catch (err: any) {
      console.error('Failed to fetch PII detections:', err);
      setDetections([]);
      setError(err?.message || 'Failed to load PII detections');
    } finally {
      setIsLoading(false);
    }
  }, [filters.status, filters.risk]);
  
  const fetchStatistics = useCallback(async () => {
    try {
      const token = getStoredAccessToken() || (typeof window !== 'undefined' ? (window as any).__PROSPECAI_ACCESS_TOKEN : null);
      const response = await fetch('/api/v1/lgpd/detections/statistics', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch statistics');

      const apiData: APIStatistics = await response.json();
      const transformedStats = transformAPIStatistics(apiData);
      setStatistics(transformedStats);
    } catch (err: any) {
      console.error('Failed to fetch PII statistics:', err);
      setStatistics(null);
      setError(err?.message || 'Failed to load PII statistics');
    }
  }, []);
  
  useEffect(() => {
    fetchDetections();
    fetchStatistics();
  }, [fetchDetections, fetchStatistics]);
  
  // ==========================================================================
  // Actions
  // ==========================================================================
  
  const handleApprove = async (detection: PIIDetection) => {
    setIsProcessing(true);
    
    try {
      const token = getStoredAccessToken() || (typeof window !== 'undefined' ? (window as any).__PROSPECAI_ACCESS_TOKEN : null);
      const response = await fetch(`/api/v1/lgpd/detections/${detection.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          notes: reviewNotes || undefined,
          strategy: selectedStrategy,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to approve detection');
      
      setReviewModal(null);
      setReviewNotes('');
      await fetchDetections();
      await fetchStatistics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleReject = async (detection: PIIDetection) => {
    setIsProcessing(true);
    
    try {
      const token = getStoredAccessToken() || (typeof window !== 'undefined' ? (window as any).__PROSPECAI_ACCESS_TOKEN : null);
      const response = await fetch(`/api/v1/lgpd/detections/${detection.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          notes: reviewNotes || tp('rejectedManually'),
        }),
      });
      
      if (!response.ok) throw new Error('Failed to reject detection');
      
      setReviewModal(null);
      setReviewNotes('');
      await fetchDetections();
      await fetchStatistics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleAnonymize = async (detection: PIIDetection) => {
    setIsProcessing(true);
    
    try {
      const token = getStoredAccessToken() || (typeof window !== 'undefined' ? (window as any).__PROSPECAI_ACCESS_TOKEN : null);
      const response = await fetch(`/api/v1/lgpd/detections/${detection.id}/anonymize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          strategy: selectedStrategy,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to anonymize');
      
      setReviewModal(null);
      await fetchDetections();
      await fetchStatistics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(tp('confirmApprove', { count: selectedIds.size }))) return;
    
    setIsProcessing(true);
    
    try {
      const token = getStoredAccessToken() || (typeof window !== 'undefined' ? (window as any).__PROSPECAI_ACCESS_TOKEN : null);
      const response = await fetch('/api/v1/lgpd/detections/batch-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          detection_ids: Array.from(selectedIds),
          strategy: selectedStrategy,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to bulk approve');
      
      setSelectedIds(new Set());
      await fetchDetections();
      await fetchStatistics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // ==========================================================================
  // Selection
  // ==========================================================================
  
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const toggleSelectAll = () => {
    if (selectedIds.size === detections.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(detections.map(d => d.id)));
    }
  };
  
  // ==========================================================================
  // Filter
  // ==========================================================================
  
  const filteredDetections = detections.filter(d => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const hasMatchingEntity = d.entities.some(e => 
        e.value.toLowerCase().includes(searchLower) ||
        e.type.toLowerCase().includes(searchLower)
      );
      if (!hasMatchingEntity) return false;
    }
    return true;
  });
  
  // Paginated detections
  const paginatedDetections = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDetections.slice(start, start + pageSize);
  }, [filteredDetections, currentPage, pageSize]);
  
  // Handle filter change with pagination reset
  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };
  
  // ==========================================================================
  // Render
  // ==========================================================================
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title={tp('title')}
        subtitle={tp('subtitle')}
        viewToggle={true}
        viewMode={viewMode}
        onViewChange={setViewMode}
        viewLabels={{ list: tp('tableView') }}
      />
      
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
            ✕
          </button>
        </div>
      )}
      
      {/* Configurable Statistics Bar */}
      {filteredDetections && (
        <ConfigurableStatisticsBar
          module="pii-analysis"
          data={filteredDetections}
          customCalculators={PII_CUSTOM_CALCULATORS}
        />
      )}
      
      {/* Filters */}
      <FilterPanel
        fields={filterFields}
        values={filters}
        onChange={handleFilterChange}
        onReset={() => { setFilters({ status: 'all', risk: 'all', search: '' }); setCurrentPage(1); }}
        defaultExpanded={false}
      />
      
      {/* Detections View */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredDetections.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
            <ShieldExclamationIcon className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {tp('noDetectionsFound')}
          </p>
        </div>
      ) : viewMode === 'board' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(STATUS_CONFIG).map(([statusKey, statusInfo]) => (
            <div key={statusKey} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <ShieldExclamationIcon className="h-4 w-4" />
                {statusInfo.label}
                <span className="ml-auto text-xs bg-gray-200 dark:bg-slate-600 px-2 py-0.5 rounded-full">
                  {filteredDetections.filter(d => d.anonymization_status === statusKey).length}
                </span>
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredDetections.filter(d => d.anonymization_status === statusKey).map((detection) => {
                  const riskColor = RISK_COLORS[detection.risk_level];
                  return (
                    <div
                      key={detection.id}
                      className="p-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-600 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setReviewModal(detection)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${riskColor.bg} ${riskColor.text}`}>
                          {detection.risk_level.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        {detection.entities.length} {tp('piiEntities')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                        {detection.entities.map(e => PII_TYPE_LABELS[e.type] || e.type).join(', ')}
                      </p>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(detection.created_at)}
                      </div>
                    </div>
                  );
                })}
                {filteredDetections.filter(d => d.anonymization_status === statusKey).length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">{tp('noItems')}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-4">
          {paginatedDetections.map((detection) => {
            const riskColor = RISK_COLORS[detection.risk_level];
            const statusConfig = STATUS_CONFIG[detection.anonymization_status];

            return (
              <div
                key={detection.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setReviewModal(detection)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-lg ${riskColor.bg} flex items-center justify-center`}>
                      <ShieldExclamationIcon className={`w-6 h-6 ${riskColor.text}`} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <h3 className="text-base font-medium text-gray-900 dark:text-white">
                        {tp('piiEntitiesDetected', { count: detection.entities.length })}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${riskColor.bg} ${riskColor.text}`}>
                          {detection.risk_level.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs bg-${statusConfig.color}-100 dark:bg-${statusConfig.color}-900/30 text-${statusConfig.color}-700 dark:text-${statusConfig.color}-300`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {detection.entities.slice(0, 5).map((entity, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                          {PII_TYPE_LABELS[entity.type] || entity.type}
                        </span>
                      ))}
                      {detection.entities.length > 5 && (
                        <span className="px-2 py-0.5 text-xs text-gray-500">+{detection.entities.length - 5}</span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {formatDate(detection.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <DocumentTextIcon className="h-3.5 w-3.5" />
                        {detection.source_type}
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0 self-start">
                    <button
                      onClick={(e) => { e.stopPropagation(); setReviewModal(detection); }}
                      className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'timeline' ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <PIIDetectionTimelineView
            detections={paginatedDetections}
            onReview={setReviewModal}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <PIIDetectionTableView
            detections={paginatedDetections}
            allDetections={filteredDetections}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
            onToggleSelectAll={toggleSelectAll}
            onReview={setReviewModal}
          />
        </div>
      )}
      
      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={filteredDetections.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        persistInUrl={true}
      />
      
      {/* Review Modal */}
      {reviewModal && (
        <PIIReviewModal
          detection={reviewModal}
          reviewNotes={reviewNotes}
          selectedStrategy={selectedStrategy}
          isProcessing={isProcessing}
          onClose={() => setReviewModal(null)}
          onNotesChange={setReviewNotes}
          onStrategyChange={setSelectedStrategy}
          onApprove={handleApprove}
          onReject={handleReject}
          onAnonymize={handleAnonymize}
        />
      )}
    </div>
  );
}
