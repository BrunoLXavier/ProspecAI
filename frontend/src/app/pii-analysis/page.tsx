// PII Analysis and Review Page
// Human-in-the-loop review for PII detection and anonymization
// Implements RF-01: LGPD Agent with manual approval workflow
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { getStoredAccessToken } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldExclamationIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  DocumentMagnifyingGlassIcon,
  ClockIcon,
  ShieldCheckIcon,
  IdentificationIcon,
  EnvelopeIcon,
  PhoneIcon,
  TableCellsIcon,
  DocumentTextIcon,
  UserIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import { ViewMode } from '@/components/features/shared/ui/ViewToggle';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
// import { PIIAnalysisBoard } from '@/components/features/pii-analysis';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import Pagination, { usePagination } from '@/components/features/shared/ui/Pagination';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';

// =============================================================================
// Types
// =============================================================================

interface PIIEntity {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: number;
  suggested_strategy: string;
}

// API response entity format
interface APIEntity {
  id: string;
  pii_type: string;
  original_value: string;
  masked_value?: string;
  start_position: number;
  end_position: number;
  confidence: number;
  detection_method: string;
  risk_level: string;
}

// API response detection format
interface APIDetection {
  id: string;
  document_id?: string;
  ingestion_source_id?: string;
  file_name: string;
  file_type?: string;
  total_entities: number;
  overall_risk_level: string;
  risk_summary: Record<string, number>;
  anonymization_status: string;
  anonymization_strategy?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  reviewer_comment?: string;
  anonymized_at?: string;
  analyzed_at: string;
  created_at: string;
  entities: APIEntity[];
}

interface PIIDetection {
  id: string;
  source_id?: string;
  source_type: string;
  entities: PIIEntity[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  anonymization_status: 'pending_review' | 'approved' | 'rejected' | 'anonymized' | 'anonymization_failed';
  anonymization_strategy?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
}

interface PIIStatistics {
  total: number;
  pending_review: number;
  approved: number;
  rejected: number;
  anonymized: number;
  by_risk_level: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  by_type: Record<string, number>;
}

// =============================================================================
// Data Transformation Functions
// =============================================================================

/**
 * Transforms API response to frontend format
 */
function transformAPIDetection(apiDetection: APIDetection): PIIDetection {
  return {
    id: apiDetection.id,
    source_id: apiDetection.document_id || apiDetection.ingestion_source_id,
    source_type: apiDetection.file_type || 'unknown',
    entities: apiDetection.entities.map((entity) => ({
      type: entity.pii_type,
      value: entity.original_value,
      start: entity.start_position,
      end: entity.end_position,
      confidence: entity.confidence,
      suggested_strategy: entity.detection_method === 'pattern' ? 'mask' : 'pseudonymize',
    })),
    risk_level: apiDetection.overall_risk_level as 'low' | 'medium' | 'high' | 'critical',
    anonymization_status: apiDetection.anonymization_status as PIIDetection['anonymization_status'],
    anonymization_strategy: apiDetection.anonymization_strategy,
    reviewed_by: apiDetection.reviewed_by,
    reviewed_at: apiDetection.reviewed_at,
    review_notes: apiDetection.reviewer_comment,
    created_at: apiDetection.created_at,
  };
}

/**
 * Transforms API statistics response to frontend format
 */
interface APIStatistics {
  total_detections: number;
  total_entities: number;
  status_counts: Record<string, number>;
  risk_counts: Record<string, number>;
  pending_review: number;
}

function transformAPIStatistics(apiStats: APIStatistics): PIIStatistics {
  return {
    total: apiStats.total_detections,
    pending_review: apiStats.status_counts.pending_review || 0,
    approved: apiStats.status_counts.approved || 0,
    rejected: apiStats.status_counts.rejected || 0,
    anonymized: apiStats.status_counts.anonymized || 0,
    by_risk_level: {
      low: apiStats.risk_counts.low || 0,
      medium: apiStats.risk_counts.medium || 0,
      high: apiStats.risk_counts.high || 0,
      critical: apiStats.risk_counts.critical || 0,
    },
    by_type: {}, // API doesn't provide this yet
  };
}

// =============================================================================
// Constants
// =============================================================================

const RISK_COLORS = {
  low: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
};

const STATUS_CONFIG = {
  pending_review: { label: 'Pendente', color: 'yellow' },
  approved: { label: 'Aprovado', color: 'blue' },
  rejected: { label: 'Rejeitado', color: 'gray' },
  anonymized: { label: 'Anonimizado', color: 'green' },
  anonymization_failed: { label: 'Falhou', color: 'red' },
};

/**
 * Custom calculators for PII statistics
 * These calculate statistics from the detection data
 */
const PII_CUSTOM_CALCULATORS: Record<string, (data: Record<string, any>[]) => number> = {
  // Status counts
  pending: (data) => data.filter(d => d.anonymization_status === 'pending_review').length,
  approved: (data) => data.filter(d => d.anonymization_status === 'approved').length,
  rejected: (data) => data.filter(d => d.anonymization_status === 'rejected').length,
  anonymized: (data) => data.filter(d => d.anonymization_status === 'anonymized').length,
  
  // Risk levels
  critical: (data) => data.filter(d => d.risk_level === 'critical').length,
  high: (data) => data.filter(d => d.risk_level === 'high').length,
  medium: (data) => data.filter(d => d.risk_level === 'medium').length,
  low: (data) => data.filter(d => d.risk_level === 'low').length,
  
  // Entity type counts (count entities across all detections)
  cpf: (data) => data.reduce((sum, d) => sum + (d.entities?.filter((e: any) => e.type === 'cpf')?.length || 0), 0),
  cnpj: (data) => data.reduce((sum, d) => sum + (d.entities?.filter((e: any) => e.type === 'cnpj')?.length || 0), 0),
  email: (data) => data.reduce((sum, d) => sum + (d.entities?.filter((e: any) => e.type === 'email')?.length || 0), 0),
  phone: (data) => data.reduce((sum, d) => sum + (d.entities?.filter((e: any) => e.type === 'phone')?.length || 0), 0),
  name: (data) => data.reduce((sum, d) => sum + (d.entities?.filter((e: any) => e.type === 'name' || e.type === 'person')?.length || 0), 0),
  address: (data) => data.reduce((sum, d) => sum + (d.entities?.filter((e: any) => e.type === 'address')?.length || 0), 0),
  rg: (data) => data.reduce((sum, d) => sum + (d.entities?.filter((e: any) => e.type === 'rg')?.length || 0), 0),
  creditCard: (data) => data.reduce((sum, d) => sum + (d.entities?.filter((e: any) => e.type === 'credit_card')?.length || 0), 0),
  
  // Performance metrics
  approvalRate: (data) => {
    const reviewed = data.filter(d => d.anonymization_status === 'approved' || d.anonymization_status === 'rejected');
    if (reviewed.length === 0) return 0;
    const approved = reviewed.filter(d => d.anonymization_status === 'approved').length;
    return Math.round((approved / reviewed.length) * 100);
  },
  anonymizationRate: (data) => {
    if (data.length === 0) return 0;
    const anonymized = data.filter(d => d.anonymization_status === 'anonymized').length;
    return Math.round((anonymized / data.length) * 100);
  },
  falsePositiveRate: (data) => {
    const reviewed = data.filter(d => d.anonymization_status === 'approved' || d.anonymization_status === 'rejected');
    if (reviewed.length === 0) return 0;
    const rejected = reviewed.filter(d => d.anonymization_status === 'rejected').length;
    return Math.round((rejected / reviewed.length) * 100);
  },
  
  // AI metrics
  avgConfidence: (data) => {
    const allConfidences = data.flatMap(d => d.entities?.map((e: any) => e.confidence) || []);
    if (allConfidences.length === 0) return 0;
    const avg = allConfidences.reduce((sum: number, c: number) => sum + c, 0) / allConfidences.length;
    return Math.round(avg * 100);
  },
  highConfidence: (data) => {
    return data.flatMap(d => d.entities || []).filter((e: any) => e.confidence >= 0.9).length;
  },
  needsReview: (data) => {
    return data.flatMap(d => d.entities || []).filter((e: any) => e.confidence < 0.8).length;
  },
};

const PII_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  phone: 'Telefone',
  name: 'Nome',
  address: 'Endereço',
  rg: 'RG',
  credit_card: 'Cartão de Crédito',
  bank_account: 'Conta Bancária',
  ip_address: 'Endereço IP',
  date_of_birth: 'Data de Nascimento',
  other: 'Outro',
};

const ANONYMIZATION_STRATEGIES = [
  { id: 'mask', label: 'Mascarar', description: 'Substitui por asteriscos (****)' },
  { id: 'pseudonymize', label: 'Pseudonimizar', description: 'Substitui por valor fictício consistente' },
  { id: 'remove', label: 'Remover', description: 'Remove completamente o dado' },
  { id: 'hash', label: 'Hash', description: 'Converte em hash irreversível' },
];

// No inline mock PII detections/statistics; use backend endpoints for tenant-aware data.

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dateStr));
}

// =============================================================================
// Component
// =============================================================================

export default function PIIAnalysisPage() {
  const t = useTranslations('common');
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
          notes: reviewNotes || 'Rejeitado manualmente',
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
    
    if (!confirm(`Aprovar ${selectedIds.size} detecções selecionadas?`)) return;
    
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

  const filterFields: FilterField[] = [
    { key: 'search', label: 'Buscar', type: 'text', placeholder: 'Buscar detecções...' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'all', label: 'Todos os status' },
      { value: 'pending_review', label: 'Pendentes' },
      { value: 'approved', label: 'Aprovados' },
      { value: 'anonymized', label: 'Anonimizados' },
      { value: 'rejected', label: 'Rejeitados' },
    ] },
    { key: 'risk', label: 'Risco', type: 'select', options: [
      { value: 'all', label: 'Todos os riscos' },
      { value: 'critical', label: 'Crítico' },
      { value: 'high', label: 'Alto' },
      { value: 'medium', label: 'Médio' },
      { value: 'low', label: 'Baixo' },
    ] },
  ];
  
  // ==========================================================================
  // Render
  // ==========================================================================
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Análise de PII"
        subtitle="Revise e aprove detecções de dados pessoais antes da anonimização"
        viewToggle={true}
        viewMode={viewMode}
        onViewChange={setViewMode}
        viewLabels={{ list: 'Table View' }}
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
          <ShieldExclamationIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            Nenhuma detecção encontrada
          </p>
        </div>
      ) : viewMode === 'board' ? (
        /* Board View - Grouped by status */
        /* <PIIAnalysisBoard 
          detections={filteredDetections}
          onItemClick={(detection) => setReviewModal(detection)}
        /> */
        <div className="text-center py-12">Board view unavailable</div>
      ) : viewMode === 'list' ? (
        /* List View - Card-based layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedDetections.map((detection) => {
            const riskColor = RISK_COLORS[detection.risk_level];
            const statusConfig = STATUS_CONFIG[detection.anonymization_status];
            
            return (
              <div
                key={detection.id}
                onClick={() => setReviewModal(detection)}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-4 cursor-pointer hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
              >
                {/* Header with risk badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${riskColor.bg}`}>
                      <ShieldExclamationIcon className={`w-5 h-5 ${riskColor.text}`} />
                    </div>
                    <div>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${riskColor.bg} ${riskColor.text}`}>
                        {detection.risk_level.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full bg-${statusConfig.color}-100 dark:bg-${statusConfig.color}-900/30 text-${statusConfig.color}-700 dark:text-${statusConfig.color}-300`}>
                    {statusConfig.label}
                  </span>
                </div>

                {/* Entity badges */}
                <div className="mb-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {detection.entities.length} entidades detectadas
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {detection.entities.slice(0, 4).map((entity, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                      >
                        {PII_TYPE_LABELS[entity.type] || entity.type}
                      </span>
                    ))}
                    {detection.entities.length > 4 && (
                      <span className="px-2 py-0.5 text-xs text-gray-500">
                        +{detection.entities.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer with source and date */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-1">
                    <DocumentTextIcon className="w-3.5 h-3.5" />
                    <span>{detection.source_type}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-3.5 h-3.5" />
                    <span>{formatDate(detection.created_at)}</span>
                  </div>
                </div>

                {/* Selection checkbox */}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <label className="flex items-center gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(detection.id)}
                      onChange={() => toggleSelection(detection.id)}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-500 dark:text-gray-400">Selecionar</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'timeline' ? (
        /* Timeline View - Detection timeline */
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6">
          <TimelineView
            items={paginatedDetections.map((detection): TimelineItem => {
              const riskColor = RISK_COLORS[detection.risk_level];
              const statusConfig = STATUS_CONFIG[detection.anonymization_status];
              const statusToTimelineStatus: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info' | 'pending'> = {
                pending_review: 'pending',
                approved: 'info',
                rejected: 'error',
                anonymized: 'success',
                anonymization_failed: 'error',
              };
              
              return {
                id: detection.id,
                title: `${detection.entities.length} entidades PII detectadas`,
                description: (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {detection.entities.slice(0, 3).map((entity, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                        >
                          {PII_TYPE_LABELS[entity.type] || entity.type}
                        </span>
                      ))}
                      {detection.entities.length > 3 && (
                        <span className="px-2 py-0.5 text-xs text-gray-500">
                          +{detection.entities.length - 3}
                        </span>
                      )}
                    </div>
                    <p className="text-xs">Origem: {detection.source_type}</p>
                  </div>
                ),
                date: detection.created_at,
                status: statusToTimelineStatus[detection.anonymization_status] || 'default',
                icon: <ShieldExclamationIcon className="w-4 h-4" />,
                tags: [
                  { label: detection.risk_level.toUpperCase(), color: `${riskColor.bg} ${riskColor.text}` },
                  { label: statusConfig.label, color: `bg-${statusConfig.color}-100 dark:bg-${statusConfig.color}-900/30 text-${statusConfig.color}-700 dark:text-${statusConfig.color}-300` },
                ],
                onClick: () => setReviewModal(detection),
              };
            })}
            size="md"
            showConnectors={true}
            animated={true}
            emptyMessage="Nenhuma detecção encontrada"
          />
        </div>
      ) : (
        /* Table View - Data table */
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredDetections.length && filteredDetections.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Entidades
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Risco
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Origem
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Data
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedDetections.map((detection) => {
                const riskColor = RISK_COLORS[detection.risk_level];
                const statusConfig = STATUS_CONFIG[detection.anonymization_status];
                
                return (
                  <tr key={detection.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(detection.id)}
                        onChange={() => toggleSelection(detection.id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {detection.entities.slice(0, 3).map((entity, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                          >
                            {PII_TYPE_LABELS[entity.type] || entity.type}
                          </span>
                        ))}
                        {detection.entities.length > 3 && (
                          <span className="px-2 py-0.5 text-xs text-gray-500">
                            +{detection.entities.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${riskColor.bg} ${riskColor.text}`}>
                        {detection.risk_level.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {detection.source_type}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full bg-${statusConfig.color}-100 dark:bg-${statusConfig.color}-900/30 text-${statusConfig.color}-700 dark:text-${statusConfig.color}-300`}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(detection.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setReviewModal(detection)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <ShieldExclamationIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Revisar Detecção PII
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ID: {reviewModal.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReviewModal(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Risk Level */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">Nível de Risco:</span>
                <span className={`px-3 py-1 text-sm rounded-full ${RISK_COLORS[reviewModal.risk_level].bg} ${RISK_COLORS[reviewModal.risk_level].text}`}>
                  {reviewModal.risk_level.toUpperCase()}
                </span>
              </div>
              
              {/* Entities */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Entidades Detectadas ({reviewModal.entities.length})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {reviewModal.entities.map((entity, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                    >
                      <div>
                        <span className="px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded mr-2">
                          {PII_TYPE_LABELS[entity.type] || entity.type}
                        </span>
                        <span className="text-gray-900 dark:text-white font-mono text-sm">
                          {entity.value.slice(0, 30)}{entity.value.length > 30 ? '...' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.round(entity.confidence * 100)}% conf.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Anonymization Strategy */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Estratégia de Anonimização
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {ANONYMIZATION_STRATEGIES.map((strategy) => (
                    <button
                      key={strategy.id}
                      className="p-3 border rounded-lg text-left"
                      onClick={() => setSelectedStrategy(strategy.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{strategy.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{strategy.description}</div>
                        </div>
                        <div className="text-primary-600">{selectedStrategy === strategy.id ? '✓' : ''}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
