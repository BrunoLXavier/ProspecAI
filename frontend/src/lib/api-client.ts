/**
 * API Client for ProspecAI Backend
 * Centralized HTTP client with JWT authentication
 * Integrates with AuthContext for token management
 */
import axios, { AxiosInstance } from 'axios';
import { getStoredAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BYPASS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

if (typeof window !== 'undefined') {
  // Log the effective base URL so we can confirm requests bypass the Next proxy when needed
  // (set NEXT_PUBLIC_API_BYPASS_URL in your dev env to force direct backend calls)
  // This log is intentional for debugging and can be removed later.
  // eslint-disable-next-line no-console
  console.info('[ApiClient] Effective baseURL:', API_BASE_URL);
}

// Token refresh function reference (set by AuthContext)
let refreshTokenFn: (() => Promise<string | null>) | null = null;

export function setTokenRefreshFunction(fn: () => Promise<string | null>) {
  refreshTokenFn = fn;
}

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // Request interceptor for adding auth token
    this.client.interceptors.request.use(
          async (config) => {
            // Prefer in-memory token set by AuthContext to avoid storage race conditions
            let token: string | null = null;
            try {
              if (typeof window !== 'undefined' && (window as any).__PROSPECAI_ACCESS_TOKEN) {
                token = (window as any).__PROSPECAI_ACCESS_TOKEN as string;
              }
            } catch (e) {
              // ignore
            }
            if (!token) token = getStoredAccessToken();
            if (token && config && config.headers) {
              config.headers.Authorization = `Bearer ${token}`;
            }
            // Temporary logging to verify outgoing headers (client-side)
            try {
              const authHeader = config?.headers?.Authorization ?? null;
              const tenantHeader = config?.headers?.['X-Tenant-ID'] ?? null;
              // Use console.* so this appears in browser console during client requests
              console.info('[ApiClient] Outgoing headers', { url: config?.url, Authorization: authHeader, 'X-Tenant-ID': tenantHeader });
            } catch (e) {
              // ignore logging failures
            }
        // Inject tenant header if available
        try {
          const user = require('@/contexts/AuthContext').getStoredUser();
          if (user && user.tenantId) {
            config.headers['X-Tenant-ID'] = user.tenantId;
          }
        } catch (e) {
          // fail silently
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor with token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Queue the request while refreshing
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = refreshTokenFn ? await refreshTokenFn() : null;
            
            if (newToken) {
              // Retry queued requests
              this.failedQueue.forEach(({ resolve }) => resolve(newToken));
              this.failedQueue = [];
              
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            this.failedQueue.forEach(({ reject }) => reject(refreshError));
            this.failedQueue = [];
          } finally {
            this.isRefreshing = false;
          }

          // Redirect to login if refresh failed
          if (typeof window !== 'undefined') {
            // Avoid forcing a navigation to /login if we're already on a login route
            if (!window.location.pathname.endsWith('/login')) {
              console.debug('[ApiClient] Redirecting to /login via replace');
              window.location.replace('/login');
            } else {
              console.debug('[ApiClient] Already on login page; not redirecting');
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic HTTP methods for flexible API calls
  async get<T = any>(url: string, params?: Record<string, any>): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string): Promise<T> {
    const response = await this.client.delete(url);
    return response.data;
  }

  // Funding Sources API
  async listFundingSources(params?: {
    status?: string;
    instrument_type?: string;
    skip?: number;
    limit?: number;
  }) {
    const response = await this.client.get('/api/v1/funding', { params });
    return response.data;
  }

  async getFundingSource(id: string) {
    const response = await this.client.get(`/api/v1/funding/${id}`);
    return response.data;
  }

  async createFundingSource(data: any) {
    const response = await this.client.post('/api/v1/funding', data);
    return response.data;
  }

  async updateFundingSource(id: string, data: any) {
    const response = await this.client.patch(`/api/v1/funding/${id}`, data);
    return response.data;
  }

  async deleteFundingSource(id: string) {
    await this.client.delete(`/api/v1/funding/${id}`);
  }

  // Portfolio API
  async listProjects(params?: {
    status?: string;
    research_area?: string;
    trl_min?: number;
    trl_max?: number;
    skip?: number;
    limit?: number;
  }) {
    const response = await this.client.get('/api/v1/portfolio/projects', { params });
    return response.data;
  }

  async getProject(id: string) {
    const response = await this.client.get(`/api/v1/portfolio/projects/${id}`);
    return response.data;
  }

  async createProject(data: any) {
    const response = await this.client.post('/api/v1/portfolio/projects', data);
    return response.data;
  }

  async updateProject(id: string, data: any) {
    const response = await this.client.patch(`/api/v1/portfolio/projects/${id}`, data);
    return response.data;
  }

  async advanceTRL(id: string, data: { new_trl: number; evidence: string; date_achieved: string }) {
    const response = await this.client.post(`/api/v1/portfolio/projects/${id}/trl-advancement`, data);
    return response.data;
  }

  async getPortfolioStats() {
    const response = await this.client.get('/api/v1/portfolio/stats');
    return response.data;
  }

  // CRM API
  async listClients(params?: {
    segment?: string;
    maturity_level?: string;
    search?: string;
    skip?: number;
    limit?: number;
  }) {
    const response = await this.client.get('/api/v1/crm/clients', { params });
    return response.data;
  }

  async getClient(id: string) {
    const response = await this.client.get(`/api/v1/crm/clients/${id}`);
    return response.data;
  }

  async createClient(data: any, enrichFromCNPJ: boolean = true) {
    const response = await this.client.post('/api/v1/crm/clients', data, {
      params: { enrich_from_cnpj: enrichFromCNPJ },
    });
    return response.data;
  }

  async enrichCNPJ(cnpj: string) {
    const response = await this.client.post(`/api/v1/crm/enrich-cnpj/${cnpj}`);
    return response.data;
  }

  async createInteraction(clientId: string, data: any, detectDemands: boolean = true) {
    const response = await this.client.post(
      `/api/v1/crm/clients/${clientId}/interactions`,
      data,
      { params: { detect_demands: detectDemands } }
    );
    return response.data;
  }

  async listInteractions(clientId: string, params?: { skip?: number; limit?: number }) {
    const response = await this.client.get(`/api/v1/crm/clients/${clientId}/interactions`, { params });
    return response.data;
  }

  // Opportunities API
  async listOpportunities(params?: {
    stage?: string;
    client_id?: string;
    min_value?: number;
    skip?: number;
    limit?: number;
  }) {
    const response = await this.client.get('/api/v1/opportunities', { params });
    return response.data;
  }

  async getOpportunity(id: string) {
    const response = await this.client.get(`/api/v1/opportunities/${id}`);
    return response.data;
  }

  async createOpportunity(data: any, calculatePriority: boolean = true) {
    const response = await this.client.post('/api/v1/opportunities', data, {
      params: { calculate_priority: calculatePriority },
    });
    return response.data;
  }

  async transitionStage(id: string, data: { new_stage: string; notes?: string }) {
    const response = await this.client.post(`/api/v1/opportunities/${id}/transition`, data);
    return response.data;
  }

  async getPipelineStats() {
    const response = await this.client.get('/api/v1/opportunities/stats/pipeline');
    return response.data;
  }

  // Matching API
  async executeMatching(data: {
    project_id?: string;
    funding_source_id?: string;
    min_score?: number;
    max_results?: number;
  }) {
    const response = await this.client.post('/api/v1/matching/execute', data);
    return response.data;
  }

  async getMatchingScore(projectId: string, fundingId: string) {
    const response = await this.client.get(`/api/v1/matching/scores/${projectId}/${fundingId}`);
    return response.data;
  }

  async explainMatching(projectId: string, fundingId: string) {
    const response = await this.client.get(`/api/v1/matching/explain/${projectId}/${fundingId}`);
    return response.data;
  }

  // Proposals API
  async listProposals(params?: {
    status?: string;
    funding_source_id?: string;
    project_id?: string;
    skip?: number;
    limit?: number;
  }) {
    const response = await this.client.get('/api/v1/proposals', { params });
    return response.data;
  }

  async getProposal(id: string) {
    const response = await this.client.get(`/api/v1/proposals/${id}`);
    return response.data;
  }

  async createProposal(data: any, analyzeAdherence: boolean = true) {
    const response = await this.client.post('/api/v1/proposals', data, {
      params: { analyze_adherence: analyzeAdherence },
    });
    return response.data;
  }

  async analyzeAdherence(id: string) {
    const response = await this.client.get(`/api/v1/proposals/${id}/adherence`);
    return response.data;
  }

  async submitProposal(id: string) {
    const response = await this.client.post(`/api/v1/proposals/${id}/submit`);
    return response.data;
  }
}

export const apiClient = new ApiClient();
export { ApiClient };
export default apiClient;
