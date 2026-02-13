/**
 * Client Entity Form Definition — RF-04
 * CRM client form: CNPJ, company data, contact, notes.
 * i18n keys reference the `crm` namespace in locale files.
 */
import { registerEntity, EntityFormDefinition } from '../types';

export interface ClientFormData {
  name: string;
  cnpj: string;
  segment: string;
  annual_revenue: number;
  maturity_level: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
}

export const clientDefinition: EntityFormDefinition<ClientFormData> = registerEntity<ClientFormData>({
  entityKey: 'crm',
  i18nNamespace: 'crm',
  resource: 'crm',
  instituteScoped: false,
  apiEndpoint: '/api/v1/crm/clients',
  statisticsModule: 'crm',
  gridCols: 1,

  defaultValues: {
    name: '',
    cnpj: '',
    segment: '',
    annual_revenue: 0,
    maturity_level: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    notes: '',
  },

  tabs: [
    { key: 'basic', nameKey: 'tabBasic', fields: ['cnpj', 'name', 'segment', 'annual_revenue', 'maturity_level'], gridCols: 1 },
    { key: 'contact', nameKey: 'tabContact', fields: ['contact_name', 'contact_email', 'contact_phone'], gridCols: 1 },
    { key: 'notes', nameKey: 'tabNotes', fields: ['notes'], gridCols: 1 },
  ],

  fields: [
    {
      name: 'cnpj', type: 'text', labelKey: 'cnpj', placeholderKey: 'cnpjPlaceholder',
      rules: [{ type: 'cnpj', messageKey: 'cnpj' }],
    },
    {
      name: 'name', type: 'text', labelKey: 'clientName', placeholderKey: 'namePlaceholder',
      colSpan: 2,
      rules: [
        { type: 'required', messageKey: 'required' },
        { type: 'maxLength', value: 500, messageKey: 'maxLength', messageParams: { max: 500 } },
      ],
    },
    {
      name: 'segment', type: 'select', labelKey: 'segment',
      options: [
        { value: 'technology', labelKey: 'segments.technology' },
        { value: 'manufacturing', labelKey: 'segments.manufacturing' },
        { value: 'services', labelKey: 'segments.services' },
        { value: 'agribusiness', labelKey: 'segments.agribusiness' },
      ],
    },
    {
      name: 'annual_revenue', type: 'currency', labelKey: 'revenue',
      rules: [{ type: 'min', value: 0, messageKey: 'min', messageParams: { min: 0 } }],
    },
    {
      name: 'maturity_level', type: 'select', labelKey: 'maturityLabel',
      options: [
        { value: 'basic', labelKey: 'maturityLevels.basic' },
        { value: 'intermediate', labelKey: 'maturityLevels.intermediate' },
        { value: 'advanced', labelKey: 'maturityLevels.advanced' },
        { value: 'innovative', labelKey: 'maturityLevels.innovative' },
      ],
    },
    {
      name: 'contact_name', type: 'text', labelKey: 'contactName', placeholderKey: 'contactEmailPlaceholder',
    },
    {
      name: 'contact_email', type: 'email', labelKey: 'email',
      rules: [{ type: 'email', messageKey: 'email' }],
    },
    {
      name: 'contact_phone', type: 'tel', labelKey: 'phonePlaceholder',
    },
    {
      name: 'notes', type: 'textarea', labelKey: 'notes', placeholderKey: 'notesPlaceholder',
      rows: 6, showCount: true, colSpan: 1,
      rules: [{ type: 'maxLength', value: 5000, messageKey: 'maxLength', messageParams: { max: 5000 } }],
    },
  ],

  filters: [
    { key: 'search', labelKey: 'searchPlaceholder', type: 'text', placeholderKey: 'searchPlaceholder' },
    {
      key: 'segment', labelKey: 'segment', type: 'select',
      options: [
        { value: '', labelKey: 'filters.allSegments' },
        { value: 'technology', labelKey: 'segments.technology' },
        { value: 'manufacturing', labelKey: 'segments.manufacturing' },
        { value: 'services', labelKey: 'segments.services' },
        { value: 'agribusiness', labelKey: 'segments.agribusiness' },
      ],
    },
    {
      key: 'maturityLevel', labelKey: 'maturityLabel', type: 'select',
      options: [
        { value: '', labelKey: 'filters.allMaturity' },
        { value: 'basic', labelKey: 'maturityLevels.basic' },
        { value: 'intermediate', labelKey: 'maturityLevels.intermediate' },
        { value: 'advanced', labelKey: 'maturityLevels.advanced' },
        { value: 'innovative', labelKey: 'maturityLevels.innovative' },
      ],
    },
  ],
});

export default clientDefinition;
