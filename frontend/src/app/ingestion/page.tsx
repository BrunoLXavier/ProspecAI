// Data Ingestion Dashboard
// Upload and manage bulk data imports with PII detection
// Implements RF-01: Ingestão de dados multiorigem
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  TableCellsIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  TrashIcon,
  EyeIcon,
  ShieldExclamationIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import PageHeader from '@/components/ui/PageHeader';
import { ViewMode } from '@/components/ui/ViewToggle';
import IngestionBoard from '@/components/ingestion/IngestionBoard';
import IngestionDetailModal from '@/components/ingestion/IngestionDetailModal';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';
import { getStoredAccessToken } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';

// =============================================================================
// Types
// =============================================================================

interface IngestionJob {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'validating' | 'processing' | 'pii_detection' | 'completed' | 'failed' | 'cancelled';
  source_type: string;
  total_files: number;
  processed_files: number;
  total_records: number;
  processed_records: number;
  failed_records: number;
  pii_detected_count: number;
  pii_anonymized_count: number;
  progress_percentage: number;
  current_step?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

interface IngestionSource {
  id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  status: string;
  total_records: number;
  processed_records: number;
  error_message?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dateStr));
}

const STATUS_CONFIG = {
  pending: { key: 'pending', color: 'gray', icon: DocumentTextIcon },
  validating: { key: 'validating', color: 'blue', icon: ArrowPathIcon },
  processing: { key: 'processing', color: 'blue', icon: ArrowPathIcon },
  pii_detection: { key: 'pii_detection', color: 'yellow', icon: ShieldExclamationIcon },
  completed: { key: 'completed', color: 'green', icon: CheckCircleIcon },
  failed: { key: 'failed', color: 'red', icon: XCircleIcon },
  cancelled: { key: 'cancelled', color: 'gray', icon: XCircleIcon },
};

// =============================================================================
// Component
// =============================================================================

export default function IngestionPage() {
  const t = useTranslations('ingestion');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(urlView === 'board' || urlView === 'list' ? urlView : 'list');
  
  // State
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<IngestionJob | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [jobSources, setJobSources] = useState<IngestionSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Upload state
  const [showNewModal, setShowNewModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [jobName, setJobName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    source_type: 'all',
    dateFrom: '',
    dateTo: '',
  });
  
  // WebSocket
  const wsRef = useRef<WebSocket | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Filter fields configuration
  const filterFields: FilterField[] = useMemo(() => [
    {
      key: 'search',
      label: t('search') || 'Search',
      type: 'text',
      placeholder: 'Search jobs...',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'pending', label: 'Pending' },
        { value: 'validating', label: 'Validating' },
        { value: 'processing', label: 'Processing' },
        { value: 'pii_detection', label: 'PII Detection' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' },
      ],
    },
    {
      key: 'source_type',
      label: 'Source Type',
      type: 'select',
      options: [
        { value: 'all', label: 'All Types' },
        { value: 'csv', label: 'CSV' },
        { value: 'xlsx', label: 'Excel (XLSX)' },
        { value: 'json', label: 'JSON' },
        { value: 'xml', label: 'XML' },
      ],
    },
    {
      key: 'dateFrom',
      label: 'From Date',
      type: 'date',
    },
    {
      key: 'dateTo',
      label: 'To Date',
      type: 'date',
    },
  ], [t]);

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      source_type: 'all',
      dateFrom: '',
      dateTo: '',
    });
  };

  // Filter jobs based on current filters
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Search filter
      if (filters.search && !job.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      // Status filter
      if (filters.status !== 'all' && job.status !== filters.status) {
        return false;
      }
      // Source type filter
      if (filters.source_type !== 'all' && job.source_type !== filters.source_type) {
        return false;
      }
      // Date filters
      if (filters.dateFrom && new Date(job.created_at) < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && new Date(job.created_at) > new Date(filters.dateTo)) {
        return false;
      }
      return true;
    });
  }, [jobs, filters]);

  // Calculate statistics from filtered jobs
  const stats = useMemo(() => {
    const total = filteredJobs.length;
    const completed = filteredJobs.filter(j => j.status === 'completed').length;
    const processing = filteredJobs.filter(j => ['validating', 'processing', 'pii_detection'].includes(j.status)).length;
    const failed = filteredJobs.filter(j => j.status === 'failed').length;
    const totalRecords = filteredJobs.reduce((sum, j) => sum + j.total_records, 0);
    const totalPII = filteredJobs.reduce((sum, j) => sum + j.pii_detected_count, 0);
    return { total, completed, processing, failed, totalRecords, totalPII };
  }, [filteredJobs]);
  
  // ==========================================================================
  // Mock Data for Development/Testing
  // ==========================================================================
  
  const mockJobs: IngestionJob[] = [
    {
      id: '1',
      name: 'Import Clients CSV',
      description: 'Bulk import of client data from CRM export',
      status: 'completed',
      source_type: 'csv',
      total_files: 1,
      processed_files: 1,
      total_records: 1500,
      processed_records: 1500,
      failed_records: 3,
      pii_detected_count: 45,
      pii_anonymized_count: 45,
      progress_percentage: 100,
      started_at: '2026-01-10T09:00:00Z',
      completed_at: '2026-01-10T09:15:00Z',
      created_at: '2026-01-10T08:55:00Z',
    },
    {
      id: '2',
      name: 'Funding Sources Update',
      description: 'Monthly update of funding sources from FINEP',
      status: 'processing',
      source_type: 'xlsx',
      total_files: 3,
      processed_files: 2,
      total_records: 250,
      processed_records: 180,
      failed_records: 0,
      pii_detected_count: 0,
      pii_anonymized_count: 0,
      progress_percentage: 72,
      current_step: 'Processing file 3 of 3',
      started_at: '2026-01-13T10:00:00Z',
      created_at: '2026-01-13T09:55:00Z',
    },
    {
      id: '3',
      name: 'Project Portfolio JSON',
      description: 'Import projects from legacy system',
      status: 'pii_detection',
      source_type: 'json',
      total_files: 1,
      processed_files: 1,
      total_records: 85,
      processed_records: 85,
      failed_records: 0,
      pii_detected_count: 12,
      pii_anonymized_count: 5,
      progress_percentage: 85,
      current_step: 'Detecting PII entities',
      started_at: '2026-01-13T11:00:00Z',
      created_at: '2026-01-13T10:50:00Z',
    },
    {
      id: '4',
      name: 'Partner Companies Import',
      status: 'failed',
      source_type: 'csv',
      total_files: 1,
      processed_files: 0,
      total_records: 0,
      processed_records: 0,
      failed_records: 0,
      pii_detected_count: 0,
      pii_anonymized_count: 0,
      progress_percentage: 0,
      error_message: 'Invalid CSV format: missing required columns',
      created_at: '2026-01-12T14:00:00Z',
    },
    {
      id: '5',
      name: 'Research Data XML',
      status: 'pending',
      source_type: 'xml',
      total_files: 2,
      processed_files: 0,
      total_records: 0,
      processed_records: 0,
      failed_records: 0,
      pii_detected_count: 0,
      pii_anonymized_count: 0,
      progress_percentage: 0,
      created_at: '2026-01-13T12:00:00Z',
    },
  ];
  
  // ==========================================================================
  // Data Loading
  // ==========================================================================
  
  const fetchJobs = useCallback(async () => {
    try {
      const token = getStoredAccessToken() || (typeof window !== 'undefined' ? (window as any).__PROSPECAI_ACCESS_TOKEN : null);

      // If there is no access token, do not use mock data; return empty and surface error
      if (!token) {
        console.debug('[Ingestion] No access token found');
        setJobs([]);
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      // Use central apiClient which handles token refresh and headers
      try {
        const data = await apiClient.get<IngestionJob[]>('/api/v1/ingestion/jobs');
        setJobs(data ?? []);
      } catch (e: any) {
        console.error('[Ingestion] apiClient failed to fetch jobs', e);
        setJobs([]);
        setError(e?.message || 'Failed to fetch ingestion jobs');
      }
    } catch (err: any) {
      setJobs([]);
      setError(err?.message || 'Failed to load ingestion jobs');
      console.error('Failed to fetch ingestion data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);
  
  // ==========================================================================
  // WebSocket for Progress Updates
  // ==========================================================================
  
  const connectWebSocket = useCallback((jobId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/ingestion/${jobId}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'progress') {
        setJobs(prev => prev.map(job => 
          job.id === jobId ? { ...job, ...data.job } : job
        ));
        
        if (selectedJob?.id === jobId) {
          setSelectedJob(prev => prev ? { ...prev, ...data.job } : null);
        }
      }
    };
    
    ws.onerror = () => {
      console.error('WebSocket error');
    };
    
    ws.onclose = () => {
      wsRef.current = null;
    };
    
    wsRef.current = ws;
  }, [selectedJob]);
  
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  
  // ==========================================================================
  // File Upload
  // ==========================================================================
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.name.endsWith('.csv') || 
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.json')
    );
    
    if (files.length > 0) {
      addFiles(files);
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      addFiles(files);
    }
  };
  
  const addFiles = (files: File[]) => {
    const newFiles: UploadingFile[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
    }));
    setUploadingFiles(prev => [...prev, ...newFiles]);
  };
  
  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  // ==========================================================================
  // Create Job
  // ==========================================================================
  
  const handleCreateJob = async () => {
    if (!jobName || uploadingFiles.length === 0) return;
    
    setIsCreatingJob(true);
    setError(null);
    
      try {
        // Create job via apiClient (handles auth + retries)
        const job = await apiClient.post('/api/v1/ingestion/jobs', {
          name: jobName,
          description: jobDescription || undefined,
          source_type: 'file',
        });

        // Upload files using form data and apiClient (axios will set Authorization)
        const formData = new FormData();
        uploadingFiles.forEach(uf => formData.append('files', uf.file));

        await apiClient.post(`/api/v1/ingestion/jobs/${job.id}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setJobName('');
        setJobDescription('');
        setUploadingFiles([]);

        await fetchJobs();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsCreatingJob(false);
      }
  };
  
  // ==========================================================================
  // Job Actions
  // ==========================================================================
  
  const handleStartJob = async (jobId: string) => {
    try {
      await apiClient.post(`/api/v1/ingestion/jobs/${jobId}/start`);
      connectWebSocket(jobId);
      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };
  
  const handleDeleteJob = async (jobId: string) => {
    if (!confirm(t('deleteConfirmation') || 'Tem certeza que deseja excluir este job?')) return;
    
    try {
      await apiClient.delete(`/api/v1/ingestion/jobs/${jobId}`);
      if (selectedJob?.id === jobId) setSelectedJob(null);
      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };
  
  const handleViewJob = async (job: IngestionJob) => {
    setSelectedJob(job);
    setIsDetailModalOpen(true);
    
    // Fetch sources for this job
    try {
      const data = await apiClient.get(`/api/v1/ingestion/jobs/${job.id}`);
      setJobSources(data.sources || []);
    } catch (err) {
      console.error('Failed to fetch job sources', err);
    }
    
    // Connect WebSocket if job is in progress
    if (['validating', 'processing', 'pii_detection'].includes(job.status)) {
      connectWebSocket(job.id);
    }
  };
  
  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedJob(null);
  };

  const handleJobDeleted = (id: string) => {
    console.log('Job deleted:', id);
    setSelectedJob(null);
  };
  
  // ==========================================================================
  // Render
  // ==========================================================================
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Ingestão de Dados"
        subtitle="Importe dados de múltiplas fontes com detecção automática de PII"
        viewToggle={true}
        viewMode={viewMode}
        onViewChange={setViewMode}
        action={
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Novo Job
          </button>
        }
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
      <ConfigurableStatisticsBar
        module="ingestion"
        data={filteredJobs}
      />

      {/* Advanced Filters */}
      <FilterPanel
        fields={filterFields}
        values={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        defaultExpanded={false}
      />
      
      {/* Jobs Section */}
      {viewMode === 'board' ? (
        <IngestionBoard
          jobs={filteredJobs}
          onItemClick={handleViewJob}
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Jobs de Ingestão
              </h2>
              {/* Refresh button removed (jobs auto-refresh or use listing controls) */}
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                {t('noJobs') || 'Nenhum job de ingestão encontrado'}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {t('createJobPrompt') || 'Crie um novo job para começar'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredJobs.map((job) => {
                  const statusConfig = STATUS_CONFIG[job.status];
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <div
                      key={job.id}
                      onClick={() => handleViewJob(job)}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer ${
                        selectedJob?.id === job.id ? 'bg-primary-50 dark:bg-primary-900/10' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`p-2 rounded-lg bg-${statusConfig.color}-100 dark:bg-${statusConfig.color}-900/30`}>
                            <StatusIcon className={`w-5 h-5 text-${statusConfig.color}-600 dark:text-${statusConfig.color}-400 ${
                              ['validating', 'processing', 'pii_detection'].includes(job.status) ? 'animate-spin' : ''
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                              {job.name}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                              <span>{job.total_files} {t('stats.files') || 'arquivos'}</span>
                              <span>{job.total_records.toLocaleString()} {t('stats.records') || 'registros'}</span>
                              <span>{formatDate(job.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 text-xs rounded-full bg-${statusConfig.color}-100 dark:bg-${statusConfig.color}-900/30 text-${statusConfig.color}-700 dark:text-${statusConfig.color}-300`}>
                            {t(`status.${job.status}`) || job.status}
                          </span>
                          
                          {job.pii_detected_count > 0 && (
                            <span className="px-2.5 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
                              <ShieldExclamationIcon className="w-3 h-3" />
                              {job.pii_detected_count} {t('piiDetected') || 'PII'}
                            </span>
                          )}
                          
                          <div className="flex items-center gap-1 ml-2">
                            {job.status === 'pending' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartJob(job.id);
                                }}
                                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition"
                                title={t('startProcessingTitle') || 'Iniciar processamento'}
                              >
                                <PlayIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      {['validating', 'processing', 'pii_detection'].includes(job.status) && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>{job.current_step || tCommon('processing') || 'Processando...'}</span>
                            <span>{Math.round(job.progress_percentage)}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-600 transition-all duration-500"
                              style={{ width: `${job.progress_percentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Error Message */}
                      {job.error_message && (
                        <div className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                          <ExclamationTriangleIcon className="w-4 h-4" />
                          {job.error_message}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      
      {/* Ingestion Detail Modal */}
      <IngestionDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        job={selectedJob}
        onDelete={handleJobDeleted}
      />
      
      {/* New Job Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Novo Job de Ingestão
                </h3>
                <button
                  onClick={() => {
                    setShowNewModal(false);
                    setJobName('');
                    setJobDescription('');
                    setUploadingFiles([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Job Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome do Job *
                </label>
                <input
                  type="text"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="Ex: Importação de Clientes Q1"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrição (opcional)
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Descreva o conteúdo dos arquivos..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>
              
              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                  isDragging
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                <CloudArrowUpIcon className={`w-12 h-12 mx-auto mb-4 ${
                  isDragging ? 'text-primary-500' : 'text-gray-400'
                }`} />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Arraste arquivos aqui ou
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                >
                  selecione do computador
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".csv,.xlsx,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  CSV, XLSX, JSON (máx. 50MB cada)
                </p>
              </div>
              
              {/* Selected Files */}
              {uploadingFiles.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Arquivos Selecionados ({uploadingFiles.length})
                  </label>
                  {uploadingFiles.map((uf, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                    >
                      <TableCellsIcon className="w-5 h-5 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {uf.file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatBytes(uf.file.size)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-gray-400 hover:text-red-500 transition"
                      >
                        <XCircleIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setJobName('');
                  setJobDescription('');
                  setUploadingFiles([]);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition"
              >
                {tCommon('cancel') || 'Cancelar'}
              </button>
              <button
                onClick={async () => {
                  await handleCreateJob();
                  if (!error) {
                    setShowNewModal(false);
                  }
                }}
                disabled={!jobName || uploadingFiles.length === 0 || isCreatingJob}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreatingJob ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    {t('creating') || 'Criando...'}
                  </>
                ) : (
                  <>
                    <CloudArrowUpIcon className="w-5 h-5" />
                    {t('createJob') || 'Criar Job'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
