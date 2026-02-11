// PII Analysis Filter Fields Hook
// Implements RF-01: LGPD Agent with manual approval workflow

import { FilterField } from '@/components/features/shared/ui/FilterPanel';

export function usePIIFilterFields(): FilterField[] {
  return [
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
}
