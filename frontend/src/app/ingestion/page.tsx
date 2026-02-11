// Data Ingestion Dashboard
// Upload and manage bulk data imports with PII detection
// Implements RF-01: Ingestão de dados multiorigem
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import {
  XCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import FilterPanel from '@/components/features/shared/ui/FilterPanel';
import PageHeader from '@/components/features/shared/ui/PageHeader';
import { ViewMode } from '@/components/features/shared/ui/ViewToggle';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import Pagination, { usePagination } from '@/components/features/shared/ui/Pagination';
import { getStoredAccessToken } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import {
  IngestionJob,
  IngestionSource,
  UploadingFile,
} from '@/components/features/ingestion/components/types';
import IngestionBoard from '@/components/features/ingestion/components/IngestionBoard';
import IngestionModal from '@/components/features/ingestion/components/IngestionModal';
import IngestionJobListView from '@/components/features/ingestion/components/IngestionJobListView';
import IngestionTimelineView from '@/components/features/ingestion/components/IngestionTimelineView';
import IngestionTableView from '@/components/features/ingestion/components/IngestionTableView';
import NewJobModal from '@/components/features/ingestion/components/NewJobModal';
import { useIngestionTableColumns } from '@/components/features/ingestion/components/useIngestionTableColumns';
import { useIngestionTimelineItems } from '@/components/features/ingestion/components/useIngestionTimelineItems';
import { useIngestionFilterFields } from '@/components/features/ingestion/components/useIngestionFilterFields';

// =============================================================================
// Component
// =============================================================================

export default function IngestionPage() {
  const t = useTranslations('ingestion');
  const searchParams = useSearchParams();
  const urlView = searchParams.get('view') as ViewMode | null;
  const [viewMode, setViewMode] = useState<ViewMode>(
    urlView === 'board' || urlView === 'list' || urlView === 'timeline' || urlView === 'table'
      ? urlView
      : 'list'
  );
  
  // State
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<IngestionJob | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [jobSources, setJobSources] = useState<IngestionSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const { initialPage, initialPageSize } = usePagination(20, true);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  
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
  
  // Filter fields configuration (extracted to hook)
  const filterFields = useIngestionFilterFields();

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      source_type: 'all',
      dateFrom: '',
      dateTo: '',
    });
    setCurrentPage(1);
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
  
  // Paginated jobs
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [filteredJobs, currentPage, pageSize]);

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

  // Data Loading
  
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

  // View data hooks (must be after handleViewJob is defined)
  const timelineItems = useIngestionTimelineItems(paginatedJobs, handleViewJob);
  const tableColumns = useIngestionTableColumns();
  
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
      {viewMode === 'board' && (
        <IngestionBoard
          jobs={filteredJobs}
          onItemClick={handleViewJob}
        />
      )}

      {viewMode === 'timeline' && (
        <IngestionTimelineView
          items={timelineItems}
          isLoading={isLoading}
        />
      )}

      {viewMode === 'table' && (
        <IngestionTableView
          jobs={paginatedJobs}
          columns={tableColumns}
          isLoading={isLoading}
          onRowClick={handleViewJob}
        />
      )}

      {viewMode === 'list' && (
        <IngestionJobListView
          jobs={filteredJobs}
          paginatedJobs={paginatedJobs}
          isLoading={isLoading}
          selectedJobId={selectedJob?.id || null}
          onViewJob={handleViewJob}
          onStartJob={handleStartJob}
        />
      )}
      
      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={filteredJobs.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        persistInUrl={true}
      />
      
      {/* Ingestion Modal */}
      <IngestionModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        job={selectedJob}
        onDelete={handleJobDeleted}
      />
      
      {/* New Job Modal */}
      {showNewModal && (
        <NewJobModal
          jobName={jobName}
          onJobNameChange={setJobName}
          jobDescription={jobDescription}
          onJobDescriptionChange={setJobDescription}
          uploadingFiles={uploadingFiles}
          isDragging={isDragging}
          isCreatingJob={isCreatingJob}
          error={error}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileSelect={handleFileSelect}
          onRemoveFile={removeFile}
          onCreateJob={async () => {
            await handleCreateJob();
            if (!error) {
              setShowNewModal(false);
            }
          }}
          onClose={() => {
            setShowNewModal(false);
            setJobName('');
            setJobDescription('');
            setUploadingFiles([]);
          }}
        />
      )}
    </div>
  );
}
