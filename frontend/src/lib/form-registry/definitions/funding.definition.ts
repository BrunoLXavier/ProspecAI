/**
 * Funding Entity Form Definition — RF-02
 * Single source of truth for funding source form fields, validation,
 * tabs, filters, and statistics mapping.
 *
 * i18n keys reference the `funding` namespace in locale files.
 * Field names match backend snake_case (API interceptors handle conversion).
 */
import { registerEntity, EntityFormDefinition } from '../types';

export interface FundingFormData {
  source_name: string;
  category: string;
  status: string;
  deadline: string;
  total_amount: number;
  description: string;
  url: string;
  trl_min: number;
  trl_max: number;
  focus_areas: string[];
}

export const fundingDefinition: EntityFormDefinition<FundingFormData> = registerEntity<FundingFormData>({
  entityKey: 'funding',
  i18nNamespace: 'funding',
  resource: 'funding',
  instituteScoped: false,
  apiEndpoint: '/api/v1/funding',
  statisticsModule: 'funding',
  gridCols: 1,

  defaultValues: {
    source_name: '',
    category: 'NATIONAL',
    status: 'DRAFT',
    deadline: '',
    total_amount: 0,
    description: '',
    url: '',
    trl_min: 1,
    trl_max: 9,
    focus_areas: [],
  },

  tabs: [
    {
      key: 'basic',
      nameKey: 'tabBasic',
      fields: ['source_name', 'category', 'status', 'deadline', 'total_amount'],
      gridCols: 1,
    },
    {
      key: 'technical',
      nameKey: 'tabTRL',
      fields: ['trl_min', 'trl_max', 'focus_areas'],
      gridCols: 1,
    },
    {
      key: 'details',
      nameKey: 'tabDetails',
      fields: ['description', 'url'],
      gridCols: 1,
    },
  ],

  fields: [
    {
      name: 'source_name',
      type: 'text',
      labelKey: 'sourceName',
      placeholderKey: 'sourcePlaceholder',
      colSpan: 2,
      rules: [
        { type: 'required', messageKey: 'required' },
        { type: 'maxLength', value: 500, messageKey: 'maxLength', messageParams: { max: 500 } },
      ],
    },
    {
      name: 'category',
      type: 'select',
      labelKey: 'category',
      rules: [{ type: 'required', messageKey: 'required' }],
      options: [
        { value: 'NATIONAL', labelKey: 'options.category.national' },
        { value: 'REGIONAL', labelKey: 'options.category.regional' },
        { value: 'INTERNATIONAL', labelKey: 'options.category.international' },
        { value: 'PRIVATE', labelKey: 'options.category.private' },
        { value: 'CORPORATE', labelKey: 'options.category.corporate' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      labelKey: 'statusLabel',
      rules: [{ type: 'required', messageKey: 'required' }],
      options: [
        { value: 'DRAFT', labelKey: 'options.status.draft', color: 'gray' },
        { value: 'OPEN', labelKey: 'options.status.open', color: 'green' },
        { value: 'CLOSED', labelKey: 'options.status.closed', color: 'red' },
        { value: 'SUSPENDED', labelKey: 'options.status.suspended', color: 'yellow' },
      ],
    },
    {
      name: 'deadline',
      type: 'date',
      labelKey: 'deadline',
      rules: [{ type: 'required', messageKey: 'required' }],
    },
    {
      name: 'total_amount',
      type: 'currency',
      labelKey: 'totalAmount',
      rules: [
        { type: 'required', messageKey: 'required' },
        { type: 'min', value: 0, messageKey: 'min', messageParams: { min: 0 } },
      ],
    },
    {
      name: 'trl_min',
      type: 'slider',
      labelKey: 'trlMin',
      min: 1,
      max: 9,
      step: 1,
      formatValue: (v: number) => `TRL ${v}`,
      colorVariant: 'primary',
    },
    {
      name: 'trl_max',
      type: 'slider',
      labelKey: 'trlMax',
      min: 1,
      max: 9,
      step: 1,
      formatValue: (v: number) => `TRL ${v}`,
      colorVariant: 'success',
    },
    {
      name: 'focus_areas',
      type: 'tags',
      labelKey: 'focusAreas',
      placeholderKey: 'focusAreasPlaceholder',
      colSpan: 2,
      maxTags: 10,
      tagVariant: 'primary',
    },
    {
      name: 'description',
      type: 'textarea',
      labelKey: 'description',
      placeholderKey: 'descriptionPlaceholder',
      colSpan: 1,
      rows: 6,
      showCount: true,
      rules: [
        { type: 'maxLength', value: 5000, messageKey: 'maxLength', messageParams: { max: 5000 } },
      ],
    },
    {
      name: 'url',
      type: 'url',
      labelKey: 'url',
      placeholderKey: 'sourcePlaceholder',
      colSpan: 1,
      rules: [{ type: 'url', messageKey: 'url' }],
    },
  ],

  filters: [
    {
      key: 'search',
      labelKey: 'searchPlaceholder',
      type: 'text',
      placeholderKey: 'searchPlaceholder',
    },
    {
      key: 'status',
      labelKey: 'statusLabel',
      type: 'select',
      options: [
        { value: '', labelKey: 'filters.allStatus' },
        { value: 'OPEN', labelKey: 'status.open' },
        { value: 'CLOSED', labelKey: 'status.closed' },
        { value: 'SUSPENDED', labelKey: 'status.suspended' },
      ],
    },
    {
      key: 'category',
      labelKey: 'category',
      type: 'select',
      options: [
        { value: '', labelKey: 'filters.allTypes' },
        { value: 'NATIONAL', labelKey: 'options.category.national' },
        { value: 'REGIONAL', labelKey: 'options.category.regional' },
        { value: 'INTERNATIONAL', labelKey: 'options.category.international' },
        { value: 'PRIVATE', labelKey: 'options.category.private' },
        { value: 'CORPORATE', labelKey: 'options.category.corporate' },
      ],
    },
  ],
});

export default fundingDefinition;
