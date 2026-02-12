/**
 * Communication Entity Form Definition — RF-08
 * Single source of truth for communication thread form fields, validation,
 * tabs, filters, and statistics mapping.
 *
 * i18n keys reference the `communications` namespace in locale files.
 * Field names match backend snake_case (API interceptors handle conversion).
 */
import { registerEntity, EntityFormDefinition } from '../types';

export interface CommunicationFormData {
  subject: string;
  body: string;
  linked_entity_type: string;
  linked_entity_id: string;
  status: string;
}

export const communicationDefinition: EntityFormDefinition<CommunicationFormData> = registerEntity<CommunicationFormData>({
  entityKey: 'communications',
  i18nNamespace: 'communications',
  resource: 'communications',
  instituteScoped: false,
  apiEndpoint: '/api/v1/communications/threads',
  statisticsModule: 'communications',
  gridCols: 2,

  defaultValues: {
    subject: '',
    body: '',
    linked_entity_type: '',
    linked_entity_id: '',
    status: 'active',
  },

  tabs: [
    {
      key: 'basic',
      nameKey: 'columns.subject',
      fields: ['subject', 'body', 'status'],
      gridCols: 1,
    },
    {
      key: 'link',
      nameKey: 'linkedEntity',
      fields: ['linked_entity_type', 'linked_entity_id'],
      gridCols: 2,
    },
  ],

  fields: [
    {
      name: 'subject',
      type: 'text',
      labelKey: 'columns.subject',
      placeholderKey: 'subjectPlaceholder',
      colSpan: 2,
      rules: [
        { type: 'required', messageKey: 'required' },
        { type: 'maxLength', value: 500, messageKey: 'maxLength', messageParams: { max: 500 } },
      ],
    },
    {
      name: 'body',
      type: 'textarea',
      labelKey: 'initialMessage',
      placeholderKey: 'initialMessagePlaceholder',
      rows: 6,
      showCount: true,
      colSpan: 2,
    },
    {
      name: 'status',
      type: 'select',
      labelKey: 'statusLabel',
      options: [
        { value: 'active', labelKey: 'status.active', color: 'green' },
        { value: 'pending', labelKey: 'status.pending', color: 'yellow' },
        { value: 'archived', labelKey: 'status.archived', color: 'gray' },
        { value: 'closed', labelKey: 'status.closed', color: 'red' },
      ],
    },
    {
      name: 'linked_entity_type',
      type: 'select',
      labelKey: 'entityTypes.client',
      options: [
        { value: '', labelKey: 'filters.all' },
        { value: 'client', labelKey: 'entityTypes.client' },
        { value: 'opportunity', labelKey: 'entityTypes.opportunity' },
        { value: 'proposal', labelKey: 'entityTypes.proposal' },
        { value: 'funding_source', labelKey: 'entityTypes.fundingSource' },
      ],
    },
    {
      name: 'linked_entity_id',
      type: 'text',
      labelKey: 'entityId',
      placeholderKey: 'entityIdPlaceholder',
      helperTextKey: 'entityIdHint',
    },
  ],

  filters: [
    { key: 'search', labelKey: 'filters.search', type: 'text', placeholderKey: 'filters.searchPlaceholder' },
    {
      key: 'linkedEntityType', labelKey: 'filters.linkedEntityType', type: 'select',
      options: [
        { value: '', labelKey: 'filters.all' },
        { value: 'client', labelKey: 'entityTypes.client' },
        { value: 'opportunity', labelKey: 'entityTypes.opportunity' },
        { value: 'proposal', labelKey: 'entityTypes.proposal' },
        { value: 'funding_source', labelKey: 'entityTypes.fundingSource' },
      ],
    },
  ],
});
