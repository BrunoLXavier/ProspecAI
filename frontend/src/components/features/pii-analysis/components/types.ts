// PII Analysis shared types, helpers and constants
// Implements RF-01: LGPD Agent with manual approval workflow

// =============================================================================
// Types
// =============================================================================

export interface PIIEntity {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: number;
  suggested_strategy: string;
}

// API response entity format
export interface APIEntity {
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
export interface APIDetection {
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

export interface PIIDetection {
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

export interface PIIStatistics {
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

export interface APIStatistics {
  total_detections: number;
  total_entities: number;
  status_counts: Record<string, number>;
  risk_counts: Record<string, number>;
  pending_review: number;
}

// =============================================================================
// Constants
// =============================================================================

export const RISK_COLORS = {
  low: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
};

export const STATUS_CONFIG = {
  pending_review: { label: 'Pendente', color: 'yellow' },
  approved: { label: 'Aprovado', color: 'blue' },
  rejected: { label: 'Rejeitado', color: 'gray' },
  anonymized: { label: 'Anonimizado', color: 'green' },
  anonymization_failed: { label: 'Falhou', color: 'red' },
};

export const PII_TYPE_LABELS: Record<string, string> = {
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

export const ANONYMIZATION_STRATEGIES = [
  { id: 'mask', label: 'Mascarar', description: 'Substitui por asteriscos (****)' },
  { id: 'pseudonymize', label: 'Pseudonimizar', description: 'Substitui por valor fictício consistente' },
  { id: 'remove', label: 'Remover', description: 'Remove completamente o dado' },
  { id: 'hash', label: 'Hash', description: 'Converte em hash irreversível' },
];

/**
 * Custom calculators for PII statistics
 * These calculate statistics from the detection data
 */
export const PII_CUSTOM_CALCULATORS: Record<string, (data: Record<string, any>[]) => number> = {
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

// =============================================================================
// Data Transformation Functions
// =============================================================================

/**
 * Transforms API response to frontend format
 */
export function transformAPIDetection(apiDetection: APIDetection): PIIDetection {
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
export function transformAPIStatistics(apiStats: APIStatistics): PIIStatistics {
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
// Helper Functions
// =============================================================================

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dateStr));
}
