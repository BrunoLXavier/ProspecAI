/**
 * Opportunity Entity Form Definition — RF-05
 * Pipeline de Oportunidades with priority scoring.
 * i18n keys reference the `opportunities` namespace in locale files.
 */
import { registerEntity, EntityFormDefinition } from '../types';

export interface OpportunityFormData {
  title: string;
  description: string;
  client_id: string;
  funding_source_id: string;
  stage: string;
  status: string;
  estimated_value: number;
  expected_close_date: string;
  probability: number;
  urgency: number;
  financial_impact: number;
  strategic_fit: number;
}

export const opportunityDefinition: EntityFormDefinition<OpportunityFormData> = registerEntity<OpportunityFormData>({
  entityKey: 'opportunities',
  i18nNamespace: 'opportunities',
  resource: 'opportunities',
  instituteScoped: false,
  apiEndpoint: '/api/v1/opportunities',
  statisticsModule: 'opportunities',
  gridCols: 1,

  defaultValues: {
    title: '',
    description: '',
    client_id: '',
    funding_source_id: '',
    stage: 'intelligence',
    status: 'active',
    estimated_value: 0,
    expected_close_date: '',
    probability: 50,
    urgency: 3,
    financial_impact: 3,
    strategic_fit: 3,
  },

  tabs: [
    { key: 'basic', nameKey: 'tabs.basic', fields: ['title', 'description', 'client_id', 'funding_source_id', 'stage', 'status'], gridCols: 1 },
    { key: 'values', nameKey: 'tabs.values', fields: ['estimated_value', 'expected_close_date', 'probability'], gridCols: 1 },
    { key: 'priority', nameKey: 'tabs.priority', fields: ['urgency', 'financial_impact', 'strategic_fit'], gridCols: 1 },
  ],

  fields: [
    {
      name: 'title', type: 'text', labelKey: 'opportunity', placeholderKey: 'titlePlaceholder',
      colSpan: 2,
      rules: [{ type: 'required', messageKey: 'required' }, { type: 'maxLength', value: 500, messageKey: 'maxLength', messageParams: { max: 500 } }],
    },
    {
      name: 'description', type: 'textarea', labelKey: 'descriptionLabel', placeholderKey: 'descriptionPlaceholder',
      rows: 4, colSpan: 2,
    },
    {
      name: 'client_id', type: 'combobox', labelKey: 'client', placeholderKey: 'clientPlaceholder',
    },
    {
      name: 'funding_source_id', type: 'combobox', labelKey: 'fundingSource', placeholderKey: 'fundingSourcePlaceholder',
    },
    {
      name: 'stage', type: 'select', labelKey: 'stage',
      rules: [{ type: 'required', messageKey: 'required' }],
      options: [
        { value: 'intelligence', labelKey: 'stages.intelligence' },
        { value: 'approach', labelKey: 'stages.approach' },
        { value: 'proposal', labelKey: 'stages.proposal' },
        { value: 'negotiation', labelKey: 'stages.negotiation' },
        { value: 'won', labelKey: 'stages.won' },
        { value: 'lost', labelKey: 'stages.lost' },
      ],
    },
    {
      name: 'status', type: 'select', labelKey: 'status',
      options: [
        { value: 'active', labelKey: 'statuses.active' },
        { value: 'pending', labelKey: 'statuses.pending' },
        { value: 'completed', labelKey: 'statuses.completed' },
      ],
    },
    {
      name: 'estimated_value', type: 'currency', labelKey: 'estimatedValue',
      rules: [{ type: 'min', value: 0, messageKey: 'min', messageParams: { min: 0 } }],
    },
    {
      name: 'expected_close_date', type: 'date', labelKey: 'expectedCloseDate',
    },
    {
      name: 'probability', type: 'slider', labelKey: 'probability',
      min: 0, max: 100, step: 5, formatValue: (v: number) => `${v}%`, colorVariant: 'primary',
    },
    {
      name: 'urgency', type: 'slider', labelKey: 'urgencyLabel',
      min: 1, max: 5, step: 1, colorVariant: 'warning',
    },
    {
      name: 'financial_impact', type: 'slider', labelKey: 'financialImpactLabel',
      min: 1, max: 5, step: 1, colorVariant: 'success',
    },
    {
      name: 'strategic_fit', type: 'slider', labelKey: 'strategicFitLabel',
      min: 1, max: 5, step: 1, colorVariant: 'info',
    },
  ],

  filters: [
    { key: 'search', labelKey: 'searchPlaceholder', type: 'text', placeholderKey: 'searchPlaceholder' },
    {
      key: 'stage', labelKey: 'stage', type: 'select',
      options: [
        { value: '', labelKey: 'filters.allStages' },
        { value: 'intelligence', labelKey: 'stages.intelligence' },
        { value: 'approach', labelKey: 'stages.approach' },
        { value: 'proposal', labelKey: 'stages.proposal' },
        { value: 'negotiation', labelKey: 'stages.negotiation' },
        { value: 'won', labelKey: 'stages.won' },
        { value: 'lost', labelKey: 'stages.lost' },
      ],
    },
    {
      key: 'status', labelKey: 'status', type: 'select',
      options: [
        { value: '', labelKey: 'filters.allStatuses' },
        { value: 'active', labelKey: 'statuses.active' },
        { value: 'pending', labelKey: 'statuses.pending' },
        { value: 'completed', labelKey: 'statuses.completed' },
      ],
    },
  ],
});

export default opportunityDefinition;
