/**
 * Report Builder API Hooks
 * React Query hooks for the Report Builder API
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import type {
  TableSummary,
  TableSchema,
  RelationshipSchema,
  ReportTemplate,
  ReportInstance,
  QueryConfig,
  PreviewResult,
  OutputFormat,
} from '@/types/features/report-builder';

const REPORTS_BASE = '/api/v1/reports';

// =============================================================================
// SCHEMA QUERIES
// =============================================================================

export function useReportableTables() {
  return useQuery<TableSummary[]>({
    queryKey: ['report-builder', 'tables'],
    queryFn: async () => {
      const data = await apiClient.get(`${REPORTS_BASE}/schema/tables`);
      return Array.isArray(data) ? data : data?.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTableSchema(tableName: string | null) {
  return useQuery<TableSchema>({
    queryKey: ['report-builder', 'schema', tableName],
    queryFn: async () => {
      if (!tableName) throw new Error('No table selected');
      return await apiClient.get(`${REPORTS_BASE}/schema/tables/${tableName}`);
    },
    enabled: !!tableName,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTableJoins(tableName: string | null) {
  return useQuery<RelationshipSchema[]>({
    queryKey: ['report-builder', 'joins', tableName],
    queryFn: async () => {
      if (!tableName) return [];
      const data = await apiClient.get(`${REPORTS_BASE}/schema/tables/${tableName}/joins`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!tableName,
    staleTime: 5 * 60 * 1000,
  });
}

// =============================================================================
// TEMPLATE QUERIES
// =============================================================================

export function useReportTemplates(options?: {
  visibility?: 'private' | 'institute' | 'all_tenants';
  category?: string;
}) {
  return useQuery<ReportTemplate[]>({
    queryKey: ['report-templates', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.visibility) params.append('visibility', options.visibility);
      if (options?.category) params.append('category', options.category);
      
      const url = params.toString() 
        ? `${REPORTS_BASE}/templates?${params}` 
        : `${REPORTS_BASE}/templates`;
      
      const data = await apiClient.get(url);
      return Array.isArray(data) ? data : data?.data || [];
    },
  });
}

export function useReportTemplate(templateId: string | null) {
  return useQuery<ReportTemplate>({
    queryKey: ['report-template', templateId],
    queryFn: async () => {
      if (!templateId) throw new Error('No template ID');
      return await apiClient.get(`${REPORTS_BASE}/templates/${templateId}`);
    },
    enabled: !!templateId,
  });
}

// =============================================================================
// TEMPLATE MUTATIONS
// =============================================================================

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<ReportTemplate>) => {
      return await apiClient.post(`${REPORTS_BASE}/templates`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ReportTemplate> & { id: string }) => {
      return await apiClient.put(`${REPORTS_BASE}/templates/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      queryClient.invalidateQueries({ queryKey: ['report-template', variables.id] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (templateId: string) => {
      await apiClient.delete(`${REPORTS_BASE}/templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
    },
  });
}

// =============================================================================
// PREVIEW & GENERATION
// =============================================================================

export function usePreviewQuery() {
  return useMutation<PreviewResult, Error, { query_config: QueryConfig; limit?: number }>({
    mutationFn: async (data) => {
      return await apiClient.post(`${REPORTS_BASE}/preview`, data);
    },
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  
  return useMutation<Blob | object, Error, {
    templateId: string;
    format: OutputFormat;
    parameters?: Record<string, unknown>;
  }>({
    mutationFn: async ({ templateId, format, parameters }) => {
      const response = await apiClient.post(
        `${REPORTS_BASE}/generate/${format}`,
        { template_id: templateId, format, parameters },
        { responseType: format === 'json' ? 'json' : 'blob' }
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-instances'] });
    },
  });
}

// =============================================================================
// REPORT INSTANCES
// =============================================================================

export function useReportInstances(options?: {
  templateId?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}) {
  return useQuery<ReportInstance[]>({
    queryKey: ['report-instances', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.templateId) params.append('template_id', options.templateId);
      if (options?.status) params.append('status', options.status);
      
      const url = params.toString() 
        ? `${REPORTS_BASE}?${params}` 
        : REPORTS_BASE;
      
      const data = await apiClient.get(url);
      return Array.isArray(data) ? data : data?.data || [];
    },
  });
}

export function useDeleteReportInstance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (instanceId: string) => {
      await apiClient.delete(`${REPORTS_BASE}/${instanceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-instances'] });
    },
  });
}

// =============================================================================
// DOWNLOAD HELPER
// =============================================================================

export function downloadReport(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function getReportFilename(templateName: string, format: OutputFormat): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  const safeName = templateName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return `${safeName}_${timestamp}.${format}`;
}
