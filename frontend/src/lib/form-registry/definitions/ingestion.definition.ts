/**
 * Ingestion Entity Form Definition — RF-01
 * Single source of truth for ingestion job form fields, validation,
 * tabs, filters, and statistics mapping.
 *
 * i18n keys reference the `ingestion` namespace in locale files.
 * Field names match backend snake_case (API interceptors handle conversion).
 */
import { registerEntity, EntityFormDefinition } from '../types';

export interface IngestionFormData {
  name: string;
  description: string;
  source_type: string;
}

export const ingestionDefinition: EntityFormDefinition<IngestionFormData> = registerEntity<IngestionFormData>({
  entityKey: 'ingestion',
  i18nNamespace: 'ingestion',
  resource: 'ingestion',
  instituteScoped: false,
  apiEndpoint: '/api/v1/ingestion/jobs',
  statisticsModule: 'ingestion',
  gridCols: 1,

  defaultValues: {
    name: '',
    description: '',
    source_type: 'csv',
  },

  tabs: [
    {
      key: 'basic',
      nameKey: 'jobName',
      fields: ['name', 'description', 'source_type'],
      gridCols: 1,
    },
  ],

  fields: [
    {
      name: 'name',
      type: 'text',
      labelKey: 'jobName',
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
      rows: 4,
      showCount: true,
      colSpan: 2,
      rules: [{ type: 'maxLength', value: 2000, messageKey: 'maxLength', messageParams: { max: 2000 } }],
    },
    {
      name: 'source_type',
      type: 'select',
      labelKey: 'sourceType',
      rules: [{ type: 'required', messageKey: 'required' }],
      options: [
        { value: 'csv', labelKey: 'sourceTypes.csv' },
        { value: 'json', labelKey: 'sourceTypes.json' },
        { value: 'xlsx', labelKey: 'sourceTypes.xlsx' },
        { value: 'xml', labelKey: 'sourceTypes.xml' },
        { value: 'file', labelKey: 'sourceTypes.file' },
      ],
    },
  ],

  filters: [
    { key: 'search', labelKey: 'searchPlaceholder', type: 'text', placeholderKey: 'searchPlaceholder' },
    {
      key: 'status', labelKey: 'status', type: 'select',
      options: [
        { value: '', labelKey: 'status' },
        { value: 'pending', labelKey: 'statuses.pending' },
        { value: 'processing', labelKey: 'statuses.processing' },
        { value: 'completed', labelKey: 'statuses.completed' },
        { value: 'failed', labelKey: 'statuses.failed' },
      ],
    },
  ],
});
