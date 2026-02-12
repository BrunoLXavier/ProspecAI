/**
 * Feedback Entity Form Definition — RF-07
 * Single source of truth for feedback form fields, validation,
 * tabs, filters, and statistics mapping.
 *
 * i18n keys reference the `feedback` namespace in locale files.
 * Field names match backend snake_case (API interceptors handle conversion).
 */
import { registerEntity, EntityFormDefinition } from '../types';

export interface FeedbackFormData {
  type: string;
  severity: string;
  comment: string;
  page_url: string;
  status: string;
}

export const feedbackDefinition: EntityFormDefinition<FeedbackFormData> = registerEntity<FeedbackFormData>({
  entityKey: 'feedback',
  i18nNamespace: 'feedback',
  resource: 'feedback',
  instituteScoped: false,
  apiEndpoint: '/api/v1/feedback',
  statisticsModule: 'feedback',
  gridCols: 2,

  defaultValues: {
    type: 'bug_report',
    severity: 'medium',
    comment: '',
    page_url: '',
    status: 'open',
  },

  tabs: [
    {
      key: 'basic',
      nameKey: 'comment.typeLabel',
      fields: ['type', 'severity', 'status', 'comment'],
      gridCols: 2,
    },
    {
      key: 'context',
      nameKey: 'comment.back',
      fields: ['page_url'],
      gridCols: 1,
    },
  ],

  fields: [
    {
      name: 'type',
      type: 'select',
      labelKey: 'comment.typeLabel',
      rules: [{ type: 'required', messageKey: 'required' }],
      options: [
        { value: 'bug_report', labelKey: 'types.bug_report', color: 'red' },
        { value: 'feature_request', labelKey: 'types.feature_request', color: 'blue' },
        { value: 'ui_feedback', labelKey: 'types.ui_feedback', color: 'yellow' },
        { value: 'usability', labelKey: 'types.usability', color: 'orange' },
        { value: 'performance', labelKey: 'types.performance', color: 'purple' },
        { value: 'other', labelKey: 'types.other', color: 'gray' },
      ],
    },
    {
      name: 'severity',
      type: 'select',
      labelKey: 'comment.priorityLabel',
      rules: [{ type: 'required', messageKey: 'required' }],
      options: [
        { value: 'critical', labelKey: 'severity.critical', color: 'red' },
        { value: 'high', labelKey: 'severity.high', color: 'orange' },
        { value: 'medium', labelKey: 'severity.medium', color: 'yellow' },
        { value: 'low', labelKey: 'severity.low', color: 'green' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      labelKey: 'admin.updateStatus',
      options: [
        { value: 'open', labelKey: 'status.open', color: 'blue' },
        { value: 'in_progress', labelKey: 'status.in_progress', color: 'yellow' },
        { value: 'in_review', labelKey: 'status.in_review', color: 'purple' },
        { value: 'resolved', labelKey: 'status.resolved', color: 'green' },
        { value: 'closed', labelKey: 'status.closed', color: 'gray' },
        { value: 'wont_fix', labelKey: 'status.wont_fix', color: 'red' },
      ],
    },
    {
      name: 'comment',
      type: 'textarea',
      labelKey: 'comment.commentLabel',
      placeholderKey: 'comment.placeholder',
      rows: 6,
      showCount: true,
      colSpan: 2,
      rules: [
        { type: 'required', messageKey: 'required' },
        { type: 'maxLength', value: 5000, messageKey: 'maxLength', messageParams: { max: 5000 } },
      ],
    },
    {
      name: 'page_url',
      type: 'url',
      labelKey: 'admin.page',
      colSpan: 2,
    },
  ],

  filters: [
    { key: 'search', labelKey: 'admin.search', type: 'text', placeholderKey: 'admin.search' },
    {
      key: 'type', labelKey: 'comment.typeLabel', type: 'select',
      options: [
        { value: '', labelKey: 'admin.filters' },
        { value: 'bug_report', labelKey: 'types.bug_report' },
        { value: 'feature_request', labelKey: 'types.feature_request' },
        { value: 'ui_feedback', labelKey: 'types.ui_feedback' },
        { value: 'usability', labelKey: 'types.usability' },
        { value: 'performance', labelKey: 'types.performance' },
      ],
    },
    {
      key: 'status', labelKey: 'admin.updateStatus', type: 'select',
      options: [
        { value: '', labelKey: 'admin.filters' },
        { value: 'open', labelKey: 'status.open' },
        { value: 'in_progress', labelKey: 'status.in_progress' },
        { value: 'resolved', labelKey: 'status.resolved' },
        { value: 'closed', labelKey: 'status.closed' },
      ],
    },
  ],
});
