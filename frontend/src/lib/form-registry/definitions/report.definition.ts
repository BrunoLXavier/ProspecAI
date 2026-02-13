/**
 * Report Entity Form Definition — RF-09
 * Single source of truth for report template form fields, validation,
 * tabs, filters, and statistics mapping.
 *
 * i18n keys reference the `reports` namespace in locale files.
 * Field names match backend snake_case (API interceptors handle conversion).
 */
import { registerEntity, EntityFormDefinition } from '../types';

export interface ReportFormData {
  name: string;
  description: string;
  type: string;
  output_formats: string[];
  parameters: string[];
  is_active: boolean;
}

export const reportDefinition: EntityFormDefinition<ReportFormData> = registerEntity<ReportFormData>({
  entityKey: 'reports',
  i18nNamespace: 'reports',
  resource: 'reports',
  instituteScoped: false,
  apiEndpoint: '/api/v1/reports/templates',
  statisticsModule: 'reports',
  gridCols: 1,

  defaultValues: {
    name: '',
    description: '',
    type: '',
    output_formats: [],
    parameters: [],
    is_active: true,
  },

  tabs: [
    {
      key: 'basic',
      nameKey: 'tabs.basic',
      fields: ['name', 'description', 'type', 'is_active'],
      gridCols: 1,
    },
    {
      key: 'formats',
      nameKey: 'tabs.formats',
      fields: ['output_formats'],
      gridCols: 1,
    },
    {
      key: 'parameters',
      nameKey: 'tabs.parameters',
      fields: ['parameters'],
      gridCols: 1,
    },
  ],

  fields: [
    {
      name: 'name',
      type: 'text',
      labelKey: 'templateName',
      placeholderKey: 'namePlaceholder',
      colSpan: 2,
      rules: [
        { type: 'required', messageKey: 'required' },
        { type: 'maxLength', value: 500, messageKey: 'maxLength', messageParams: { max: 500 } },
      ],
    },
    {
      name: 'description',
      type: 'textarea',
      labelKey: 'description',
      placeholderKey: 'descriptionPlaceholder',
      rows: 4,
      showCount: true,
      colSpan: 2,
      rules: [{ type: 'maxLength', value: 2000, messageKey: 'maxLength', messageParams: { max: 2000 } }],
    },
    {
      name: 'type',
      type: 'select',
      labelKey: 'type',
      rules: [{ type: 'required', messageKey: 'required' }],
      options: [
        { value: 'proposal_summary', labelKey: 'types.proposalSummary' },
        { value: 'matching_analysis', labelKey: 'types.matchingAnalysis' },
        { value: 'portfolio_overview', labelKey: 'types.portfolioOverview' },
        { value: 'pipeline_status', labelKey: 'types.pipelineStatus' },
        { value: 'funding_opportunities', labelKey: 'types.fundingOpportunities' },
        { value: 'custom', labelKey: 'types.custom' },
      ],
    },
    {
      name: 'is_active',
      type: 'switch',
      labelKey: 'statusLabel',
    },
    {
      name: 'output_formats',
      type: 'tags',
      labelKey: 'outputFormats',
      placeholderKey: 'outputFormatsPlaceholder',
      helperTextKey: 'outputFormatsHelp',
      colSpan: 2,
      maxTags: 5,
      tagVariant: 'primary',
    },
    {
      name: 'parameters',
      type: 'tags',
      labelKey: 'parameters',
      placeholderKey: 'paramPlaceholder',
      helperTextKey: 'parametersHelp',
      colSpan: 2,
      maxTags: 20,
      tagVariant: 'info',
    },
  ],

  filters: [
    { key: 'search', labelKey: 'filters.search', type: 'text', placeholderKey: 'filters.searchPlaceholder' },
  ],
});
