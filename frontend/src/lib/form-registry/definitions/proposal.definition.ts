/**
 * Proposal Entity Form Definition — RF-08
 * Repositório de Propostas.
 * i18n keys reference the `proposals` namespace in locale files.
 */
import { registerEntity, EntityFormDefinition } from '../types';

export interface ProposalFormData {
  title: string;
  opportunity_id: string;
  funding_source_id: string;
  status: string;
  content: string;
}

export const proposalDefinition: EntityFormDefinition<ProposalFormData> = registerEntity<ProposalFormData>({
  entityKey: 'proposals',
  i18nNamespace: 'proposals',
  resource: 'proposals',
  instituteScoped: false,
  apiEndpoint: '/api/v1/proposals',
  statisticsModule: 'proposals',
  gridCols: 2,

  defaultValues: {
    title: '',
    opportunity_id: '',
    funding_source_id: '',
    status: 'draft',
    content: '',
  },

  tabs: [
    { key: 'basic', nameKey: 'tabs.basic', fields: ['title', 'opportunity_id', 'funding_source_id', 'status'], gridCols: 2 },
    { key: 'content', nameKey: 'tabs.content', fields: ['content'], gridCols: 1 },
  ],

  fields: [
    {
      name: 'title', type: 'text', labelKey: 'titleLabel', placeholderKey: 'titlePlaceholder',
      colSpan: 2,
      rules: [{ type: 'required', messageKey: 'required' }, { type: 'maxLength', value: 500, messageKey: 'maxLength', messageParams: { max: 500 } }],
    },
    {
      name: 'opportunity_id', type: 'combobox', labelKey: 'opportunity', placeholderKey: 'opportunityPlaceholder',
    },
    {
      name: 'funding_source_id', type: 'combobox', labelKey: 'fundingSource', placeholderKey: 'fundingSourcePlaceholder',
    },
    {
      name: 'status', type: 'select', labelKey: 'statusLabel',
      rules: [{ type: 'required', messageKey: 'required' }],
      options: [
        { value: 'draft', labelKey: 'status.draft' },
        { value: 'in_review', labelKey: 'status.in_review' },
        { value: 'submitted', labelKey: 'status.submitted' },
        { value: 'approved', labelKey: 'status.approved' },
        { value: 'rejected', labelKey: 'status.rejected' },
      ],
    },
    {
      name: 'content', type: 'textarea', labelKey: 'contentLabel', placeholderKey: 'contentPlaceholder',
      rows: 12, showCount: true, colSpan: 1,
      rules: [{ type: 'maxLength', value: 50000, messageKey: 'maxLength', messageParams: { max: 50000 } }],
    },
  ],

  filters: [
    { key: 'search', labelKey: 'filters.search', type: 'text', placeholderKey: 'filters.searchPlaceholder' },
    {
      key: 'status', labelKey: 'filters.status', type: 'select',
      options: [
        { value: '', labelKey: 'filters.allStatus' },
        { value: 'draft', labelKey: 'status.draft' },
        { value: 'in_review', labelKey: 'status.in_review' },
        { value: 'submitted', labelKey: 'status.submitted' },
        { value: 'approved', labelKey: 'status.approved' },
        { value: 'rejected', labelKey: 'status.rejected' },
      ],
    },
  ],
});

export default proposalDefinition;
