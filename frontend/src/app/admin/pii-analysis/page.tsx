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
} from '@heroicons/react/24/outline';
import PageHeader from '@/components/ui/PageHeader';
import { ViewMode } from '@/components/ui/ViewToggle';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import PIIAnalysisBoard from '@/components/pii/PIIAnalysisBoard';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';

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

// =============================================================================
// Mock Data for Testing
// =============================================================================

const MOCK_PII_DETECTIONS: PIIDetection[] = [
  {
    id: 'pii-001',
    source_id: 'doc-123',
    source_type: 'client_document',
    entities: [
      { type: 'cpf', value: '123.456.789-00', start: 45, end: 59, confidence: 0.98, suggested_strategy: 'mask' },
      { type: 'name', value: 'João da Silva', start: 10, end: 23, confidence: 0.95, suggested_strategy: 'pseudonymize' },
      { type: 'email', value: 'joao.silva@email.com', start: 120, end: 140, confidence: 0.99, suggested_strategy: 'mask' },
    ],
    risk_level: 'high',
    anonymization_status: 'pending_review',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'pii-002',
    source_id: 'doc-456',
    source_type: 'proposal_attachment',
    entities: [
      { type: 'cnpj', value: '12.345.678/0001-90', start: 200, end: 218, confidence: 0.97, suggested_strategy: 'mask' },
      { type: 'phone', value: '(11) 98765-4321', start: 340, end: 355, confidence: 0.92, suggested_strategy: 'remove' },
    ],
    risk_level: 'medium',
    anonymization_status: 'pending_review',
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'pii-003',
    source_id: 'doc-789',
    source_type: 'ingestion_file',
    entities: [
      { type: 'credit_card', value: '4111 **** **** 1234', start: 500, end: 519, confidence: 0.99, suggested_strategy: 'remove' },
    ],
    risk_level: 'critical',
    anonymization_status: 'pending_review',
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'pii-004',
    source_id: 'doc-101',
    source_type: 'client_document',
    entities: [
      { type: 'address', value: 'Rua das Flores, 123, São Paulo - SP', start: 80, end: 115, confidence: 0.88, suggested_strategy: 'pseudonymize' },
    ],
    risk_level: 'low',
    anonymization_status: 'approved',
    anonymization_strategy: 'pseudonymize',
    reviewed_by: 'admin@prospecai.com',
    reviewed_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    review_notes: 'Aprovado para pseudonimização - dados de endereço comercial',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'pii-005',
    source_id: 'doc-202',
    source_type: 'proposal_attachment',
    entities: [
      { type: 'rg', value: '12.345.678-9', start: 25, end: 37, confidence: 0.91, suggested_strategy: 'mask' },
      { type: 'date_of_birth', value: '15/03/1985', start: 60, end: 70, confidence: 0.85, suggested_strategy: 'remove' },
    ],
    risk_level: 'high',
    anonymization_status: 'anonymized',
    anonymization_strategy: 'mask',
    reviewed_by: 'lgpd@prospecai.com',
    reviewed_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: 'pii-006',
    source_id: 'doc-303',
    source_type: 'ingestion_file',
    entities: [
      { type: 'ip_address', value: '192.168.1.100', start: 150, end: 163, confidence: 0.94, suggested_strategy: 'hash' },
    ],
    risk_level: 'low',
    anonymization_status: 'rejected',
    reviewed_by: 'admin@prospecai.com',
    reviewed_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    review_notes: 'IP interno - não requer anonimização',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'pii-007',
    source_id: 'doc-404',
    source_type: 'database_export',
    entities: [
      { type: 'cpf', value: '987.654.321-00', start: 15, end: 29, confidence: 0.96, suggested_strategy: 'mask' },
      { type: 'name', value: 'Maria Oliveira Santos', start: 50, end: 71, confidence: 0.97, suggested_strategy: 'pseudonymize' },
      { type: 'phone', value: '(21) 99876-5432', start: 90, end: 105, confidence: 0.94, suggested_strategy: 'remove' },
      { type: 'email', value: 'maria.santos@empresa.com.br', start: 130, end: 157, confidence: 0.99, suggested_strategy: 'mask' },
    ],
    risk_level: 'critical',
    anonymization_status: 'pending_review',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'pii-008',
    source_id: 'doc-505',
    source_type: 'api_response',
    entities: [
      { type: 'bank_account', value: 'Ag: 1234 / CC: 56789-0', start: 200, end: 222, confidence: 0.93, suggested_strategy: 'remove' },
    ],
    risk_level: 'critical',
    anonymization_status: 'anonymized',
    anonymization_strategy: 'remove',
    reviewed_by: 'lgpd@prospecai.com',
    reviewed_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    review_notes: 'Dados bancários removidos completamente por segurança',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
  },
  {
    id: 'pii-009',
    source_id: 'doc-606',
    source_type: 'form_submission',
    entities: [
      { type: 'name', value: 'Carlos Alberto Pereira', start: 5, end: 27, confidence: 0.94, suggested_strategy: 'pseudonymize' },
      { type: 'address', value: 'Av. Brasil, 500, Apto 301, Rio de Janeiro - RJ', start: 45, end: 92, confidence: 0.89, suggested_strategy: 'pseudonymize' },
    ],
    risk_level: 'medium',
    anonymization_status: 'approved',
    anonymization_strategy: 'pseudonymize',
    reviewed_by: 'admin@prospecai.com',
    reviewed_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    review_notes: 'Dados de contato de cliente - pseudonimizar para relatórios',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    id: 'pii-010',
    source_id: 'doc-707',
    source_type: 'client_document',
    entities: [
      { type: 'cnpj', value: '98.765.432/0001-10', start: 100, end: 118, confidence: 0.98, suggested_strategy: 'mask' },
      { type: 'email', value: 'contato@empresa.com.br', start: 150, end: 172, confidence: 0.99, suggested_strategy: 'mask' },
      { type: 'phone', value: '(31) 3456-7890', start: 200, end: 215, confidence: 0.91, suggested_strategy: 'remove' },
    ],
    risk_level: 'medium',
    anonymization_status: 'pending_review',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'pii-011',
    source_id: 'doc-808',
    source_type: 'ingestion_file',
    entities: [
      { type: 'cpf', value: '456.789.123-45', start: 30, end: 44, confidence: 0.97, suggested_strategy: 'mask' },
      { type: 'rg', value: '45.678.901-2', start: 60, end: 72, confidence: 0.88, suggested_strategy: 'mask' },
      { type: 'date_of_birth', value: '22/07/1990', start: 85, end: 95, confidence: 0.92, suggested_strategy: 'remove' },
    ],
    risk_level: 'high',
    anonymization_status: 'anonymization_failed',
    reviewed_by: 'lgpd@prospecai.com',
    reviewed_at: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
    review_notes: 'Falha na anonimização - arquivo corrompido',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'pii-012',
    source_id: 'doc-909',
    source_type: 'database_export',
    entities: [
      { type: 'name', value: 'Ana Paula Costa', start: 10, end: 25, confidence: 0.96, suggested_strategy: 'pseudonymize' },
      { type: 'email', value: 'ana.costa@gmail.com', start: 40, end: 59, confidence: 0.99, suggested_strategy: 'mask' },
    ],
    risk_level: 'medium',
    anonymization_status: 'anonymized',
    anonymization_strategy: 'mask',
    reviewed_by: 'admin@prospecai.com',
    reviewed_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 15).toISOString(),
  },
  {
    id: 'pii-013',
    source_id: 'doc-1010',
    source_type: 'api_response',
    entities: [
      { type: 'ip_address', value: '200.158.10.55', start: 80, end: 93, confidence: 0.95, suggested_strategy: 'hash' },
      { type: 'ip_address', value: '189.40.120.200', start: 120, end: 134, confidence: 0.95, suggested_strategy: 'hash' },
    ],
    risk_level: 'low',
    anonymization_status: 'approved',
    anonymization_strategy: 'hash',
    reviewed_by: 'admin@prospecai.com',
    reviewed_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    review_notes: 'IPs externos - hashear para análise anônima',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: 'pii-014',
    source_id: 'doc-1111',
    source_type: 'form_submission',
    entities: [
      { type: 'credit_card', value: '5500 **** **** 5678', start: 150, end: 169, confidence: 0.99, suggested_strategy: 'remove' },
      { type: 'name', value: 'Roberto Fernandes Lima', start: 20, end: 42, confidence: 0.94, suggested_strategy: 'pseudonymize' },
    ],
    risk_level: 'critical',
    anonymization_status: 'pending_review',
    created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: 'pii-015',
    source_id: 'doc-1212',
    source_type: 'proposal_attachment',
    entities: [
      { type: 'address', value: 'Rua XV de Novembro, 1500, Curitiba - PR, 80020-310', start: 200, end: 250, confidence: 0.87, suggested_strategy: 'pseudonymize' },
      { type: 'phone', value: '(41) 3333-4444', start: 280, end: 295, confidence: 0.93, suggested_strategy: 'remove' },
    ],
    risk_level: 'low',
    anonymization_status: 'rejected',
    reviewed_by: 'lgpd@prospecai.com',
    reviewed_at: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
    review_notes: 'Endereço comercial público - não requer anonimização',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
  },
];

const MOCK_PII_STATISTICS: PIIStatistics = {
  total: 15,
  pending_review: 6,
  approved: 4,
  rejected: 2,
  anonymized: 3,
  by_risk_level: {
    low: 4,
    medium: 4,
    high: 3,
    critical: 4,
  },
  by_type: {
    cpf: 3,
    cnpj: 2,
    email: 4,
    phone: 4,
    name: 5,
    address: 3,
    rg: 2,
    credit_card: 2,
    ip_address: 3,
    date_of_birth: 2,
    bank_account: 1,
  },
};

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
  const [viewMode, setViewMode] = useState<ViewMode>(urlView === 'board' || urlView === 'list' ? urlView : 'list');
  
  // State
  const [detections, setDetections] = useState<PIIDetection[]>([]);
  const [statistics, setStatistics] = useState<PIIStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
    } catch (err) {
      // Use mock data on API failure for testing
      console.warn('Using mock PII detections data for testing:', err);
      let mockData = MOCK_PII_DETECTIONS;
      
      // Apply filters to mock data
      if (filters.status !== 'all') {
        mockData = mockData.filter(d => d.anonymization_status === filters.status);
      }
      if (filters.risk !== 'all') {
        mockData = mockData.filter(d => d.risk_level === filters.risk);
      }
      
      setDetections(mockData);
      setError(null); // Clear error since we're using mock data
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
    } catch (err) {
      // Use mock statistics on API failure for testing
      console.warn('Using mock PII statistics for testing:', err);
      setStatistics(MOCK_PII_STATISTICS);
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
        listLabel="Table View"
        listIcon={<TableCellsIcon className="w-5 h-5" />}
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
        onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({ status: 'all', risk: 'all', search: '' })}
        defaultExpanded={false}
      />
      
      {/* Detections View */}
      {viewMode === 'board' ? (
        isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <PIIAnalysisBoard 
            detections={filteredDetections}
            onItemClick={(detection) => setReviewModal(detection)}
          />
        )
      ) : (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            {/* <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" /> */}
          </div>
        ) : filteredDetections.length === 0 ? (
          <div className="text-center py-12">
            <ShieldExclamationIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              Nenhuma detecção encontrada
            </p>
          </div>
        ) : (
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
              {filteredDetections.map((detection) => {
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
        )}
      </div>
      )}
      
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
                      onClick={() => setSelectedStrategy(strategy.id)}
                      className={`p-3 rounded-lg border-2 text-left transition ${
                        selectedStrategy === strategy.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <p className={`font-medium text-sm ${
                        selectedStrategy === strategy.id
                          ? 'text-primary-700 dark:text-primary-300'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {strategy.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {strategy.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notas de Revisão (opcional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Adicione observações sobre esta revisão..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
            
            {/* Actions */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
              <button
                onClick={() => handleReject(reviewModal)}
                disabled={isProcessing}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
              >
                Rejeitar
              </button>
              <button
                onClick={() => handleApprove(reviewModal)}
                disabled={isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                Aprovar
              </button>
              <button
                onClick={() => handleAnonymize(reviewModal)}
                disabled={isProcessing || reviewModal.anonymization_status !== 'approved'}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    Anonimizar
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
