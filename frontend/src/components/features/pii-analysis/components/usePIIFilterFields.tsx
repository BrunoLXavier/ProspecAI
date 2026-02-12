// PII Analysis Filter Fields Hook
// Implements RF-01: LGPD Agent with manual approval workflow

import { useTranslations } from 'next-intl';
import { FilterField } from '@/components/features/shared/ui/FilterPanel';

export function usePIIFilterFields(): FilterField[] {
  const t = useTranslations('pii');
  return [
    { key: 'search', label: t('search'), type: 'text', placeholder: t('searchPlaceholder') },
    { key: 'status', label: t('status'), type: 'select', options: [
      { value: 'all', label: t('allStatuses') },
      { value: 'pending_review', label: t('pending') },
      { value: 'approved', label: t('approved') },
      { value: 'anonymized', label: t('anonymized') },
      { value: 'rejected', label: t('rejected') },
    ] },
    { key: 'risk', label: t('risk'), type: 'select', options: [
      { value: 'all', label: t('allRisks') },
      { value: 'critical', label: t('critical') },
      { value: 'high', label: t('high') },
      { value: 'medium', label: t('medium') },
      { value: 'low', label: t('low') },
    ] },
  ];
}
